// Hidden native windows; invented maps; HTML fullscreen is exercised without resizing/showing an OS window.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const {resolve,join}=require('node:path');
const {pathToFileURL}=require('node:url');
const {mkdirSync,writeFileSync}=require('node:fs');
const {allowAppFullscreen}=require('../desktop/permissions.cjs');
const dir=resolve('work/expanded-map-ui-'+Date.now());mkdirSync(dir,{recursive:true});app.setPath('userData',join(dir,'profile'));app.disableHardwareAcceleration();
let main,deny=false,permissions=0;const entry=pathToFileURL(resolve('desktop/ui/index.html')).href,errors=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms)),assert=(ok,message)=>{if(!ok)throw Error(message);};
const run=code=>main.webContents.executeJavaScript(code,true);
async function waitFor(fn,message){for(let n=0;n<60;n++){if(await fn())return;await pause(80);}throw Error(message);}
async function click(label,scope='.map-library'){await run(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(scope)}+' button')].find(e=>e.getClientRects().length&&(e.textContent.trim()===${JSON.stringify(label)}||e.getAttribute('aria-label')===${JSON.stringify(label)}));if(!el||el.disabled)throw Error('Missing button '+${JSON.stringify(label)});el.click();})()`);await pause(100);}
async function set(selector,value){await run(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause(80);}
async function key(keyCode){main.webContents.sendInputEvent({type:'keyDown',keyCode});main.webContents.sendInputEvent({type:'keyUp',keyCode});await pause(100);}
async function point(selector){return run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width*.45,y:r.y+r.height*.48}})()`);}
async function pointer(selector,dx=0,dy=0){await run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);await pause(100);const p=await point(selector);const send=(type,x,y)=>main.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});await send('mousePressed',p.x,p.y);if(dx||dy){await send('mouseMoved',p.x+dx,p.y+dy);await pause(60);}await send('mouseReleased',p.x+dx,p.y+dy);await pause(120);}
async function ready(){await waitFor(()=>run('(()=>{const c=document.querySelector(".map-expanded-canvas canvas");return document.querySelector(".map-expanded").open&&c.clientWidth===innerWidth&&c.clientHeight===innerHeight&&Math.abs(c.width-c.clientWidth*Math.min(2,devicePixelRatio))<2})()'),'expanded canvas must fill viewport at device resolution');}
async function screenshot(name){main.setSize(main.getSize()[0]+1,main.getSize()[1]);await pause(200);writeFileSync(join(dir,name),(await main.webContents.capturePage()).toPNG());}
const inline='.map-library > .map-view canvas',full='.map-expanded-canvas canvas';
app.whenReady().then(async()=>{
 const deadline=setTimeout(()=>{console.error('Expanded-map test timed out');app.exit(1);},65000);
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 session.defaultSession.setPermissionRequestHandler((wc,p,cb,d)=>{if(p==='fullscreen')permissions++;cb(!deny&&allowAppFullscreen(main,entry,wc,p,d));});
 session.defaultSession.setPermissionCheckHandler((wc,p,_origin,d)=>!deny&&allowAppFullscreen(main,entry,wc,p,d));
 main=new BrowserWindow({show:false,width:1320,height:960,webPreferences:{preload:resolve('desktop/preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false,disableHtmlFullscreenWindowResize:true}});
 main.webContents.setAudioMuted(true);main.webContents.setWindowOpenHandler(()=>({action:'deny'}));main.webContents.debugger.attach('1.3');main.webContents.on('console-message',(_event,level,message)=>{if(level===3&&!/fullscreen/i.test(message))errors.push(message);});
 ipcMain.handle('app:visibility',()=>false);ipcMain.handle('advisor:history',()=>({version:1,sources:{}}));ipcMain.handle('overlay:get-state',()=>({visible:false,locked:false,settings:{size:'medium',opacity:1}}));ipcMain.handle('maps:find',()=>({folders:[],selectedFolderId:'',lastStem:'',warnings:[],truncated:false}));
 try{
  await main.loadFile(resolve('desktop/ui/index.html'));await main.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});await pause(200);await click('Maps & Routes','.offline-tabs');
  await run('document.querySelector(".map-setup").open=true');
  let lines='';for(let x=-240;x<=120;x+=120)for(let y=-160;y<=80;y+=120)for(const [a,b,c,d] of [[x,y,x+80,y],[x+80,y,x+80,y+80],[x+80,y+80,x,y+80],[x,y+80,x,y]])lines+=`L ${a},${b},0,${c},${d},0,70,65,55\n`;
  const files=[{name:'fictional.txt',text:lines},{name:'fictional_1.txt',text:'P 0,0,0,20,80,140,2,Fixture_Merchant\nP 120,80,50,160,50,30,2,Upper_Floor\n'}];
  await run(`(()=>{const dt=new DataTransfer();for(const f of ${JSON.stringify(files)})dt.items.add(new File([f.text],f.name));const el=document.querySelector('.map-import-row input[type=file]');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await waitFor(()=>run('!!document.querySelector(".map-loaded")'),'map import');
  await run(`document.querySelector(${JSON.stringify(inline)}).scrollIntoView({block:'center'})`);await pause(150);
  await pointer(inline,45,30);assert(await run('!document.querySelector(".map-expanded").open'),'drag must not expand map');
  const before=await run(`(()=>{const c=document.querySelector(${JSON.stringify(inline)});return {image:c.toDataURL(),width:c.width,height:c.height,clientWidth:c.clientWidth,clientHeight:c.clientHeight}})()`);
  await pointer(inline);await ready();assert(await run('document.fullscreenElement===document.querySelector(".map-expanded-surface")'),'real Fullscreen API entered');assert(!main.isVisible(),'test window stays hidden');
  assert(await run('document.activeElement.classList.contains("map-expanded-close")'),'close button receives focus');assert(await run('document.body.style.overflow==="hidden"'),'background scroll locked');
  await click('Close map','.map-expanded');await waitFor(()=>run('!document.querySelector(".map-expanded").open&&!document.fullscreenElement'),'close exits fullscreen');await pause(200);
  assert(await run(`document.activeElement===document.querySelector(${JSON.stringify(inline)})`),'focus returns to map');const after=await run(`(()=>{const c=document.querySelector(${JSON.stringify(inline)});return {image:c.toDataURL(),width:c.width,height:c.height,clientWidth:c.clientWidth,clientHeight:c.clientHeight}})()`);writeFileSync(join(dir,'view-comparison.json'),JSON.stringify({before:{...before,image:before.image.length},after:{...after,image:after.image.length}}));writeFileSync(join(dir,'before.png'),Buffer.from(before.image.split(',')[1],'base64'));writeFileSync(join(dir,'after.png'),Buffer.from(after.image.split(',')[1],'base64'));assert(after.image===before.image,'opening/closing preserves map position and zoom');
  await key('Enter');await ready();
  await click('Zoom in','.map-expanded');assert(await run('document.querySelector(".map-expanded-controls output").textContent==="140%"'),'embedded zoom control');await click('Move view east','.map-expanded');await click('Move view north','.map-expanded');
  const p=await point(full);await main.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',x:p.x,y:p.y,deltaX:0,deltaY:-100});await pause(150);assert(await run('parseInt(document.querySelector(".map-expanded-controls output").textContent)>140'),'wheel zoom works');
  await click('Map tools','.map-expanded');await set('.map-expanded-panel .map-filter-grid input[placeholder]','Merchant');assert(await run('document.querySelector(".map-expanded-panel .map-landmarks summary").textContent.includes("1 matching")'),'landmark search inside expanded map');
  await run('document.querySelectorAll(".map-expanded-panel .map-layer-controls input")[1].click()');await pause(100);assert(await run('document.querySelector(".map-expanded-panel .map-landmarks summary").textContent.includes("0 matching")'),'layer switch inside expanded map');await run('document.querySelectorAll(".map-expanded-panel .map-layer-controls input")[1].click()');
  await set('.map-expanded-panel .map-filter-grid input[type=number]','0');await click('Hide tools','.map-expanded');
  const changed=await run('document.querySelector(".map-expanded-controls output").textContent');await click('Close map','.map-expanded');await pause(160);assert(await run('document.querySelector(".map-filter-grid input[placeholder]").value==="Merchant"&&document.querySelector(".map-filter-grid input[type=number]").value==="0"'),'search/height filters persist after close');
  await click('Expand map');await ready();assert(await run('document.querySelector(".map-expanded-controls output").textContent')===changed,'zoom survives reopening');
  await run(`document.querySelector(${JSON.stringify(full)}).focus()`);await key('F');assert(await run('document.querySelector(".map-expanded-controls output").textContent==="100%"'),'keyboard Fit map');await key('ArrowLeft');await key('+');assert(await run('document.querySelector(".map-expanded-controls output").textContent==="140%"'),'keyboard zoom');
  await key('Escape');await waitFor(()=>run('!document.querySelector(".map-expanded").open'),'Escape closes expanded map');assert(await run('document.body.style.overflow!=="hidden"'),'scroll restored');
  // Browser/OS fullscreen exit also closes the expanded map and restores focus.
  await click('Expand map');await ready();await run('document.exitFullscreen()');await waitFor(()=>run('!document.querySelector(".map-expanded").open'),'external fullscreen exit recovery');
  // Denied fullscreen still provides a working window-filling dialog.
  deny=true;await click('Expand map');await ready();assert(await run('!document.fullscreenElement'),'denied API uses expanded window fallback');
  for(const [width,height] of [[1920,1080],[420,900],[900,450]]){main.setSize(width,height);await pause(180);await ready();await click('Fit map','.map-expanded');
   const fit=await run('(()=>{const close=document.querySelector(".map-expanded-close").getBoundingClientRect(),bar=document.querySelector(".map-expanded-controls").getBoundingClientRect();return close.top>=0&&close.right<=innerWidth&&bar.bottom<=innerHeight&&bar.left>=0&&bar.right<=innerWidth})()');assert(fit,'controls fit '+width+'x'+height);
   await screenshot('expanded-'+width+'x'+height+'.png');
   await click('Map tools','.map-expanded');assert(await run('(()=>{const p=document.querySelector(".map-expanded-panel").getBoundingClientRect(),bar=document.querySelector(".map-expanded-controls").getBoundingClientRect();return p.height>100&&p.bottom<=bar.top&&p.right<=innerWidth})()'),'tools panel fits without covering controls');await click('Hide tools','.map-expanded');
  }
  await click('Close map','.map-expanded');await waitFor(()=>run('!document.querySelector(".map-expanded").open'),'fallback close works');assert(!main.isVisible(),'no native test window shown');assert(!errors.length,errors.join('\n'));
  writeFileSync(join(dir,'result.json'),JSON.stringify({permissions,errors,fullscreen:true,windowResizeSuppressed:true},null,2));clearTimeout(deadline);console.log('EXPANDED_MAP_UI_OK: click versus drag, true HTML fullscreen, focus, Escape/close, pan/zoom/wheel/keyboard, filters, preserved view, denied fallback and responsive controls. '+dir);app.exit(0);
 }catch(error){console.error(error);console.error('Details: '+dir);writeFileSync(join(dir,'failure.txt'),await run('document.body.innerText'));await screenshot('failure.png');app.exit(1);}
});
