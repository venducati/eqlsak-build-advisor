import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMapFile,validateMapSelection,mapBounds,parseLocation} from '../lib/eq-map.ts';
test('standard EQ line and label records preserve coordinates, colors, commas and layer identity',()=>{
 const map=parseMapFile('fictional_1.txt','\uFEFFL -100, -200, 0, 100, 200, 10, 0, 0, 0\r\nP 10, 20, 30, 0, 0, 240, 2, A_Merchant_(M),_West\r');
 assert.equal(map.stem,'fictional');assert.equal(map.layer,1);assert.deepEqual(map.lines[0].a,{x:-100,y:-200,z:0});assert.equal(map.labels[0].text,'A Merchant (M), West');assert.equal(map.labels[0].color,'rgb(0,0,240)');assert.equal(map.skipped,0);assert.equal(mapBounds([map]).x,0);
});
test('untrusted labels remain text, invalid records are counted, huge inputs are rejected',()=>{
 const map=parseMapFile('fictional.txt','P 0, 0, 0, 0, 0, 0, 1, <img src=x onerror=alert(1)>\nL , 0, 0, 0, 0, 0, 0, 0, 0\nL NaN, 0, 0, 0, 0, 0, 0, 0, 0\nP 0, 0, 0, 999, 0, 0, 1, Bad\n[date] Combat log\n# Comment');
 assert.equal(map.labels.length,1);assert.equal(map.skipped,4);assert.ok(map.labels[0].text.startsWith('<img'));assert.throws(()=>parseMapFile('fictional.txt','L 0,0,0,1,1,1,0,0,0\n'.repeat(50001)),/too much/);
});
test('file picker rejects mixed zones, duplicate layers, oversized packs and archives',()=>{
 const f=(name,size=30)=>({name,size});assert.equal(validateMapSelection([f('unrest.txt'),f('UNREST_1.TXT')]).length,2);
 for(const files of [[f('unrest.txt'),f('cauldron.txt')],[f('unrest_1.txt'),f('UNREST_1.txt')],[f('pack.zip')],[f('unrest.txt',9*1024*1024)],[]])assert.throws(()=>validateMapSelection(files));
});
test('/loc north, west, height converts to EQ map axes without reading the game',()=>{
 assert.deepEqual(parseLocation('100, -200, 10'),{x:200,y:-100,z:10});assert.deepEqual(parseLocation('Your Location is -100.5, 200.1, -3.0.'),{x:-200.1,y:100.5,z:-3});assert.equal(parseLocation('1,2'),null);assert.equal(parseLocation('NaN,2,3'),null);
});
