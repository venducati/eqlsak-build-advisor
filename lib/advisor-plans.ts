import {
  validateInput,
  type AdvisorInput,
  type RulePack,
} from './build-advisor.ts';
export type SavedPlan = {
  id: string;
  name: string;
  savedAt: string;
  input: AdvisorInput;
};
export const planStorageKey = 'eqlsak-saved-builds-v1';
export function readPlan(value: unknown, pack: RulePack): SavedPlan {
  const p = value as SavedPlan;
  if (
    !p ||
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    p.name.length > 80 ||
    typeof p.id !== 'string' ||
    p.id.length > 100 ||
    typeof p.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(p.savedAt)) ||
    validateInput(p.input, pack).length
  )
    throw new Error(
      'This saved build cannot be loaded with the current rules.',
    );
  if (
    p.input.zone.length > 200 ||
    p.input.continent.length > 100 ||
    p.input.gearGoals.length > 50 ||
    p.input.factionConstraints.length > 50 ||
    [...p.input.gearGoals, ...p.input.factionConstraints].some(
      (x) => x.length > 200,
    )
  )
    throw new Error('This build file has too much text.');
  return {
    id: p.id,
    name: p.name,
    savedAt: p.savedAt,
    input: structuredClone(p.input),
  };
}
export function readPlanFile(text: string, pack: RulePack) {
  if (text.length > 100_000)
    throw new Error('Choose a build file smaller than 100 KB.');
  const value = JSON.parse(text);
  if (value.format !== 'eqlsak-build-plan' || value.version !== 1)
    throw new Error('Choose an EQLSaK build plan file.');
  return readPlan(value.plan, pack);
}
export function comparisonInput(
  current: AdvisorInput,
  saved: AdvisorInput,
): AdvisorInput {
  return {
    ...current,
    primary: saved.primary,
    secondary: saved.secondary,
    tertiary: saved.tertiary,
  };
}
