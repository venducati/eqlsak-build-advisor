const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settingsFrom,fitBounds,frameFrom,defaults}=require('../overlay-state.cjs');
const primary={workArea:{x:0,y:0,width:1920,height:1040}},left={workArea:{x:-1280,y:0,width:1280,height:984}};
test('saved preferences use safe defaults and windows remain in available monitor space',()=>{
 assert.deepEqual(settingsFrom(null),defaults);assert.equal(settingsFrom({opacity:9}).opacity,1);assert.equal(settingsFrom({opacity:0}).opacity,.45);assert.equal(settingsFrom({size:'constructor'}).size,'medium');
 let b=fitBounds({x:5000,y:5000},[primary,left],primary);assert.equal(b.x,1540);assert.equal(b.y,520);
 b=fitBounds({x:-80,y:900,size:'large'},[primary,left],primary);assert.equal(b.x,-456);assert.equal(b.y,360);assert.equal(b.width,456);assert.equal(b.height,624);
});
test('only bounded display data passes across the overlay bridge',()=>{
 const value={mode:'live',player:'Test',clock:1,lastEventAt:null,rolling:true,stats:Object.fromEntries(['dps','damage','incoming','hps','healing','criticalHits','criticalRate','hits','dotDps','ddDamage'].map(k=>[k,0])),series:Array(60).fill(0),effects:[],rawLog:'secret'};
 assert.equal(frameFrom(value).rawLog,undefined);
 for(const invalid of [{...value,mode:'unknown'},{...value,series:Array(61).fill(0)},{...value,player:'a'.repeat(81)},{...value,stats:{...value.stats,dps:Infinity}},{...value,effects:[{ability:'A',target:'B',kind:'buff',status:'bad',remaining:10}]}])assert.throws(()=>frameFrom(invalid));
});
