import catalogSeed from '../data/eql-spell-catalog.json' with { type: 'json' };
import abilitySeed from '../data/eql-hotbar-abilities.json' with { type: 'json' };
import type { AdvisorInput, Provenance, RulePack } from './build-advisor';

export type SpellClass = { id: string; level: number };
export type Spell = { name: string; level: number; classes: SpellClass[]; mana: number | null; range: string; cast: number | null; recast: number | null; duration: string; target: string; type: string; resist: string };
export type SpellCategory = 'damage' | 'dot' | 'heal' | 'cure' | 'control' | 'debuff' | 'buff' | 'pet' | 'travel' | 'stealth' | 'utility';
export type SpellCatalog = { version: number; reviewedOn: string; provenance: Provenance; source: { title: string; url: string; upstream: string; note: string }; spells: Spell[] };
export type HotbarAbility = { name: string; class: string; kind: 'damage' | 'defense' | 'heal' | 'control' | 'utility'; priority: number };
type AbilityCatalog = { version: number; provenance: Provenance; abilities: HotbarAbility[] };
export type SpellCandidate = Spell & { category: SpellCategory; classId: string; availableAt: number; score: number; reason: string };
export type HotbarPlan = { level: number; build: string[]; spellBar: SpellCandidate[]; preparation: SpellCandidate[]; meleeBar: (HotbarAbility & { score: number; reason: string })[]; notices: string[]; catalog: SpellCatalog };

export const spellCatalog = catalogSeed as SpellCatalog;
export const abilityCatalog = abilitySeed as AbilityCatalog;
const classNames: Record<string, string> = { BRD: 'Bard', BST: 'Beastlord', CLR: 'Cleric', DRU: 'Druid', ENC: 'Enchanter', MAG: 'Magician', NEC: 'Necromancer', PAL: 'Paladin', RNG: 'Ranger', ROG: 'Rogue', SHD: 'Shadow Knight', SHM: 'Shaman', WIZ: 'Wizard' };
const travelWords = /gate|portal|circle|teleport|transloc|evacuat|succor|spirit of wolf|selo/i;
const controlWords = /mesmer|mesmeriz|root|snare|lull|pacif|fear|charm|stun|slow|calm|blind/i;
const debuffWords = /enfeeb|weaken|decreas|malo|tash|crippl|disease cloud|cancel|poison|curse/i;
const petWords = /elemental|animation|summon|bones|corpse|pet|companion/i;
const stealthWords = /invisib|gather shadows|hide/i;
const categoryNames: Record<SpellCategory, string> = { damage: 'Direct damage', dot: 'Damage over time', heal: 'Healing', cure: 'Cure', control: 'Crowd control', debuff: 'Debuff', buff: 'Buff', pet: 'Pet', travel: 'Travel', stealth: 'Stealth', utility: 'Utility' };

export function categoryForSpell(spell: Spell): SpellCategory {
  const type = spell.type.toLowerCase(), name = spell.name.toLowerCase();
  if (travelWords.test(name)) return 'travel';
  if (stealthWords.test(name) || type.includes('invisibility')) return 'stealth';
  if (type.includes('damage over time')) return 'dot';
  if (type.includes('heal over time') || type === 'heal' || name.includes('heal') || name.includes('remedy') || name.includes('renew')) return 'heal';
  if (type.includes('cure') || type.includes('remove') || /\bcure\b/i.test(name)) return 'cure';
  if (type.includes('slow') || controlWords.test(name)) return 'control';
  if (type.includes('pet') || petWords.test(name)) return 'pet';
  if (type.includes('detrimental') || type.includes('direct damage')) return debuffWords.test(name) || type.includes('utility detrimental') ? 'debuff' : 'damage';
  if (type.includes('buff') || type.includes('beneficial')) return 'buff';
  return 'utility';
}

export function spellCategoryName(category: SpellCategory) { return categoryNames[category]; }
export function castingClasses() { return Object.entries(classNames).filter(([id]) => spellCatalog.spells.some(spell => spell.classes.some(c => c.id === id))); }
export function validateSpellCatalog(value: unknown): asserts value is SpellCatalog {
  const catalog = value as SpellCatalog;
  if (!catalog || catalog.version !== 1 || !Array.isArray(catalog.spells) || catalog.spells.length < 400 || !catalog.provenance || !catalog.source?.url.startsWith('https://')) throw new Error('The spell catalog is not a supported EQLSaK catalog.');
  for (const spell of catalog.spells) if (!spell || typeof spell.name !== 'string' || !spell.name || !Number.isFinite(spell.level) || !Array.isArray(spell.classes) || !spell.classes.length || spell.classes.some(c => !classNames[c.id] || !Number.isFinite(c.level))) throw new Error('The spell catalog contains an invalid spell record.');
}

