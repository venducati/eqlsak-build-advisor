import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCombatLine,
  CombatLines,
  summarizeCombat,
} from '../lib/combat-meter.ts';
import { readProfiles, csvCell } from '../lib/local-state.ts';
import { readLootIndex } from '../lib/loot-index.ts';
const at = Date.parse('2026-09-10T12:00:00Z');
test('malformed remote loot records fail before reaching rendering or totals', () => {
  const record = {
    mob: 'a gnoll',
    seen: 2,
    sessions: [{ zone: 'Blackburrow' }],
  };
  const payload = { data: { items: { Fang: [record] } } };
  assert.equal(readLootIndex(payload)[0].sightings[0].seen, 2);
  for (const bad of [
    null,
    {},
    [],
    { data: { items: { Fang: [null] } } },
    { data: { items: { Fang: [{ ...record, sessions: null }] } } },
    { data: { items: { Fang: [{ ...record, seen: '2' }] } } },
  ])
    assert.throws(() => readLootIndex(bad));
});
const event = (text, ms = 0) =>
  parseCombatLine('[' + new Date(at + ms).toISOString() + '] ' + text);
test('spell direct hit and periodic ticks remain distinct', () => {
  assert.equal(
    event('You hit a gnoll for 120 points of fire damage by Flame Lick.').kind,
    'DD',
  );
  assert.equal(
    event('a gnoll has taken 25 damage from your Flame Lick.').kind,
    'DoT',
  );
  assert.equal(
    event("a gnoll has taken 25 damage from Alia's Flame Lick.").actor,
    'Alia',
  );
});
test('non-melee without a named spell stays unclassified', () =>
  assert.equal(
    event('You hit a gnoll for 5 points of non-melee damage.').kind,
    'damage',
  ));
test('healing and HoT use logged leading amount without guessing overheal', () => {
  const heal = event(
    'Alia healed YOU over time for 50 (70) hit points by Regrowth.',
  );
  assert.equal(heal.kind, 'HoT');
  assert.equal(heal.amount, 50);
  assert.equal(heal.ability, 'Regrowth');
});
test('incoming damage is not personal DPS; named allies excluded unless pet selected', () => {
  const e = [
    event('You slash a gnoll for 90 points of damage.'),
    event('a gnoll hits YOU for 20 points of damage.'),
    event('Alia hits a gnoll for 100 points of damage.'),
    event('Pet hits a gnoll for 30 points of damage.'),
  ];
  const a = summarizeCombat(e, 'Aria', '', at, true);
  assert.equal(a.damage, 90);
  assert.equal(a.incoming, 20);
  assert.equal(a.dps, 3);
  assert.equal(summarizeCombat(e, 'Aria', 'Pet', at, true).damage, 120);
});
test('fixed rolling window excludes old and future events and decays to zero', () => {
  const e = [event('You kick a gnoll for 300 points of damage.')];
  assert.equal(summarizeCombat(e, '', '', at + 30000, true).damage, 0);
  assert.equal(summarizeCombat(e, '', '', at - 1, true).damage, 0);
});
test('cast and worn-off messages are observations, not inferred active buffs', () => {
  assert.equal(event('You begin casting Minor Healing.').kind, 'cast');
  assert.equal(event('You begin casting Minor Healing.').actor, 'You');
  assert.equal(
    event('Your Flame Lick spell has worn off of a gnoll.').kind,
    'worn-off',
  );
  assert.equal(event('You feel armored.').kind, 'beneficial');
  assert.equal(event('You feel mysterious.').kind, 'unknown');
});
test('partial chunks, CRLF and repeated equal hits are preserved without duplication', () => {
  const reader = new CombatLines();
  assert.deepEqual(reader.push('first\r'), []);
  assert.deepEqual(reader.push('\nsecond\nsecond\npar'), [
    'first',
    'second',
    'second',
  ]);
  assert.deepEqual(reader.push('tial\n'), ['partial']);
  reader.reset(true);
  assert.deepEqual(reader.push('old partial tail\nnew\n'), ['new']);
});
test('oversize lines are dropped without poisoning subsequent messages', () => {
  const reader = new CombatLines();
  reader.push('x'.repeat(9000));
  assert.deepEqual(reader.push('tail\ngood\n'), ['good']);
});
test('invalid timestamps are never used for rates', () => {
  assert.equal(
    parseCombatLine('You hit a gnoll for 4 points of damage.'),
    null,
  );
  assert.equal(parseCombatLine('[not a date] text'), null);
});
test('corrupt and structurally invalid stored profiles fall back safely', () => {
  const fallback = [
    { name: 'One', level: '1', build: 'RNG', location: '', goal: '' },
  ];
  for (const raw of ['[]', 'null', '{}', 'broken', '[{"name":4}]'])
    assert.equal(readProfiles(raw, fallback), fallback);
  assert.deepEqual(readProfiles(JSON.stringify(fallback), []), fallback);
});
test('CSV exports neutralize spreadsheet formulas and escape quotes', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('hello "there"'), '"hello ""there"""');
});
