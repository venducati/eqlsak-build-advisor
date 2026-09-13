import catalog from '../data/zone-catalog.json' with { type: 'json' };

export type ZoneOption = {
  id: string;
  name: string;
  continent: string;
  aliases: string[];
  availability: string;
};
export const normalizeZone = (text: string) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export const zoneCatalog: ZoneOption[] = catalog.zones;
export function matchesZone(zone: ZoneOption, query: string) {
  const key = normalizeZone(query);
  return [zone.name, ...zone.aliases].some((name) =>
    normalizeZone(name).includes(key),
  );
}
export function findZone(query: string, zones = zoneCatalog) {
  const key = normalizeZone(query);
  return zones.find((zone) =>
    [zone.name, ...zone.aliases].some((name) => normalizeZone(name) === key),
  );
}
export function allZones(
  extra: { id: string; name: string; continent: string }[] = [],
): ZoneOption[] {
  const merged = zoneCatalog.map((zone) => ({
    ...zone,
    aliases: [...zone.aliases],
  }));
  for (const zone of extra) {
    const found = findZone(zone.name, merged);
    if (found) {
      // Rule pack names remain the values used by the scoring engine.
      if (found.name !== zone.name) found.aliases.push(found.name);
      found.name = zone.name;
    } else merged.push({ ...zone, aliases: [], availability: 'local rule' });
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}
