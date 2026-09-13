// Hidden windows, real isolated map bridge, invented map files, no network or game access.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const {resolve,join}=require('node:path');
const {pathToFileURL}=require('node:url');
const {mkdirSync,writeFileSync,readFileSync,unlinkSync}=require('node:fs');
const {MapLibrary}=require('../desktop/map-library.cjs');
const dir=resolve('work/map-folder-ui-'+Date.now()),pack=join(dir,'maps','brewall'),settings=join(dir,'map-settings.json');
mkdirSync(pack,{recursive:true});app.setPath('userData',join(dir,'profile'));app.disableHardwareAcceleration();
app.on('window-all-closed',()=>{});
const line='L -100,-100,0,100,-100,0,0,0,0\nL 100,-100,0,100,100,0,0,0,0\nL 100,100,0,-100,100,0,0,0,0\nL -100,100,0,-100,-100,0,0,0,0\n';
for(const stem of ['unrest','cauldron','paw','befallen']){writeFileSync(join(pack,stem+'.txt'),line);writeFileSync(join(pack,stem+'_1.txt'),'P 0,0,0,0,0,180,2,Fixture_Merchant\n');}
for(let n=0;n<576;n++)writeFileSync(join(pack,'fictional'+n+'.txt'),line);
let main,library=new MapLibrary(settings,{defaultFolders:[join(dir,'maps')]}),scans=0,choices=0,reads=0;
const entry=pathToFileURL(resolve('desktop/ui/index.html')).href,errors=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const run=code=>main.webContents.executeJavaScript(code,true);
async function waitFor(fn,message){for(let n=0;n<60;n++){if(await fn())return;await pause(80);}throw Error(message);}
async function click(text,selector='button'){await run(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>!el.closest('[hidden]')&&(el.textContent.trim()===${JSON.stringify(text)}||el.getAttribute('aria-label')===${JSON.stringify(text)}));if(!el||el.disabled)throw Error('Missing '+${JSON.stringify(text)});el.click();})()`);await pause(100);}
async function choose(search,stem){
 if(!await run('document.querySelector(".map-quick-pick input[role=combobox]").getAttribute("aria-expanded")==="true"'))await click('Browse installed map locations');
 await run(`(()=>{const input=document.querySelector('.map-quick-pick input[role=combobox]');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(search)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await pause(120);await waitFor(()=>run(`!![...document.querySelectorAll('[role=option]')].find(el=>el.textContent.includes(${JSON.stringify(stem+' ·')}))`),'search result '+stem);
 await run(`(()=>{const el=[...document.querySelectorAll('[role=option]')].find(el=>el.textContent.includes(${JSON.stringify(stem+' ·')}));el.click();})()`);
 await waitFor(()=>run(`document.querySelector('.map-loaded')?.textContent.includes(${JSON.stringify(' · '+stem)})&&!document.querySelector('.map-quick-pick input[role=combobox]').disabled`),'map opened '+stem);
}
async function create(native=true){
 main=new BrowserWindow({show:false,width:1320,height:1000,webPreferences:{...(native?{preload:resolve('desktop/preload.cjs')}:{}),contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 main.webContents.setAudioMuted(true);main.webContents.setWindowOpenHandler(()=>({action:'deny'}));main.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});
 main.webContents.debugger.attach('1.3');await main.loadFile(resolve('desktop/ui/index.html'));await main.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});await pause(200);
}
async function shot(name){main.setSize(main.getSize()[0]+1,main.getSize()[1]);await pause(200);writeFileSync(join(dir,name),(await main.webContents.capturePage()).toPNG());}
app.whenReady().then(async()=>{
 const deadline=setTimeout(()=>{console.error('Map picker UI deadline');app.exit(1);},60000);
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const trusted=e=>{if(e.sender!==main.webContents||e.senderFrame!==main.webContents.mainFrame||e.senderFrame.url!==entry)throw Error('Untrusted');};
 ipcMain.handle('app:visibility',e=>{trusted(e);return false;});ipcMain.handle('advisor:history',e=>{trusted(e);return {version:1,sources:{}};});ipcMain.handle('overlay:get-state',()=>({visible:false,locked:false,settings:{size:'medium',opacity:1}}));
 ipcMain.handle('maps:find',e=>{trusted(e);scans++;return library.find();});ipcMain.handle('maps:read',(e,id)=>{trusted(e);reads++;return library.read(id);});ipcMain.handle('maps:remember',(e,id)=>{trusted(e);return library.remember(id);});ipcMain.handle('maps:choose-folder',e=>{trusted(e);choices++;return library.find(pack);});
 try{
  await create();await click('Maps & Routes');await waitFor(()=>run('document.querySelector(".map-quick-heading").textContent.includes("580 locations ready")'),'automatic discovery');assert(choices===0&&scans===1,'no dialog on installed map detection');
  assert(await run('!document.querySelector(".map-setup").open'),'setup starts collapsed');
  await run('document.querySelector(".map-quick-pick input[role=combobox]").focus()');await main.webContents.debugger.sendCommand('Input.insertText',{text:'Unrest'});
  await waitFor(()=>run('!![...document.querySelectorAll("[role=option]")].find(el=>el.textContent.includes("unrest ·"))'),'typing opens filtered options');
  main.webContents.sendInputEvent({type:'keyDown',keyCode:'ArrowDown'});main.webContents.sendInputEvent({type:'keyUp',keyCode:'ArrowDown'});main.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});main.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});
  await waitFor(()=>run('document.querySelector(".map-loaded")?.textContent.includes("unrest")&&!document.querySelector(".map-quick-pick input[role=combobox]").disabled'),'keyboard choice loads map');assert(await run('document.querySelectorAll(".map-layer-controls label").length===2'),'base and layer loaded together');
  await click('Browse installed map locations');await shot('map-picker-wide.png');await run('document.activeElement.blur()');await run('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await choose('Dagnors','cauldron');assert(reads===2&&choices===0,'switch zones without any folder dialog');
  await waitFor(async()=>JSON.parse(readFileSync(settings,'utf8')).lastStem==='cauldron','last choice saved');
  main.destroy();library=new MapLibrary(settings,{defaultFolders:[]});await create();await click('Maps & Routes');await waitFor(()=>run('document.querySelector(".map-loaded")?.textContent.includes("cauldron")'),'saved folder and map reopen after restart');
  await click('brewall · Folder options','summary');writeFileSync(join(pack,'cauldron_2.txt'),'P 10,10,0,180,0,0,2,New_Update\n');await click('Refresh map list');await waitFor(()=>run('document.querySelectorAll(".map-layer-controls label").length===3'),'refresh reads new layers');
  await choose('Splitpaw','paw');unlinkSync(join(pack,'unrest.txt'));await chooseError();assert(await run('document.querySelector(".map-loaded").textContent.includes("paw")'),'failed read preserves prior map');
  await click('Build Advisor');await click('Open local map');await waitFor(()=>run('document.querySelector(".map-loaded")?.textContent.includes("befallen")'),'zone card map');
  await choose('Cauldron','cauldron');await click('Build Advisor');await click('Open local map');await waitFor(()=>run('document.querySelector(".map-loaded")?.textContent.includes("befallen")'),'same zone card opens its map again after manual browsing');
  await click('Clear map from BA');await choose('Befallen','befallen');
  for(const width of [1320,420]){main.setSize(width,1000);await run('document.querySelector(".map-heading").scrollIntoView({block:"start"})');await shot('map-ready-'+width+'.png');assert(await run('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow '+width);assert(await run('(()=>{const c=document.querySelector(".map-view canvas");return Math.abs(c.width-c.clientWidth*Math.min(2,devicePixelRatio))<2})()'),'crisp canvas sizing');}
  assert(choices===0,'normal use never opens folder dialog');main.destroy();await create(false);await click('Maps & Routes');assert(await run('document.querySelector(".map-quick-pick").textContent.includes("once for this browser session")'),'browser folder explanation');
  await run(`(()=>{const dt=new DataTransfer();for(const stem of ['unrest','cauldron'])for(const layer of ['', '_1']){const f=new File([${JSON.stringify(line)}],stem+layer+'.txt');Object.defineProperty(f,'webkitRelativePath',{value:'brewall/'+f.name});dt.items.add(f);}const el=document.querySelector('.map-quick-pick input[type=file]');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(()=>run('document.querySelector(".map-quick-heading").textContent.includes("2 locations ready")'),'browser full folder imported');await choose('Unrest','unrest');await choose('Cauldron','cauldron');assert(await run('document.querySelectorAll(".map-layer-controls label").length===2'),'browser switches full layers without new upload');
  assert(!errors.length,errors.join('\n'));writeFileSync(join(dir,'result.json'),JSON.stringify({scans,choices,reads,errors},null,2));clearTimeout(deadline);console.log('MAP_FOLDER_UI_OK: 580 locations, native auto detection, folder/map persistence, zone links, refresh, missing files, browser directory import, responsive layout. '+dir);app.exit(0);
 }catch(error){console.error(error);console.error('Details: '+dir);if(main&&!main.isDestroyed())writeFileSync(join(dir,'failure.txt'),await run('document.body.innerText'));app.exit(1);}
});
async function chooseError(){await click('Browse installed map locations');await run(`(()=>{const input=document.querySelector('.map-quick-pick input[role=combobox]');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Unrest');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause(150);await run(`[...document.querySelectorAll('[role=option]')].find(el=>el.textContent.includes('unrest ·')).click()`);await waitFor(()=>run('document.querySelector(".map-picker-status")?.textContent.includes("removed")'),'missing file message');}
