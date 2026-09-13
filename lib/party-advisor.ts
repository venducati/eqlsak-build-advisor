import {
  coverage,
  teammateBuilds,
  type AdvisorInput,
  type RulePack,
  type Zone,
} from './build-advisor.ts';
import rules from '../data/party-advisor.json' with { type: 'json' };

export const partyRules = rules;
export function assessParty(input: AdvisorInput, pack: RulePack, zone: Zone) {
  const playerBuild = [input.primary, input.secondary, input.tertiary].filter(
    Boolean,
  );
  const locked = input.level !== null && input.level < pack.tertiaryUnlockLevel;
  const players = [playerBuild, ...teammateBuilds(input)].map(
    (build, index) => {
      const activeBuild = index === 0 && locked ? build.slice(0, 2) : build;
      return {
        number: index + 1,
        build,
        activeBuild,
        ratings: coverage(activeBuild, pack),
        workload: Math.max(
          0,
          ...activeBuild.map(
            (id) => pack.classes.find((c) => c.id === id)?.workload || 0,
          ),
        ),
      };
    },
  );
  const entered = players.filter((player) => player.activeBuild.length);
  const metrics = rules.metrics.map((metric) => {
    const value = Math.max(
      0,
      ...entered.map((player) => player.ratings[metric.id] || 0),
    );
    const providers = entered
      .filter((player) => player.ratings[metric.id] >= rules.usefulRating)
      .map((player) => player.number);
    const leaders =
      value > 0
        ? entered
            .filter((player) => player.ratings[metric.id] === value)
            .map((player) => player.number)
        : [];
    const target =
      metric.id === 'heal'
        ? zone.heal
        : metric.id === 'control'
          ? zone.control
          : null;
    return {
      ...metric,
      value,
      providers,
      leaders,
      target,
      gap: target === null ? 0 : Math.max(0, target - value),
    };
  });
  const strongest = [...metrics]
    .filter((metric) => metric.value >= rules.strongRating)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const weakest = [...metrics]
    .sort((a, b) => b.gap - a.gap || a.value - b.value)
    .slice(0, 3);
  const busy = entered.flatMap((player) => {
    const jobs = metrics.filter(
      (metric) =>
        ['tank', 'heal', 'control'].includes(metric.id) &&
        metric.providers.length === 1 &&
        metric.providers[0] === player.number,
    );
    return jobs.length >= 2
      ? [{ player: player.number, jobs: jobs.map((job) => job.label) }]
      : [];
  });
  return {
    players,
    entered: entered.length,
    metrics,
    strongest,
    weakest,
    busy,
    locked,
    provenance: rules.provenance,
  };
}
