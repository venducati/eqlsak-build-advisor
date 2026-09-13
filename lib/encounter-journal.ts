import { isDamage, isSelf, type CombatEvent } from './combat-meter.ts';
import { findZone, normalizeZone } from './zone-catalog.ts';
import { assessParty } from './party-advisor.ts';
import { type AdvisorInput, type RulePack } from './build-advisor.ts';
import strategy from '../data/trip-strategy.json' with { type: 'json' };

export type LootDisposition = 'kept' | 'sold' | 'stored' | 'upgraded';
export type LootDrop = {
  item: string;
  mob: string;
  quantity: number;
  disposition: LootDisposition;
  result: string;
  created: number;
  copper: number;
  at: number;
};
export type TripGoal = {
  id: string;
  zone: string;
  item: string;
  quantity: number;
  mob: string;
};
export type MissedDrop = {
  item: string;
  quantity: number;
  mob: string;
  reason: string;
};
export type TripContext = {
  builds: string[][];
  level: number | null;
  zone: string;
  controlGap: number;
  healGap: number;
  factionConstraints: string[];
};
export type Trip = {
  id: string;
  source: string;
  player: string;
  zone: string;
  baseZone: string;
  zoneBasis: string;
  started: number;
  last: number;
  ended: number | null;
  exit: string;
  exitConfirmed: boolean;
  drops: LootDrop[];
  missed: MissedDrop[];
  kills: Record<string, number>;
  damage: number;
  incoming: number;
  healing: number;
  deaths: number;
  resists: number;
  coin: number;
  ignoredLoot: number;
  limited: boolean;
  context: TripContext;
};
export type TripStream = {
  source: string;
  player: string;
  trips: Trip[];
  active: Trip | null;
  context: (zone: string) => TripContext;
};
const key = (text: string) => text.trim().toLowerCase().replaceAll('’', "'");
const safeCount = (n: number) =>
  Number.isSafeInteger(n) && n > 0 && n <= 1000000;

