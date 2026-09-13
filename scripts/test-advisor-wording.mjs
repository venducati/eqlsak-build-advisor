import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRules, defaultInput, recommend } from '../lib/build-advisor.ts';
import { refreshBuiltInWording } from '../lib/advisor-wording.ts';
import wording from '../data/advisor-language.json' with { type: 'json' };

test('older built-in wording updates without changing saved scores or source labels', () => {
  const saved = structuredClone(defaultRules);
  const [oldText, newText] = Object.entries(wording)[0];
  saved.classes[0].tradeoff = oldText;
  saved.weights.control = 8;
  saved.rules[0].points = 19;
  const original = structuredClone(saved);
  const updated = refreshBuiltInWording(saved);
  assert.equal(updated.classes[0].tradeoff, newText);
  assert.deepEqual(saved, original);
  assert.deepEqual(updated.weights, saved.weights);
  assert.deepEqual(
    updated.rules.map((r) => [r.id, r.points, r.when, r.provenance.label]),
    saved.rules.map((r) => [r.id, r.points, r.when, r.provenance.label]),
  );
  assert.deepEqual(
    updated.evidence.map((e) => [
      e.id,
      e.links,
      e.reviewedOn,
      e.provenance.label,
    ]),
    saved.evidence.map((e) => [
      e.id,
      e.links,
      e.reviewedOn,
      e.provenance.label,
    ]),
  );
  for (const role of Object.keys(saved.roles)) {
    const scores = (p) =>
      recommend({ ...defaultInput, role }, p).rankings.map((r) => [
        r.id,
        r.score,
      ]);
    assert.deepEqual(scores(updated), scores(saved));
  }
});

test('custom prose and game identifiers survive a wording refresh', () => {
  const saved = structuredClone(defaultRules);
  const oldText = Object.keys(wording)[0];
  saved.rules[0].why = 'My own raid advice: ' + oldText;
  saved.rules[0].id = oldText;
  saved.zones[0].loot.push(oldText);
  saved.evidence[0].links[0].title = oldText;
  assert.deepEqual(refreshBuiltInWording(saved), saved);
});

test('wording refresh is safe to repeat and leaves current rules unchanged', () => {
  assert.deepEqual(refreshBuiltInWording(defaultRules), defaultRules);
  const once = refreshBuiltInWording(defaultRules);
  assert.deepEqual(refreshBuiltInWording(once), once);
});
