export type DropSighting = {
  mob: string;
  seen: number;
  sessions: { zone: string | null }[];
};
export function readLootIndex(
  payload: unknown,
): { name: string; sightings: DropSighting[] }[] {
  const items = (payload as { data?: { items?: unknown } } | null)?.data?.items;
  if (!items || typeof items !== 'object' || Array.isArray(items))
    throw new Error('Loot index format was not recognised');
  return Object.entries(items).map(([name, rows]) => {
    if (!Array.isArray(rows)) throw new Error('Loot sightings must be a list');
    const sightings = rows.map((r: unknown) => {
      if (!r || typeof r !== 'object') throw new Error('Invalid loot sighting');
      const v = r as Record<string, unknown>;
      if (
        typeof v.mob !== 'string' ||
        !v.mob.trim() ||
        typeof v.seen !== 'number' ||
        !Number.isSafeInteger(v.seen) ||
        v.seen < 0 ||
        !Array.isArray(v.sessions)
      )
        throw new Error('Invalid loot sighting fields');
      const sessions = v.sessions.map((s: unknown) => {
        if (!s || typeof s !== 'object')
          throw new Error('Invalid loot session');
        const zone = (s as Record<string, unknown>).zone;
        if (zone !== null && typeof zone !== 'string')
          throw new Error('Invalid loot zone');
        return { zone };
      });
      return { mob: v.mob, seen: v.seen, sessions };
    });
    return { name, sightings };
  });
}
