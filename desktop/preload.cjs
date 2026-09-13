'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('eqlDesktop',{
  version:'1.6.4',
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
