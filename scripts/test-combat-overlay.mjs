import {test} from 'node:test';
import assert from 'node:assert/strict';
import {overlaySnapshot} from '../lib/combat-overlay.ts';
import {parseCombatLine,summarizeCombat} from '../lib/combat-meter.ts';
import {frameFrom} from '../desktop/overlay-state.cjs';
const clock=Date.parse('2026-09-13T12:00:00Z');
const event=(text,sec=0)=>parseCombatLine(`[${new Date(clock+sec*1000).toISOString()}] ${text}`);
const input={clock,events:[],player:'Fixture',pet:'Companion',rolling:true,mode:'live',rules:[],manual:[]};
test('overlay matches meter totals, critical rate, pet attribution and timed series',()=>{
 const events=[event('You slash a target for 120 points of damage. (Critical)'),event('a target has taken 30 damage from your Burn.'),event('a target hits YOU for 5 points of damage.'),event('Other hits a target for 999 points of damage.'),event('Companion hits a target for 50 points of damage.'),event('You slash a target for 1000 points of damage.',-60),event('You slash a target for 1000 points of damage.',1)];
 const frame=overlaySnapshot({...input,events});const meter=summarizeCombat(events,input.player,input.pet,clock,true);
 assert.equal(frame.stats.damage,200);assert.equal(frame.stats.damage,meter.damage);assert.equal(frame.stats.dps,meter.dps);assert.equal(frame.stats.incoming,5);assert.equal(frame.stats.criticalRate,meter.criticalRate);assert.equal(frame.series.reduce((a,b)=>a+b,0),200);assert.equal(frame.stats.dotDps,1);assert.deepEqual(frameFrom(frame),frame);
 assert.ok(!JSON.stringify(frame).includes('Other'));assert.ok(!Object.hasOwn(frame,'events'));
});
test('empty frames remain finite and mode distinguishes samples from live data',()=>{
 for(const mode of ['live','paused','idle','demo','replay']){const f=frameFrom(overlaySnapshot({...input,mode}));assert.equal(f.mode,mode);assert.equal(f.stats.damage,0);assert.equal(f.lastEventAt,null);assert.equal(f.series.length,60);}
});
test('effect estimates reflect timer rules and newest event time is order independent',()=>{
 const rules=[{ability:'Test Ward',kind:'buff',seconds:60,applied:'You have Test Ward.',faded:'Your Test Ward fades.'}];
 const frame=overlaySnapshot({...input,events:[event('You slash a target for 5 points of damage.',-5),event('You have Test Ward.',-10),event('You slash a target for 10 points of damage.',-30)],rules});
 assert.equal(frame.lastEventAt,clock-5000);assert.equal(frame.effects[0].remaining,50);assert.equal(frame.effects[0].ability,'Test Ward');assert.equal(frameFrom(frame).effects[0].kind,'buff');
});
