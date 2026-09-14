import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zoomMapAt} from '../lib/map-view.ts';
test('wheel zoom keeps the map point under the cursor fixed, including at zoom limits',()=>{
 for(const zoom of [.25,1,31,32])for(const factor of [.5,2]){
  const view={zoom,center:{x:123,y:-75},scale:zoom*3},offset={x:220,y:-180};
  const next=zoomMapAt(view,factor,offset),scale=view.scale*next.zoom/zoom;
  assert.ok(next.zoom>=.25&&next.zoom<=32);
  assert.ok(Math.abs(view.center.x+offset.x/view.scale-next.center.x-offset.x/scale)<1e-9);
  assert.ok(Math.abs(view.center.y+offset.y/view.scale-next.center.y-offset.y/scale)<1e-9);
 }
});
