const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdir,mkdtemp,writeFile,readFile,symlink} = require('node:fs/promises');
const {join} = require('node:path');
const {readRecentLog,RECENT_BYTES} = require('../log-history.cjs');
async function fixture(text){await mkdir('work/history-tests',{recursive:true});const dir=await mkdtemp('work/history-tests/case-');const path=join(dir,'eqlog_Test_Example.txt');await writeFile(path,text);return {path,dir};}
test('recent log snapshot reads loot without changing the file or including an unfinished line', async()=>{
 const text='[Sun Sep 13 10:00:00 2026] You have entered Unrest.\r\n[Sun Sep 13 10:01:00 2026] --You have looted a Test Gem from a rat\'s corpse.--\r\n[unfinished';
 const {path}=await fixture(text),snapshot=await readRecentLog(path);
 assert(snapshot.text.includes('Test Gem'));assert(!snapshot.text.includes('[unfinished'));assert(snapshot.partial);assert.equal(await readFile(path,'utf8'),text);
});
test('large files are bounded and partial leading and trailing lines are discarded',async()=>{
 const text='x'.repeat(RECENT_BYTES+100)+'\ncomplete one\ncomplete two\nunfinished';
 const {path}=await fixture(text),snapshot=await readRecentLog(path);
 assert.equal(snapshot.bytesRead,RECENT_BYTES);assert.equal(snapshot.totalBytes,Buffer.byteLength(text));assert.equal(snapshot.text,'complete one\ncomplete two\n');assert(snapshot.partial);
});
test('empty and completed small files are handled correctly, and folders are rejected',async()=>{
 const {path,dir}=await fixture('');assert.deepEqual(await readRecentLog(path),{name:'eqlog_Test_Example.txt',text:'',partial:false,totalBytes:0,bytesRead:0});
 await writeFile(path,'complete\n');assert.equal((await readRecentLog(path)).partial,false);await assert.rejects(readRecentLog(dir));
});
test('a symbolic link is not accepted as a regular selected log',async()=>{
 const {path,dir}=await fixture('');const link=join(dir,'linked');await symlink(dir,link,'junction');await assert.rejects(readRecentLog(link));
});
