import {useEffect,useId,useRef,useState,type ReactNode,type RefObject} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Layers,LocateFixed,X,ZoomIn,ZoomOut} from 'lucide-react';

export default function ExpandedMap({dialog,surface,screenOwned,open,name,credit,zoom,onClose,onZoom,onPan,onFit,children,tools}:{
 dialog:RefObject<HTMLDialogElement|null>;surface:RefObject<HTMLDivElement|null>;screenOwned:RefObject<boolean>;open:boolean;name:string;credit:string;zoom:number;
 onClose:()=>void;onZoom:(factor:number)=>void;onPan:(x:number,y:number)=>void;onFit:()=>void;children:ReactNode;tools:ReactNode;
}){
 const [toolsOpen,setToolsOpen]=useState(false),[screenNote,setScreenNote]=useState('');
 const title=useId(),panel=useId(),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open){setToolsOpen(false);return;}
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const changed=()=>{if(document.fullscreenElement===surface.current){screenOwned.current=true;setScreenNote('');}else if(screenOwned.current){screenOwned.current=false;close.current();}};
  const failed=()=>{setScreenNote('Expanded to fill this window.');};
  document.addEventListener('fullscreenchange',changed);document.addEventListener('fullscreenerror',failed);if(document.fullscreenElement===surface.current){screenOwned.current=true;setScreenNote('');}
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('fullscreenchange',changed);document.removeEventListener('fullscreenerror',failed);screenOwned.current=false;};
 },[open,surface,screenOwned]);
 return <dialog ref={dialog} className="map-expanded" aria-labelledby={title} onCancel={e=>{e.preventDefault();onClose();}} onClose={()=>{if(!dialog.current?.open)onClose();}}>
  <div ref={surface} className="map-expanded-surface">
   {children}
   <header className="map-expanded-heading"><div><h2 id={title}>{name}</h2><small>{credit} · N ↑</small></div><button className="map-expanded-close" onClick={onClose} autoFocus><X aria-hidden="true"/> Close map</button></header>
   <div className="map-expanded-help">Drag to move · Scroll to zoom · Esc to close{screenNote&&<span role="status">{screenNote}</span>}</div>
   <div className="map-expanded-controls" role="group" aria-label="Map view controls">
    <div className="map-expanded-zoom"><button onClick={()=>onZoom(1/1.4)} disabled={zoom<=.25} aria-label="Zoom out" title="Zoom out (−)"><ZoomOut aria-hidden="true"/></button><output aria-label="Map zoom">{Math.round(zoom*100)}%</output><button onClick={()=>onZoom(1.4)} disabled={zoom>=32} aria-label="Zoom in" title="Zoom in (+)"><ZoomIn aria-hidden="true"/></button><button onClick={onFit} title="Fit map (F)"><LocateFixed aria-hidden="true"/> Fit map</button></div>
    <div className="map-expanded-directions" role="group" aria-label="Move map view"><button onClick={()=>onPan(-1,0)} aria-label="Move view west" title="West (←)"><ArrowLeft aria-hidden="true"/></button><button onClick={()=>onPan(0,-1)} aria-label="Move view north" title="North (↑)"><ArrowUp aria-hidden="true"/></button><button onClick={()=>onPan(0,1)} aria-label="Move view south" title="South (↓)"><ArrowDown aria-hidden="true"/></button><button onClick={()=>onPan(1,0)} aria-label="Move view east" title="East (→)"><ArrowRight aria-hidden="true"/></button></div>
    <button aria-expanded={toolsOpen} aria-controls={panel} onClick={()=>setToolsOpen(v=>!v)}><Layers aria-hidden="true"/>{toolsOpen?'Hide tools':'Map tools'}</button>
   </div>
   <aside id={panel} className="map-expanded-panel" aria-label="Layers and landmarks" hidden={!toolsOpen}>{open&&tools}</aside>
  </div>
 </dialog>;
}
