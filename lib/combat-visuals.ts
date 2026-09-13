import { isDamage, isSelf, type CombatEvent } from './combat-meter.ts';
import { parseTripLine } from './encounter-journal.ts';

export function logPlayerName(filename: string) {
  return filename.match(/^eqlog_([^_]+)_.+\.(?:txt|log)$/i)?.[1] || '';
}
export function combatBounds(events: CombatEvent[], fallback: number) {
  const relevant = events.filter(
    (e) =>
      isDamage(e) ||
      [
        'heal',
        'HoT',
        'beneficial',
        'worn-off',
        'cast',
        'zone',
        'death',
      ].includes(e.kind) ||
      parseTripLine(e.raw) !== null,
  );
  const times = (relevant.length ? relevant : events).map((e) => e.at);
  return times.length
    ? { first: Math.min(...times), last: Math.max(...times) }
    : { first: fallback, last: fallback };
}
export function combatSeries(
  events: CombatEvent[],
  player: string,
  pet: string,
  now: number,
) {
  const start = Math.floor(now / 1000) * 1000 - 59000;
  const buckets = Array.from({ length: 60 }, (_, index) => ({
    at: start + index * 1000,
    damage: 0,
    dot: 0,
    healing: 0,
    hits: 0,
    crits: 0,
  }));
  for (const event of events) {
    if (event.at > now || event.at < start) continue;
    const own =
      isSelf(event.actor, player) ||
      Boolean(
        pet.trim() && event.actor.toLowerCase() === pet.trim().toLowerCase(),
      );
    if (!own) continue;
    const bucket = buckets[Math.floor((event.at - start) / 1000)];
    if (isDamage(event) && !isSelf(event.target, player)) {
      bucket.damage += event.amount;
      bucket.hits++;
      if (event.critical) bucket.crits++;
      if (event.kind === 'DoT') bucket.dot += event.amount;
    } else if (['heal', 'HoT'].includes(event.kind))
      bucket.healing += event.amount;
  }
  const peak = Math.max(1, ...buckets.flatMap((b) => [b.damage, b.healing]));
  const peakDps = Math.max(
    1,
    ...buckets.map(
      (_, index) =>
        buckets
          .slice(Math.max(0, index - 29), index + 1)
          .reduce((sum, b) => sum + b.damage, 0) / 30,
    ),
  );
  const peakHits = Math.max(
    1,
    ...buckets.map((_, index) =>
      buckets
        .slice(Math.max(0, index - 29), index + 1)
        .reduce((sum, b) => sum + b.hits, 0),
    ),
  );
  return { buckets, peak, peakDps, peakHits };
}

