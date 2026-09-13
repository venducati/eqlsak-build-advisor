import data from '../data/zone-factions.json' with { type: 'json' };
import { findZone, normalizeZone } from './zone-catalog.ts';

export type Faction = {
  id: string;
  name: string;
  aliases: string[];
  sources: string[];
};
export type Effect = { faction: string; direction: string; points?: number };
export type FactionAction = {
  id: string;
  title: string;
  zone: string;
  kind: string;
  provenance: string;
  confidence: string;
  effects: Effect[];
  sources: string[];
  note: string;
};
export type Standing = {
  name: string;
  points: number;
  maximum?: number;
  source: 'import' | 'manual';
  asOf: string;
};
export type CharacterFactions = {
  name: string;
  standings: Record<string, Standing>;
  goals: Record<string, number>;
  zones: Record<string, string[]>;
};
export type FactionStore = {
  version: 1;
  active: string;
  characters: Record<string, CharacterFactions>;
};
export const factionData = data;
export const factions: Faction[] = data.factions;
export const factionActions: FactionAction[] = data.actions;
export const storageKey = 'eqlsak-zone-factions-v1';
export const characterKey = (name: string) =>
  'character:' + name.trim().toLowerCase();
export const emptyCharacter = (name: string): CharacterFactions => ({
  name,
  standings: {},
  goals: {},
  zones: {},
});
export function emptyStore(name: string): FactionStore {
  const active = characterKey(name);
  return { version: 1, active, characters: { [active]: emptyCharacter(name) } };
}
export function factionId(name: string) {
  const key = normalizeZone(name);
  return (
    factions.find((f) =>
      [f.id, f.name, ...f.aliases].some((n) => normalizeZone(n) === key),
    )?.id || 'custom-' + key
  );
}
export const factionName = (id: string, character?: CharacterFactions) =>
  factions.find((f) => f.id === id)?.name ||
  character?.standings[id]?.name ||
  id.replace(/^custom-/, '');
export const zoneKey = (zone: string) =>
  normalizeZone(findZone(zone)?.name || zone);
export const zoneRecord = (zone: string) =>
  data.zones.find((z) => z.names.some((n) => zoneKey(n) === zoneKey(zone)));
export function parsePoints(text: string): number | null {
  if (!/^[+-]?\d+$/.test(text.trim())) return null;
  const value = Number(text.trim());
  return Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000
    ? value
    : null;
}
// The game's fourth column is points remaining to maximum, NOT maximum itself.
export function parseFactionExport(
  text: string,
  now = new Date().toISOString(),
) {
  if (text.length > 2_000_000)
    throw new Error(
      'This file is too large. Choose a faction text export under 2 MB.',
    );
  const standings: Record<string, Standing> = {};
  let skipped = 0;
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const delimiter = line.includes('\t')
      ? '\t'
      : line.includes('|')
        ? '|'
        : line.includes('^')
          ? '^'
          : ',';
    const fields: string[] = [];
    let field = '',
      quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        fields.push(field.trim());
        field = '';
      } else field += char;
    }
    fields.push(field.trim());
    if (
      /^(faction\s*)?id$/i.test(fields[0]) &&
      /name|faction/i.test(fields[1] || '')
    )
      continue;
    const points = parsePoints(fields[2] || ''),
      remaining = parsePoints(fields[3] || '');
    if (
      quoted ||
      fields.length !== 4 ||
      !/^\d+$/.test(fields[0]) ||
      !fields[1] ||
      fields[1].length > 160 ||
      points === null ||
      remaining === null ||
      remaining < 0 ||
      Math.abs(points + remaining) > 1_000_000_000
    ) {
      skipped++;
      continue;
    }
    const id = factionId(fields[1]);
    if (standings[id])
      throw new Error(
        'This file has repeated faction rows. Use one export from one character.',
      );
    standings[id] = {
      name: factions.find((f) => f.id === id)?.name || fields[1],
      points,
      maximum: points + remaining,
      source: 'import',
      asOf: now,
    };
  }
  if (!Object.keys(standings).length)
    throw new Error(
      'No faction rows found. Use /outputfile faction, then choose the Factions.txt file.',
    );
  return { standings, skipped };
}
export function validateFactionStore(value: unknown): FactionStore {
  const v = value as FactionStore;
  if (
    !v ||
    v.version !== 1 ||
    typeof v.active !== 'string' ||
    !v.characters ||
    Array.isArray(v.characters) ||
    !Object.hasOwn(v.characters, v.active)
  )
    throw new Error('Invalid faction save.');
  for (const [key, c] of Object.entries(v.characters)) {
    if (
      !c ||
      typeof c.name !== 'string' ||
      !c.name.trim() ||
      c.name.length > 120 ||
      characterKey(c.name) !== key ||
      !c.standings ||
      !c.goals ||
      !c.zones
    )
      throw new Error('Invalid character save.');
    for (const s of Object.values(c.standings)) {
      if (
        !s ||
        typeof s.name !== 'string' ||
        typeof s.points !== 'number' ||
        parsePoints(String(s.points)) === null ||
        (s.maximum !== undefined &&
          (typeof s.maximum !== 'number' ||
            parsePoints(String(s.maximum)) === null)) ||
        !['import', 'manual'].includes(s.source) ||
        typeof s.asOf !== 'string' ||
        !Number.isFinite(Date.parse(s.asOf))
      )
        throw new Error('Invalid standing.');
    }
    for (const goal of Object.values(c.goals))
      if (typeof goal !== 'number' || parsePoints(String(goal)) === null)
        throw new Error('Invalid goal.');
    for (const ids of Object.values(c.zones))
      if (
        !Array.isArray(ids) ||
        ids.some((id) => typeof id !== 'string' || id.length > 200)
      )
        throw new Error('Invalid zone link.');
  }
  return v;
}
export function goalProgress(
  current: number | null,
  goal: number,
  maximum?: number,
) {
  return {
    needed: current === null ? null : Math.max(0, goal - current),
    beyondMaximum: maximum !== undefined && goal > maximum,
  };
}
export function actionPlan(
  id: string,
  current: number | null,
  goal: number,
  protectedNames: string[],
  maximum?: number,
) {
  const protectedIds = new Set(protectedNames.map(factionId));
  return factionActions
    .filter((a) =>
      a.effects.some((e) => e.faction === id && e.direction === 'up'),
    )
    .map((action) => {
      const effect = action.effects.find(
        (e) => e.faction === id && e.direction === 'up',
      )!;
      const conflicts = action.effects
        .filter((e) => e.direction === 'down' && protectedIds.has(e.faction))
        .map((e) => e.faction);
      const { needed, beyondMaximum } = goalProgress(current, goal, maximum);
      const count =
        needed !== null &&
        !beyondMaximum &&
        !conflicts.length &&
        effect.points &&
        action.provenance !== 'heuristic/inference'
          ? Math.ceil(needed / effect.points)
          : null;
      return { action, conflicts, count };
    })
    .sort(
      (a, b) =>
        Number(Boolean(a.conflicts.length)) -
          Number(Boolean(b.conflicts.length)) ||
        Number(a.action.provenance === 'heuristic/inference') -
          Number(b.action.provenance === 'heuristic/inference'),
    );
}
