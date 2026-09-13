import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCombatLine } from '../lib/combat-meter.ts';
import {
  appendTripEvents,
  finishTrip,
  goalsForTrip,
  newTripStream,
  parseTripLine,
  baseTripZone,
  copperAmount,
  tripAdvice,
  readTripHistory,
  validateTripGoals,
  tripContext,
} from '../lib/encounter-journal.ts';
import { defaultInput, defaultRules } from '../lib/build-advisor.ts';
const at = Date.parse('2026-09-11T12:00:00Z');
const e = (raw, seconds = 0) =>
  parseCombatLine(`[${new Date(at + seconds * 1000).toISOString()}] ${raw}`);
const stream = () =>
  newTripStream('eqlog_Aria_Test.txt', 'Aria', (zone) =>
    tripContext(defaultInput, defaultRules, zone),
  );
const goal = {
  id: 'gem',
  item: 'Test Gem',
  quantity: 2,
  zone: 'Befallen',
  mob: 'a ghoul',
};

test('EQL kept, auto-sold, depot and upgrade loot preserve disposition and quantities', () => {
  const kept = parseTripLine(
    "--You have looted 2 Test Gem from a ghoul's corpse.--",
  ).loot;
  assert.equal(kept.item, 'Test Gem');
  assert.equal(kept.quantity, 2);
  assert.equal(kept.disposition, 'kept');
  const sold = parseTripLine(
    "You looted a Test Ring from a ghoul's corpse and sold it for 3 silver and 6 copper.",
  ).loot;
  assert.equal(sold.copper, 36);
  assert.equal(sold.disposition, 'sold');
  assert.equal(
    parseTripLine(
      "You looted 3 Test Thread from a ghoul's corpse and stored it in your tradeskill depot.",
    ).loot.disposition,
    'stored',
  );
  const upgrade = parseTripLine(
    "You looted a Test Ring from a ghoul's corpse to create a Test Ring +1.",
  ).loot;
  assert.equal(upgrade.item, 'Test Ring');
  assert.equal(upgrade.result, 'Test Ring +1');
  assert.equal(upgrade.created, 1);
});
test('chat, other looters, ambiguous tails, bad quantities and invalid money are not gains', () => {
  for (const line of [
    "You say, 'You looted a Gem from a ghoul's corpse.'",
    "Other looted a Gem from a ghoul's corpse.",
    "You looted 0 Gem from a ghoul's corpse.",
    "You looted a Gem from a ghoul's corpse somehow.",
    "You looted a Gem from a ghoul's corpse and sold it for many gold.",
  ])
    assert.equal(parseTripLine(line), null, line);
  assert.equal(copperAmount('3 platinum, 2 gold and 1 copper'), 3201);
  assert.equal(copperAmount('5 gold and an item'), null);
  assert.equal(parseTripLine('You receive 3 gold as your split.').coin, 300);
});
test('each zone entry closes the prior trip and preserves instance number and tier', () => {
  const s = stream();
  appendTripEvents(s, [
    e('You have entered Befallen 4 (Refined).'),
    e("--You have looted 2 Test Gem from a ghoul's corpse.--", 1),
    e('You have entered Befallen 5 (Fused).', 3),
  ]);
  assert.equal(s.trips.length, 2);
  assert.equal(s.trips[0].zone, 'Befallen 4 (Refined)');
  assert.equal(s.trips[0].baseZone, 'Befallen');
  assert.equal(s.trips[0].ended, at + 3000);
  assert.equal(s.trips[0].exitConfirmed, true);
  assert.equal(s.trips[1].drops.length, 0);
  assert.equal(
    baseTripZone('An unknown dungeon 12 (Pristine)'),
    'An unknown dungeon',
  );
});
test('incremental trips keep totals beyond the combat display limit and do not count uncredited deaths', () => {
  const s = stream();
  appendTripEvents(s, [e('You have entered Befallen.')]);
  for (let batch = 0; batch < 22; batch++)
    appendTripEvents(
      s,
      Array.from({ length: 1000 }, (_, n) =>
        e('You hit a ghoul for 1 points of damage.', batch * 1000 + n),
      ),
    );
  appendTripEvents(s, [
    e('You have slain a ghoul!', 22001),
    e('a ghoul died.', 22002),
    e('You have been slain by a ghoul!', 22003),
  ]);
  assert.equal(s.active.damage, 22000);
  assert.equal(s.active.kills['a ghoul'], 1);
  assert.equal(s.active.deaths, 1);
  assert.equal(s.active.ended, null, 'death alone does not prove leaving');
  finishTrip(s, at + 22004000, 'You reported leaving: Disconnected', true);
  assert.equal(s.active, null);
  assert.equal(s.trips[0].exitConfirmed, true);
});
test('goals distinguish secured, auto-sold, created, manually missed and unobserved items', () => {
  const s = stream();
  appendTripEvents(s, [
    e('You have entered Befallen 2 (Refined).'),
    e("You looted 2 Test Gem from a ghoul's corpse and sold it for 1 gold.", 1),
    e("You looted a Ring from a ghoul's corpse to create a Ring +1.", 2),
    e("You looted a Ring from a ghoul's corpse to create a Ring +1.", 3),
  ]);
  const goals = goalsForTrip(
    [
      goal,
      { ...goal, id: 'ring', item: 'Ring +1' },
      { ...goal, id: 'missing', item: 'Unseen Crown' },
    ],
    s.active,
  );
  assert.equal(goals[0].secured, 0);
  assert.equal(goals[0].sold, 2);
  assert.equal(goals[0].remaining, 2);
  assert.equal(goals[1].secured, 2);
  assert.equal(goals[1].remaining, 0);
  assert.equal(goals[2].status, 'Not recorded this trip');
  assert.equal(goals[2].missed, 0);
  s.active.missed.push({
    item: 'Unseen Crown',
    quantity: 1,
    mob: '',
    reason: 'Lost the roll',
  });
  assert.equal(
    goalsForTrip([{ ...goal, item: 'Unseen Crown' }], s.active)[0].missed,
    1,
  );
  assert.equal(goalsForTrip([{ ...goal, zone: 'Najena' }], s.active).length, 0);
});
test('trip advice uses local observations and never declares missing goals to be actual drops', () => {
  const s = stream();
  appendTripEvents(s, [
    e('You have entered Befallen.'),
    e('You have been slain by a ghoul!', 1),
    e('a ghoul resisted your Test Fire!', 2),
  ]);
  const advice = tripAdvice(s.active, [goal]);
  assert.ok(advice.some((r) => r.when === 'deaths'));
  assert.ok(advice.some((r) => r.when === 'resists'));
  assert.ok(
    advice
      .find((r) => r.when === 'unfinished')
      .tradeoff.includes('does not prove'),
  );
});
test('saved trips and goals are validated, serializable and source-keyed for deduplication', () => {
  const s = stream();
  appendTripEvents(s, [
    e('You have entered Befallen.'),
    e("--You have looted a Test Gem from a ghoul's corpse.--", 1),
  ]);
  assert.equal(
    readTripHistory(JSON.parse(JSON.stringify(s.trips)))[0].drops[0].quantity,
    1,
  );
  const second = stream();
  appendTripEvents(second, [e('You have entered Befallen.')]);
  assert.equal(second.trips[0].id, s.trips[0].id);
  assert.deepEqual(validateTripGoals([goal]), [goal]);
  for (const bad of [
    null,
    {},
    [null],
    [{ ...goal, quantity: -1 }],
    [{ ...goal, quantity: Infinity }],
  ])
    assert.throws(() => validateTripGoals(bad));
  for (const bad of [
    null,
    [null],
    [{ ...s.trips[0], drops: [{ item: 'x' }] }],
    [{ ...s.trips[0], kills: { ghoul: -1 } }],
  ])
    assert.throws(() => readTripHistory(bad));
});
test('unknown starting zones and unsupported loot tails are disclosed, not invented', () => {
  const s = stream();
  appendTripEvents(s, [
    e("You looted a Gem from a ghoul's corpse through an unknown mechanism."),
  ]);
  assert.equal(s.active.zoneBasis, 'Zone missing from log');
  assert.equal(s.active.drops.length, 0);
  assert.equal(s.active.ignoredLoot, 1);
  assert.ok(tripAdvice(s.active, []).some((r) => r.when === 'missingLog'));
});
