import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Combobox} from '@base-ui/react/combobox';
import {ChevronDown,FolderOpen,MapPin,RefreshCw} from 'lucide-react';
import {browserMapIndex,emptyMapIndex,mapLocationName,mapLocationMatches,matchMapLocation,type MapIndex,type MapFolder,type MapLocation,type MapContents} from '../lib/map-library';
import {validateMapSelection} from '../lib/eq-map';
import '../app/advisor-zones.css';

const lastKey='eqlsak-last-map-v1';
export default function MapFolderPicker({zone,active,requestKey=0,loadedStem,onLoad,onBusy,busy}:{zone:string;active:boolean;requestKey?:number;loadedStem:string;onLoad:(contents:MapContents)=>void;onBusy:(busy:boolean)=>void;busy:boolean}){
 const [index,setIndex]=useState<MapIndex>(emptyMapIndex),[folderId,setFolderId]=useState(''),[chosen,setChosen]=useState<MapLocation|null>(null),[searching,setSearching]=useState(false),[note,setNote]=useState(''),[native,setNative]=useState(false);
 const id=useId(),directory=useRef<HTMLInputElement>(null),browserFiles=useRef(new Map<string,File[]>()),started=useRef(false),request=useRef(0),scan=useRef(0),lastContext=useRef(''),lastStem=useRef('');
 const current=useRef({zone,onLoad,onBusy});current.current={zone,onLoad,onBusy};
 const lastRequest=useRef(0);
 const folder=index.folders.find(f=>f.id===folderId);
 const rows=useMemo(()=>[...(folder?.zones||[])].sort((a,b)=>mapLocationName(a.stem).localeCompare(mapLocationName(b.stem))||a.stem.localeCompare(b.stem)),[folder]);
 async function open(row:MapLocation,pack:MapFolder){
  const ticket=++request.current;current.current.onBusy(true);setNote('Opening '+mapLocationName(row.stem)+'…');
  try{
   let contents:MapContents;
   if(window.eqlMaps)contents=await window.eqlMaps.read(row.id);
   else {const files=browserFiles.current.get(row.id);if(!files)throw Error('Choose your map folder again.');validateMapSelection(files);contents={id:row.id,stem:row.stem,provider:pack.provider,files:await Promise.all(files.map(async f=>({name:f.name,text:await f.text()})))};}
   if(ticket!==request.current)return;
   current.current.onLoad(contents);setChosen(row);lastStem.current=row.stem;setNote('');
   try{if(window.eqlMaps)await window.eqlMaps.remember(row.id);else localStorage.setItem(lastKey,row.stem);}catch{if(ticket===request.current)setNote('Map opened. Your last choice could not be saved.');}
  }catch(error){if(ticket===request.current)setNote(error instanceof Error?error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/,''):'This map could not be opened. Try refreshing the list.');}
  finally{if(ticket===request.current)current.current.onBusy(false);}
 }
 function adopt(next:MapIndex){
  setIndex(next);setFolderId(next.selectedFolderId);setChosen(null);lastContext.current=current.current.zone;lastRequest.current=requestKey;
  const pack=next.folders.find(f=>f.id===next.selectedFolderId);if(!pack)return;
  const requested=matchMapLocation(pack.zones,current.current.zone),saved=pack.zones.find(z=>z.stem===(lastStem.current||next.lastStem));
  const nextRow=requestKey>0&&!lastStem.current?(requested||saved):(saved||requested);
  if(nextRow)void open(nextRow,pack);
 }
 async function find(choose=false){
  const bridge=window.eqlMaps;if(!bridge){directory.current?.click();return;}
  const ticket=++scan.current;setSearching(true);setNote('');
  try{const result=await(choose?bridge.chooseFolder():bridge.find());if(result&&ticket===scan.current)adopt(result);}
  catch(error){if(ticket===scan.current)setNote(error instanceof Error?error.message:'The map folder could not be checked.');}
  finally{if(ticket===scan.current)setSearching(false);}
 }
 useEffect(()=>{
  if(!active)return;
  if(!started.current){started.current=true;setNative(Boolean(window.eqlMaps));if(window.eqlMaps)void find();else try{lastStem.current=localStorage.getItem(lastKey)||'';}catch{};}
  else if(folder&&(zone!==lastContext.current||requestKey!==lastRequest.current)){lastContext.current=zone;lastRequest.current=requestKey;const row=matchMapLocation(folder.zones,zone);if(row&&row.id!==chosen?.id)void open(row,folder);else if(!row&&zone.trim())setNote('No exact map match for '+zone+'. Choose a location below.');}
 // Folder scans and explicit selections handle their own changes. This effect follows only page/zone navigation.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,zone,requestKey]);
 useEffect(()=>()=>{request.current++;scan.current++;},[]);
 useEffect(()=>{setChosen(row=>row?.stem===loadedStem?row:null);},[loadedStem]);
 function changeFolder(nextId:string){const pack=index.folders.find(f=>f.id===nextId);if(!pack)return;setFolderId(nextId);setChosen(null);const next=pack.zones.find(z=>z.stem===lastStem.current)||matchMapLocation(pack.zones,zone);if(next)void open(next,pack);}
 function importFolder(files:File[]){if(!files.length)return;const next=browserMapIndex(files);browserFiles.current=next.files;setNote(next.index.folders.length?'':'No EQ map files were found in that folder. Choose your Brewall or other map folder.');adopt(next.index);}
 return <div className="map-quick-pick" aria-label="Choose a local map">
  <div className="map-quick-heading"><h3><MapPin aria-hidden="true"/> Choose a location</h3><span>{searching?'Finding your maps…':folder?`${folder.zones.length} locations ready`:'Local map library'}</span></div>
  {index.folders.length>1&&<label className="map-folder-select">Map folder<select value={folderId} disabled={busy||searching} onChange={e=>changeFolder(e.target.value)}>{index.folders.map(f=><option key={f.id} value={f.id}>{f.name} · {f.path}</option>)}</select></label>}
  {folder?<>
   <label htmlFor={id}>Dungeon or zone</label>
   <Combobox.Root items={rows} value={chosen} onValueChange={row=>{if(row)void open(row,folder);}} itemToStringLabel={row=>mapLocationName(row.stem)} itemToStringValue={row=>row.id} isItemEqualToValue={(a,b)=>a.id===b.id} filter={mapLocationMatches} disabled={busy||searching} autoHighlight>
    <Combobox.InputGroup className="ba-zone-input-group"><Combobox.Input id={id} placeholder="Search a name — Unrest, Cauldron, Lower Guk…" aria-describedby={id+'-help'}/><Combobox.Trigger aria-label="Browse installed map locations"><ChevronDown aria-hidden="true"/></Combobox.Trigger></Combobox.InputGroup>
    <Combobox.Portal><Combobox.Positioner className="ba-zone-positioner" sideOffset={6}><Combobox.Popup className="ba-zone-popup"><Combobox.Empty className="ba-zone-empty">No matching map file in this folder.</Combobox.Empty><Combobox.List className="ba-zone-list">{(row:MapLocation)=><Combobox.Item key={row.id} value={row} className="ba-zone-option"><MapPin size={17} aria-hidden="true"/><span>{mapLocationName(row.stem)}<small>{row.stem} · {row.fileCount} map {row.fileCount===1?'file':'files'}</small></span></Combobox.Item>}</Combobox.List></Combobox.Popup></Combobox.Positioner></Combobox.Portal>
   </Combobox.Root>
   <p id={id+'-help'} className="map-pick-help">Choose a name to open its map and layers together. {native?'Your folder and last map are remembered.':'This folder stays ready for this browser session.'}</p>
   <details className="map-folder-details"><summary>{folder.name} · Folder options</summary><p className="map-folder-path">{folder.path}</p><div className="map-folder-actions"><button disabled={busy||searching} onClick={()=>void find()}><RefreshCw aria-hidden="true"/>{native?'Refresh map list':'Reload map folder'}</button><button disabled={busy||searching} onClick={()=>void find(true)}><FolderOpen aria-hidden="true"/> Change map folder</button></div><p>New maps or updated files? Refresh the list. BA reads your files and leaves them unchanged.</p></details>
  </>:!searching&&<><p>{native?'No installed maps found. Choose your Brewall or other map folder once; BA will remember it.':'Choose your map folder once for this browser session. The Windows app can find and remember it automatically.'}</p><button disabled={busy} onClick={()=>void find(true)}><FolderOpen aria-hidden="true"/> Choose map folder</button></>}
  <input ref={directory} type="file" hidden multiple accept=".txt" {...{webkitdirectory:''}} onChange={e=>{importFolder(Array.from(e.target.files||[]));e.target.value='';}}/>
  {(note||index.warnings.length>0||index.truncated)&&<p role="status" className="map-picker-status">{note||index.warnings.join(' ')||'This folder is very large. Choose a smaller map pack to list more files.'}</p>}
 </div>;
}
