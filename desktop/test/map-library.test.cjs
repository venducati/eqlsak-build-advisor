const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {MapLibrary,commonMapFolders,fileParts}=require('../map-library.cjs');
const line='L 0,0,0,10,10,0,0,0,0\n';
async function fixture(){const root=path.resolve('work/map-library-tests');await fs.mkdir(root,{recursive:true});const dir=await fs.mkdtemp(path.join(root,'case-'));const maps=path.join(dir,'maps'),pack=path.join(maps,'brewall');await fs.mkdir(pack,{recursive:true});await fs.writeFile(path.join(pack,'unrest.txt'),line);await fs.writeFile(path.join(pack,'unrest_1.txt'),'P 1,1,0,0,0,0,1,Fixture\n');return {dir,maps,pack,settings:path.join(dir,'settings.json')};}
test('default detection includes Public Daybreak EQL maps and filters log names',()=>{
 assert.equal(commonMapFolders({PUBLIC:'C:\\Users\\Public'})[0],path.join('C:\\Users\\Public','Daybreak Game Company','Installed Games','EverQuest Legends','maps'));
 assert.deepEqual(fileParts('UNREST_1.TXT'),{stem:'unrest',layer:1});assert.equal(fileParts('eqlog_Person_Server.txt'),null);
});
test('discovers map packs, reads selected layers only, remembers and reopens after restart',async()=>{
 const f=await fixture();await fs.writeFile(path.join(f.pack,'cauldron.txt'),'');await fs.writeFile(path.join(f.pack,'eqlog_Person_Server.txt'),'private log');
 const lib=new MapLibrary(f.settings,{defaultFolders:[f.maps]});const index=await lib.find();assert.equal(index.folders.length,1);assert.equal(index.folders[0].zones.length,2);
 const row=index.folders[0].zones.find(z=>z.stem==='unrest');assert.equal(row.fileCount,2);const data=await lib.read(row.id);assert.deepEqual(data.files.map(f=>f.name),['unrest.txt','unrest_1.txt']);await lib.remember(row.id);
 const restarted=new MapLibrary(f.settings,{defaultFolders:[]});const next=await restarted.find();assert.equal(next.lastStem,'unrest');assert.equal(next.folders[0].path,f.pack);assert.equal((await restarted.read(next.folders[0].zones.find(z=>z.stem==='unrest').id)).files.length,2);
 await assert.rejects(()=>lib.read(path.join(f.pack,'unrest.txt')),/Refresh/);
});
test('refresh discovers new layers, reads updated bytes, and invalidates stale selection IDs',async()=>{
 const f=await fixture(),lib=new MapLibrary(f.settings,{defaultFolders:[f.maps]});const old=(await lib.find()).folders[0].zones[0];
 await fs.writeFile(path.join(f.pack,'unrest_2.txt'),line);await fs.writeFile(path.join(f.pack,'unrest.txt'),line+line);
 const next=(await lib.find()).folders[0].zones[0];assert.equal(next.fileCount,3);assert.equal((await lib.read(next.id)).files[0].text,line+line);await assert.rejects(()=>lib.read(old.id),/Refresh/);
 await fs.unlink(path.join(f.pack,'unrest_2.txt'));await assert.rejects(()=>lib.read(next.id),/removed/);
});
test('choose a game root once, keep scans shallow, and recover from missing folders',async()=>{
 const f=await fixture();await fs.mkdir(path.join(f.pack,'nested'));await fs.writeFile(path.join(f.pack,'nested','hidden.txt'),line);
 const lib=new MapLibrary(f.settings,{defaultFolders:[]});const index=await lib.find(f.dir);assert.equal(index.folders.length,1);assert.equal(index.folders[0].zones.length,1);
 assert.equal((await new MapLibrary(f.settings,{defaultFolders:[]}).find()).folders[0].path,f.pack);
 await fs.rename(f.pack,f.pack+'-moved');await assert.rejects(()=>lib.read(index.folders[0].zones[0].id),/no longer available/);
 assert.equal((await lib.find()).folders.length,0);await assert.rejects(()=>lib.find('relative/folder'),/local drive/);await assert.rejects(()=>lib.find('\\\\server\\maps'),/local drive/);
});
test('oversized maps are bounded; folder junctions are rejected',async()=>{
 const f=await fixture(),lib=new MapLibrary(f.settings,{defaultFolders:[f.maps]});await fs.writeFile(path.join(f.pack,'huge.txt'),Buffer.alloc(8*1024*1024+1));
 const index=await lib.find();await assert.rejects(()=>lib.read(index.folders[0].zones.find(z=>z.stem==='huge').id),/8 MB/);
 const link=path.join(f.dir,'shortcut');await fs.symlink(f.pack,link,process.platform==='win32'?'junction':'dir');await assert.rejects(()=>lib.find(link),/could not be opened/);
});
