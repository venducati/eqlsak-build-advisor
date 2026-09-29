
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { defaultRules as pack, defaultInput as input, recommend, validateRulePack, validateInput, parseBuild, companionMatches, assessBuild } from '../lib/build-advisor.ts';
import { defaultRaceRules, recommendRaces } from '../lib/race-advisor.ts';
const clone=()=>structuredClone(pack);
test('seed rules validate and all classes have two-site references and community coverage',()=>{
 validateRulePack(pack);
 for(const c of pack.classes) {
  assert(pack.evidence.some(e=>e.classes.includes(c.id)&&e.status==='accepted'));
  assert(pack.evidence.some(e=>e.classes.includes(c.id)&&e.status==='opinion'));
 }
 assert(pack.evidence.find(e=>e.id==='forge-roles').links[0].url.includes('eqlforge'));
});
for(const [role,id] of [['overall','BRD'],['CC','ENC'],['named hunting','SHM'],['travel','DRU']]) {
 test('Ranger/Rogue seed priority: '+role,()=>assert.equal(recommend({...input,role}).rankings[0].id,id));
}
test('full combination explains the chosen build without silently replacing it',()=>{
 const r=recommend({...input,tertiary:'ENC'});
 assert.deepEqual(r.assessment.build,['RNG','ROG','ENC']);
 assert(r.assessment.gaps.includes('heal'));
 assert(r.rankings.find(x=>x.id==='ENC').rules.length);
});
test('all 560 unordered trios produce finite explainable results and stable rankings',()=>{
 let count=0;
 for(let a=0;a<pack.classes.length;a++) for(let b=a+1;b<pack.classes.length;b++) for(let c=b+1;c<pack.classes.length;c++) {
  const i={...input,primary:pack.classes[a].id,secondary:pack.classes[b].id,tertiary:pack.classes[c].id};
  const r=recommend(i); assert.deepEqual(r,recommend(i));assert.equal(r.rankings.length,14);
  for(const rank of r.rankings) {assert(Number.isFinite(rank.score));assert(Math.abs(rank.score-rank.breakdown.reduce((s,x)=>s+x.points,0))<0.011);}
  count++;
 }
 assert.equal(count,560);
});
test('invalid input is handled without a guessed recommendation',()=>{
 for(const i of [null,{},{...input,primary:'???'},{...input,secondary:'RNG'},{...input,level:NaN},{...input,buddy:['MNK','MNK']},{...input,control:-1}]) assert(validateInput(i).length);
 assert.deepEqual(recommend({...input,primary:'???'}).rankings,[]);
});
test('full names, aliases and class positions',()=>{
 assert.deepEqual(parseBuild('Ranger / Rogue / Bard'),['RNG','ROG','BRD']);
 assert.deepEqual(parseBuild('mce'),['MNK','CLR','ENC']);
 assert.deepEqual(parseBuild('SK / Cleric / Enchanter'),['SHD','CLR','ENC']);
});
test('buddy pair rules match both orientations',()=>{
 assert.equal(companionMatches(['RNG','ROG','BRD'],['MNK','CLR','ENC']).length,1);
 assert.equal(companionMatches(['MNK','CLR','ENC'],['RNG','ROG','BRD']).length,1);
 assert.equal(companionMatches(['MNK','CLR','ROG'],['WAR','CLR','ENC']).length,1);
});
test('solo ignores buddy while duo coverage fills gaps and adjusts ranks',()=>{
 assert.deepEqual(recommend({...input,buddy:['MNK','CLR','ENC']}),recommend(input));
 const i={...input,mode:'duo',buddy:['MNK','CLR','ENC'],tertiary:'BRD'};
 const r=recommend(i);assert(r.assessment.buddyFills.includes('heal'));
 assert(r.rankings.find(x=>x.id==='BRD').breakdown.some(x=>x.label==='mce-rng-rog-brd'));
});
test('overlap is non-additive and high workload costs more with low tolerance',()=>{
 assert.equal(assessBuild(['RNG','ROG','WAR'],input).ratings.dps,5);
 const low=recommend({...input,complexity:0}).rankings.find(x=>x.id==='ENC');
 const high=recommend({...input,complexity:5}).rankings.find(x=>x.id==='ENC');
 assert(low.score<high.score);assert(low.breakdown.find(x=>x.label==='overlap').points<0);
});
test('level, zone, continent and item goals alter zone fit',()=>{
 const get=(i)=>recommend({...input,tertiary:'SHM',...i}).zones.find(z=>z.zone.id==='blackburrow');
 assert(get({level:10}).score>get({level:40}).score);
 assert(get({zone:'Blackburrow'}).score>get({zone:''}).score);
 assert(get({continent:'Antonica'}).score>get({continent:'Faydwer'}).score);
 assert(get({gearGoals:['Wicked Sallet']}).score>get({gearGoals:['Unknown item']}).score);
 assert(get({level:null}).cautions.some(c=>c.includes('unknown')));
 assert.deepEqual(get({gearGoals:['']}),get({gearGoals:[]}));
});
test('unknown faction access is flagged; documented conflict excludes the zone',()=>{
 const i={...input,factionConstraints:['Protected faction']};
 assert(recommend(i).zones.every(z=>z.cautions.some(c=>c.includes('Faction safety unknown'))));
 const p=clone();p.zones[0].factionEffects=['Protected faction'];p.zones[0].accessFactions=[];
 validateRulePack(p);
 assert(recommend(i,p).zones.find(z=>z.zone.id==='blackburrow').blocked);
});
test('third-class zone capabilities are not assumed before level ten',()=>{
 assert.deepEqual(recommend({...input,level:9,tertiary:'SHM'}).zones,recommend({...input,level:9}).zones);
});
test('edited JSON changes scores and conditional level/mode/zone rules respect scope',()=>{
 const p=clone();p.rules.push({id:'local-test',when:{candidate:'WIZ',minLevel:30,modes:['duo'],zones:['Najena'],continents:['Antonica']},points:100,why:'Test context',provenance:p.provenance});
 validateRulePack(p);
 assert.equal(recommend({...input,level:30,mode:'duo',zone:'Najena',continent:'Antonica'},p).rankings[0].id,'WIZ');
 assert.equal(recommend({...input,level:29,mode:'duo',zone:'Najena',continent:'Antonica'},p).rankings[0].id,'BRD');
});
test('corrupt or dangerous rule imports are rejected',()=>{
 for(const mutate of [
  p=>p.weights.control=null,p=>p.classes[0].ratings.dps=6,p=>p.rules[0].when={unknown:'x'},
  p=>p.rules[0].when.candidate='NOT_A_CLASS',p=>p.rules[0].provenance.label='verified',
  p=>p.evidence[0].links[0].url='javascript:alert(1)',p=>p.zones[0].min=1000,
  p=>p.metrics=['dps'],p=>p.evidence[0].classes=['???'],p=>p.tuning.modeSurvival.solo=NaN
 ]) {const p=clone();mutate(p);assert.throws(()=>validateRulePack(p));}
});
test('excluded evidence never contributes score points and inputs are not mutated',()=>{
 const p=clone(),i=structuredClone(input),before=JSON.stringify([p,i]);
 const r=recommend(i,p);assert.equal(JSON.stringify([p,i]),before);
 assert(r.rankings.every(x=>!x.breakdown.some(b=>b.label==='forge-enc-healing-rejected')));
});
test('engine and advisor perform no network inference calls',()=>{
 for(const file of ['lib/build-advisor.ts','components/BuildAdvisor.tsx']) assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|api\.openai/.test(readFileSync(file,'utf8')));
});
test('all fifteen launch races have an offline, explainable trio fit',()=>{
 assert.equal(defaultRaceRules.races.length,15);
 assert.equal(new Set(defaultRaceRules.races.map(r=>r.id)).size,15);
 const ranks=recommendRaces({...input,tertiary:'BRD'},pack);
 assert.equal(ranks.length,15);
 assert(ranks.every(r=>Number.isFinite(r.score)&&r.reasons.length&&r.tradeoffs.length&&r.race.provenance.label));
 assert.deepEqual(ranks,recommendRaces({...input,tertiary:'BRD'},pack));
});
