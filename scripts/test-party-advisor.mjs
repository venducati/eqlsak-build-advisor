import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultInput,
  defaultRules,
  recommend,
  recommendZones,
  validateInput,
} from '../lib/build-advisor.ts';
import { assessParty } from '../lib/party-advisor.ts';
import { readPlanFile } from '../lib/advisor-plans.ts';
const zone = defaultRules.zones.find((zone) => zone.name === 'Splitpaw Lair');
const base = {
  ...defaultInput,
  tertiary: 'BRD',
  level: 30,
  mode: 'group',
  buddy: ['WAR', 'ROG', 'MNK'],
  party: [
    ['CLR', 'ENC', 'SHM'],
    ['DRU', 'MAG', 'PAL'],
  ],
};

test('all four trios appear and keep player identity', () => {
  const result = assessParty(base, defaultRules, zone);
  assert.equal(result.players.length, 4);
  assert.equal(result.entered, 4);
  assert.deepEqual(
    result.players.map((player) => player.build),
    [['RNG', 'ROG', 'BRD'], base.buddy, ...base.party],
  );
  assert(
    result.metrics.find((metric) => metric.id === 'heal').leaders.includes(3),
  );
  assert(
    result.metrics
      .find((metric) => metric.id === 'control')
      .leaders.includes(3),
  );
  assert.deepEqual(result, assessParty(base, defaultRules, zone));
});
test('shared strengths provide backups without adding skill caps', () => {
  const repeated = {
    ...base,
    primary: 'WAR',
    secondary: 'ROG',
    tertiary: 'MNK',
    party: [base.buddy, base.buddy],
  };
  const result = assessParty(repeated, defaultRules, zone);
  const damage = result.metrics.find((metric) => metric.id === 'dps');
  assert.equal(damage.value, 5);
  assert.equal(damage.providers.length, 4);
  assert(
    result.metrics.every((metric) => metric.value >= 0 && metric.value <= 5),
  );
});
test('mode controls which players count and older saved inputs still work', () => {
  assert.equal(
    assessParty({ ...base, mode: 'solo' }, defaultRules, zone).players.length,
    1,
  );
  assert.equal(
    assessParty({ ...base, mode: 'duo' }, defaultRules, zone).players.length,
    2,
  );
  assert.equal(validateInput(defaultInput).length, 0);
  assert.equal(
    assessParty({ ...defaultInput, mode: 'group' }, defaultRules, zone).entered,
    1,
  );
});
test('a third player fills a zone gap and changes the actual zone score', () => {
  const pair = {
    ...base,
    primary: 'WAR',
    secondary: 'ROG',
    tertiary: 'MNK',
    party: [],
  };
  const group = { ...pair, party: [['CLR', 'ENC', 'SHM']] };
  const pairZone = recommendZones(pair, ['WAR', 'ROG', 'MNK']).find(
    (row) => row.zone.id === zone.id,
  );
  const groupZone = recommendZones(group, ['WAR', 'ROG', 'MNK']).find(
    (row) => row.zone.id === zone.id,
  );
  assert(groupZone.score > pairZone.score);
  assert(
    assessParty(pair, defaultRules, zone).metrics.some(
      (metric) => metric.gap > 0,
    ),
  );
  assert(
    assessParty(group, defaultRules, zone).metrics.every(
      (metric) => metric.gap === 0,
    ),
  );
});
test('party validation rejects too many players, duplicate or unknown classes and malformed rows', () => {
  for (const party of [
    [[], [], []],
    [['CLR', 'CLR']],
    [['NOPE']],
    [null],
    'bad',
  ])
    assert(validateInput({ ...base, party }).length > 0);
  assert.equal(
    validateInput({ ...base, party: [base.buddy, base.buddy] }).length,
    0,
  );
});
test('locked third class is visible but excluded; teammate levels are not assumed', () => {
  const result = assessParty(
    {
      ...base,
      primary: 'WAR',
      secondary: 'ROG',
      tertiary: 'CLR',
      level: 5,
      mode: 'solo',
    },
    defaultRules,
    zone,
  );
  assert.deepEqual(result.players[0].build, ['WAR', 'ROG', 'CLR']);
  assert.deepEqual(result.players[0].activeBuild, ['WAR', 'ROG']);
  assert.equal(result.metrics.find((metric) => metric.id === 'heal').value, 0);
});
test('one specialist taking multiple jobs is called out', () => {
  const result = assessParty(
    {
      ...base,
      primary: 'WAR',
      secondary: 'ROG',
      tertiary: 'MNK',
      buddy: ['CLR', 'ENC', 'SHM'],
      party: [],
    },
    defaultRules,
    zone,
  );
  assert(
    result.busy.some(
      (row) =>
        row.player === 2 &&
        row.jobs.includes('Healing') &&
        row.jobs.includes('Enemy control'),
    ),
  );
});
test('saved build files carry the whole party and duplicate synergy rules are not counted twice', () => {
  const plan = {
    id: 'party',
    name: 'Four players',
    savedAt: '2026-09-11T00:00:00Z',
    input: base,
  };
  assert.deepEqual(
    readPlanFile(
      JSON.stringify({ format: 'eqlsak-build-plan', version: 1, plan }),
      defaultRules,
    ).input.party,
    base.party,
  );
  const pair = { ...base, buddy: ['MNK', 'CLR', 'ENC'], party: [] };
  const group = { ...pair, party: [pair.buddy, pair.buddy] };
  assert.deepEqual(recommend(group).rankings, recommend(pair).rankings);
});
