import wording from '../data/advisor-language.json' with { type: 'json' };
import type { RulePack } from './build-advisor';

// Refresh only exact matches to older built-in prose. Keep user edits and all scoring data.
export function refreshBuiltInWording(pack: RulePack): RulePack {
  const changes: Record<string, string> = wording;
  const textFields = new Set([
    'why',
    'tradeoff',
    'reference',
    'summary',
    'limitation',
  ]);
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        textFields.has(key) &&
        typeof child === 'string' &&
        Object.hasOwn(changes, child)
          ? changes[child]
          : visit(child),
      ]),
    );
  }
  return visit(pack) as RulePack;
}

export const roleLabels: Record<string, string> = {
  overall: 'All-around build',
  DPS: 'Deal damage (DPS)',
  tank: 'Take hits (Tank)',
  heal: 'Heal allies',
  CC: 'Control extra enemies (CC)',
  travel: 'Travel',
  stealth: 'Move unseen (Stealth)',
  pulling: 'Pull enemies',
  'named hunting': 'Hunt named enemies',
  'faction work': 'Work on factions',
};
export const modeLabels = {
  solo: 'Alone (Solo)',
  duo: 'With one buddy (Duo)',
  group: 'With a group',
};
export const sourceStatusLabels = {
  accepted: 'Used as a source',
  opinion: 'Player opinion',
  excluded: 'Not used for scoring',
};
