'use client';
import { useEffect, useId, useRef, useState } from 'react';
import AdvisorIcon from './AdvisorIcon';
import {
  actionPlan,
  characterKey,
  emptyCharacter,
  emptyStore,
  factionActions,
  factionData,
  factionName,
  factions,
  goalProgress,
  parseFactionExport,
  parsePoints,
  storageKey,
  validateFactionStore,
  zoneKey,
  zoneRecord,
  type CharacterFactions,
  type FactionAction,
  type FactionStore,
  type Standing,
} from '../lib/zone-factions';
import '../app/zone-factions.css';

const signed = (n: number) => (n > 0 ? '+' : '') + n.toLocaleString();
function FactionGraph({
  current,
  goal,
}: {
  current: number | null;
  goal: number;
}) {
  if (current === null)
    return (
      <div className="zf-unknown">
        <AdvisorIcon code="faction" /> Import or enter your points to see the
        chart.
      </div>
    );
  const min = Math.min(-100, current, goal),
    max = Math.max(100, current, goal);
  const x = (n: number) => 12 + ((n - min) / (max - min)) * 336;
  return (
    <figure className="zf-chart">
      <svg
        viewBox="0 0 360 80"
        role="img"
        aria-label={`Current points ${current}. Goal ${goal}. Zero is the dividing line for negative and positive points.`}
      >
        <rect
          x="12"
          y="32"
          width={x(0) - 12}
          height="12"
          rx="3"
          fill="#743b42"
        />
        <rect
          x={x(0)}
          y="32"
          width={348 - x(0)}
          height="12"
          rx="3"
          fill="#27604e"
        />
        <path d={`M${x(0)} 25v26`} stroke="#ccd5d8" strokeDasharray="3 3" />
        <path d={`M${x(goal)} 31v30`} stroke="#f2cb78" strokeWidth="2" />
        <path d={`M${x(goal) - 5} 60l5 6 5-6Z`} fill="#f2cb78" />
        <circle
          cx={x(current)}
          cy="38"
          r="7"
          fill="#bce3ff"
          stroke="#0b1726"
          strokeWidth="2"
        />
        <text x="12" y="17" fill="#f3b3b8" fontSize="12">
          Negative
        </text>
        <text x="348" y="17" fill="#9fe0be" textAnchor="end" fontSize="12">
          Positive
        </text>
      </svg>
      <figcaption>
        <span className="zf-now">● Current {signed(current)}</span>
        <span className="zf-goal">◆ Goal {signed(goal)}</span>
      </figcaption>
    </figure>
  );
}
function ActionDetails({
  action,
  character,
}: {
  action: FactionAction;
  character: CharacterFactions;
}) {
  return (
    <>
      <div className="zf-effects">
        {action.effects.map((e) => (
          <span
            key={e.faction}
            className={e.direction === 'up' ? 'zf-up' : 'zf-down'}
          >
            {e.direction === 'up' ? '↑ Helps' : '↓ Hurts'}{' '}
            {factionName(e.faction, character)}
            {e.points
              ? ` (${e.direction === 'up' ? '+' : '−'}${e.points})`
              : ''}
          </span>
        ))}
      </div>
      <p>{action.note}</p>
      <details>
        <summary>Sources & confidence</summary>
        <p>
          <span className="ba-source">{action.provenance}</span>{' '}
          {action.confidence}
        </p>
        <p>
          Reviewed {factionData.reviewedOn}. These are the listed effects; other
          hits may apply.
        </p>
        <ul>
          {action.sources.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {new URL(url).hostname}:{' '}
                {decodeURIComponent(
                  url.split('/').pop() || 'source',
                ).replaceAll('_', ' ')}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
function StandingCard({
  id,
  character,
  protectedNames,
  onSave,
  onGoal,
}: {
  id: string;
  character: CharacterFactions;
  protectedNames: string[];
  onSave: (id: string, standing: Standing | null) => void;
  onGoal: (id: string, goal: number) => void;
}) {
  const current = character.standings[id]?.points ?? null,
    goal = character.goals[id] ?? 1,
    standing = character.standings[id];
  const [pointsText, setPointsText] = useState(
    current === null ? '' : String(current),
  );
  const [goalText, setGoalText] = useState(String(goal));
  const [message, setMessage] = useState('');
  useEffect(
    () => setPointsText(current === null ? '' : String(current)),
    [current],
  );
  useEffect(() => setGoalText(String(goal)), [goal]);
  const name = factionName(id, character),
    progress = goalProgress(current, goal, standing?.maximum);
  const plans = actionPlan(
    id,
    current,
    goal,
    protectedNames,
    standing?.maximum,
  );
  const losses = factionActions.filter((a) =>
    a.effects.some((e) => e.faction === id && e.direction === 'down'),
  );
  return (
    <article className="zf-card">
      <h4>
        <AdvisorIcon code="faction" />
        {name}
      </h4>
      <div className="zf-standing">
        <strong>
          {current === null ? 'Not recorded' : signed(current) + ' points'}
        </strong>
        <span>
          {current === null
            ? 'No standing is assumed'
            : current < 0
              ? 'Negative points'
              : current === 0
                ? 'Zero points'
                : 'Positive points'}
        </span>
      </div>
      <FactionGraph current={current} goal={goal} />
      <p className="zf-gap">
        {progress.needed === null
          ? 'Choose a goal and add your current points.'
          : progress.needed === 0
            ? 'Your saved points meet this goal.'
            : `${progress.needed.toLocaleString()} more points to reach your goal.`}
      </p>
      {progress.beyondMaximum && (
        <p className="ba-warning">
          This goal is above the maximum in your last export (
          {signed(standing!.maximum!)}). Choose a lower goal or check a new
          export.
        </p>
      )}
      <form
        className="zf-edit"
        onSubmit={(e) => {
          e.preventDefault();
          const points = pointsText.trim() ? parsePoints(pointsText) : null,
            target = parsePoints(goalText);
          if ((pointsText.trim() && points === null) || target === null) {
            setMessage('Use whole numbers, such as -250 or 100.');
            return;
          }
          onSave(
            id,
            points === null
              ? null
              : {
                  name,
                  points,
                  ...(standing?.maximum !== undefined
                    ? { maximum: standing.maximum }
                    : {}),
                  source: 'manual',
                  asOf: new Date().toISOString(),
                },
          );
          onGoal(id, target);
          setMessage('Saved on this device.');
        }}
      >
        <label>
          Current points
          <input
            aria-label={`${name} current points`}
            inputMode="numeric"
            value={pointsText}
            onChange={(e) => setPointsText(e.target.value)}
            placeholder="Unknown"
          />
        </label>
        <label>
          Goal points
          <input
            aria-label={`${name} goal points`}
            inputMode="numeric"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
          />
        </label>
        <button type="submit">Save points & goal</button>
      </form>
      <p className="zf-meta">
        {standing
          ? `${standing.source === 'import' ? 'Game export' : 'Entered by player'} · ${new Date(standing.asOf).toLocaleString()}`
          : 'Blank means unknown. Zero means 0 points.'}
      </p>
      {message && <p role="status">{message}</p>}
      <details className="zf-plan" open={current !== null && current < goal}>
        <summary>
          <AdvisorIcon code="target" /> Ways to raise this faction (
          {plans.length})
        </summary>
        {plans.length ? (
          plans.map(({ action, conflicts, count }) => (
            <section className="zf-action" key={action.id}>
              <h5>{action.title}</h5>
              <small>{action.zone}</small>
              {conflicts.length > 0 && (
                <p className="ba-warning">
                  Not recommended with your protected factions: this hurts{' '}
                  {conflicts.map((f) => factionName(f, character)).join(', ')}.
                </p>
              )}
              {count !== null && count > 0 && (
                <p>
                  <b>
                    About {count.toLocaleString()}{' '}
                    {action.kind === 'kill' ? 'kills' : 'turn-ins'}
                  </b>{' '}
                  at the listed rate. This is an estimate. Check one in game
                  first.
                </p>
              )}
              <ActionDetails action={action} character={character} />
            </section>
          ))
        ) : (
          <p>
            No reviewed way to raise this faction is saved yet. That does not
            mean it is impossible.
          </p>
        )}
      </details>
      {losses.length > 0 && (
        <details className="zf-plan">
          <summary>
            <AdvisorIcon code="warning" /> Hunts or actions that lower it (
            {losses.length})
          </summary>
          {losses.map((action) => (
            <section className="zf-action" key={action.id}>
              <h5>{action.title}</h5>
              <ActionDetails action={action} character={character} />
            </section>
          ))}
        </details>
      )}
    </article>
  );
}
export default function ZoneFactionAdvisor({
  zone,
  profileName,
  protectedNames,
}: {
  zone: string;
  profileName: string;
  protectedNames: string[];
}) {
  const [saved, setSaved] = useState<FactionStore>(() =>
    emptyStore(profileName),
  );
  const [ready, setReady] = useState(false),
    [message, setMessage] = useState('');
  const [characterDraft, setCharacterDraft] = useState(profileName),
    [addedFaction, setAddedFaction] = useState('');
  const [instance, setInstance] = useState('');
  const inputId = useId();
  const previousProfile = useRef(profileName);
  useEffect(() => {
    if (!ready || previousProfile.current === profileName) return;
    previousProfile.current = profileName;
    const key = characterKey(profileName);
    setSaved((s) => ({
      ...s,
      active: key,
      characters: {
        ...s.characters,
        [key]: s.characters[key] || emptyCharacter(profileName),
      },
    }));
  }, [profileName, ready]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSaved(validateFactionStore(JSON.parse(raw)));
    } catch {
      setMessage(
        'Saved faction data could not be loaded. Import a new export or enter points again.',
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {
        setMessage(
          'Points are shown, but this browser cannot save them. Keep your game export as a backup.',
        );
      }
  }, [saved, ready]);
  const character = saved.characters[saved.active];
  useEffect(() => setCharacterDraft(character.name), [character.name]);
  // A change of zone starts with the base zone; named instances get their own manual links.
  useEffect(() => setInstance(''), [zone]);
  const locationKey =
    zoneKey(zone) +
    (instance.trim() ? ':' + instance.trim().toLowerCase() : '');
  const record = zoneRecord(zone);
  const ids = [
    ...new Set([
      ...(record?.factions || []),
      ...(character.zones[locationKey] || []),
    ]),
  ];
  const options = [
    ...new Set([
      ...factions.map((f) => f.id),
      ...Object.keys(character.standings),
    ]),
  ].sort((a, b) =>
    factionName(a, character).localeCompare(factionName(b, character)),
  );
  function editCharacter(update: (c: CharacterFactions) => CharacterFactions) {
    setSaved((s) => ({
      ...s,
      characters: {
        ...s.characters,
        [s.active]: update(s.characters[s.active]),
      },
    }));
  }
  function selectCharacter(name: string) {
    name = name.trim();
    if (!name || name.length > 120) {
      setMessage('Enter a character and server name, up to 120 letters.');
      return;
    }
    const key = characterKey(name);
    setSaved((s) => ({
      ...s,
      active: key,
      characters: {
        ...s.characters,
        [key]: s.characters[key] || emptyCharacter(name),
      },
    }));
    setMessage('Showing saved faction points for ' + name + '.');
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error('Choose a faction export smaller than 2 MB.');
      const parsed = parseFactionExport(await file.text());
      const name = /-factions\.txt$/i.test(file.name)
        ? file.name.replace(/-factions\.txt$/i, '').slice(0, 120)
        : character.name;
      const key = characterKey(name);
      setSaved((s) => {
        const c = s.characters[key] || emptyCharacter(name);
        return {
          ...s,
          active: key,
          characters: {
            ...s.characters,
            [key]: { ...c, standings: { ...c.standings, ...parsed.standings } },
          },
        };
      });
      setMessage(
        `Imported ${Object.keys(parsed.standings).length} faction rows for ${name}.${parsed.skipped ? ` Skipped ${parsed.skipped} rows that did not match the export format.` : ''} Other saved factions were kept.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'This file could not be loaded.',
      );
    }
  }
  if (!zone.trim()) return null;
  return (
    <section className="zf-panel" aria-label="Zone faction tracker">
      <header>
        <span className="zf-kicker">FACTION FIELD GUIDE</span>
        <h3>
          <AdvisorIcon code="faction" medallion /> Your standing in {zone}
        </h3>
        <p>
          See your saved points, set a goal, and check which hunts help or hurt.
          Points stay on this device.
        </p>
      </header>
      <fieldset disabled={!ready}>
        <div className="zf-toolbar">
          <label>
            Character / server
            <input
              value={characterDraft}
              maxLength={120}
              onChange={(e) => setCharacterDraft(e.target.value)}
              placeholder="Name_Server"
            />
          </label>
          <button type="button" onClick={() => selectCharacter(characterDraft)}>
            Use character
          </button>
          <label>
            Saved characters
            <select
              value={saved.active}
              onChange={(e) =>
                selectCharacter(saved.characters[e.target.value].name)
              }
            >
              {Object.entries(saved.characters).map(([key, c]) => (
                <option value={key} key={key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details className="zf-import">
          <summary>Import your faction points from the game</summary>
          <ol>
            <li>
              In EQL, enter <code>/outputfile faction</code>.
            </li>
            <li>
              Choose the file named <code>Character_Server-Factions.txt</code>{' '}
              in your game folder.
            </li>
            <li>
              Import it again after a hunt to refresh your chart. This is a
              saved snapshot, not a live game connection.
            </li>
          </ol>
          <label htmlFor={inputId}>
            Import faction export
            <input
              id={inputId}
              type="file"
              accept=".txt,.csv"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p>
            The usual file name selects the character and server for you. A file
            with another name loads into {character.name}.
          </p>
        </details>
        {message && (
          <p className="zf-status" role="status">
            {message}
          </p>
        )}
        <p className="ba-note">
          Showing <b>{character.name}</b>. A positive point total does not
          guarantee a friendly NPC. Race, deity, spells, and game changes may
          affect its response. Check in game.
        </p>
        <div className="zf-toolbar">
          <label>
            Instance or camp note (optional)
            <input
              value={instance}
              maxLength={120}
              onChange={(e) => setInstance(e.target.value)}
              placeholder="Base zone"
            />
          </label>
          <label>
            Add a faction to this location
            <select
              value={addedFaction}
              onChange={(e) => setAddedFaction(e.target.value)}
            >
              <option value="">Choose a faction</option>
              {options
                .filter((id) => !ids.includes(id))
                .map((id) => (
                  <option value={id} key={id}>
                    {factionName(id, character)}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!addedFaction || ids.includes(addedFaction)}
            onClick={() => {
              editCharacter((c) => ({
                ...c,
                zones: {
                  ...c.zones,
                  [locationKey]: [
                    ...new Set([...(c.zones[locationKey] || []), addedFaction]),
                  ],
                },
              }));
              setAddedFaction('');
            }}
          >
            Track faction here
          </button>
        </div>
        <p className="zf-meta">
          {record
            ? record.note
            : 'This zone has no reviewed faction links yet. Add one from the list or import your game export to see more factions.'}{' '}
          {instance.trim()
            ? 'Base-zone links are shown as a starting point; this instance has not been verified.'
            : ''}
        </p>
        <div className="zf-grid">
          {ids.map((id) => (
            <div key={saved.active + ':' + id}>
              <StandingCard
                id={id}
                character={character}
                protectedNames={protectedNames}
                onSave={(faction, standing) =>
                  editCharacter((c) => {
                    const standings = { ...c.standings };
                    if (standing) standings[faction] = standing;
                    else delete standings[faction];
                    return { ...c, standings };
                  })
                }
                onGoal={(faction, goal) =>
                  editCharacter((c) => ({
                    ...c,
                    goals: { ...c.goals, [faction]: goal },
                  }))
                }
              />
              {character.zones[locationKey]?.includes(id) &&
                !record?.factions.includes(id) && (
                  <button
                    type="button"
                    className="zf-remove"
                    onClick={() =>
                      editCharacter((c) => ({
                        ...c,
                        zones: {
                          ...c.zones,
                          [locationKey]: c.zones[locationKey].filter(
                            (f) => f !== id,
                          ),
                        },
                      }))
                    }
                  >
                    Remove local link to {factionName(id, character)}
                  </button>
                )}
            </div>
          ))}
        </div>
      </fieldset>
      <footer>
        Default goal: +1, the first positive point. This does not mean
        “Amiable.” Faction links cover a reviewed starting set. Ways to improve
        a faction may take you to another zone. Manual location links are your
        notes.
      </footer>
    </section>
  );
}
