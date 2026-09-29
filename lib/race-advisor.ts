import seed from '../data/race-advisor.json' with { type: 'json' };
import { coverage } from './build-advisor.ts';
import type { AdvisorInput, Provenance, RulePack } from './build-advisor.ts';

export type Race = { id:string; name:string; icon:string; start:string; scores:Record<string,number>; strengths:string[]; tradeoffs:string[]; provenance:Provenance };
export type RacePack = { version:number; updated:string; provenance:Provenance; notice:string; races:Race[] };
export const defaultRaceRules = seed as RacePack;

const priorities: Record<string,string[]> = {
  DPS:['melee','caster'], tank:['frontline'], heal:['utility','caster'], CC:['caster','utility'],
  travel:['travel'], stealth:['utility','melee'], pulling:['utility','melee'], 'named hunting':['frontline','melee'], 'faction work':['faction','travel'], overall:['frontline','melee','caster','utility']
};
const classToRace: Record<string,string[]> = {
  WAR:['frontline','melee'], PAL:['frontline','utility'], SHD:['frontline','caster'], CLR:['caster','utility'], DRU:['caster','travel'], SHM:['utility','caster'], RNG:['melee','travel'], ROG:['melee','utility'], MNK:['melee','frontline'], BRD:['utility','travel'], ENC:['caster','utility'], NEC:['caster','utility'], WIZ:['caster'], MAG:['caster'], BST:['melee','utility'], BER:['melee','frontline']
};

export function recommendRaces(input:AdvisorInput, pack:RulePack, races=defaultRaceRules) {
  const build=[input.primary,input.secondary,input.tertiary].filter(Boolean);
  const classFit=coverage(build,pack);
  const wants=new Set([...(priorities[input.role] || priorities.overall), ...build.flatMap(id=>classToRace[id] || [])]);
  if(input.mobility>=3) wants.add('travel');
  if(input.mode==='solo') wants.add('frontline');
  return races.races.map(race=>{
    const contributions=Array.from(wants).map(key=>({ key, score:race.scores[key] || 0 })).sort((a,b)=>b.score-a.score);
    const score=contributions.reduce((sum,entry)=>sum+entry.score,0) + (input.continent && input.continent===race.start ? 2 : 0);
    const buildHints=build.filter(id=>(classToRace[id] || []).some(key=>(race.scores[key] || 0)>=4));
    const reasons=[...race.strengths];
    if(buildHints.length) reasons.unshift(`It supports your ${buildHints.join(' / ')} plan through ${contributions.filter(x=>x.score>=4).slice(0,2).map(x=>x.key).join(' and ')}.`);
    if(classFit.survivability<3 && race.scores.frontline>=4) reasons.unshift('Your selected trio has a survivability gap in the current rules, so this race profile adds a helpful frontline lean.');
    return { race, score, reasons, tradeoffs:race.tradeoffs, matched:contributions.filter(x=>x.score>=4).map(x=>x.key) };
  }).sort((a,b)=>b.score-a.score || a.race.name.localeCompare(b.race.name));
}
