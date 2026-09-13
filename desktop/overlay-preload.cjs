'use strict';
const { contextBridge,ipcRenderer }=require('electron');
const listen=(channel,callback)=>{const listener=(_event,value)=>callback(value);ipcRenderer.on(channel,listener);return()=>ipcRenderer.removeListener(channel,listener);};
contextBridge.exposeInMainWorld('eqlOverlayView',{
  get:()=>ipcRenderer.invoke('overlay:view-state'),
  control:value=>ipcRenderer.invoke('overlay:view-control',value),
  onState:callback=>listen('overlay:state',callback),
  onFrame:callback=>listen('overlay:frame',callback),
});
