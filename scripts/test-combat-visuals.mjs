import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCombatLine, summarizeCombat } from '../lib/combat-meter.ts';
import {
  combatSeries,
  combatBounds,
  trackEffects,
  validateEffectRules,
  effectMessageTarget,
  logPlayerName,
} from '../lib/combat-visuals.ts';
const at = Date.parse('2026-09-11T12:00:00Z');
const event = (text, seconds = 0) =>
  parseCombatLine(`[${new Date(at + seconds * 1000).toISOString()}] ${text}`);
const rule = {
  ability: 'Test Ward',
  kind: 'buff',
  seconds: 60,
  applied: 'You have Test Ward.',
  faded: 'Your Test Ward fades.',
};
test('critical suffixes mark existing hits without double counting damage', () => {
  const events = [
    event('You slash a target for 120 points of damage. (Critical) (Riposte)'),
    event(
      'You hit a target for 90 points of fire damage by Test Fire. (Critical)',
    ),
    event('a target has taken 15 damage from your Test Burn. (Critical)'),
    event('a target hits YOU for 5 points of damage. (Critical)'),
  ];
  const stats = summarizeCombat(events, '', '', at, true);
  assert.equal(stats.damage, 225);
  assert.equal(stats.criticalHits, 3);
  assert.equal(stats.hits, 3);
  assert.equal(stats.criticalRate, 100);
  assert.equal(stats.dotDamage, 15);
  assert.equal(stats.ddDamage, 90);
  assert.equal(stats.incoming, 5);
  assert.equal(
    event('You slash a target for 10 points of damage. (Riposte)').critical,
    false,
  );
  assert.equal(event('You deliver a critical blow!').kind, 'unknown');
});
test('archery and incoming DoTs are recognized, with finite amounts only', () => {
  assert.equal(
    event('You shoot a target for 45 points of damage.').kind,
    'melee',
  );
  const poison = event('You have taken 18 damage from Poison by a snake.');
  assert.equal(poison.kind, 'DoT');
  assert.equal(summarizeCombat([poison], '', '', at, true).incoming, 18);
  assert.equal(
    event(`You hit a target for ${'9'.repeat(500)} points of damage.`).kind,
    'unknown',
  );
});
test('pulse uses exact seconds, excludes others/future events and preserves DoT as a subset', () => {
  const events = [
    event('You hit a target for 80 points of damage.'),
    event('a target has taken 20 damage from your Burn.'),
    event('Other hits a target for 999 points of damage.'),
    event('You hit a target for 500 points of damage.', 2),
  ];
  const result = combatSeries(events, '', '', at);
  assert.equal(result.buckets.at(-1).damage, 100);
  assert.equal(result.buckets.at(-1).dot, 20);
  assert.equal(
    combatSeries(events, '', '', at + 63000).buckets.reduce(
      (sum, b) => sum + b.damage,
      0,
    ),
    0,
  );
  assert.equal(logPlayerName('eqlog_Aria_Freeport.txt'), 'Aria');
  assert.equal(logPlayerName('anything.txt'), '');
  assert.equal(
    combatBounds([...events, event('A late chat message.', 100)], at).last,
    at + 2000,
  );
});
test('confirmed landing plus saved duration reaches soon, due and worn off', () => {
  const events = [event('You have Test Ward.')];
  assert.equal(
    trackEffects(events, [rule], [], '', '', at + 10000)[0].remaining,
    50,
  );
  assert.equal(
    trackEffects(events, [rule], [], '', '', at + 50000)[0].status,
    'soon',
  );
  assert.equal(
    trackEffects(events, [rule], [], '', '', at + 60000)[0].status,
    'due',
  );
  events.push(event('Your Test Ward spell has worn off.', 20));
  assert.equal(
    trackEffects(events, [rule], [], '', '', at + 21000)[0].status,
    'ended',
  );
  assert.equal(
    trackEffects(events, [rule], [], '', '', at + 21000)[0].percent,
    0,
  );
  assert.equal(
    trackEffects(events, [rule], [], '', '', at + 21000)[0].remaining,
    0,
  );
});
test('casts and ticks alone never start a duration and repeated ticks do not reset it', () => {
  assert.equal(
    trackEffects(
      [event('Your Unknown Spell spell has worn off.')],
      [],
      [],
      '',
      '',
      at,
    )[0].kind,
    'unknown',
  );
  const burn = {
    ...rule,
    ability: 'Test Burn',
    kind: 'DoT',
    seconds: 30,
    applied: '{target} is burning.',
    faded: '',
  };
  assert.equal(
    trackEffects(
      [event('You begin casting Test Burn.')],
      [burn],
      [],
      '',
      '',
      at,
    ).length,
    0,
  );
  const tick = event('a target has taken 20 damage from your Test Burn.', 10);
  assert.equal(
    trackEffects([tick], [burn], [], '', '', at + 10000)[0].remaining,
    null,
  );
  assert.equal(
    trackEffects(
      [event('a target is burning.'), tick],
      [burn],
      [],
      '',
      '',
      at + 20000,
    )[0].remaining,
    10,
  );
  const late = event('a target has taken 20 damage from your Test Burn.', 35);
  assert.equal(
    trackEffects(
      [event('a target is burning.'), late],
      [burn],
      [],
      '',
      '',
      at + 35000,
    )[0].remaining,
    null,
  );
});
test('targets stay separate, fade affects one target, and other players are not attributed to you', () => {
  const debuff = {
    ...rule,
    ability: 'Test Slow',
    kind: 'debuff',
    applied: '{target} is affected by Test Slow.',
    faded: '',
  };
  const events = [
    event('a target is affected by Test Slow.'),
    event('a second target is affected by Test Slow.', 1),
    event('Your Test Slow spell has worn off of a target.', 10),
    event("a stranger has taken 55 damage from Other's Burn."),
  ];
  const effects = trackEffects(events, [debuff], [], '', '', at + 10000);
  assert.equal(effects.length, 2);
  assert.equal(effects.find((e) => e.target === 'a target').status, 'ended');
  assert.equal(
    effects.find((e) => e.target === 'a second target').remaining,
    51,
  );
});
test('manual refresh starts anew, replay ignores future markers, and transitions require checking', () => {
  const manual = [
    {
      ability: 'Test Ward',
      kind: 'buff',
      target: 'You',
      seconds: 60,
      at: at + 20000,
    },
  ];
  assert.equal(trackEffects([], [], manual, '', '', at).length, 0);
  assert.equal(
    trackEffects([], [], manual, '', '', at + 40000)[0].remaining,
    40,
  );
  assert.equal(
    trackEffects(
      [event('You have entered Qeynos.', 30)],
      [],
      manual,
      '',
      '',
      at + 40000,
    )[0].status,
    'check',
  );
  assert.equal(
    trackEffects(
      [event('You have been slain by a target!', 30)],
      [],
      manual,
      '',
      '',
      at + 40000,
    )[0].remaining,
    null,
  );
});
test('message patterns are literal and imported timer data is bounded', () => {
  assert.equal(
    effectMessageTarget('{target} feels weak.', 'a target feels weak.'),
    'a target',
  );
  assert.equal(effectMessageTarget('A (test) effect.', 'A test effect.'), null);
  assert.equal(
    effectMessageTarget('You have Test Ward.', 'You say, You have Test Ward.'),
    null,
  );
  assert.deepEqual(validateEffectRules([rule]), [rule]);
  for (const bad of [
    null,
    {},
    [null],
    [{ ...rule, seconds: -1 }],
    [{ ...rule, seconds: Infinity }],
    [{ ...rule, seconds: 90000 }],
    [rule, rule],
    [rule, { ...rule, ability: 'Other' }],
  ])
    assert.throws(() => validateEffectRules(bad));
});
