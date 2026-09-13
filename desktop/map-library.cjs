'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {commonLogFolders}=require('./log-discovery.cjs');
const MAX_BYTES=8*1024*1024,MAX_ENTRIES=20000,MAX_FOLDERS=32;
const local=p=>typeof p==='string'&&path.isAbsolute(p)&&!/^[/\\]{2}/.test(p)&&!p.includes('\0');
const key=p=>path.resolve(p).toLowerCase();
const fileParts=name=>{
 const m=name.match(/^([a-z0-9][a-z0-9_-]*?)(?:_([123]))?\.txt$/i);
 return m&&name.length<=120&&!/^eqlog_/i.test(name)?{stem:m[1].toLowerCase(),layer:Number(m[2]||0)}:null;
};
const provider=folder=>/brewall/i.test(path.basename(folder))?'brewall':/good/i.test(path.basename(folder))?'good':'other';
const commonMapFolders=(env=process.env)=>commonLogFolders(env).map(p=>path.join(path.dirname(p),'maps'));
async function realFolder(folder){
 if(!local(folder))throw Error('Choose a map folder on a local drive.');
 const stat=await fs.lstat(folder);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Choose a regular map folder, not a folder shortcut.');
 const real=await fs.realpath(folder);if(!local(real))throw Error('Choose a folder on a local drive.');return real;
}
/** A named map directory and its immediate children only. Never crawl a drive. */
async function scanFolder(folder){
 const real=await realFolder(folder),groups=new Map(),children=[];let scanned=0,truncated=false;
 const directory=await fs.opendir(real);
 for await(const entry of directory){
  if(++scanned>MAX_ENTRIES){truncated=true;break;}
  if(entry.isDirectory()&&!entry.isSymbolicLink()){if(children.length<MAX_FOLDERS)children.push(path.join(real,entry.name));else truncated=true;continue;}
  const parsed=fileParts(entry.name);if(!entry.isFile()||!parsed)continue;
  const group=groups.get(parsed.stem)||{stem:parsed.stem,files:[]};group.files.push({name:entry.name,layer:parsed.layer});groups.set(parsed.stem,group);
 }
 const zones=[...groups.values()].filter(g=>g.files.length<=4&&new Set(g.files.map(f=>f.layer)).size===g.files.length).sort((a,b)=>a.stem.localeCompare(b.stem));
 for(const group of zones)group.files.sort((a,b)=>a.layer-b.layer);
 return {path:real,zones,children,truncated};
}
class MapLibrary {
 constructor(settingsFile,{defaultFolders=commonMapFolders()}={}){this.settingsFile=settingsFile;this.defaultFolders=defaultFolders;this.issued=new Map();this.scanTicket=0;this.writeQueue=Promise.resolve();}
 async settings(){try{const stat=await fs.stat(this.settingsFile);if(stat.size>16384)return {};const s=JSON.parse(await fs.readFile(this.settingsFile,'utf8'));return {folder:local(s.folder)?s.folder:'',lastStem:/^[a-z0-9_-]{1,120}$/.test(s.lastStem)?s.lastStem:''};}catch{return {};}}
 async save(folder,lastStem=''){
  const write=async()=>{await fs.mkdir(path.dirname(this.settingsFile),{recursive:true});const temp=this.settingsFile+'.tmp';await fs.writeFile(temp,JSON.stringify({folder,lastStem}));await fs.rename(temp,this.settingsFile);};
  this.writeQueue=this.writeQueue.catch(()=>{}).then(write);return this.writeQueue;
 }
 async find(chosen=''){
  if(chosen&&!local(chosen))throw Error('Choose a map folder on a local drive.');
  const ticket=++this.scanTicket,saved=await this.settings(),folders=[],issued=new Map(),seen=new Set(),warnings=[];
  let truncated=false;
  const add=async(folder,children)=>{
   if(folders.length>=MAX_FOLDERS){truncated=true;return;}
   let result;
   try{result=await scanFolder(folder);}catch(error){if(chosen&&key(folder)===key(chosen))throw Error('That map folder could not be opened. Check that it is still available.');if(!['ENOENT','ENOTDIR'].includes(error.code))warnings.push('A map folder could not be opened. Choose it again if needed.');return;}
   if(seen.has(key(result.path)))return;seen.add(key(result.path));truncated||=result.truncated;
   if(result.zones.length){
    const folderId=randomUUID();const zones=result.zones.map(z=>{const id=randomUUID();issued.set(id,{...z,folder:result.path,folderId,provider:provider(result.path)});return {id,stem:z.stem,fileCount:z.files.length};});
    folders.push({id:folderId,path:result.path,name:path.basename(result.path),provider:provider(result.path),zones});
   }
   if(children)for(const sub of result.children)await add(sub,false);
  };
  const roots=chosen?[path.join(chosen,'maps'),chosen]:[saved.folder,...this.defaultFolders].filter(Boolean);
  for(const folder of roots)await add(folder,true);
  let preferred=folders.find(f=>saved.folder&&key(f.path)===key(saved.folder));
  if(chosen)preferred=folders.find(f=>key(f.path)===key(chosen))||folders.find(f=>f.provider==='brewall')||folders[0];
  preferred||=folders.find(f=>f.provider==='brewall')||folders[0];
  if(ticket!==this.scanTicket)throw Error('A newer map search has replaced this one.');
  this.issued=issued;
  if(chosen&&preferred){try{await this.save(preferred.path,key(preferred.path)===key(saved.folder||preferred.path)?saved.lastStem:'');}catch{warnings.push('Folder choices could not be saved. You can still use the maps now.');}}
  return {folders,selectedFolderId:preferred?.id||'',lastStem:preferred&&saved.folder&&key(preferred.path)===key(saved.folder)?saved.lastStem||'':'',warnings:[...new Set(warnings)],truncated};
 }
 async read(id){
  if(typeof id!=='string'||!this.issued.has(id))throw Error('Refresh the map list, then choose a location.');
  const row=this.issued.get(id);let real;
  try{real=await realFolder(row.folder);}catch{throw Error('The map folder is no longer available. Choose it again in Folder options.');}
  if(key(real)!==key(row.folder))throw Error('The map folder changed. Refresh the list.');
  const files=[];let used=0;
  for(const file of row.files){
   const filename=path.join(real,file.name);let handle;
   try{
    const before=await fs.lstat(filename);if(!before.isFile()||before.isSymbolicLink()||key(path.dirname(await fs.realpath(filename)))!==key(real))throw Error('A map file changed or is a shortcut. Refresh the list.');
    if(before.size+used>MAX_BYTES)throw Error('This zone is larger than the 8 MB map limit. Choose fewer layers with the manual file option.');
    handle=await fs.open(filename,'r');const stat=await handle.stat();if(!stat.isFile()||stat.dev!==before.dev||stat.ino!==before.ino)throw Error('A map file changed while opening. Try again.');
    const buffer=Buffer.alloc(Math.min(MAX_BYTES-used+1,stat.size+1));let count=0;
    while(count<buffer.length){const chunk=await handle.read(buffer,count,buffer.length-count,count);if(!chunk.bytesRead)break;count+=chunk.bytesRead;}
    const after=await handle.stat();if(after.size!==stat.size||after.mtimeMs!==stat.mtimeMs||count!==stat.size)throw Error('The map is being updated. Try again when the update is finished.');
    if(count+used>MAX_BYTES)throw Error('This zone is larger than the 8 MB map limit.');used+=count;files.push({name:file.name,text:buffer.subarray(0,count).toString('utf8')});
   }catch(error){if(['ENOENT','ENOTDIR'].includes(error.code))throw Error('A map file was removed. Refresh the list.');throw error;}finally{await handle?.close();}
  }
  return {id,stem:row.stem,provider:row.provider,files};
 }
 async remember(id){const row=this.issued.get(id);if(!row)throw Error('Refresh the list before saving this map choice.');await this.save(row.folder,row.stem);}
}
module.exports={MapLibrary,commonMapFolders,fileParts,scanFolder};
