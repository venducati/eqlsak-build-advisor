import {useEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {Map,ExternalLink,FolderOpen,Layers,ZoomIn,ZoomOut,LocateFixed,Trash2,MapPin,Search,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Maximize} from 'lucide-react';
import '../app/map-layout-fix.css';
import sources from '../data/map-sources.json';
import {mapBounds,parseMapFile,parseLocation,validateMapSelection,MAP_RECORDS,type MapLayer,type MapPoint} from '../lib/eq-map';
import {zoneGuideURL} from '../lib/zone-navigation';
import MapFolderPicker from './MapFolderPicker';
import {mapLocationName,matchMapLocation,type MapContents} from '../lib/map-library';
import ExpandedMap from './ExpandedMap';
import {clampMapPitch,clampMapZoom,defaultMap3dCamera,projectMap3d,wireframeMapColors,zoomMapAt} from '../lib/map-view';
import '../app/map-library.css';

export default function MapLibrary({zone,active,requestKey=0}:{zone:string;active:boolean;requestKey?:number}) {
  const [layers,setLayers]=useState<MapLayer[]>([]),[provider,setProvider]=useState('brewall'),[loadedProvider,setLoadedProvider]=useState('');
  const [visible,setVisible]=useState<number[]>([0,1,2,3]),[query,setQuery]=useState(''),[showLabels,setShowLabels]=useState(true),[wireframe,setWireframe]=useState(false),[threeD,setThreeD]=useState(false);
  const [floor,setFloor]=useState(''),[band,setBand]=useState('30'),[location,setLocation]=useState(''),[pin,setPin]=useState<MapPoint|null>(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[zoom,setZoom]=useState(1),[center,setCenter]=useState({x:0,y:0}),[yaw,setYaw]=useState<number>(defaultMap3dCamera.yaw),[pitch,setPitch]=useState<number>(defaultMap3dCamera.pitch),[floorLift,setFloorLift]=useState<number>(defaultMap3dCamera.floorLift),[zOffset,setZOffset]=useState(0);
  const [size,setSize]=useState({width:800,height:480}),[expanded,setExpanded]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),surface=useRef<HTMLDivElement>(null),inlineCanvas=useRef<HTMLCanvasElement>(null),fullCanvas=useRef<HTMLCanvasElement>(null),opener=useRef<HTMLElement|null>(null),expandSession=useRef(0);
  const canvas=expanded?fullCanvas:inlineCanvas;
  const picker=useRef<HTMLInputElement>(null),drag=useRef<{x:number;y:number;origin:{x:number;y:number};yaw:number;pitch:number;zOffset:number;mode:'turn'|'slide'|'height';moved:boolean}|null>(null),generation=useRef(0);
  const didDrag=useRef(false),screenOwned=useRef(false);
  const bounds=useMemo(()=>mapBounds(layers),[layers]);
  // At 100%, leave room around the drawing for the embedded controls.
  const drawingWidth=Math.max(100,size.width-(expanded?40:0));
  const drawingHeight=Math.max(100,size.height-(expanded?(size.height<550?180:260):0));
  const scale=Math.min(drawingWidth/bounds.spanX,drawingHeight/bounds.spanY)*zoom;
  const z= floor.trim()===''?null:Number(floor),thickness=Number(band);
  const validFloor=z===null||Number.isFinite(z)&&Math.abs(z)<=1e7&&Number.isFinite(thickness)&&thickness>0;
  const selected=useMemo(()=>layers.filter(l=>visible.includes(l.layer)),[layers,visible]);
  const labels=useMemo(()=>selected.flatMap(l=>l.labels).filter(p=>(z===null||!validFloor||Math.abs(p.z-z)<=thickness)&&p.text.toLowerCase().includes(query.trim().toLowerCase())),[selected,z,validFloor,thickness,query]);
  const verticalBounds=useMemo(()=>{let min=Infinity,max=-Infinity;const add=(value:number)=>{min=Math.min(min,value);max=Math.max(max,value);};for(const layer of selected){for(const line of layer.lines){add(line.a.z);add(line.b.z);}for(const label of layer.labels)add(label.z);}return Number.isFinite(min)?{z:(min+max)/2,span:Math.max(10,max-min)*1.1}:{z:0,span:10};},[selected]);
  const threeDSpan=Math.max(bounds.spanX,bounds.spanY,verticalBounds.span);
  const credit=sources.sources.find(s=>s.id===loadedProvider);
  const view=useRef({zoom,center,scale});view.current={zoom,center,scale};
  function closeExpanded(){
    expandSession.current++;screenOwned.current=false;setExpanded(false);drag.current=null;
    if(dialog.current?.open)dialog.current.close();
    const target=opener.current,restore=()=>{if(!dialog.current?.open&&target?.isConnected)target.focus({preventScroll:true});};
    if(surface.current&&document.fullscreenElement===surface.current)void document.exitFullscreen().catch(()=>{}).then(restore);
    else restore();
  }
  function openExpanded(){
    if(!active||!layers.length||dialog.current?.open)return;
    opener.current=document.activeElement instanceof HTMLElement?document.activeElement:inlineCanvas.current;
    dialog.current?.showModal();setExpanded(true);drag.current=null;const ticket=++expandSession.current,element=surface.current;
    if(!document.fullscreenElement&&element?.requestFullscreen){screenOwned.current=true;void element.requestFullscreen().then(()=>{
      if(ticket!==expandSession.current&&document.fullscreenElement===element)void document.exitFullscreen().catch(()=>{});
      else if(ticket===expandSession.current&&dialog.current?.open)element.querySelector<HTMLButtonElement>('.map-expanded-close')?.focus({preventScroll:true});
    }).catch(()=>{if(ticket===expandSession.current)screenOwned.current=false;/* The dialog still fills the app window if full screen is unavailable. */});}
  }
  useEffect(()=>{if(!active&&expanded)closeExpanded();},[active,expanded]);
  useEffect(()=>{const modal=dialog.current,element=surface.current;return()=>{expandSession.current++;modal?.close();if(element&&document.fullscreenElement===element)void document.exitFullscreen().catch(()=>{});};},[]);
  useEffect(()=>{
    if(!active||!canvas.current)return;const el=canvas.current;
    const wheel=(event:WheelEvent)=>{if(event.ctrlKey||event.metaKey||!event.deltaY)return;event.preventDefault();const factor=Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.004);if(threeD){setZoom(value=>clampMapZoom(value*factor));return;}const box=el.getBoundingClientRect(),next=zoomMapAt(view.current,factor,{x:event.clientX-box.left-box.width/2,y:event.clientY-box.top-box.height/2});view.current={...next,scale:view.current.scale*next.zoom/view.current.zoom};setZoom(next.zoom);setCenter(next.center);};
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  },[active,expanded,layers.length,threeD]);
  useEffect(()=>{
    if(!active||!canvas.current)return;const el=canvas.current;
    const measure=()=>setSize({width:el.clientWidth,height:el.clientHeight});
    const observer=new ResizeObserver(measure);observer.observe(el);measure();
    // Measure again after dialog cleanup restores page scrollbars.
    const settled=setTimeout(measure,0);window.addEventListener('resize',measure);
    return()=>{clearTimeout(settled);observer.disconnect();window.removeEventListener('resize',measure);};
  },[active,expanded,layers.length]);
  useEffect(()=>{
    if(!active||!canvas.current||!size.width)return;
    const el=canvas.current,dpr=Math.min(2,window.devicePixelRatio||1);el.width=Math.round(size.width*dpr);el.height=Math.round(size.height*dpr);
    const ctx=el.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);ctx.fillStyle=wireframe?wireframeMapColors.background:'#f2e4c5';ctx.fillRect(0,0,size.width,size.height);
    if(threeD){
      const span=threeDSpan,origin={x:center.x,y:center.y,z:verticalBounds.z+zOffset},camera={yaw,pitch,floorLift,zoom};
      const project=(p:{x:number;y:number;z:number})=>projectMap3d(p,origin,span,size,camera),segments:{a:ReturnType<typeof project>;b:ReturnType<typeof project>;layer:number}[]=[];
      for(const layer of selected)for(const line of layer.lines){if(validFloor&&z!==null&&(Math.max(line.a.z,line.b.z)<z-thickness||Math.min(line.a.z,line.b.z)>z+thickness))continue;segments.push({a:project(line.a),b:project(line.b),layer:layer.layer});}
      segments.sort((a,b)=>b.a.depth+b.b.depth-a.a.depth-a.b.depth);ctx.lineWidth=1.35;
      for(const line of segments){ctx.strokeStyle=line.layer===0?wireframeMapColors.baseLine:wireframeMapColors.overlayLine;ctx.beginPath();ctx.moveTo(line.a.x,line.a.y);ctx.lineTo(line.b.x,line.b.y);ctx.stroke();}
      for(const label of labels){const point=project(label);if(point.x<0||point.y<0||point.x>size.width||point.y>size.height)continue;ctx.fillStyle=wireframeMapColors.landmark;ctx.beginPath();ctx.arc(point.x,point.y,3,0,Math.PI*2);ctx.fill();if(showLabels){ctx.font=(9+label.size*2)+'px system-ui';ctx.lineWidth=3;ctx.strokeStyle=wireframeMapColors.labelOutline;ctx.strokeText(label.text,point.x+7,point.y-5);ctx.fillStyle=wireframeMapColors.label;ctx.fillText(label.text,point.x+7,point.y-5);}}
      if(pin){const point=project(pin);ctx.strokeStyle='#ff8aa5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x,point.y,9,0,Math.PI*2);ctx.moveTo(point.x-14,point.y);ctx.lineTo(point.x+14,point.y);ctx.moveTo(point.x,point.y-14);ctx.lineTo(point.x,point.y+14);ctx.stroke();}
      return;
    }
    const xy=(p:{x:number;y:number})=>({x:(p.x-center.x)*scale+size.width/2,y:(p.y-center.y)*scale+size.height/2});
    ctx.lineWidth=wireframe?1.35:1;
    for(const layer of selected)for(const line of layer.lines){if(validFloor&&z!==null&&(Math.max(line.a.z,line.b.z)<z-thickness||Math.min(line.a.z,line.b.z)>z+thickness))continue;const a=xy(line.a),b=xy(line.b);ctx.strokeStyle=wireframe?(layer.layer===0?wireframeMapColors.baseLine:wireframeMapColors.overlayLine):line.color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(const p of labels){const pt=xy(p);if(pt.x<0||pt.y<0||pt.x>size.width||pt.y>size.height)continue;ctx.fillStyle=wireframe?wireframeMapColors.landmark:p.color;ctx.beginPath();ctx.arc(pt.x,pt.y,3,0,Math.PI*2);ctx.fill();if(showLabels){ctx.font=(9+p.size*2)+'px system-ui';ctx.lineWidth=3;ctx.strokeStyle=wireframe?wireframeMapColors.labelOutline:'#fff6df';ctx.strokeText(p.text,pt.x+7,pt.y-5);ctx.fillStyle=wireframe?wireframeMapColors.label:p.color;ctx.fillText(p.text,pt.x+7,pt.y-5);}}
    if(pin){const p=xy(pin);ctx.strokeStyle='#8e254a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.moveTo(p.x-14,p.y);ctx.lineTo(p.x+14,p.y);ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x,p.y+14);ctx.stroke();}
  },[active,expanded,size,center,scale,selected,labels,showLabels,wireframe,threeD,yaw,pitch,floorLift,zOffset,bounds,verticalBounds,threeDSpan,zoom,z,validFloor,thickness,pin]);
  function reset3d(){setYaw(defaultMap3dCamera.yaw);setPitch(defaultMap3dCamera.pitch);setFloorLift(defaultMap3dCamera.floorLift);setZOffset(0);}
  function reset(){setCenter({x:bounds.x,y:bounds.y});setZoom(1);if(threeD)reset3d();}
  function applyFiles(contents:MapContents){
    validateMapSelection(contents.files.map(f=>({name:f.name,size:new TextEncoder().encode(f.text).length})));
    const next=contents.files.map(f=>parseMapFile(f.name,f.text));
    const count=next.reduce((n,l)=>n+l.lines.length+l.labels.length,0);
    if(!count)throw Error('No map lines or labels were found. Choose EQ map files, not a combat log.');
    if(count>MAP_RECORDS)throw Error('This selection has more than 50,000 records. Load fewer layers.');
    generation.current++;next.sort((a,b)=>a.layer-b.layer);setLayers(next);setLoadedProvider(contents.provider);setVisible([0,1,2,3]);setQuery('');setFloor('');setPin(null);setLocation('');setZoom(1);setCenter(mapBounds(next));
    const skipped=next.reduce((n,l)=>n+l.skipped,0);
    setMessage(`Loaded ${next.length} map file${next.length===1?'':'s'} together. ${skipped?skipped+' unreadable rows were skipped.':'Files stay on this device.'}`);
  }
  async function load(files:File[]) {
    const ticket=++generation.current;setBusy(true);setMessage('');
    try{validateMapSelection(files);const texts=await Promise.all(files.map(async f=>({name:f.name,text:await f.text()})));if(ticket!==generation.current)return;applyFiles({id:'manual',stem:'',provider,files:texts});setBusy(false);}
    catch(error){if(ticket===generation.current)setMessage(error instanceof Error?error.message:'The map could not be read.');}
    finally{if(ticket===generation.current)setBusy(false);}
  }
  function mark(){const p=parseLocation(location);if(!p){setMessage('Enter three numbers from /loc: north, west, height. Example: 100, -200, 10');return;}setPin(p);setCenter(p);setMessage('Your typed location is marked. It stays here until you enter another location.');}
  const pan=(dx:number,dy:number)=>setCenter(c=>({x:c.x+dx*100/scale,y:c.y+dy*100/scale}));

  function layerControls(){return (<fieldset className="map-layer-controls"><legend><Layers aria-hidden="true"/> Layers</legend>{layers.map(layer=><label key={layer.layer}><input type="checkbox" checked={visible.includes(layer.layer)} onChange={e=>setVisible(v=>e.target.checked?[...v,layer.layer]:v.filter(n=>n!==layer.layer))}/>{layer.layer===0?'Base':'Layer '+layer.layer}<small>{layer.lines.length} lines · {layer.labels.length} labels</small></label>)}</fieldset>);}
  function wireframeControl(){return <button className="map-wireframe-toggle" type="button" aria-pressed={wireframe} onClick={()=>{if(wireframe){setWireframe(false);setThreeD(false);}else setWireframe(true);}}>{wireframe?'Use full map colors':'Wireframe view'}</button>;}
  function threeDControl(){return <button className="map-wireframe-toggle map-3d-toggle" type="button" aria-pressed={threeD} onClick={()=>{if(!threeD)setWireframe(true);setThreeD(value=>!value);}}>{threeD?'Use 2D wireframe':'3D wireframe view'}</button>;}
  function threeDTools(){return threeD?<div className="map-3d-controls"><p><strong>3D controls:</strong> Drag to yaw and pitch. Hold <kbd>Shift</kbd> while dragging to slide across X/Y. Hold <kbd>Alt</kbd> while dragging up or down to move through Z height. Scroll to zoom.</p><label>Floor lift <input type="range" min=".5" max="4" step=".1" value={floorLift} onChange={event=>setFloorLift(Number(event.target.value))}/><output>{floorLift.toFixed(1)}×</output></label><output className="map-z-position">Z move {Math.round(zOffset)}</output><button type="button" onClick={reset3d}>Reset 3D view</button></div>:null;}
  function mapFilters(){return <><div className="map-filter-grid"><label><span className="map-field-label"><Search aria-hidden="true"/> Find a landmark</span><input value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} placeholder="Merchant, zone exit, named…"/></label><label><span className="map-field-label">Height (Z), optional</span><input type="number" value={floor} onChange={e=>setFloor(e.target.value)} placeholder="All heights"/></label><label><span className="map-field-label">Height range ±</span><input type="number" min="1" max="100000" value={band} onChange={e=>setBand(e.target.value)}/></label></div>
      {!validFloor&&<p role="status">Enter a valid height and a range above zero. Showing all heights for now.</p>}</>;}
  function landmarkList(){return (<details className="map-landmarks" open={Boolean(query)}><summary>{labels.length} matching landmarks · choose one to center the map</summary><ul>{labels.slice(0,100).map((label,i)=><li key={i}><button onClick={()=>{setCenter(label);setPin(label);setZoom(v=>Math.max(3,v));}}>{label.text}<small>Map X {label.x.toFixed(1)} · Y {label.y.toFixed(1)} · Height {label.z.toFixed(1)}</small></button></li>)}</ul>{labels.length>100&&<p>Showing the first 100. Search above to narrow the list.</p>}{!labels.length&&<p>No labels match your search, layers and height.</p>}</details>);}
  function mapCanvas(ref:RefObject<HTMLCanvasElement|null>,full=false){const viewName=threeD?'3D wireframe map':wireframe?'Wireframe map':'Map',threeDHelp='Drag to yaw and pitch. Shift-drag slides X/Y. Alt-drag vertically moves through Z height.';return <canvas ref={ref} className={wireframe?'map-wireframe-canvas':undefined} tabIndex={0} aria-haspopup={full?undefined:'dialog'} aria-label={full?`${viewName} expanded. ${threeD?threeDHelp:'Drag to move.'} Scroll or use plus and minus to zoom. F resets the view.`:`${viewName}. Click or press Enter to expand. ${threeD?threeDHelp:'Drag to pan or use arrow keys.'}`}
    onPointerDown={e=>{if(e.button!==0||!e.isPrimary)return;e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);didDrag.current=false;drag.current={x:e.clientX,y:e.clientY,origin:center,yaw,pitch,zOffset,mode:e.altKey?'height':e.shiftKey?'slide':'turn',moved:false};}}
    onPointerMove={e=>{const start=drag.current;if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>5)start.moved=true;if(start.moved){didDrag.current=true;if(threeD){if(start.mode==='turn'){setYaw(start.yaw+dx*.012);setPitch(clampMapPitch(start.pitch-dy*.012));}else if(start.mode==='slide'){const pixels=Math.max(1,Math.min(size.width,size.height)*.42*zoom);setCenter({x:start.origin.x-dx/pixels*threeDSpan,y:start.origin.y+dy/pixels*threeDSpan});}else{const pixels=Math.max(1,Math.min(size.width,size.height)*.42*zoom);setZOffset(start.zOffset+dy/pixels*threeDSpan);}}else setCenter({x:start.origin.x-dx/scale,y:start.origin.y-dy/scale});}}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{didDrag.current=true;drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onClick={()=>{if(!full&&!didDrag.current)openExpanded();}}
    onKeyDown={e=>{const d:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(d[e.key]){e.preventDefault();if(threeD){if(e.altKey&&d[e.key][1])setZOffset(value=>value-d[e.key][1]*threeDSpan*.05);else if(e.shiftKey)setCenter(value=>({x:value.x+d[e.key][0]*threeDSpan*.05,y:value.y-d[e.key][1]*threeDSpan*.05}));else if(d[e.key][0])setYaw(value=>value+d[e.key][0]*.12);else setPitch(value=>clampMapPitch(value-d[e.key][1]*.12));}else pan(...d[e.key]);}else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(v=>clampMapZoom(v*1.4));}else if(e.key==='-'){e.preventDefault();setZoom(v=>clampMapZoom(v/1.4));}else if(e.key.toLowerCase()==='f'){e.preventDefault();reset();}else if(!full&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openExpanded();}}}/>;}
  return <section className="map-library" aria-label="Maps and routes">
    <header className="map-heading"><Map aria-hidden="true"/><div><h2>Maps &amp; Routes</h2><p>Choose a location. Its map and layers open together.</p></div></header>
    <MapFolderPicker zone={zone} active={active} requestKey={requestKey} loadedStem={layers[0]?.stem||''} busy={busy} onBusy={setBusy} onLoad={applyFiles}/>
    <p role="status" className="map-message">{message}</p>
    <p><strong>Planning zone:</strong> {zone||'Choose a current zone in Build Advisor.'} {zone&&<a href={zoneGuideURL(zone)} target="_blank" rel="noopener noreferrer">Open EQLSaK zone guide <ExternalLink aria-hidden="true"/></a>}</p>
    {layers.length>0?<>
      <div className="map-loaded"><strong>{mapLocationName(layers[0].stem)}</strong><span>{credit?.name||'Your chosen map'} · {layers[0].stem}</span><small>EverQuest community map · EQL layout not verified. {credit?'By '+credit.creator+'.':'Check the creator’s terms before sharing.'}</small></div>
      {zone&&!matchMapLocation([{id:'loaded',stem:layers[0].stem,fileCount:layers.length}],zone)&&<p className="map-reference-note">The map shown is <strong>{mapLocationName(layers[0].stem)}</strong>. Your planning zone is {zone}. Choose another location above if needed.</p>}
      {layerControls()}
      {mapFilters()}
      <div className="map-tools"><button onClick={()=>setZoom(v=>Math.min(32,v*1.4))} disabled={zoom>=32}><ZoomIn/> Zoom in</button><button onClick={()=>setZoom(v=>Math.max(.25,v/1.4))} disabled={zoom<=.25}><ZoomOut/> Zoom out</button><button onClick={reset}><LocateFixed/> Fit map</button>{wireframeControl()}{threeDControl()}<label><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/> Show label text</label></div>
      {threeDTools()}
      <div className="map-view">{mapCanvas(inlineCanvas)}<span className="map-north">{threeD?'3D · Shift X/Y · Alt Z':'N ↑'}</span><button className="map-expand-button" onClick={openExpanded} aria-haspopup="dialog"><Maximize aria-hidden="true"/> Expand map</button><span className="map-expand-hint">Click map to expand · {threeD?'Drag turn · Shift X/Y · Alt Z':'Drag to move'}</span></div>
      <div className="map-pan"><span>{threeD?'Turn 3D view':'Move map view'}</span><button aria-label={threeD?'Turn 3D view left':'Move view west'} onClick={()=>threeD?setYaw(value=>value-.12):pan(-1,0)}><ArrowLeft/></button><button aria-label={threeD?'Tilt 3D view up':'Move view north'} onClick={()=>threeD?setPitch(value=>clampMapPitch(value+.12)):pan(0,-1)}><ArrowUp/></button><button aria-label={threeD?'Tilt 3D view down':'Move view south'} onClick={()=>threeD?setPitch(value=>clampMapPitch(value-.12)):pan(0,1)}><ArrowDown/></button><button aria-label={threeD?'Turn 3D view right':'Move view east'} onClick={()=>threeD?setYaw(value=>value+.12):pan(1,0)}><ArrowRight/></button><span>{Math.round(zoom*100)}% · Drag map to {threeD?'turn it':'move'}</span></div>
      <div className="map-location"><label>Mark a location from /loc<input value={location} maxLength={160} onChange={e=>setLocation(e.target.value)} placeholder="north, west, height"/></label><button onClick={mark}><MapPin/> Mark location</button>{pin&&<button onClick={()=>setPin(null)}>Clear location</button>}<small>This is a typed marker, not live player tracking.</small></div>
      {landmarkList()}
      {loadedProvider==='good'&&<details className="map-key"><summary>Good’s map label key</summary><dl>{sources.goodLabelKey.map(k=><div key={k.code}><dt>({k.code})</dt><dd>{k.meaning}</dd></div>)}</dl><p>Layer contents and colors depend on the map. See the creator’s guide for details.</p></details>}
      <button disabled={busy} className="map-clear" onClick={()=>{generation.current++;setLayers([]);setPin(null);setMessage('Map cleared from this view. Your original files are unchanged.');}}><Trash2/> Clear map from BA</button>
    </>:<div className="map-empty"><Map aria-hidden="true"/><h3>Your local map appears here</h3><p>Choose a dungeon or zone above to see its paths and landmarks.</p></div>}
    <ExpandedMap dialog={dialog} surface={surface} screenOwned={screenOwned} open={expanded} name={layers.length?mapLocationName(layers[0].stem):'Local map'} credit={credit?.name||'Your local map'} zoom={zoom} onClose={closeExpanded} onZoom={factor=>setZoom(v=>clampMapZoom(v*factor))} onPan={threeD?(x,y)=>{if(x)setYaw(value=>value+x*.12);if(y)setPitch(value=>clampMapPitch(value-y*.12));}:pan} onFit={reset} tools={<>{layerControls()}{wireframeControl()}{threeDControl()}{threeDTools()}<label className="map-expanded-labels"><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/> Show label text</label>{mapFilters()}{landmarkList()}</>}><div className="map-view map-expanded-canvas">{mapCanvas(fullCanvas,true)}</div></ExpandedMap>
    <details className="map-setup"><summary>Map downloads &amp; manual files</summary>
      <div className="map-source-grid">{sources.sources.map(source=><article key={source.id}><h3>{source.name}</h3><p>{source.summary}</p><small>By {source.creator}</small><a href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/> Downloads &amp; latest changes</a>{source.worldUrl&&<a href={source.worldUrl} target="_blank" rel="noopener noreferrer"><Map aria-hidden="true"/> World connections map</a>}</article>)}</div>
      <p className="map-reference-note"><strong>EverQuest community reference · EQL not verified</strong><br/>{sources.compatibility}</p>
      <ol><li>Need maps? Download a pack from its creator above. Unzip it into its own folder within the game’s Maps folder.</li><li>In the Windows app, open Folder options and choose Refresh map list. Choose your folder once if it is not found.</li><li>In the browser edition, choose the whole folder once per session. Then pick any zone from the list.</li><li>After replacing a map pack with a newer version, refresh the list to read the updated files.</li></ol>
      <p>BA reads local maps. It does not change game files or include a map pack. Known zone names use the <a href="https://docs.eqemu.dev/server/zones/zone-list/" target="_blank" rel="noopener noreferrer">EQEmu zone list</a>; other files appear by their file name.</p>
      <h3>Choose individual files instead</h3><p>This option is useful for custom maps. Select one zone’s base file and numbered layers together, such as <code>unrest.txt</code> and <code>unrest_1.txt</code>.</p>
      <div className="map-import-row"><label>Map maker<select value={provider} onChange={e=>setProvider(e.target.value)} disabled={busy}>{sources.sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}<option value="other">My own / another map</option></select></label><button disabled={busy} onClick={()=>picker.current?.click()}><FolderOpen aria-hidden="true"/>{busy?'Reading map…':'Choose zone map files'}</button><input ref={picker} type="file" accept=".txt" multiple hidden onChange={e=>{void load(Array.from(e.target.files||[]));e.target.value='';}}/></div>
    </details>
  </section>;
}
