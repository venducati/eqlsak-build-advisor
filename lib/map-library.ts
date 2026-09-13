import names from '../data/map-zone-names.json' with {type:'json'};
import {mapFileName} from './eq-map.ts';
import {findZone,normalizeZone,zoneCatalog} from './zone-catalog.ts';
export type MapLocation={id:string;stem:string;fileCount:number};
export type MapFolder={id:string;name:string;path:string;provider:string;zones:MapLocation[]};
export type MapIndex={folders:MapFolder[];selectedFolderId:string;lastStem:string;warnings:string[];truncated:boolean};
export type MapContents={id:string;stem:string;provider:string;files:{name:string;text:string}[]};
export const emptyMapIndex:MapIndex={folders:[],selectedFolderId:'',lastStem:'',warnings:[],truncated:false};
const lookup=names.zones as Record<string,{name:string;id:number}>,aliases=names.aliases as Record<string,string[]>;
const normalized=(value:string)=>normalizeZone(value.replace(/^the\s+/i,''));
export function mapLocationName(stem:string){return lookup[stem]?.name||zoneCatalog.find(z=>normalizeZone(z.id)===normalizeZone(stem))?.name||stem;}
export function mapLocationMatches(row:MapLocation,query:string){const term=normalized(query);return [row.stem,mapLocationName(row.stem),...(aliases[row.stem]||[])].some(s=>normalized(s).includes(term));}
export function matchMapLocation(rows:MapLocation[],zone:string){
 if(!zone.trim())return null;
 const known=findZone(zone),keys=[zone,...(known?[known.name,...known.aliases]:[])].map(normalized);
 const exact=rows.filter(row=>[row.stem,mapLocationName(row.stem),...(aliases[row.stem]||[])].some(s=>keys.includes(normalized(s))));
 return exact.length===1?exact[0]:null;
}
/** Browser directory input: keep File handles, read only the selected zone on demand. */
export function browserMapIndex(files:File[]){
 const folders=new Map<string,MapFolder>(),issued=new Map<string,File[]>();let scanned=0,truncated=false;
 for(const file of files){
  if(++scanned>20000){truncated=true;break;}if(/^eqlog_/i.test(file.name))continue;
  let part;try{part=mapFileName(file.name);}catch{continue;}
  const relative=file.webkitRelativePath||file.name,folder=relative.slice(0,-file.name.length).replace(/\/$/,'')||'Selected folder';
  const folderId=folder.toLowerCase();let group=folders.get(folderId);
  if(!group){if(folders.size>=32){truncated=true;continue;}group={id:folderId,path:folder,name:folder.split('/').at(-1)||folder,provider:/brewall/i.test(folder)?'brewall':/good/i.test(folder)?'good':'other',zones:[]};folders.set(folderId,group);}
  const id=folderId+'::'+part.stem;const list=issued.get(id)||[];list.push(file);issued.set(id,list);
  if(!group.zones.some(z=>z.id===id))group.zones.push({id,stem:part.stem,fileCount:0});
 }
 for(const folder of folders.values())folder.zones=folder.zones.filter(row=>{const list=issued.get(row.id)!;row.fileCount=list.length;const layers=list.map(f=>mapFileName(f.name).layer);return list.length<=4&&new Set(layers).size===layers.length;});
 const result=[...folders.values()].filter(f=>f.zones.length);const selected=result.find(f=>f.provider==='brewall')||result[0];
 return {index:{folders:result,selectedFolderId:selected?.id||'',lastStem:'',warnings:[],truncated} satisfies MapIndex,files:issued};
}
declare global {interface Window {eqlMaps?:{find:()=>Promise<MapIndex>;chooseFolder:()=>Promise<MapIndex|null>;read:(id:string)=>Promise<MapContents>;remember:(id:string)=>Promise<void>};}}
