export type MapPoint = {x:number;y:number;z:number};
export type MapLine = {a:MapPoint;b:MapPoint;color:string};
export type MapLabel = MapPoint & {text:string;color:string;size:number};
export type MapLayer = {name:string;stem:string;layer:number;lines:MapLine[];labels:MapLabel[];skipped:number};
export const MAP_BYTES = 8 * 1024 * 1024, MAP_RECORDS = 50000;
export function mapFileName(name:string) {
  const match=name.match(/^([a-z0-9][a-z0-9_-]*?)(?:_([123]))?\.txt$/i);
  if(!match || name.length>120) throw Error('Choose extracted EQ map .txt files, such as unrest.txt and unrest_1.txt. ZIP files must be unzipped first.');
  return {stem:match[1].toLowerCase(),layer:Number(match[2]||0)};
}
export function validateMapSelection(files:{name:string;size:number}[]) {
  if(!files.length||files.length>4)throw Error('Choose one zone: its base file and up to three numbered layers (four files at most).');
  if(files.some(f=>!Number.isFinite(f.size)||f.size<0)||files.reduce((sum,f)=>sum+f.size,0)>MAP_BYTES)throw Error('Choose map files totaling 8 MB or less.');
  const names=files.map(f=>mapFileName(f.name));
  if(new Set(names.map(n=>n.stem)).size!==1)throw Error('These files belong to different zones. Choose files with the same name before the layer number.');
  if(new Set(names.map(n=>n.layer)).size!==names.length)throw Error('Choose only one file for each layer. Load each map maker’s version separately.');
  return names;
}
export function parseMapFile(name:string,text:string):MapLayer {
  const result:MapLayer={name,...mapFileName(name),lines:[],labels:[],skipped:0};
  if(new TextEncoder().encode(text).length>MAP_BYTES)throw Error('This map is too large. Use a file smaller than 8 MB.');
  const numeric=(values:string[],count:number)=>values.length>=count && values.slice(0,count).every(v=>v.trim()!==''&&Number.isFinite(Number(v))&&Math.abs(Number(v))<=1e7);
  const color=(v:string[],i:number)=>v.slice(i,i+3).every(n=>Number.isInteger(Number(n))&&Number(n)>=0&&Number(n)<=255);
  const rgb=(v:string[],i:number)=>`rgb(${v.slice(i,i+3).map(Number).join(',')})`;
  const point=(v:string[],i:number)=>({x:Number(v[i]),y:Number(v[i+1]),z:Number(v[i+2])});
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/)) {
    const row=raw.trim();if(!row||row.startsWith('#')||row.startsWith('//'))continue;
    if(row.length>2048){result.skipped++;continue;}
    const v=row.slice(1).trim().split(',');
    if(/^L\s/i.test(row)&&v.length===9&&numeric(v,9)&&color(v,6))result.lines.push({a:point(v,0),b:point(v,3),color:rgb(v,6)});
    else if(/^P\s/i.test(row)&&v.length>=8&&numeric(v,7)&&color(v,3)&&[1,2,3].includes(Number(v[6]))&&v.slice(7).join(',').trim())result.labels.push({...point(v,0),color:rgb(v,3),size:Number(v[6]),text:v.slice(7).join(',').trim().replaceAll('_',' ').slice(0,240)});
    else result.skipped++;
    if(result.lines.length+result.labels.length>MAP_RECORDS)throw Error('This map has too much detail to load safely. Choose a smaller map (50,000 records at most).');
  }
  return result;
}
export function mapBounds(layers:MapLayer[]) {
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  const add=(p:MapPoint)=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);};
  for(const layer of layers){for(const line of layer.lines){add(line.a);add(line.b);}for(const label of layer.labels)add(label);}
  if(!Number.isFinite(minX))return {x:0,y:0,spanX:100,spanY:100};
  return {x:(minX+maxX)/2,y:(minY+maxY)/2,spanX:Math.max(10,maxX-minX)*1.1,spanY:Math.max(10,maxY-minY)*1.1};
}
// EQ map-file coordinates already face north upward in a top-down drawing.
// The game's /loc prints north, west, height: negate west and north for the file axes.
export function parseLocation(value:string):MapPoint|null {
  const match=value.trim().match(/^(?:Your Location is\s*)?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)[.]?$/i);
  if(!match)return null;
  const [north,west,z]=match.slice(1).map(Number);
  return [north,west,z].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e7)?{x:-west,y:-north,z}:null;
}
