import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultMap3dCamera,projectMap3d,wireframeMapColors,zoomMapAt} from '../lib/map-view.ts';
test('wheel zoom keeps the map point under the cursor fixed, including at zoom limits',()=>{
 for(const zoom of [.25,1,31,32])for(const factor of [.5,2]){
  const view={zoom,center:{x:123,y:-75},scale:zoom*3},offset={x:220,y:-180};
  const next=zoomMapAt(view,factor,offset),scale=view.scale*next.zoom/zoom;
  assert.ok(next.zoom>=.25&&next.zoom<=32);
  assert.ok(Math.abs(view.center.x+offset.x/view.scale-next.center.x-offset.x/scale)<1e-9);
  assert.ok(Math.abs(view.center.y+offset.y/view.scale-next.center.y-offset.y/scale)<1e-9);
 }
});

test('wireframe palette gives local maps a high-contrast structural view',()=>{
 assert.equal(wireframeMapColors.background,'#07191e');
 assert.notEqual(wireframeMapColors.baseLine,wireframeMapColors.overlayLine);
 assert.notEqual(wireframeMapColors.label,wireframeMapColors.labelOutline);
});

test('3D wireframe projection turns height and yaw into a finite canvas view',()=>{
 const camera={...defaultMap3dCamera,zoom:1},origin={x:0,y:0,z:0},canvas={width:800,height:600};
 const floor=projectMap3d({x:80,y:40,z:100},origin,400,canvas,camera);
 const turned=projectMap3d({x:80,y:40,z:100},origin,400,canvas,{...camera,yaw:camera.yaw+.5});
 assert.ok(Number.isFinite(floor.x)&&Number.isFinite(floor.y)&&Number.isFinite(floor.depth));
 assert.notEqual(floor.x,turned.x);
 assert.notEqual(floor.y,turned.y);
});

test('3D wireframe projection responds to a camera move on the Z axis',()=>{
 const camera={...defaultMap3dCamera,zoom:1},canvas={width:800,height:600},point={x:80,y:40,z:100};
 const base=projectMap3d(point,{x:0,y:0,z:0},400,canvas,camera);
 const raised=projectMap3d(point,{x:0,y:0,z:120},400,canvas,camera);
 assert.notEqual(base.y,raised.y);
 assert.notEqual(base.depth,raised.depth);
});
