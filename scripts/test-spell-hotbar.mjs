import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultInput, defaultRules } from '../lib/build-advisor.ts';
import { castingClasses, recommendHotbars, spellCatalog, validateSpellCatalog } from '../lib/spell-hotbar.ts';

test('bundled spell catalog has a cited complete public-table snapshot for every listed casting class', () => {
  validateSpellCatalog(spellCatalog);
  assert.equal(spellCatalog.spells.length, 500);
  assert.match(spellCatalog.source.url, /^https:\/\//);
  for (const id of ['BRD', 'BST', 'CLR', 'DRU', 'ENC', 'MAG', 'NEC', 'PAL', 'RNG', 'SHD', 'SHM', 'WIZ']) assert(castingClasses().some(([classId]) => classId === id));
});

test('spell bar is deterministic, respects selected classes and uses level-gated spell access', () => {
  const input = { ...defaultInput, primary: 'RNG', secondary: 'ROG', tertiary: 'BRD', level: 25, role: 'dps' };
  const first = recommendHotbars(input, defaultRules), second = recommendHotbars(input, defaultRules);
  assert.deepEqual(first.spellBar.map(spell => spell.name), second.spellBar.map(spell => spell.name));
  assert(first.spellBar.length > 0 && first.spellBar.length <= 14);
  assert(first.spellBar.every(spell => spell.availableAt <= 25 && input.primary === spell.classId || spell.availableAt <= 25 && input.secondary === spell.classId || spell.availableAt <= 25 && input.tertiary === spell.classId));
  assert(first.meleeBar.some(ability => ability.name === 'Backstab'));
});

test('hotbar layout shifts toward control and healing when those roles are selected', () => {
  const input = { ...defaultInput, primary: 'WAR', secondary: 'CLR', tertiary: 'ENC', level: 25, role: 'control', control: 5, healing: 4 };
  const plan = recommendHotbars(input, defaultRules);
  assert(plan.spellBar.some(spell => spell.category === 'control'));
  assert(plan.spellBar.some(spell => spell.category === 'heal' || spell.category === 'cure'));
  assert(plan.meleeBar.some(ability => ability.name === 'Taunt'));
});
