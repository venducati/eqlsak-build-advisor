export type StoredProfile = {
  name: string;
  level: string;
  build: string;
  location: string;
  goal: string;
};
export function validProfiles(value: unknown): value is StoredProfile[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 20 &&
    value.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        ['name', 'level', 'build', 'location', 'goal'].every(
          (key) => typeof p[key] === 'string' && p[key].length <= 2000,
        ),
    )
  );
}
export function readProfiles(raw: string | null, fallback: StoredProfile[]) {
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    return validProfiles(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function csvCell(value: string | number) {
  const raw = String(value);
  const safe = /^\s*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
