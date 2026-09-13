import { recommend, teammateBuilds, type AdvisorInput, type RulePack } from './build-advisor';
import { modeLabels, roleLabels } from './advisor-wording';

export function buildFitReport(input: AdvisorInput, candidate: string, pack: RulePack) {
  const planned = { ...input, tertiary: candidate };
  const result = recommend(planned, pack);
  const choice = result.rankings.find((row) => row.id === candidate);
  if (result.errors.length || !choice || !result.assessment) return null;
  const assessment = result.assessment;
  const names = [input.primary, input.secondary, candidate].map(id => pack.classes.find(c => c.id === id)!.name);
  const positive = choice.breakdown.filter(row => row.points > 0);
  const special = positive.filter(row => !pack.metrics.includes(row.label));
  const strongest = positive.filter(row => pack.metrics.includes(row.label)).sort((a, b) => b.points - a.points).slice(0, 4);
  const reasons = [...special, ...strongest];
  const cautions = [...new Set(choice.tradeoffs)];
  if (assessment.gaps.length) cautions.push('This trio still needs help with: ' + assessment.gaps.map(metric => ({ heal: 'healing', control: 'enemy control', survivability: 'staying alive', travel: 'travel' })[metric] || metric).join(', ') + '.');
  cautions.push(`Effort to play: ${assessment.workload}/5. Your comfort setting: ${input.complexity}/5.`);
  const penalties = choice.breakdown.filter(row => row.points < 0);
  const context = [
    `${modeLabels[input.mode]} play; main goal: ${roleLabels[input.role] || input.role}. The rank uses these choices.`,
    `Your needs: movement ${input.mobility}/5, healing ${input.healing}/5, enemy control ${input.control}/5. Higher needs give those skills more weight.`,
    teammateBuilds(input).some(build => build.length) ? 'Your entered teammates count toward shared skills and matching buddy rules.' : 'No teammate help is included in this score.',
  ];
  if (input.level === null) context.push('Add your level to check hunting ranges and rules that depend on level.');
  else if (input.level < pack.tertiaryUnlockLevel) context.push(`This is a future build: the saved rules place the third-class unlock at level ${pack.tertiaryUnlockLevel}. It does not count toward your current zone score yet.`);
  else context.push(`Level ${input.level} is used for level-based rules and zone checks; individual skill unlocks still need checking.`);
  if (input.zone) {
    const zone = result.zones.find(row => [row.zone.id, row.zone.name, ...row.zone.aliases].some(value => value.toLowerCase() === input.zone.toLowerCase()));
    context.push(zone ? `${zone.zone.name}: ${zone.blocked ? 'left out because of your faction choices' : zone.score + ' zone-fit points'}. Zone fit is separate from the class rank.` : `No saved hunting rule for ${input.zone}. Zone suitability is unknown.`);
  }
  if (input.gearGoals.length || input.factionConstraints.length) context.push('Gear goals and faction choices affect zone advice. They do not prove a drop, item upgrade, or friendly NPC standing.');
  return {
    id: candidate, name: choice.name, build: names.join(' / '), score: choice.score,
    rank: result.rankings.indexOf(choice) + 1, total: result.rankings.length,
    reasons, cautions, penalties, context,
    alternatives: result.rankings.filter(row => row.id !== candidate).slice(0, 3).map(row => ({
      name: row.name, score: row.score,
      why: row.rules.find(rule => rule.points > 0)?.why || [...row.breakdown].sort((a, b) => b.points - a.points)[0]?.why || 'Compare its saved skill ratings.',
      tradeoff: row.tradeoffs[0],
    })),
    breakdown: choice.breakdown,
  };
}

export function fitReportText(report: NonNullable<ReturnType<typeof buildFitReport>>) {
  return [
    `Why ${report.name} fits`, report.build,
    `Rank ${report.rank} of ${report.total} · ${report.score} planning points`,
    '', 'Why it helps', ...report.reasons.map(row => `- ${row.why} (${row.provenance.label}: ${row.provenance.reference})`),
    '', 'Your goals and setting', ...report.context.map(text => '- ' + text),
    '', 'Tradeoffs and weak spots', ...report.cautions.map(text => '- ' + text),
    ...report.penalties.map(row => `- ${row.why} (${row.points} points; ${row.provenance.label})`),
    '', 'Other choices', ...report.alternatives.map(row => `- ${row.name}, ${row.score} points: ${row.why} Tradeoff: ${row.tradeoff}`),
    '', 'Scores are local planning estimates, not measured damage or a promise of success.',
  ].join('\n');
}