export type EffectKind = 'buff' | 'debuff' | 'DoT' | 'HoT' | 'unknown';
export type EffectRule = {
  ability: string;
  kind: EffectKind;
  seconds: number | null;
  applied: string;
  faded: string;
};
export type ManualEffect = {
  ability: string;
  kind: EffectKind;
  target: string;
  at: number;
  seconds: number;
};
export type TrackedEffect = {
  key: string;
  ability: string;
  target: string;
  kind: EffectKind;
  seen: number;
  started: number | null;
  duration: number | null;
  ended: number | null;
  tick: number | null;
  basis: string;
  check: boolean;
};
const normal = (text: string) => text.trim().toLowerCase();
export function validateEffectRules(value: unknown): EffectRule[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new Error('Use a list of up to 100 spell timers.');
  const names = new Set<string>();
  for (const rule of value) {
    if (
      !rule ||
      typeof rule.ability !== 'string' ||
      !rule.ability.trim() ||
      rule.ability.length > 120 ||
      !['buff', 'debuff', 'DoT', 'HoT', 'unknown'].includes(rule.kind) ||
      !(
        rule.seconds === null ||
        (Number.isFinite(rule.seconds) &&
          rule.seconds >= 1 &&
          rule.seconds <= 86400)
      ) ||
      !['applied', 'faded'].every(
        (key) =>
          typeof rule[key] === 'string' &&
          rule[key].length <= 500 &&
          (rule[key].match(/\{target\}/g) || []).length <= 1,
      ) ||
      names.has(normal(rule.ability))
    )
      throw new Error(
        'Each timer needs a different spell name, a type, and a duration from 1 to 86,400 seconds, or no duration.',
      );
    names.add(normal(rule.ability));
  }
  const patterns = value
    .flatMap((rule) => [rule.applied, rule.faded])
    .filter(Boolean);
  if (new Set(patterns.map(normal)).size !== patterns.length)
    throw new Error('Use a different log message for each timer action.');
  return value;
}
// Literal matching only. The one optional placeholder is a target name, not a regular expression.
export function effectMessageTarget(
  pattern: string,
  text: string,
): string | null {
  if (!pattern.trim()) return null;
  const [before, after] = pattern.split('{target}');
  if (after === undefined)
    return normal(pattern) === normal(text) ? 'You' : null;
  if (
    !normal(text).startsWith(normal(before)) ||
    !normal(text).endsWith(normal(after))
  )
    return null;
  const target = text
    .slice(before.length, after.length ? -after.length : undefined)
    .trim();
  return target && target.length <= 120 ? target : null;
}
export function trackEffects(
  events: CombatEvent[],
  rules: EffectRule[],
  manual: ManualEffect[],
  player: string,
  pet: string,
  now: number,
) {
  const states = new Map<string, TrackedEffect>();
  const targetName = (target: string) =>
    isSelf(target, player) ? 'You' : target || 'Unknown target';
  const keyFor = (ability: string, target: string) =>
    normal(ability) + '|' + normal(targetName(target));
  const begin = (
    ability: string,
    target: string,
    kind: EffectKind,
    at: number,
    seconds: number | null,
    confirmed: boolean,
    basis: string,
  ) => {
    const key = keyFor(ability, target);
    states.set(key, {
      key,
      ability,
      target: targetName(target),
      kind,
      seen: at,
      started: confirmed ? at : null,
      duration: seconds,
      ended: null,
      tick: null,
      basis,
      check: false,
    });
    return states.get(key)!;
  };
  const timeline = [
    ...events.map((event) => ({ at: event.at, event })),
    ...manual.map((marker) => ({ at: marker.at, marker })),
  ]
    .filter((row) => row.at <= now)
    .sort((a, b) => a.at - b.at);
  for (const row of timeline) {
    if ('marker' in row) {
      const marker = row.marker;
      begin(
        marker.ability,
        marker.target,
        marker.kind,
        marker.at,
        marker.seconds,
        true,
        'Started by you',
      );
      continue;
    }
    const event = row.event;
    const own =
      isSelf(event.actor, player) ||
      Boolean(pet.trim() && normal(event.actor) === normal(pet));
    if (
      event.kind === 'zone' ||
      (event.kind === 'death' && isSelf(event.target, player))
    ) {
      for (const state of states.values())
        if (state.ended === null) {
          state.check = true;
          state.basis =
            'Recheck after ' + (event.kind === 'zone' ? 'zoning' : 'death');
        }
      continue;
    }
    if (event.kind === 'death') {
      for (const state of states.values())
        if (normal(state.target) === normal(event.target)) {
          state.ended = event.at;
          state.basis = 'Target defeated';
        }
      continue;
    }
    let matched = false;
    for (const rule of rules) {
      const target = effectMessageTarget(rule.applied, event.raw);
      const faded = effectMessageTarget(rule.faded, event.raw);
      if (target !== null) {
        begin(
          rule.ability,
          target,
          rule.kind,
          event.at,
          rule.seconds,
          true,
          'Log match · your timer rule',
        );
        matched = true;
      }
      if (faded !== null) {
        const state =
          states.get(keyFor(rule.ability, faded)) ||
          begin(
            rule.ability,
            faded,
            rule.kind,
            event.at,
            rule.seconds,
            false,
            'Log fade message',
          );
        state.ended = event.at;
        matched = true;
      }
    }
    if (matched) continue;
    if (event.kind === 'worn-off' && own) {
      const rule = rules.find(
        (rule) => normal(rule.ability) === normal(event.ability),
      );
      const state =
        states.get(keyFor(event.ability, event.target)) ||
        begin(
          event.ability,
          event.target,
          rule?.kind || 'unknown',
          event.at,
          rule?.seconds || null,
          false,
          'Worn off in log',
        );
      state.ended = event.at;
      state.seen = event.at;
      state.basis = 'Worn off in log';
      continue;
    }
    if (event.kind === 'beneficial' && isSelf(event.target, player)) {
      begin(
        event.ability,
        event.target,
        'buff',
        event.at,
        null,
        false,
        'Message seen · exact spell may vary',
      );
      continue;
    }
    if (
      ['DoT', 'HoT'].includes(event.kind) &&
      (own || isSelf(event.target, player))
    ) {
      const rule = rules.find(
        (rule) => normal(rule.ability) === normal(event.ability),
      );
      let state = states.get(keyFor(event.ability, event.target));
      if (!state || state.ended !== null)
        state = begin(
          event.ability,
          event.target,
          event.kind as EffectKind,
          event.at,
          null,
          false,
          'Tick seen · start time unknown',
        );
      state.tick = event.at;
      state.seen = event.at;
      if (
        state.started !== null &&
        state.duration !== null &&
        event.at > state.started + state.duration * 1000
      ) {
        state.started = null;
        state.duration = null;
        state.basis = 'Still ticking · recheck the duration';
      }
      if (state.check) {
        state.check = false;
        state.started = null;
        state.basis = 'Tick seen after transition · time unknown';
      }
      if (rule) state.kind = rule.kind;
    }
  }
  return [...states.values()]
    .map((state) => {
      const remaining =
        state.ended !== null
          ? 0
          : state.started !== null && state.duration !== null && !state.check
            ? Math.max(0, (state.started + state.duration * 1000 - now) / 1000)
            : null;
      const status =
        state.ended !== null
          ? 'ended'
          : state.check
            ? 'check'
            : remaining === null
              ? 'observed'
              : remaining <= 0
                ? 'due'
                : remaining <= Math.min(15, state.duration! * 0.25)
                  ? 'soon'
                  : 'timed';
      return {
        ...state,
        remaining,
        status,
        percent:
          state.ended !== null
            ? 0
            : remaining !== null && state.duration
              ? Math.min(100, (remaining / state.duration) * 100)
              : null,
      };
    })
    .filter((state) =>
      state.ended !== null
        ? now - state.ended <= 60000
        : state.started !== null || now - state.seen <= 180000,
    )
    .sort((a, b) => {
      const priority: Record<string, number> = {
        due: 0,
        soon: 1,
        ended: 2,
        check: 3,
        timed: 4,
        observed: 5,
      };
      return priority[a.status] - priority[b.status] || b.seen - a.seen;
    })
    .slice(0, 40);
}
