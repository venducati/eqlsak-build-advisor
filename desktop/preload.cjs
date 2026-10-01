'use strict';
const {contextBridge,ipcRenderer}=require('electron');
let appIsVisible=true;
const visibilityCallbacks=new Set();
const updateVisibility=visible=>{appIsVisible=Boolean(visible);for(const cb of visibilityCallbacks)cb(appIsVisible);};
ipcRenderer.on('app:visibility',(_event,visible)=>updateVisibility(visible));
window.addEventListener('DOMContentLoaded',()=>{void ipcRenderer.invoke('app:visibility').then(updateVisibility).catch(()=>{});},{once:true});
contextBridge.exposeInMainWorld('eqlWindow',{isVisible:()=>appIsVisible,onVisibility:callback=>{visibilityCallbacks.add(callback);return()=>visibilityCallbacks.delete(callback);}});
const listen=(channel,callback)=>{const listener=(_event,value)=>callback(value);ipcRenderer.on(channel,listener);return()=>ipcRenderer.removeListener(channel,listener);};
contextBridge.exposeInMainWorld('eqlMaps',{
 find:()=>ipcRenderer.invoke('maps:find'),chooseFolder:()=>ipcRenderer.invoke('maps:choose-folder'),
 read:id=>ipcRenderer.invoke('maps:read',id),remember:id=>ipcRenderer.invoke('maps:remember',id),
});
contextBridge.exposeInMainWorld('eqlOverlay',{
 getState:()=>ipcRenderer.invoke('overlay:get-state'),control:action=>ipcRenderer.invoke('overlay:control',action),
 publish:frame=>ipcRenderer.send('overlay:frame',frame),onState:callback=>listen('overlay:state',callback),
 onOpenControls:callback=>listen('overlay:open-controls',callback),
});
contextBridge.exposeInMainWorld('eqlDesktop',{
  version:'1.6.15',
  getSourceHistory:()=>ipcRenderer.invoke('advisor:history'),
  checkSources:(classes)=>ipcRenderer.invoke('advisor:check-sources',classes),
  getRuleUpdate:(url,expectedHash)=>ipcRenderer.invoke('advisor:rule-update',url,expectedHash),
  onProgress:(callback)=>{
    const listener=(_event,progress)=>callback(progress);
    ipcRenderer.on('advisor:progress',listener);
    return ()=>ipcRenderer.removeListener('advisor:progress',listener);
  }
});
contextBridge.exposeInMainWorld('eqlMeter',{
 detect:()=>ipcRenderer.invoke('meter:detect'),
 readRecent:id=>ipcRenderer.invoke('meter:read-recent',id),
 chooseFolder:()=>ipcRenderer.invoke('meter:choose-folder'),
 startDetected:id=>ipcRenderer.invoke('meter:start-detected',id),
 start:()=>ipcRenderer.invoke('meter:start'),
 stop:()=>ipcRenderer.invoke('meter:stop'),
 pause:paused=>ipcRenderer.invoke('meter:pause',paused),
 onData:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('meter:data',listener);return()=>ipcRenderer.removeListener('meter:data',listener);}
});
