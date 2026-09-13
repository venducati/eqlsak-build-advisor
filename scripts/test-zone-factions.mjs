import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allZones,findZone,matchesZone,zoneCatalog} from '../lib/zone-catalog.ts';
import {parseFactionExport,parsePoints,goalProgress,actionPlan,emptyStore,emptyCharacter,characterKey,validateFactionStore,zoneRecord,factionId,factionData} from '../lib/zone-factions.ts';
import {defaultInput,defaultRules} from '../lib/build-advisor.ts';
import {readPlanFile,comparisonInput} from '../lib/advisor-plans.ts';
test('full zone roster supports Dagnor punctuation, partial names and empty browse',()=>{
  assert(zoneCatalog.length>100);
  for(const query of ["Dagnor's Cauldron",'Dagnor’s Cauldron','dagnorscauldron'])assert.equal(findZone(query).continent,'Faydwer');
  assert(matchesZone(findZone("Dagnor's Cauldron"),'cauldron'));
  assert(zoneCatalog.every(z=>matchesZone(z,'')));
  assert.equal(findZone('Infected Paw',allZones(defaultRules.zones)).name,'Splitpaw Lair');
  assert.equal(findZone('My New Camp',allZones([{id:'custom',name:'My New Camp',continent:'Antonica'}])).id,'custom');
  assert.equal(findZone('Burning Wood').availability,'out-of-era');
});
test('faction export keeps negative points, zero and remaining-to-max semantics',()=>{
  const {standings,skipped}=parseFactionExport('Faction ID\tFaction Name\tCurrent\tRemaining\n1\tStorm Guard\t-250\t2250\n2\tGoblin\t0\t1000\n3\tHeretics\tbroken\t20');
  assert.equal(standings['storm-guard'].maximum,2000);
  assert.equal(standings['storm-guard'].points,-250);
  assert.equal(standings.goblin.points,0);assert.equal(skipped,1);
  assert.equal(parsePoints(''),null);assert.equal(parsePoints('3.5'),null);assert.equal(parsePoints('NaN'),null);assert.equal(parsePoints('+10'),10);
});
test('faction export handles quoted CSV, aliases and rejects duplicated or unusable snapshots',()=>{
  const {standings}=parseFactionExport('1,"Miners Guild 249",-500,1500\n2,"New, Custom Faction",12,100');
  assert.equal(standings['paladins-underfoot'].points,-500);assert.equal(standings['custom-newcustomfaction'].name,'New, Custom Faction');
  assert.throws(()=>parseFactionExport('1|Storm Guard|1|5\n2|Storm Guard|2|5'),/repeated/);
  assert.throws(()=>parseFactionExport('1|Goblin|0|-1'),/No faction/);
  assert.throws(()=>parseFactionExport('x'.repeat(2_000_001)),/too large/);
});
test('unknown faction standing stays unknown and goals respect reported caps',()=>{
  assert.equal(goalProgress(null,1).needed,null);assert.equal(goalProgress(0,1).needed,1);
  assert.equal(goalProgress(-250,1).needed,251);assert.equal(goalProgress(200,1).needed,0);
  assert(goalProgress(10,100,50).beyondMaximum);
  assert.equal(actionPlan('storm-guard',-250,1,[])[0].count,51);
  assert.equal(actionPlan('storm-guard',-250,1,[],0)[0].count,null);
});
test('protected factions suppress repeat estimates and unknown rates stay unknown',()=>{
  const plan=actionPlan('deepwater',-70,1,['Heretics'])[0];assert.deepEqual(plan.conflicts,['heretics']);assert.equal(plan.count,null);
  assert.equal(actionPlan('qeynos-guards',-50,1,[])[0].count,null);
  assert.deepEqual(actionPlan('goblin',-100,1,[]),[]);
  assert(zoneRecord('Dagnor’s Cauldron').factions.includes('paladins-underfoot'));
  assert.equal(factionId('Miners Guild 249'),'paladins-underfoot');
});
test('saved points remain separate for character/server and invalid saves are rejected',()=>{
  const store=emptyStore('Test_Halas');store.characters[store.active].standings.goblin={name:'Goblin',points:0,source:'manual',asOf:'2026-09-11T00:00:00Z'};
  const other=characterKey('Test_Other');store.characters[other]=emptyCharacter('Test_Other');store.active=other;
  const restored=validateFactionStore(JSON.parse(JSON.stringify(store)));assert.equal(restored.characters[other].standings.goblin,undefined);assert.equal(restored.characters[characterKey('Test_Halas')].standings.goblin.points,0);
  assert.throws(()=>validateFactionStore({version:1,active:'missing',characters:{}}));
});
test('faction catalog actions have valid references, directions and source labels',()=>{
  const ids=new Set(factionData.factions.map(f=>f.id));
  for(const zone of factionData.zones)for(const id of zone.factions)assert(ids.has(id));
  for(const action of factionData.actions){assert(['User-verified EQL','EQL-sourced','heuristic/inference'].includes(action.provenance));assert(action.sources.length);for(const effect of action.effects){assert(ids.has(effect.faction));assert(['up','down'].includes(effect.direction));if(effect.points!==undefined)assert(effect.points>0);}}
});
test('shared build validation rejects bad classes and comparisons use current hunt settings',()=>{
  const saved={...defaultInput,primary:'WAR',secondary:'CLR',tertiary:'ENC',zone:'Crushbone',healing:4};
  const plan={id:'test',name:'Tank trio',savedAt:'2026-09-11T00:00:00Z',input:saved};
  const text=JSON.stringify({format:'eqlsak-build-plan',version:1,plan});assert.equal(readPlanFile(text,defaultRules).input.primary,'WAR');
  const compared=comparisonInput(defaultInput,saved);assert.equal(compared.primary,'WAR');assert.equal(compared.zone,defaultInput.zone);assert.equal(compared.healing,defaultInput.healing);
  assert.throws(()=>readPlanFile(text.replace('WAR','INVALID'),defaultRules));
  assert.throws(()=>readPlanFile(JSON.stringify({format:'other',plan}),defaultRules));
});
