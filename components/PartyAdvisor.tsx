import type { Dispatch, SetStateAction } from 'react';
import { useId } from 'react';
import AdvisorIcon from './AdvisorIcon';
import {
  teammateBuilds,
  type AdvisorInput,
  type RulePack,
  type Zone,
} from '../lib/build-advisor';
import { assessParty, partyRules } from '../lib/party-advisor';
import '../app/party-advisor.css';

export function PartyEditor({
  input,
  pack,
  onChange,
}: {
  input: AdvisorInput;
  pack: RulePack;
  onChange: Dispatch<SetStateAction<AdvisorInput>>;
}) {
  const teammates = teammateBuilds(input);
  const count = teammates.length + 1;
  function setCount(value: number) {
    onChange((current) => ({
      ...current,
      mode: value === 1 ? 'solo' : value === 2 ? 'duo' : 'group',
      party:
        value > 2
          ? Array.from(
              { length: value - 2 },
              (_, index) => current.party?.[index] || [],
            )
          : current.party,
    }));
  }
  function setClass(player: number, slot: number, value: string) {
    onChange((current) => {
      const build = [
        ...(player === 2 ? current.buddy : current.party?.[player - 3] || []),
      ];
      if (value) build[slot] = value;
      else build.splice(slot, 1);
      if (player === 2) return { ...current, buddy: build };
      const party = (current.party || []).map((row) => [...row]);
      party[player - 3] = build;
      return { ...current, party };
    });
  }
  return (
    <section className="ba-party-editor" aria-label="Party setup">
      <h3>
        <AdvisorIcon code="buddy" /> Your party
      </h3>
      <label>
        Players to compare
        <select
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        >
          {[1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? 'player · solo' : 'players'}
            </option>
          ))}
        </select>
      </label>
      <p className="ba-note">
        You are Player 1. Use the class choices above for your build. Add each
        teammate below. Charts update as you choose.
      </p>
      {teammates.map((build, index) => (
        <fieldset key={index}>
          <legend>
            Player {index + 2}
            {index === 0 ? ' · your buddy' : ''}
          </legend>
          <div className="ba-party-class-fields">
            {[0, 1, 2].map((slot) => (
              <label key={slot}>
                Class {slot + 1}
                <select
                  aria-label={`Player ${index + 2} class ${slot + 1}`}
                  value={build[slot] || ''}
                  disabled={slot > build.length}
                  onChange={(event) =>
                    setClass(index + 2, slot, event.target.value)
                  }
                >
                  <option value="">Choose</option>
                  {pack.classes.map((character) => (
                    <option
                      key={character.id}
                      value={character.id}
                      disabled={
                        build.includes(character.id) &&
                        build[slot] !== character.id
                      }
                    >
                      {character.id} · {character.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="ba-party-trio">
            {build.map((id) => (
              <span
                key={id}
                title={
                  pack.classes.find((character) => character.id === id)?.name
                }
              >
                <AdvisorIcon code={id} /> {id}
              </span>
            ))}
          </div>
        </fieldset>
      ))}
      {count > 1 && (
        <p className="ba-note">
          Player 2 is also used by the buddy tools. Players 3 and 4 count when
          Group is selected.
        </p>
      )}
    </section>
  );
}

export function PartyZoneChart({
  input,
  pack,
  zone,
}: {
  input: AdvisorInput;
  pack: RulePack;
  zone: Zone;
}) {
  const party = assessParty(input, pack, zone);
  const id = useId();
  function bar(metric: (typeof party.metrics)[number]) {
    const state =
      metric.gap > 0
        ? 'gap'
        : metric.value >= partyRules.strongRating
          ? 'strong'
          : metric.value >= partyRules.usefulRating
            ? 'fair'
            : 'low';
    const lead = metric.leaders.length
      ? metric.leaders.map((player) => `P${player}`).join(' · ')
      : 'No cover';
    return (
      <div key={metric.id} className={`ba-party-bar ba-party-${state}`}>
        <div className="ba-party-bar-label">
          <span>
            <AdvisorIcon code={metric.id} /> {metric.label}
          </span>
          <b>{metric.value}/5</b>
        </div>
        <div
          className="ba-party-track"
          role="meter"
          aria-label={`${zone.name}: party ${metric.label}`}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={metric.value}
          aria-valuetext={`${metric.value} out of 5${metric.target !== null ? `; zone target ${metric.target}` : ''}; strongest: ${lead}`}
        >
          <span
            className="ba-party-fill"
            style={{ width: `${metric.value * 20}%` }}
          />
          {metric.target !== null && (
            <span
              className="ba-party-target"
              style={{ left: `${metric.target * 20}%` }}
              aria-hidden="true"
            />
          )}
        </div>
        <small>
          {metric.target !== null
            ? `Zone target ${metric.target}/5 · ${metric.gap > 0 ? 'Needs help' : 'Covered'}`
            : `Strongest: ${lead}`}
          {metric.providers.length > 1
            ? ` · ${metric.providers.length - 1} backup${metric.providers.length > 2 ? 's' : ''}`
            : ''}
        </small>
      </div>
    );
  }
  return (
    <section className="ba-party-zone" aria-labelledby={id}>
      <div className="ba-party-title">
        <h5 id={id}>
          <AdvisorIcon code="buddy" /> Party coverage
        </h5>
        <span>
          {party.entered} of {party.players.length} players entered
        </span>
      </div>
      <div className="ba-party-roster">
        {party.players.map((player) => (
          <div
            key={player.number}
            className={`ba-party-player ba-player-${player.number}`}
          >
            <b>
              P{player.number}
              {player.number === 1 ? ' · You' : ''}
            </b>
            <div className="ba-party-trio">
              {player.build.map((code, slot) => (
                <span
                  key={code}
                  className={
                    party.locked && player.number === 1 && slot === 2
                      ? 'ba-party-locked'
                      : ''
                  }
                  title={`${pack.classes.find((character) => character.id === code)?.name || code}${party.locked && player.number === 1 && slot === 2 ? ' · not unlocked at your level' : ''}`}
                >
                  <AdvisorIcon code={code} />
                  {code}
                </span>
              ))}
            </div>
            <small>
              {player.build.length
                ? `${player.build.length} ${player.build.length === 1 ? 'class' : 'classes'} · Effort ${player.workload}/5`
                : 'Choose classes above'}
            </small>
          </div>
        ))}
      </div>
      <div className="ba-party-highlights">
        <p>
          <AdvisorIcon code="why" />
          <strong>Strongest:</strong>{' '}
          {party.strongest.length
            ? party.strongest.map((metric) => metric.label).join(' · ')
            : 'No rating reaches 4/5 yet.'}
        </p>
        <p>
          <AdvisorIcon code="warning" />
          <strong>Lowest coverage:</strong>{' '}
          {party.weakest
            .map((metric) => `${metric.label} ${metric.value}/5`)
            .join(' · ')}
        </p>
      </div>
      <div className="ba-party-bars">
        {party.metrics.filter((metric) => metric.core).map(bar)}
      </div>
      <details className="ba-party-more">
        <summary>Travel, movement, stealth & faction tools</summary>
        <div className="ba-party-bars">
          {party.metrics.filter((metric) => !metric.core).map(bar)}
        </div>
      </details>
      {party.busy.map((row) => (
        <p className="ba-party-caution" key={row.player}>
          <AdvisorIcon code="warning" /> P{row.player} is the only player rated
          3/5 or higher for {row.jobs.join(' and ')}. Plan who takes over when
          that player is busy.
        </p>
      ))}
      {party.locked && (
        <p className="ba-note">
          Your third class is shown dimmed. It starts counting at level{' '}
          {pack.tertiaryUnlockLevel}.
        </p>
      )}
      <p className="ba-note">
        0 = no coverage · 5 = very strong. The white mark shows this zone’s
        saved target. Bars use the best player rating; backups are counted
        separately. These are planning estimates, not measured damage. XP checks
        use your level; teammate levels are not entered.
      </p>
      <span className="ba-source">
        {party.provenance.label} · Class ratings and zone targets use your saved
        rules. Faction tools do not show actual faction standing.
      </span>
    </section>
  );
}
