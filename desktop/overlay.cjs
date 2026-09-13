'use strict';
const { readFileSync, writeFileSync, mkdirSync, renameSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { scales, settingsFrom, fitBounds, frameFrom } = require('./overlay-state.cjs');
const keys = { visibility: 'CommandOrControl+Shift+F10', lock: 'CommandOrControl+Shift+F11' };

function createOverlay({ app, BrowserWindow, ipcMain, screen, globalShortcut, mainWindow, trustedMain }) {
  const file = join(app.getPath('userData'), 'overlay-settings.json');
  const entry = pathToFileURL(join(__dirname, 'ui', 'overlay.html')).href;
  let saved; try { saved = JSON.parse(readFileSync(file, 'utf8')); } catch { saved = {}; }
  let settings = settingsFrom(saved), overlay = null, shown = false, locked = false, frame = null;
  let error = '', saving = null, creating = null, disposed = false;
  let visibilityTicket = 0;
  const registered = new Set();
  function trustedOverlay(event) {
    if (!overlay || event.sender !== overlay.webContents || event.senderFrame !== overlay.webContents.mainFrame || event.senderFrame.url !== entry) throw Error('Untrusted overlay request.');
  }
  function state() { return { ...settings, visible: shown, locked, shortcutHide: registered.has(keys.visibility), shortcutLock: registered.has(keys.lock), error }; }
  function notify() {
    const main = mainWindow();
    if (main && !main.isDestroyed()) { main.webContents.setBackgroundThrottling(!shown); main.webContents.send('overlay:state', state()); }
    if (overlay && !overlay.isDestroyed()) overlay.webContents.send('overlay:state', state());
  }
  function save() {
    clearTimeout(saving); saving = null;
    try { mkdirSync(app.getPath('userData'),{recursive:true}); writeFileSync(file+'.tmp',JSON.stringify(settings)); renameSync(file+'.tmp',file); }
    catch { error = 'Overlay settings could not be saved. Your choices still work for this session.'; notify(); }
  }
  function saveLater() { clearTimeout(saving); saving = setTimeout(save,250); }
  function unregister() { for (const key of registered) globalShortcut.unregister(key); registered.clear(); }
  function shortcuts() {
    unregister();
    if (!settings.shortcuts || !overlay) return;
    for (const [key, action] of [[keys.visibility,()=>void setVisible(!shown)], [keys.lock,()=>{ if (shown) setLocked(!locked); }]]) {
      try { if (globalShortcut.register(key, action)) registered.add(key); } catch { /* Controls in BA remain available. */ }
    }
  }
  function place() {
    if (!overlay || overlay.isDestroyed()) return;
    overlay.setBounds(fitBounds(settings,screen.getAllDisplays(),screen.getPrimaryDisplay()));
    overlay.webContents.setZoomFactor(scales[settings.size]);
    overlay.setOpacity(settings.opacity);
  }
  function setLocked(value) {
    locked = value;
    if (overlay && !overlay.isDestroyed()) {
      overlay.setIgnoreMouseEvents(locked, { forward:true });
      overlay.setFocusable(!locked);
    }
    notify();
  }
  async function ensure() {
    if (creating) return creating;
    if (overlay && !overlay.isDestroyed()) return;
    creating = (async()=>{
      const win = new BrowserWindow({ ...fitBounds(settings,screen.getAllDisplays(),screen.getPrimaryDisplay()),
        show:false, frame:false, transparent:true, backgroundColor:'#00000000', resizable:false,
        maximizable:false, minimizable:false, skipTaskbar:true, hasShadow:false, title:'EQLSaK Game Overlay',
        webPreferences:{preload:join(__dirname,'overlay-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,backgroundThrottling:false},
      });
      overlay = win;
      win.setAlwaysOnTop(true,'screen-saver');
      win.setMenu(null);
      win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      win.webContents.on('will-navigate',event=>event.preventDefault());
      win.on('close',event=>{ if (!disposed) { event.preventDefault(); void setVisible(false); } });
      win.on('moved',()=>{ if (!win.isDestroyed()) { const b=win.getBounds(); settings={...settings,x:b.x,y:b.y}; saveLater(); } });
      win.on('closed',()=>{ overlay=null; shown=false; locked=false; unregister(); notify(); });
      win.webContents.on('render-process-gone',()=>{ error='The overlay stopped. Hide it, then open it again.'; shown=false; if (!win.isDestroyed()) win.destroy(); notify(); });
      try { await win.loadFile(join(__dirname,'ui','overlay.html')); place(); shortcuts(); }
      catch (cause) { if (!win.isDestroyed()) win.destroy(); throw cause; }
    })().finally(()=>{ creating=null; });
    return creating;
  }
  async function setVisible(value) {
    if (disposed) return state();
    const ticket=++visibilityTicket;
    if (value) { await ensure(); if (disposed || ticket!==visibilityTicket) return state(); shown=true; setLocked(false); overlay.showInactive(); if (frame) overlay.webContents.send('overlay:frame',frame); }
    else { shown=false; setLocked(false); if (overlay && !overlay.isDestroyed()) overlay.hide(); }
    notify(); return state();
  }
  function openControls() {
    const main=mainWindow(); if (!main || main.isDestroyed()) return;
    if (main.isMinimized()) main.restore(); main.show(); main.focus(); main.webContents.send('overlay:open-controls');
  }
  async function action(value) {
    if (!value || typeof value!=='object') throw Error('Invalid overlay action.');
    if (value.action==='show') return setVisible(true);
    if (value.action==='hide') return setVisible(false);
    if (value.action==='lock') { if(typeof value.locked!=='boolean')throw Error('Invalid overlay lock state.');setLocked(value.locked); }
    else if (value.action==='settings') {
      if (!value.settings || typeof value.settings!=='object') throw Error('Invalid overlay settings.');
      const patch=value.settings;
      if (Object.keys(patch).some(k=>!['opacity','size','shortcuts'].includes(k)) ||
        ('opacity' in patch && (!Number.isFinite(patch.opacity)||patch.opacity<0.45||patch.opacity>1)) ||
        ('size' in patch && !Object.hasOwn(scales,patch.size)) || ('shortcuts' in patch && typeof patch.shortcuts!=='boolean')) throw Error('Invalid overlay settings.');
      const changedShortcuts=patch.shortcuts!==undefined && patch.shortcuts!==settings.shortcuts;
      settings=settingsFrom({...settings,...patch}); place(); if(changedShortcuts)shortcuts(); saveLater();
    } else if (value.action==='reset-position') { settings={...settings,x:null,y:null}; place(); saveLater(); }
    else if (value.action==='controls') openControls();
    else if (value.action!=='lock') throw Error('Unknown overlay action.');
    notify(); return state();
  }
  ipcMain.handle('overlay:get-state',event=>{ trustedMain(event); return state(); });
  ipcMain.handle('overlay:control',(event,value)=>{ trustedMain(event); return action(value); });
  ipcMain.handle('overlay:view-state',event=>{ trustedOverlay(event); return {state:state(),frame}; });
  ipcMain.handle('overlay:view-control',(event,value)=>{
    trustedOverlay(event);
    if (!['hide','lock','controls'].includes(value?.action)) throw Error('Invalid overlay control.');
    return action(value);
  });
  const accept=(event,value)=>{
    try { trustedMain(event); if(!shown)return; frame={...frameFrom(value),receivedAt:Date.now()}; overlay?.webContents.send('overlay:frame',frame); }
    catch { /* Drop malformed frames; the stale-data indicator stays visible. */ }
  };
  ipcMain.on('overlay:frame',accept);
  const changed=()=>{place();saveLater();};
  screen.on('display-removed',changed);screen.on('display-metrics-changed',changed);
  return {
    state,
    clear(){frame=null;if(overlay&&!overlay.isDestroyed())overlay.webContents.send('overlay:frame',null);},
    dispose(){disposed=true;clearTimeout(saving);save();unregister();screen.removeListener('display-removed',changed);screen.removeListener('display-metrics-changed',changed);ipcMain.removeListener('overlay:frame',accept);for(const channel of ['overlay:get-state','overlay:control','overlay:view-state','overlay:view-control'])ipcMain.removeHandler(channel);if(overlay&&!overlay.isDestroyed())overlay.destroy();},
  };
}
module.exports={createOverlay};
