export const clampMapZoom=(zoom:number)=>Math.max(.25,Math.min(32,zoom));
/** Keep the world point under a wheel-zoom cursor fixed on screen. */
export function zoomMapAt(view:{zoom:number;center:{x:number;y:number};scale:number},factor:number,offset:{x:number;y:number}){
 const zoom=clampMapZoom(view.zoom*factor),scale=view.scale*zoom/view.zoom;
 if(!Number.isFinite(scale)||scale<=0)return {zoom:view.zoom,center:view.center};
 return {zoom,center:{x:view.center.x+offset.x/view.scale-offset.x/scale,y:view.center.y+offset.y/view.scale-offset.y/scale}};
}