function availability(spell: Spell, build: string[], level: number) {
  const choices = spell.classes.filter(classSpell => build.includes(classSpell.id) && classSpell.level <= level).sort((a, b) => b.level - a.level);
  return choices[0] ? { classId: choices[0].id, availableAt: choices[0].level } : null;
}
function categoryWeight(category: SpellCategory, input: AdvisorInput) {
  const role: Record<string, Partial<Record<SpellCategory, number>>> = {
    overall: { damage: 5, dot: 4, heal: 4, control: 4, debuff: 3, buff: 3, pet: 3, cure: 2 },
    dps: { damage: 9, dot: 8, debuff: 5, pet: 5, control: 2 },
    tank: { control: 8, buff: 7, heal: 6, cure: 5, debuff: 4, damage: 3 },
    heal: { heal: 10, cure: 8, buff: 6, control: 4, damage: 2 },
    control: { control: 10, debuff: 7, damage: 4, buff: 3 },
    travel: { travel: 10, stealth: 7, utility: 6, buff: 3 },
    stealth: { stealth: 10, control: 5, travel: 4, utility: 4 },
    pulling: { control: 8, debuff: 6, heal: 5, damage: 4, stealth: 3 },
    'named hunting': { debuff: 8, dot: 7, heal: 7, control: 5, damage: 5, buff: 4 },
    'faction work': { travel: 7, stealth: 6, control: 5, buff: 3, utility: 4 }
  };
  let score = role[input.role]?.[category] || 1;
  if (category === 'heal') score += input.healing * 1.5;
  if (category === 'control') score += input.control * 1.5;
  if (category === 'travel' || category === 'stealth') score += input.mobility * 1.2;
  if (input.mode !== 'solo' && ['heal', 'cure', 'buff', 'control'].includes(category)) score += 1.5;
  return score;
}
function makeCandidates(input: AdvisorInput, level: number) {
  const build = [input.primary, input.secondary, input.tertiary].filter(Boolean), known = new Map<string, SpellCandidate>();
  for (const spell of spellCatalog.spells) {
    const access = availability(spell, build, level); if (!access) continue;
    const category = categoryForSpell(spell), score = categoryWeight(category, input) * 10 + access.availableAt / 10 - (spell.mana || 0) / 1000;
    const candidate: SpellCandidate = { ...spell, ...access, category, score, reason: `${spellCategoryName(category)} supports your ${input.role === 'overall' ? 'general' : input.role} goal.` };
    const key = spell.name.toLowerCase(), old = known.get(key);
    if (!old || candidate.availableAt > old.availableAt || candidate.availableAt === old.availableAt && (candidate.mana || Infinity) < (old.mana || Infinity)) known.set(key, candidate);
  }
  return [...known.values()].sort((a, b) => b.score - a.score || b.availableAt - a.availableAt || a.name.localeCompare(b.name));
}
function selectDistinct(candidates: SpellCandidate[], count: number, categories: SpellCategory[]) {
  const picked: SpellCandidate[] = [];
  for (const category of categories) { const choice = candidates.find(spell => spell.category === category && !picked.includes(spell)); if (choice && picked.length < count) picked.push(choice); }
  for (const spell of candidates) if (picked.length < count && !picked.includes(spell)) picked.push(spell);
  return picked;
}
const mainOrder: Record<string, SpellCategory[]> = {
  dps: ['damage', 'dot', 'debuff', 'pet', 'control'], tank: ['control', 'buff', 'heal', 'cure', 'debuff'], heal: ['heal', 'cure', 'buff', 'control'], control: ['control', 'heal', 'cure', 'debuff', 'damage', 'buff'], travel: ['travel', 'stealth', 'utility', 'buff'], stealth: ['stealth', 'control', 'travel', 'utility'], pulling: ['control', 'debuff', 'heal', 'damage'], 'named hunting': ['debuff', 'dot', 'heal', 'control', 'damage'], 'faction work': ['travel', 'stealth', 'control', 'utility'], overall: ['heal', 'control', 'damage', 'dot', 'debuff', 'pet', 'cure', 'buff']
};
export function recommendHotbars(input: AdvisorInput, pack: RulePack, spellSlots = 14, meleeSlots = 8): HotbarPlan {
  validateSpellCatalog(spellCatalog); const level = input.level ?? 65, build = [input.primary, input.secondary, input.tertiary].filter(Boolean), candidates = makeCandidates(input, level);
  const combat = candidates.filter(spell => !['travel', 'utility'].includes(spell.category));
  const spellBar = selectDistinct(combat, Math.max(1, Math.min(20, spellSlots)), mainOrder[input.role] || mainOrder.overall);
  const preparation = selectDistinct(candidates.filter(spell => ['buff', 'travel', 'stealth', 'pet', 'utility'].includes(spell.category) && !spellBar.includes(spell)), 10, ['buff', 'pet', 'travel', 'stealth', 'utility']);
  const abilityWeights: Record<string, Partial<Record<HotbarAbility['kind'], number>>> = { dps: { damage: 5 }, tank: { control: 5, defense: 5, heal: 3 }, heal: { heal: 5, defense: 4 }, control: { control: 5, defense: 3 }, travel: { utility: 5 }, stealth: { utility: 5 }, pulling: { control: 5, defense: 4 }, 'named hunting': { damage: 4, defense: 4, heal: 3 }, 'faction work': { utility: 5 }, overall: { damage: 3, defense: 3, control: 3, heal: 3, utility: 2 } };
  const meleeBar = abilityCatalog.abilities.filter(ability => build.includes(ability.class)).map(ability => ({ ...ability, score: ability.priority + (abilityWeights[input.role]?.[ability.kind] || 0), reason: `${classNames[ability.class] || ability.class} action for ${ability.kind}.` })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, Math.max(1, Math.min(20, meleeSlots)));
  const names = Object.fromEntries(pack.classes.map(c => [c.id, c.name]));
  const notices = [input.level === null ? 'Level is blank, so the planner shows spells through level 65. Enter your level for a current loadout.' : `Showing spells available at level ${level}.`, candidates.length ? `${candidates.length} known spells match ${build.map(id => names[id] || id).join(' / ')} at this level.` : 'No bundled spell records match this trio and level.', 'Hotbar order is heuristic/inference. Check your spell book, AAs, focus effects and current patch notes before replacing a saved in-game layout.'];
  return { level, build, spellBar, preparation, meleeBar, notices, catalog: spellCatalog };
}