/** Keep the actual instance/tier label; only the guide lookup uses the base name. */
export function baseTripZone(zone: string) {
  const base = zone.replace(/\s+\d+\s+\([^)]+\)$/, '').trim();
  return findZone(base)?.name || base;
}
export function tripContext(
  input: AdvisorInput,
  pack: RulePack,
  rawZone: string,
): TripContext {
  const base = baseTripZone(rawZone);
  const zone = pack.zones.find((z) =>
    [z.name, ...z.aliases].some(
      (s) => normalizeZone(s) === normalizeZone(base),
    ),
  );
  const assessment = assessParty(
    input,
    pack,
    zone || {
      id: '',
      name: base,
      aliases: [],
      continent: '',
      min: 1,
      max: 60,
      control: 0,
      heal: 0,
      loot: [],
      factionEffects: null,
      accessFactions: null,
      provenance: pack.provenance,
    },
  );
  return {
    builds: assessment.players
      .map((p) => p.activeBuild)
      .filter((p) => p.length),
    level: input.level,
    zone: rawZone || input.zone,
    controlGap: assessment.metrics.find((m) => m.id === 'control')?.gap || 0,
    healGap: assessment.metrics.find((m) => m.id === 'heal')?.gap || 0,
    factionConstraints: [...input.factionConstraints],
  };
}
export function copperAmount(text: string): number | null {
  const units: Record<string, number> = {
    platinum: 1000,
    gold: 100,
    silver: 10,
    copper: 1,
  };
  let rest = text.trim(),
    amount = 0,
    matched = false;
  rest = rest.replace(
    /([\d,]+)\s+(platinum|gold|silver|copper)(?:\s+pieces?)?/gi,
    (_, count, unit) => {
      const n = Number(count.replaceAll(',', ''));
      if (!Number.isSafeInteger(n) || n < 0) return 'INVALID';
      amount += n * units[unit.toLowerCase()];
      matched = true;
      return '';
    },
  );
  return matched &&
    !rest.replace(/\band\b|[\s,.]/gi, '') &&
    Number.isSafeInteger(amount)
    ? amount
    : null;
}
export function parseTripLine(
  raw: string,
): { loot?: Omit<LootDrop, 'at'>; coin?: number; resisted?: string } | null {
  const text = raw.replace(/^--/, '').replace(/--$/, '').trim();
  const resisted = text.match(/^(.+?) resisted your (.+?)!$/i);
  if (resisted) return { resisted: resisted[2] };
  const coin = text.match(
    /^You receive (.+?) (?:from the corpse|as your split)\.?$/i,
  );
  if (coin) {
    const value = copperAmount(coin[1]);
    return value === null ? null : { coin: value };
  }
  // Anchored to your own loot message. Chat, group chatter, and other players never become your loot.
  const line = text.match(
    /^You (?:have looted|looted) (.+?) from (.+?)['’]s corpse(.*)$/i,
  );
  if (!line) return null;
  const itemPart = line[1].replace(/^(?:an?|the)\s+/i, '');
  const count = itemPart.match(/^(\d+)\s+(.+)$/);
  const quantity = count ? Number(count[1]) : 1,
    item = count ? count[2] : itemPart;
  if (
    !safeCount(quantity) ||
    !item ||
    item.length > 240 ||
    line[2].length > 240
  )
    return null;
  const tail = line[3];
  let disposition: LootDisposition = 'kept',
    result = '',
    copper = 0;
  if (!/^\.?$/.test(tail)) {
    const sold = tail.match(/^ and sold it for (.+?)\.?$/i);
    const upgrade = tail.match(/^ to create (?:an? |the )?(.+?)\.?$/i);
    if (sold) {
      const value = copperAmount(sold[1]);
      if (value === null) return null;
      disposition = 'sold';
      copper = value;
    } else if (upgrade && upgrade[1].length <= 240) {
      disposition = 'upgraded';
      result = upgrade[1];
    } else if (/^ and stored it in your [a-z ]+\.?$/i.test(tail))
      disposition = 'stored';
    else return null;
  }
  return {
    loot: {
      item,
      quantity,
      mob: line[2],
      disposition,
      result,
      created: disposition === 'upgraded' ? 1 : 0,
      copper,
    },
  };
}
export function newTripStream(
  source: string,
  player: string,
  context: TripStream['context'],
): TripStream {
  return { source, player, context, trips: [], active: null };
}
function openTrip(
  stream: TripStream,
  at: number,
  zone: string,
  logged: boolean,
) {
  const context = stream.context(zone),
    actualZone = zone || context.zone || 'Zone not recorded';
  const trip: Trip = {
    id: `${stream.source}|${at}|${actualZone}`,
    source: stream.source,
    player: stream.player,
    zone: actualZone,
    baseZone: baseTripZone(actualZone),
    zoneBasis: logged
      ? 'Zone from log'
      : context.zone
        ? 'Starting zone from your Advisor'
        : 'Zone missing from log',
    started: at,
    last: at,
    ended: null,
    exit: '',
    exitConfirmed: false,
    drops: [],
    missed: [],
    kills: Object.create(null),
    damage: 0,
    incoming: 0,
    healing: 0,
    deaths: 0,
    resists: 0,
    coin: 0,
    ignoredLoot: 0,
    limited: false,
    context,
  };
  stream.trips.push(trip);
  stream.trips = stream.trips.slice(-40);
  stream.active = trip;
  return trip;
}
export function finishTrip(
  stream: TripStream,
  at: number,
  reason: string,
  confirmed: boolean,
) {
  if (!stream.active) return;
  stream.active.ended = Math.max(stream.active.started, at);
  stream.active.last = stream.active.ended;
  stream.active.exit = reason;
  stream.active.exitConfirmed = confirmed;
  stream.active = null;
}
/** Incremental totals are independent of the combat meter's 20,000-line display buffer. */
export function appendTripEvents(stream: TripStream, events: CombatEvent[]) {
  for (const event of events) {
    if (event.kind === 'zone') {
      finishTrip(stream, event.at, `Zoned to ${event.target}`, true);
      openTrip(stream, event.at, event.target, true);
      continue;
    }
    const extra = parseTripLine(event.raw);
    const unsupportedLoot =
      /^(?:--)?You (?:have looted|looted) /i.test(event.raw) && !extra?.loot;
    const died = event.kind === 'death' && isSelf(event.target, stream.player);
    const kill =
      event.kind === 'death' &&
      isSelf(event.actor, stream.player) &&
      !isSelf(event.target, stream.player);
    const outgoing =
      isDamage(event) &&
      isSelf(event.actor, stream.player) &&
      !isSelf(event.target, stream.player);
    const incoming = isDamage(event) && isSelf(event.target, stream.player);
    const healing =
      ['heal', 'HoT'].includes(event.kind) &&
      isSelf(event.actor, stream.player);
    if (
      !extra &&
      !unsupportedLoot &&
      !died &&
      !kill &&
      !outgoing &&
      !incoming &&
      !healing
    )
      continue;
    const trip = stream.active || openTrip(stream, event.at, '', false);
    trip.last = Math.max(trip.last, event.at);
    if (extra?.loot) {
      const row = trip.drops.find(
        (drop) =>
          key(drop.item) === key(extra.loot!.item) &&
          key(drop.mob) === key(extra.loot!.mob) &&
          drop.disposition === extra.loot!.disposition &&
          key(drop.result) === key(extra.loot!.result),
      );
      if (row) {
        row.quantity += extra.loot.quantity;
        row.copper += extra.loot.copper;
        row.created += extra.loot.created;
        row.at = event.at;
      } else if (trip.drops.length < 250)
        trip.drops.push({ ...extra.loot, at: event.at });
      else trip.limited = true;
    }
    if (extra?.coin !== undefined) trip.coin += extra.coin;
    if (extra?.resisted) trip.resists++;
    if (unsupportedLoot) trip.ignoredLoot++;
    if (kill) {
      const name = event.target;
      if (Object.keys(trip.kills).length < 500 || name in trip.kills)
        trip.kills[name] =
          (Object.hasOwn(trip.kills, name) ? trip.kills[name] : 0) + 1;
      else trip.limited = true;
    }
    if (died) trip.deaths++;
    if (outgoing) trip.damage += event.amount;
    if (incoming) trip.incoming += event.amount;
    if (healing) trip.healing += event.amount;
  }
  return stream.trips;
}
export function goalsForTrip(goals: TripGoal[], trip: Trip) {
  return goals
    .filter(
      (g) =>
        !g.zone ||
        normalizeZone(baseTripZone(g.zone)) === normalizeZone(trip.baseZone),
    )
    .map((goal) => {
      const matches = trip.drops.filter((d) => key(d.item) === key(goal.item));
      const secured =
        matches
          .filter((d) => ['kept', 'stored'].includes(d.disposition))
          .reduce((n, d) => n + d.quantity, 0) +
        trip.drops
          .filter(
            (d) =>
              d.disposition === 'upgraded' && key(d.result) === key(goal.item),
          )
          .reduce((n, d) => n + d.created, 0);
      const sold = matches
        .filter((d) => d.disposition === 'sold')
        .reduce((n, d) => n + d.quantity, 0);
      const used = matches
        .filter((d) => d.disposition === 'upgraded')
        .reduce((n, d) => n + d.quantity, 0);
      const missed = trip.missed
        .filter((d) => key(d.item) === key(goal.item))
        .reduce((n, d) => n + d.quantity, 0);
      return {
        ...goal,
        secured,
        sold,
        used,
        missed,
        remaining: Math.max(0, goal.quantity - secured),
        status:
          secured >= goal.quantity
            ? 'Goal reached in this log'
            : sold || used
              ? 'Auto-sold / used in upgrade'
              : missed
                ? 'Missed drop you reported'
                : 'Not recorded this trip',
      };
    });
}
export function tripAdvice(trip: Trip, goals: TripGoal[]) {
  const progress = goalsForTrip(goals, trip);
  const conditions: Record<string, boolean> = {
    deaths: trip.deaths > 0,
    resists: trip.resists > 0,
    soldGoal: progress.some(
      (g) => g.remaining > 0 && (g.sold > 0 || g.used > 0),
    ),
    unfinished: progress.some((g) => g.remaining > 0),
    controlGap: trip.context.controlGap > 0,
    healGap: trip.context.healGap > 0,
    missingLog:
      trip.zoneBasis !== 'Zone from log' ||
      trip.ignoredLoot > 0 ||
      trip.limited,
    factions: trip.context.factionConstraints.length > 0,
    complete: progress.length > 0 && progress.every((g) => g.remaining === 0),
    noGoals: progress.length === 0,
  };
  return strategy.rules
    .filter((rule) => conditions[rule.when])
    .slice(0, 5)
    .map((rule) => ({
      ...rule,
      evidence:
        rule.when === 'deaths'
          ? `${trip.deaths} death message(s) in this trip.`
          : rule.when === 'resists'
            ? `${trip.resists} spell resist message(s). No full resist rate is known.`
            : rule.when === 'unfinished'
              ? progress
                  .filter((g) => g.remaining > 0)
                  .map(
                    (g) =>
                      `${g.item}: ${g.remaining} still needed${g.mob ? `; your listed target: ${g.mob}` : ''}`,
                  )
                  .join(' · ')
              : rule.when === 'controlGap'
                ? `Saved party control rating falls ${trip.context.controlGap} point(s) short of this zone's planning target.`
                : rule.when === 'healGap'
                  ? `Saved party healing rating falls ${trip.context.healGap} point(s) short of this zone's planning target.`
                  : rule.when === 'factions'
                    ? `Your protected factions: ${trip.context.factionConstraints.join(', ')}.`
                    : rule.when === 'soldGoal'
                      ? progress
                          .filter((g) => g.sold || g.used)
                          .map(
                            (g) =>
                              `${g.item}: ${g.sold} auto-sold, ${g.used} used in upgrade`,
                          )
                          .join(' · ')
                      : rule.when === 'missingLog'
                        ? `${trip.zoneBasis}; ${trip.ignoredLoot} unread loot line(s)${trip.limited ? '; detail limit reached' : ''}.`
                        : rule.when === 'complete'
                          ? 'Each listed goal was gained in the recorded trip.'
                          : 'No item goals are set for this zone.',
    }));
}
export function validateTripGoals(value: unknown): TripGoal[] {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some(
      (g) =>
        !g ||
        !['id', 'item', 'zone', 'mob'].every(
          (k) => typeof g[k] === 'string' && g[k].length <= 240,
        ) ||
        !g.id ||
        !g.item.trim() ||
        !safeCount(g.quantity),
    )
  )
    throw new Error(
      'Each loot goal needs an item name and a count from 1 to 1,000,000. Keep up to 100 goals.',
    );
  return value;
}
export function readTripHistory(value: unknown): Trip[] {
  // Never render unvalidated local data. All saved payloads are bounded and contain no raw chat.
  if (!Array.isArray(value) || value.length > 40)
    throw new Error('Trip history format is not supported.');
  for (const t of value) {
    if (
      !t ||
      ![
        'id',
        'source',
        'player',
        'zone',
        'baseZone',
        'zoneBasis',
        'exit',
      ].every((k) => typeof t[k] === 'string' && t[k].length <= 1000) ||
      ![
        'started',
        'last',
        'damage',
        'incoming',
        'healing',
        'deaths',
        'resists',
        'coin',
        'ignoredLoot',
      ].every((k) => Number.isSafeInteger(t[k]) && t[k] >= 0) ||
      !(t.ended === null || Number.isSafeInteger(t.ended)) ||
      typeof t.exitConfirmed !== 'boolean' ||
      typeof t.limited !== 'boolean' ||
      !Array.isArray(t.drops) ||
      t.drops.length > 250 ||
      !Array.isArray(t.missed) ||
      t.missed.length > 100 ||
      !t.kills ||
      typeof t.kills !== 'object' ||
      Array.isArray(t.kills) ||
      Object.keys(t.kills).length > 500 ||
      !Object.entries(t.kills).every(
        ([name, n]) =>
          name.length <= 240 && Number.isSafeInteger(n) && Number(n) >= 0,
      ) ||
      !t.context ||
      !Array.isArray(t.context.builds) ||
      t.context.builds.length > 4 ||
      !t.context.builds.every(
        (b: unknown) =>
          Array.isArray(b) &&
          b.length <= 3 &&
          b.every((c) => typeof c === 'string' && c.length <= 5),
      ) ||
      ![t.context.controlGap, t.context.healGap].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 5,
      ) ||
      !Array.isArray(t.context.factionConstraints) ||
      !t.context.factionConstraints.every(
        (s: unknown) => typeof s === 'string' && s.length <= 240,
      )
    )
      throw new Error('Saved trip data could not be read.');
    for (const d of t.drops)
      if (
        !d ||
        !['item', 'mob', 'result'].every(
          (k) => typeof d[k] === 'string' && d[k].length <= 240,
        ) ||
        !Number.isSafeInteger(d.quantity) ||
        d.quantity < 1 ||
        !['kept', 'sold', 'stored', 'upgraded'].includes(d.disposition) ||
        !Number.isSafeInteger(d.copper) ||
        d.copper < 0 ||
        !Number.isSafeInteger(d.created) ||
        d.created < 0 ||
        !Number.isSafeInteger(d.at)
      )
        throw new Error('Saved loot row could not be read.');
    for (const d of t.missed)
      if (
        !d ||
        !['item', 'mob', 'reason'].every(
          (k) => typeof d[k] === 'string' && d[k].length <= 240,
        ) ||
        !safeCount(d.quantity)
      )
        throw new Error('Saved missed-drop note could not be read.');
  }
  return value;
}
