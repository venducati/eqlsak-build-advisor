export const clampMapZoom=(zoom:number)=>Math.max(.25,Math.min(32,zoom));

/** Fixed, high-contrast colors used when a player asks for a structural map view. */
export const wireframeMapColors={
 background:'#07191e',
 baseLine:'#b8f5e3',
 overlayLine:'#78b9d0',
 landmark:'#f5dc94',
 label:'#fff0bd',
 labelOutline:'#07191e'
} as const;

export const defaultMap3dCamera={yaw:-.65,pitch:.65,floorLift:1.6} as const;
export const clampMapPitch=(pitch:number)=>Math.max(-1.25,Math.min(1.25,pitch));

/** Project local EQ map coordinates onto a canvas after yaw and pitch rotation. */
export function projectMap3d(point:{x:number;y:number;z:number},origin:{x:number;y:number;z:number},span:number,canvas:{width:number;height:number},camera:{yaw:number;pitch:number;floorLift:number;zoom:number}){
 const safeSpan=Math.max(10,span),x=(point.x-origin.x)/safeSpan,y=(point.y-origin.y)/safeSpan,z=(point.z-origin.z)/safeSpan*camera.floorLift;
 const sinYaw=Math.sin(camera.yaw),cosYaw=Math.cos(camera.yaw),turnX=x*cosYaw-y*sinYaw,turnY=x*sinYaw+y*cosYaw;
 const sinPitch=Math.sin(clampMapPitch(camera.pitch)),cosPitch=Math.cos(clampMapPitch(camera.pitch)),tiltY=turnY*cosPitch-z*sinPitch,depth=turnY*sinPitch+z*cosPitch;
 const perspective=4.5/Math.max(.5,4.5+depth),scale=Math.min(canvas.width,canvas.height)*.42*camera.zoom*perspective;
 return {x:canvas.width/2+turnX*scale,y:canvas.height/2+tiltY*scale,depth};
}

/** Keep the world point under a wheel-zoom cursor fixed on screen. */
export function zoomMapAt(view:{zoom:number;center:{x:number;y:number};scale:number},factor:number,offset:{x:number;y:number}){
 const zoom=clampMapZoom(view.zoom*factor),scale=view.scale*zoom/view.zoom;
 if(!Number.isFinite(scale)||scale<=0)return {zoom:view.zoom,center:view.center};
 return {zoom,center:{x:view.center.x+offset.x/view.scale-offset.x/scale,y:view.center.y+offset.y/view.scale-offset.y/scale}};
}
