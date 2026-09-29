import seed from '../data/build-advisor.json' with { type: 'json' };
import evidenceSeed from '../data/build-evidence.json' with { type: 'json' };

export type Provenance = { label: 'User-verified EQL' | 'EQL-sourced' | 'heuristic/inference'; reference: string };
export type Ratings = Record<string, number>;
export type SourceEvidence = { id:string; classes:string[]; kind:string; status:'accepted'|'opinion'|'excluded'; summary:string; limitation:string; reviewedOn:string; provenance:Provenance; links:{title:string;url:string}[] };
export type AdvisorInput = {
  primary: string; secondary: string; tertiary: string; level: number | null;
  /** Optional race. Race advice is local and does not alter the class engine. */
  race?: string;
  mode: 'solo' | 'duo' | 'group'; role: string; zone: string; continent: string;
  factionConstraints: string[]; gearGoals: string[];
  mobility: number; healing: number; control: number; complexity: number; buddy: string[];
  /** Players 3 and 4. Player 2 uses the existing buddy field. */
  party?: string[][];
};
type When = { baseAll?: string[]; candidate?: string; anyRole?: string[]; needAtLeast?: Record<string, number>; minLevel?: number; maxLevel?: number; modes?: string[]; zones?: string[]; continents?: string[] };
export type Rule = { id: string; when: When; points: number; why: string; tradeoff?: string; provenance: Provenance };
export type Zone = { id: string; name: string; aliases: string[]; continent: string; min: number; max: number; control: number; heal: number; loot: string[]; factionEffects: string[] | null; accessFactions: string[] | null; provenance: Provenance };
export type RulePack = {
  tertiaryUnlockLevel: number;
  evidence: SourceEvidence[];
  version: number; provenance: Provenance; metrics: string[]; weights: Ratings;
  tuning: { overlapPenalty: number; buddyCoverage: number; retainedStrength: number; needWeight: number; roleWeight: number; workloadPenalty: number; modeSurvival: Record<string,number> };
  roles: Record<string,string[]>; aliases: Record<string,string[]>;
  classes: { id: string; name: string; ratings: Ratings; workload: number; tradeoff: string; provenance: Provenance }[];
  rules: Rule[]; companionRules: { id: string; build: string[]; buddy: string[]; points: number; why: string; tradeoff: string; provenance: Provenance }[];
  zoneScoring: Record<string,number>; zones: Zone[];
};
export const defaultRules = { ...seed, evidence: evidenceSeed } as RulePack;
export const defaultInput: AdvisorInput = { primary:'RNG', secondary:'ROG', tertiary:'', race:'', level:null, mode:'solo', role:'overall', zone:'', continent:'', factionConstraints:[], gearGoals:[], mobility:0, healing:0, control:0, complexity:3, buddy:[] };
export const classIcons: Record<string,string> = { WAR:'🛡️', CLR:'✨', PAL:'⚜️', RNG:'🏹', SHD:'🌑', DRU:'🌿', MNK:'🥋', BRD:'🎵', ROG:'🗡️', SHM:'🐺', NEC:'💀', WIZ:'🔥', MAG:'🔥', ENC:'🔮', BST:'🐾', BER:'🪓' };
export type Evidence = { label: string; points: number; why: string; provenance: Provenance };
const heuristic: Provenance = { label:'heuristic/inference', reference:'Saved rules and point values help compare builds. This score does not simulate a fight.' };
const metricWords: Record<string,string> = {dps:'damage',tank:'taking hits',heal:'healing',control:'enemy control',mobility:'movement',travel:'travel',stealth:'stealth',pulling:'pulling',survivability:'staying alive',faction:'faction access'};
const round = (n:number) => Math.round(n * 100) / 100;
const same = (a:string,b:string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const contains = (a:string[], b:string[]) => b.every(x=>a.includes(x));

export function parseBuild(text:string, pack=defaultRules): string[] {
  return text.split(/\s*[/,+;]\s*|\s{2,}/).filter(Boolean).flatMap(token => {
    const t=token.trim().toUpperCase();
    return pack.aliases[t] || [pack.classes.find(c=>c.id===t || same(c.name,token))?.id || t];
  });
}
export function validateInput(i:AdvisorInput, pack=defaultRules): string[] {
  if(!i || typeof i!=='object' || !['primary','secondary','tertiary','mode','role','zone','continent'].every(k=>typeof (i as unknown as Record<string,unknown>)[k]==='string') || ![i.buddy,i.gearGoals,i.factionConstraints].every(a=>Array.isArray(a)&&a.every(v=>typeof v==='string'))) return ['These saved settings cannot be used. Choose your classes again.'];
  const errors:string[]=[]; const ids=pack.classes.map(c=>c.id);
  if(!i.primary || !i.secondary) errors.push('Choose your first and second classes.');
  const build=[i.primary,i.secondary,i.tertiary].filter(Boolean);
  if(build.some(x=>!ids.includes(x)) || i.buddy.some(x=>!ids.includes(x))) errors.push('Class not found. Use a listed name or short name. MCE means Monk / Cleric / Enchanter.');
  if(new Set(build).size!==build.length || new Set(i.buddy).size!==i.buddy.length) errors.push('Each character needs different classes. Do not choose the same class twice.');
  if(i.buddy.length>3) errors.push('A buddy build can have up to three classes.');
  if(i.party !== undefined && (!Array.isArray(i.party) || i.party.length > 2 || i.party.some(build => !Array.isArray(build) || build.length > 3 || build.some(id => typeof id !== 'string' || !ids.includes(id)) || new Set(build).size !== build.length))) errors.push('Use up to four players, with up to three different classes per player.');
  if(i.level!==null && (!Number.isFinite(i.level) || i.level<1 || i.level>100)) errors.push('Level must be a number from 1 to 100, or blank.');
  if(!['solo','duo','group'].includes(i.mode) || !Object.hasOwn(pack.roles,i.role)) errors.push('Choose who you play with and your main goal from the lists.');
  for(const key of ['mobility','healing','control','complexity'] as const) if(!Number.isFinite(i[key]) || i[key]<0 || i[key]>5) errors.push(key+' must be from 0 to 5.');
  return errors;
}
export function validateRulePack(value:unknown): asserts value is RulePack {
  const p=value as RulePack;
  const fail=()=>{throw new Error('This rule file cannot be used. Check its format, class codes, source labels, and number limits in the rule guide.');};
  if(!p || typeof p!=='object' || p.version!==1 || !Array.isArray(p.metrics) || !p.metrics.length || !p.metrics.every(x=>typeof x==='string') || new Set(p.metrics).size!==p.metrics.length || !Array.isArray(p.classes) || p.classes.length<3 || !p.roles || !p.roles.overall || !p.tuning || !p.zoneScoring || !p.aliases || !Array.isArray(p.rules) || !Array.isArray(p.companionRules) || !Array.isArray(p.zones)) fail();
  const str=(x:unknown)=>typeof x==='string' && x.length>0;
  const num=(x:unknown,min=-1000,max=1000)=>typeof x==='number' && Number.isFinite(x) && x>=min && x<=max;
  const prov=(v:Provenance)=>v && ['User-verified EQL','EQL-sourced','heuristic/inference'].includes(v.label) && str(v.reference);
  if(!prov(p.provenance)) fail();
  if(!num(p.tertiaryUnlockLevel,1,100)) fail();
  if(!defaultRules.metrics.every(m=>p.metrics.includes(m))) fail();
  const sourceIds=new Set<string>();
  if(!Array.isArray(p.evidence)) fail();
  for(const e of p.evidence) {
    if(!e || !str(e.id) || sourceIds.has(e.id) || !Array.isArray(e.classes) || !e.classes.every(c=>p.classes.some(x=>x.id===c)) || !['accepted','opinion','excluded'].includes(e.status) || !str(e.kind) || !str(e.summary) || !str(e.limitation) || !/^\d{4}-\d{2}-\d{2}$/.test(e.reviewedOn) || !prov(e.provenance) || !Array.isArray(e.links) || !e.links.length) fail();
    sourceIds.add(e.id);
    for(const l of e.links) {try {if(!str(l.title) || new URL(l.url).protocol!=='https:') fail();} catch {fail();}}
  }
  const ids=p.classes.map(c=>c.id);
  if(new Set(ids).size!==ids.length) fail();
  const refs=(v:unknown)=>Array.isArray(v) && v.every(x=>ids.includes(x));
  for(const c of p.classes) if(!str(c.id) || !str(c.name) || !str(c.tradeoff) || !prov(c.provenance) || !num(c.workload,0,5) || !p.metrics.every(m=>num(c.ratings?.[m],0,5))) fail();
  if(!p.metrics.every(m=>num(p.weights?.[m],0,100))) fail();
  for(const k of ['overlapPenalty','buddyCoverage','retainedStrength','needWeight','roleWeight','workloadPenalty'] as const) if(!num(p.tuning[k],0,100)) fail();
  if(!['solo','duo','group'].every(m=>num(p.tuning.modeSurvival?.[m],0,100))) fail();
  if(!Object.values(p.roles).every(v=>Array.isArray(v) && v.every(m=>p.metrics.includes(m))) || !Object.values(p.aliases).every(refs)) fail();
  const seen=new Set<string>();
  for(const r of p.rules) {
    if(!str(r.id) || seen.has(r.id) || !str(r.why) || !num(r.points) || !prov(r.provenance) || !r.when || (r.tradeoff!==undefined && !str(r.tradeoff))) fail();
    seen.add(r.id); const w=r.when;
    if(Object.keys(w).some(k=>!['baseAll','candidate','anyRole','needAtLeast','minLevel','maxLevel','modes','zones','continents'].includes(k))) fail();
    if(w.baseAll && !refs(w.baseAll) || w.candidate && !ids.includes(w.candidate) || w.anyRole && (!Array.isArray(w.anyRole) || !w.anyRole.every(k=>Object.hasOwn(p.roles,k)))) fail();
    if(w.needAtLeast && !Object.entries(w.needAtLeast).every(([k,v])=>['mobility','healing','control'].includes(k) && num(v,0,5))) fail();
    if(w.minLevel!==undefined && !num(w.minLevel,1,100) || w.maxLevel!==undefined && !num(w.maxLevel,1,100) || w.minLevel!==undefined && w.maxLevel!==undefined && w.minLevel>w.maxLevel) fail();
    for(const list of [w.modes,w.zones,w.continents]) if(list && (!Array.isArray(list) || !list.every(str))) fail();
    if(w.modes && !w.modes.every(x=>['solo','duo','group'].includes(x))) fail();
  }
  for(const r of p.companionRules) if(!str(r.id) || seen.has(r.id) || !refs(r.build) || !refs(r.buddy) || !r.build.length || !r.buddy.length || !num(r.points) || !str(r.why) || !str(r.tradeoff) || !prov(r.provenance)) fail(); else seen.add(r.id);
  for(const key of Object.keys(defaultRules.zoneScoring)) if(!num(p.zoneScoring[key],0,100)) fail();
  const zoneIds=new Set<string>();
  for(const z of p.zones) {
    if(!str(z.id) || zoneIds.has(z.id) || !str(z.name) || !str(z.continent) || !num(z.min,1,100) || !num(z.max,z.min,100) || !num(z.control,0,5) || !num(z.heal,0,5) || !prov(z.provenance)) fail();
    zoneIds.add(z.id);
    for(const list of [z.aliases,z.loot]) if(!Array.isArray(list) || !list.every(str)) fail();
    for(const list of [z.factionEffects,z.accessFactions]) if(list!==null && (!Array.isArray(list) || !list.every(str))) fail();
  }
}
export function coverage(ids:string[],pack:RulePack):Ratings {
  return Object.fromEntries(pack.metrics.map(m=>[m,Math.max(0,...ids.map(id=>pack.classes.find(c=>c.id===id)?.ratings[m]||0))]));
}
export function teammateBuilds(i:AdvisorInput): string[][] {
  return i.mode === 'solo' ? [] : [i.buddy, ...(i.mode === 'group' ? i.party || [] : [])];
}
function matches(w:When,i:AdvisorInput,candidate:string) {
  const needs:Record<string,number>={mobility:i.mobility,healing:i.healing,control:i.control};
  return (!w.baseAll || contains([i.primary,i.secondary],w.baseAll)) && (!w.candidate || w.candidate===candidate)
    && (!w.anyRole || w.anyRole.includes(i.role)) && (!w.needAtLeast || Object.entries(w.needAtLeast).every(([k,v])=>needs[k]>=v))
    && (w.minLevel===undefined || i.level!==null && i.level>=w.minLevel) && (w.maxLevel===undefined || i.level!==null && i.level<=w.maxLevel)
    && (!w.modes || w.modes.includes(i.mode)) && (!w.zones || w.zones.some(z=>same(z,i.zone))) && (!w.continents || w.continents.some(c=>same(c,i.continent)));
}
export function companionMatches(build:string[],buddy:string[],pack=defaultRules) {
  return pack.companionRules.filter(r=>contains(build,r.build)&&contains(buddy,r.buddy) || contains(build,r.buddy)&&contains(buddy,r.build));
}
function partyCompanionMatches(build:string[], input:AdvisorInput, pack:RulePack) {
  const matches = teammateBuilds(input).flatMap(buddy=>companionMatches(build,buddy,pack));
  return [...new Map(matches.map(rule=>[rule.id,rule])).values()];
}
export function assessBuild(build:string[],i:AdvisorInput,pack=defaultRules) {
  const own=coverage(build,pack), buddy=coverage(teammateBuilds(i).flat(),pack);
  const strengths=Object.entries(own).filter(([,v])=>v>=4).sort((a,b)=>b[1]-a[1]);
  const gaps=['heal','control','survivability','travel'].filter(m=>own[m]<3);
  return { build, ratings:own, strengths, gaps, workload:Math.max(0,...build.map(id=>pack.classes.find(c=>c.id===id)?.workload||0)),
    buddyFills:gaps.filter(m=>buddy[m]>=3), companions:partyCompanionMatches(build,i,pack),
    suggestedCompanions:pack.companionRules.flatMap(r=>contains(build,r.build)?[{...r,suggested:r.buddy}]:contains(build,r.buddy)?[{...r,suggested:r.build}]:[]),
    tradeoffs:build.map(id=>pack.classes.find(c=>c.id===id)?.tradeoff).filter(Boolean) as string[],
    provenance:heuristic };
}
export function recommend(i:AdvisorInput,pack=defaultRules) {
  const errors=validateInput(i,pack);
  if(errors.length) return {errors,rankings:[],assessment:null,zones:[]};
  const base=coverage([i.primary,i.secondary],pack), buddy=coverage(teammateBuilds(i).flat(),pack);
  const weights={...pack.weights}; const t=pack.tuning;
  for(const m of pack.roles[i.role]) weights[m]+=t.roleWeight;
  weights.mobility+=i.mobility*t.needWeight; weights.heal+=i.healing*t.needWeight; weights.control+=i.control*t.needWeight;
  weights.survivability+=t.modeSurvival[i.mode];
  const rankings=pack.classes.filter(c=>c.id!==i.primary && c.id!==i.secondary).map(c=>{
    const breakdown:Evidence[]=[];
    for(const m of pack.metrics) {
      const existing=Math.max(base[m],buddy[m]*t.buddyCoverage);
      const gain=Math.max(0,c.ratings[m]-existing);
      breakdown.push({label:m,points:round((gain+t.retainedStrength*c.ratings[m])*weights[m]),why:gain>0?'Adds '+(metricWords[m]||m)+' beyond what your classes or buddy can already do.':'Still helps with '+(metricWords[m]||m)+', but shared skills add fewer points.',provenance:c.provenance});
    }
    const overlap=pack.metrics.reduce((sum,m)=>sum+Math.min(c.ratings[m],base[m]),0);
    breakdown.push({label:'overlap',points:round(-overlap*t.overlapPenalty),why:'Shared skills get fewer points. These rules do not add the skill limits of two classes together.',provenance:pack.provenance});
    breakdown.push({label:'workload',points:round(-Math.max(0,c.workload-i.complexity)*t.workloadPenalty),why:'Points are lost when this class needs more effort than you want to put in.',provenance:c.provenance});
    const rules=pack.rules.filter(r=>matches(r.when,i,c.id));
    rules.forEach(r=>breakdown.push({label:r.id,points:r.points,why:r.why,provenance:r.provenance}));
    const companions=partyCompanionMatches([i.primary,i.secondary,c.id],i,pack);
    companions.forEach(r=>breakdown.push({label:r.id,points:r.points,why:r.why,provenance:r.provenance}));
    return {id:c.id,name:c.name,score:round(breakdown.reduce((s,b)=>s+b.points,0)),breakdown,rules,tradeoffs:[c.tradeoff,...rules.flatMap(r=>r.tradeoff?[r.tradeoff]:[]),...companions.map(r=>r.tradeoff)]};
  }).sort((a,b)=>b.score-a.score || (a.id<b.id?-1:a.id>b.id?1:0));
  const build=[i.primary,i.secondary,i.tertiary].filter(Boolean);
  return {errors,rankings,assessment:assessBuild(build,i,pack),zones:recommendZones(i,i.level!==null&&i.level<pack.tertiaryUnlockLevel?build.slice(0,2):build,pack)};
}
export function recommendZones(i:AdvisorInput,build:string[],pack=defaultRules) {
  const cap=coverage(build,pack), buddy=coverage(teammateBuilds(i).flat(),pack), s=pack.zoneScoring;
  return pack.zones.map(z=>{
    const breakdown:Evidence[]=[]; const cautions:string[]=[]; let blocked=false;
    const add=(label:string,points:number,why:string)=>breakdown.push({label,points:round(points),why,provenance:z.provenance});
    if(i.level===null) cautions.push('Level unknown. Add your level to check how well this zone fits for XP.');
    else if(i.level<z.min) add('XP fit',-(z.min-i.level)*s.belowPerLevel,'Your level is below the saved hunting range. This range is a guide, not a rule for entering the zone.');
    else if(i.level>z.max) add('XP fit',-(i.level-z.max)*s.abovePerLevel,'Your level is above the saved hunting range. You may earn less useful XP here.');
    else add('XP fit',s.xp,'Your level is in the saved hunting range. Each camp may suit a different level.');
    if([z.name,z.id,...z.aliases].some(v=>same(v,i.zone))) add('Travel',s.local,'Already in this zone.');
    else if(i.continent) add('Travel',same(i.continent,z.continent)?s.sameContinent:-s.otherContinentPenalty,'Being on the same continent gives a rough travel estimate. It does not check the route.');
    const control=Math.max(cap.control,buddy.control), heal=Math.max(cap.heal,buddy.heal);
    add('Control',-Math.max(0,z.control-control)*s.controlNeed,'Points are lost if your party has less enemy control than this zone is rated to need.');
    add('Recovery',-Math.max(0,z.heal-heal)*s.healNeed,'Points are lost if your party has less healing than this zone is rated to need.');
    for(const goal of new Set(i.gearGoals.map(x=>x.trim()).filter(Boolean))) {
      const found=z.loot.filter(item=>same(item,goal) || item.toLowerCase().includes(goal.toLowerCase()));
      if(found.length) add('Loot',s.lootMatch,'Saved item match: '+found.join(', ')+'. Check where the item drops before you travel.');
      else {add('Loot',-s.unknownLootPenalty,'No saved item match for '+goal+'.');cautions.push('No saved source for this gear goal: '+goal+'. The item may still drop here; the advisor does not know.');}
    }
    if(i.factionConstraints.some(x=>x.trim())) {
      if(z.factionEffects===null || z.accessFactions===null) {add('Faction access',-s.unknownFactionPenalty,'There is no saved information about faction effects or access.');cautions.push('Faction safety unknown: check '+i.factionConstraints.join(', ')+' before you hunt here.');}
      const conflicts=i.factionConstraints.filter(f=>[...(z.factionEffects||[]),...(z.accessFactions||[])].some(v=>same(v,f)));
      if(conflicts.length) {blocked=true;cautions.push('Left out due to your faction choices: '+conflicts.join(', ')+'.');}
    }
    return {zone:z,score:round(breakdown.reduce((sum,x)=>sum+x.points,0)),breakdown,cautions,blocked};
  }).sort((a,b)=>Number(a.blocked)-Number(b.blocked) || b.score-a.score || (a.zone.id<b.zone.id?-1:1));
}
