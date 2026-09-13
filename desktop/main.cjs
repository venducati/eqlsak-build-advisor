'use strict';
const {app,BrowserWindow,ipcMain,shell,session,dialog,screen,globalShortcut}=require('electron');
const {readFileSync,mkdirSync,writeFileSync,renameSync}=require('node:fs');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {fetchText,extractSource,compareSnapshot,validateURL}=require('./network.cjs');
const {LogTail}=require('./log-tail.cjs');
const {LogDiscovery}=require('./log-discovery.cjs');
const {readRecentLog}=require('./log-history.cjs');
const {createOverlay}=require('./overlay.cjs');
const {basename,extname}=require('node:path');
const manifest=require('./source-manifest.json');
const entry=pathToFileURL(join(__dirname,'ui','index.html')).href;
const smoke=process.argv.includes('--smoke-test');
app.setAppUserModelId('community.eqlsak.buildadvisor');
app.disableHardwareAcceleration();
if(smoke) app.setPath('userData',join(__dirname,'..','work','desktop-smoke-data'));
let window,overlay,busy=false;
function trusted(event) {
  if(!window || event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame || event.senderFrame.url!==entry) throw new Error('Untrusted update request.');
}
function appVisible(){return Boolean(window&&!window.isDestroyed()&&window.isVisible()&&!window.isMinimized());}
ipcMain.handle('app:visibility',event=>{trusted(event);return appVisible();});
let tail=null,tailPaused=false,tailBusy=false,tailGeneration=0;
let discovery;
function logFinder(){return discovery||(discovery=new LogDiscovery(join(app.getPath('userData'),'log-discovery.json')));}
async function attachLog(path){
 if(!['.txt','.log'].includes(extname(path).toLowerCase()))throw new Error('Choose a .txt or .log file.');
 const next=new LogTail(path);const state=await next.start();
 try{await logFinder().remember(path);}catch{/* Watching still works when settings cannot be saved. */}
 tailGeneration++;tail=next;tailPaused=false;
 return {name:basename(path),skipPartial:state.skipPartial};
}
ipcMain.handle('meter:detect',async event=>{trusted(event);return logFinder().find();});
ipcMain.handle('meter:read-recent',async(event,id)=>{trusted(event);if(tail)throw new Error('Stop live reading before loading a saved snapshot.');return readRecentLog(await logFinder().resolve(id));});
ipcMain.handle('meter:choose-folder',async event=>{
 trusted(event);
 const selected=await dialog.showOpenDialog(window,{title:'Choose your EQL game or Logs folder',properties:['openDirectory']});
 if(selected.canceled||!selected.filePaths[0])return null;
 return logFinder().find(selected.filePaths[0]);
});
ipcMain.handle('meter:start-detected',async(event,id)=>{trusted(event);return attachLog(await logFinder().resolve(id));});
ipcMain.handle('meter:start',async event=>{
 trusted(event);
 const selected=await dialog.showOpenDialog(window,{title:'Choose your EQL character log',properties:['openFile'],filters:[{name:'Combat logs',extensions:['txt','log']}]});
 if(selected.canceled||!selected.filePaths[0])return null;
 return attachLog(selected.filePaths[0]);
});
ipcMain.handle('meter:stop',event=>{trusted(event);tailGeneration++;tail=null;});
ipcMain.handle('meter:pause',(event,value)=>{trusted(event);if(typeof value!=='boolean')throw new Error('Invalid pause state.');tailPaused=value;});
const tailTimer=setInterval(async()=>{
 if(!tail||tailPaused||tailBusy||!window||window.isDestroyed())return;
 tailBusy=true;const current=tailGeneration;
 try{const batch=await tail.poll();if(current===tailGeneration&&!window.isDestroyed()&&(batch.text||batch.reset))window.webContents.send('meter:data',batch);}
 catch(e){if(current===tailGeneration&&!window.isDestroyed()){tailPaused=true;window.webContents.send('meter:data',{text:'',reset:false,backlog:0,error:'Log reading paused: '+e.message});}}
 finally{tailBusy=false;}
},500);
app.on('before-quit',()=>{clearInterval(tailTimer);overlay?.dispose();overlay=null;});
function historyPath(){return join(app.getPath('userData'),'source-history.json');}
function history(){
  try {const h=JSON.parse(readFileSync(historyPath(),'utf8'));return h&&h.version===1&&h.sources&&typeof h.sources==='object'?h:{version:1,sources:{}};}
  catch{return {version:1,sources:{}};}
}
function saveHistory(value) {
  mkdirSync(app.getPath('userData'),{recursive:true});
  const tmp=historyPath()+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2));renameSync(tmp,historyPath());
}
ipcMain.handle('advisor:history',event=>{trusted(event);return history();});
ipcMain.handle('advisor:check-sources',async(event,classes)=>{
  trusted(event);
  if(busy) throw new Error('An update check is already running.');
  if(!Array.isArray(classes)||classes.length>16||classes.some(c=>!manifest.classIds.includes(c))) throw new Error('Invalid class selection.');
  busy=true;
  try {
    const previous=history();
    const sources=manifest.sources.filter(s=>!s.classes.length||s.classes.some(c=>classes.includes(c)));
    const results=[];let done=0;
    for(const source of sources) {
      let row;
      try {
        const sourceHost=new URL(source.url).hostname;
        const hosts=new Set([sourceHost,sourceHost.startsWith('www.')?sourceHost.slice(4):'www.'+sourceHost]);
        const downloaded=await fetchText(source.url,{allowedHosts:hosts});
        if(!/html|text\/plain/i.test(downloaded.contentType)) throw new Error('Source did not return a readable page.');
        const snapshot={...extractSource(downloaded.text),url:source.url,checkedAt:new Date().toISOString(),lastModified:downloaded.lastModified};
        const old=previous.sources[source.id];
        row={id:source.id,title:source.title,url:source.url,status:compareSnapshot(old,snapshot),snapshot,previous:old||null};
        previous.sources[source.id]=snapshot;
      } catch(e) {row={id:source.id,title:source.title,url:source.url,status:'unavailable',error:e.message,previous:previous.sources[source.id]||null};}
      results.push(row);
      if(!window.isDestroyed()) window.webContents.send('advisor:progress',{done:++done,total:sources.length});
    }
    saveHistory(previous);
    return {checkedAt:new Date().toISOString(),results};
  } finally {busy=false;}
});
ipcMain.handle('advisor:rule-update',async(event,url,expectedHash)=>{
  trusted(event);
  if(expectedHash && !/^[a-f0-9]{64}$/i.test(expectedHash)) throw new Error('The SHA-256 code needs 64 characters. Use only numbers 0–9 and letters a–f.');
  const downloaded=await fetchText(url,{limit:1000000});
  const hash=createHash('sha256').update(downloaded.text).digest('hex');
  if(expectedHash && hash!==expectedHash.toLowerCase()) throw new Error('SHA-256 does not match. The update was rejected.');
  const payload=JSON.parse(downloaded.text);
  if(!payload || payload.format!=='eqlsak-rule-update' || payload.schemaVersion!==1 || typeof payload.release!=='string' || payload.release.length>100 || typeof payload.publishedAt!=='string' || !Number.isFinite(Date.parse(payload.publishedAt)) || typeof payload.notes!=='string' || payload.notes.length>5000 || !payload.rules) throw new Error('This URL is not an EQLSaK rule-update package.');
  return {payload,hash,url:downloaded.url,hashVerified:Boolean(expectedHash)};
});
app.whenReady().then(async()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  // The renderer only needs local assets. Explicit update downloads use the main process.
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>callback({cancel:true}));
  window=new BrowserWindow({width:1320,height:940,minWidth:760,minHeight:600,show:!smoke,backgroundColor:'#120f0c',title:'EQLSaK Build Advisor',icon:join(__dirname,'assets','advisor.ico'),autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  overlay=createOverlay({app,BrowserWindow,ipcMain,screen,globalShortcut,mainWindow:()=>window,trustedMain:trusted});
  const sendVisibility=()=>{if(window&&!window.isDestroyed())window.webContents.send('app:visibility',appVisible());};
  for(const name of ['minimize','restore','show','hide'])window.on(name,sendVisibility);
  window.webContents.on('did-finish-load',sendVisibility);
  window.webContents.on('did-start-loading',()=>{overlay?.clear();tailGeneration++;tail=null;});
  window.webContents.on('render-process-gone',()=>{overlay?.clear();tailGeneration++;tail=null;});
  window.on('closed',()=>{overlay?.dispose();overlay=null;window=null;app.quit();});
  const external=raw=>{try {const url=validateURL(raw);void shell.openExternal(url.href);}catch{/* Ignore non-web destinations. */}};
  window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(url!==entry){event.preventDefault();external(url);}});
  if(smoke) {
    const timer=setTimeout(()=>{console.error('Desktop load timed out.');app.exit(1);},25000);
    window.webContents.on('did-fail-load',(_e,code,description)=>{clearTimeout(timer);console.error('Desktop load failed',code,description);app.exit(1);});
    window.webContents.on('did-finish-load',async()=>{try{const info=await window.webContents.executeJavaScript('(async()=>({version:window.eqlDesktop.version,history:await window.eqlDesktop.getSourceHistory(),overlay:await window.eqlOverlay.getState(),visibility:window.eqlWindow.isVisible(),mapSources:document.querySelectorAll(".map-source-grid article").length,meter:typeof window.eqlMeter.start,detect:typeof window.eqlMeter.detect,recent:typeof window.eqlMeter.readRecent,folder:typeof window.eqlMeter.chooseFolder,watch:typeof window.eqlMeter.startDetected,headingVersion:document.querySelector(".ba-app-version")?.textContent,glossaryGroups:document.querySelectorAll(".ba-glossary-group").length,glossaryWords:document.querySelectorAll(".ba-glossary-word").length}))()');if(info.overlay.visible!==false||info.visibility!==false||info.mapSources!==2)throw new Error('Overlay or maps bridge check failed.');if(info.version!==app.getVersion()||info.headingVersion!=="v"+app.getVersion()||info.history.version!==1||[info.meter,info.detect,info.recent,info.folder,info.watch].some(value=>value!=='function'))throw new Error('Desktop bridge check failed.');if(info.glossaryGroups!==6||info.glossaryWords!==21)throw new Error('Packaged glossary matrix did not render.');clearTimeout(timer);console.log('DESKTOP_SMOKE_OK: version '+info.version+', glossary matrix, advisor, updates, combat meter, overlay, maps, log discovery and recent-history bridges loaded.');app.exit(0);}catch(e){console.error(e);app.exit(1);}});
    window.webContents.on('render-process-gone',(_e,details)=>{console.error(details);app.exit(1);});
  }
  await window.loadFile(join(__dirname,'ui','index.html'));
}).catch(e=>{console.error('Advisor failed to start:',e.message);app.exit(1);});
app.on('window-all-closed',()=>app.quit());
