import {useEffect,useMemo,useRef,useState} from 'react';
import {Map,ExternalLink,FolderOpen,Layers,ZoomIn,ZoomOut,LocateFixed,Trash2,MapPin,Search,ArrowUp,ArrowDown,ArrowLeft,ArrowRight} from 'lucide-react';
import sources from '../data/map-sources.json';
import {mapBounds,parseMapFile,parseLocation,validateMapSelection,MAP_RECORDS,type MapLayer,type MapPoint} from '../lib/eq-map';
import {zoneGuideURL} from '../lib/zone-navigation';
import MapFolderPicker from './MapFolderPicker';
import {mapLocationName,matchMapLocation,type MapContents} from '../lib/map-library';
import '../app/map-library.css';

export default function MapLibrary({zone,active,requestKey=0}:{zone:string;active:boolean;requestKey?:number}) {
  const [layers,setLayers]=useState<MapLayer[]>([]),[provider,setProvider]=useState('brewall'),[loadedProvider,setLoadedProvider]=useState('');
  const [visible,setVisible]=useState<number[]>([0,1,2,3]),[query,setQuery]=useState(''),[showLabels,setShowLabels]=useState(true);
  const [floor,setFloor]=useState(''),[band,setBand]=useState('30'),[location,setLocation]=useState(''),[pin,setPin]=useState<MapPoint|null>(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[zoom,setZoom]=useState(1),[center,setCenter]=useState({x:0,y:0});
  const [size,setSize]=useState({width:800,height:480});
  const canvas=useRef<HTMLCanvasElement>(null),picker=useRef<HTMLInputElement>(null),drag=useRef<{x:number;y:number;origin:{x:number;y:number}}|null>(null),generation=useRef(0);
  const bounds=useMemo(()=>mapBounds(layers),[layers]);
  const scale=Math.min(size.width/bounds.spanX,size.height/bounds.spanY)*zoom;
  const z= floor.trim()===''?null:Number(floor),thickness=Number(band);
  const validFloor=z===null||Number.isFinite(z)&&Math.abs(z)<=1e7&&Number.isFinite(thickness)&&thickness>0;
  const selected=useMemo(()=>layers.filter(l=>visible.includes(l.layer)),[layers,visible]);
  const labels=useMemo(()=>selected.flatMap(l=>l.labels).filter(p=>(z===null||!validFloor||Math.abs(p.z-z)<=thickness)&&p.text.toLowerCase().includes(query.trim().toLowerCase())),[selected,z,validFloor,thickness,query]);
  const credit=sources.sources.find(s=>s.id===loadedProvider);
  useEffect(()=>{if(!active||!canvas.current)return;const el=canvas.current;const measure=()=>setSize({width:el.clientWidth,height:el.clientHeight});const observer=new ResizeObserver(measure);observer.observe(el);measure();window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};},[active,layers.length]);
  useEffect(()=>{
    if(!active||!canvas.current||!size.width)return;
    const el=canvas.current,dpr=Math.min(2,window.devicePixelRatio||1);el.width=Math.round(size.width*dpr);el.height=Math.round(size.height*dpr);
    const ctx=el.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);ctx.fillStyle='#f2e4c5';ctx.fillRect(0,0,size.width,size.height);
    const xy=(p:{x:number;y:number})=>({x:(p.x-center.x)*scale+size.width/2,y:(p.y-center.y)*scale+size.height/2});
    ctx.lineWidth=1;
    for(const layer of selected)for(const line of layer.lines){if(validFloor&&z!==null&&(Math.max(line.a.z,line.b.z)<z-thickness||Math.min(line.a.z,line.b.z)>z+thickness))continue;const a=xy(line.a),b=xy(line.b);ctx.strokeStyle=line.color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(const p of labels){const pt=xy(p);if(pt.x<0||pt.y<0||pt.x>size.width||pt.y>size.height)continue;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(pt.x,pt.y,3,0,Math.PI*2);ctx.fill();if(showLabels){ctx.font=(9+p.size*2)+'px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#fff6df';ctx.strokeText(p.text,pt.x+7,pt.y-5);ctx.fillText(p.text,pt.x+7,pt.y-5);}}
    if(pin){const p=xy(pin);ctx.strokeStyle='#8e254a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.moveTo(p.x-14,p.y);ctx.lineTo(p.x+14,p.y);ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x,p.y+14);ctx.stroke();}
  },[active,size,center,scale,selected,labels,showLabels,z,validFloor,thickness,pin]);
  function reset(){setCenter({x:bounds.x,y:bounds.y});setZoom(1);}
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
  return <section className="map-library" aria-label="Maps and routes">
    <header className="map-heading"><Map aria-hidden="true"/><div><h2>Maps &amp; Routes</h2><p>Choose a location. Its map and layers open together.</p></div></header>
    <MapFolderPicker zone={zone} active={active} requestKey={requestKey} loadedStem={layers[0]?.stem||''} busy={busy} onBusy={setBusy} onLoad={applyFiles}/>
    <p role="status" className="map-message">{message}</p>
    <p><strong>Planning zone:</strong> {zone||'Choose a current zone in Build Advisor.'} {zone&&<a href={zoneGuideURL(zone)} target="_blank" rel="noopener noreferrer">Open EQLSaK zone guide <ExternalLink aria-hidden="true"/></a>}</p>
    {layers.length>0?<>
      <div className="map-loaded"><strong>{mapLocationName(layers[0].stem)}</strong><span>{credit?.name||'Your chosen map'} · {layers[0].stem}</span><small>EverQuest community map · EQL layout not verified. {credit?'By '+credit.creator+'.':'Check the creator’s terms before sharing.'}</small></div>
      {zone&&!matchMapLocation([{id:'loaded',stem:layers[0].stem,fileCount:layers.length}],zone)&&<p className="map-reference-note">The map shown is <strong>{mapLocationName(layers[0].stem)}</strong>. Your planning zone is {zone}. Choose another location above if needed.</p>}
      <fieldset className="map-layer-controls"><legend><Layers aria-hidden="true"/> Layers</legend>{layers.map(layer=><label key={layer.layer}><input type="checkbox" checked={visible.includes(layer.layer)} onChange={e=>setVisible(v=>e.target.checked?[...v,layer.layer]:v.filter(n=>n!==layer.layer))}/>{layer.layer===0?'Base':'Layer '+layer.layer}<small>{layer.lines.length} lines · {layer.labels.length} labels</small></label>)}</fieldset>
      <div className="map-filter-grid"><label><Search aria-hidden="true"/> Find a landmark<input value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} placeholder="Merchant, zone exit, named…"/></label><label>Height (Z), optional<input type="number" value={floor} onChange={e=>setFloor(e.target.value)} placeholder="All heights"/></label><label>Height range ±<input type="number" min="1" max="100000" value={band} onChange={e=>setBand(e.target.value)}/></label></div>
      {!validFloor&&<p role="status">Enter a valid height and a range above zero. Showing all heights for now.</p>}
      <div className="map-tools"><button onClick={()=>setZoom(v=>Math.min(32,v*1.4))} disabled={zoom>=32}><ZoomIn/> Zoom in</button><button onClick={()=>setZoom(v=>Math.max(.25,v/1.4))} disabled={zoom<=.25}><ZoomOut/> Zoom out</button><button onClick={reset}><LocateFixed/> Fit map</button><label><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/> Show label text</label></div>
      <div className="map-view"><canvas ref={canvas} tabIndex={0} aria-label="Local map. Drag to pan or use arrow keys. Use the landmark list below for map labels." onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,origin:center};}} onPointerMove={e=>{if(drag.current)setCenter({x:drag.current.origin.x-(e.clientX-drag.current.x)/scale,y:drag.current.origin.y-(e.clientY-drag.current.y)/scale});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{const d:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(d[e.key]){e.preventDefault();pan(...d[e.key]);}}}/><span className="map-north">N ↑</span></div>
      <div className="map-pan"><span>Move map view</span><button aria-label="Move view west" onClick={()=>pan(-1,0)}><ArrowLeft/></button><button aria-label="Move view north" onClick={()=>pan(0,-1)}><ArrowUp/></button><button aria-label="Move view south" onClick={()=>pan(0,1)}><ArrowDown/></button><button aria-label="Move view east" onClick={()=>pan(1,0)}><ArrowRight/></button><span>{Math.round(zoom*100)}% · Drag map to move</span></div>
      <div className="map-location"><label>Mark a location from /loc<input value={location} maxLength={160} onChange={e=>setLocation(e.target.value)} placeholder="north, west, height"/></label><button onClick={mark}><MapPin/> Mark location</button>{pin&&<button onClick={()=>setPin(null)}>Clear location</button>}<small>This is a typed marker, not live player tracking.</small></div>
      <details className="map-landmarks" open={Boolean(query)}><summary>{labels.length} matching landmarks · choose one to center the map</summary><ul>{labels.slice(0,100).map((label,i)=><li key={i}><button onClick={()=>{setCenter(label);setPin(label);setZoom(v=>Math.max(3,v));}}>{label.text}<small>Map X {label.x.toFixed(1)} · Y {label.y.toFixed(1)} · Height {label.z.toFixed(1)}</small></button></li>)}</ul>{labels.length>100&&<p>Showing the first 100. Search above to narrow the list.</p>}{!labels.length&&<p>No labels match your search, layers and height.</p>}</details>
      {loadedProvider==='good'&&<details className="map-key"><summary>Good’s map label key</summary><dl>{sources.goodLabelKey.map(k=><div key={k.code}><dt>({k.code})</dt><dd>{k.meaning}</dd></div>)}</dl><p>Layer contents and colors depend on the map. See the creator’s guide for details.</p></details>}
      <button disabled={busy} className="map-clear" onClick={()=>{generation.current++;setLayers([]);setPin(null);setMessage('Map cleared from this view. Your original files are unchanged.');}}><Trash2/> Clear map from BA</button>
    </>:<div className="map-empty"><Map aria-hidden="true"/><h3>Your local map appears here</h3><p>Choose a dungeon or zone above to see its paths and landmarks.</p></div>}
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
