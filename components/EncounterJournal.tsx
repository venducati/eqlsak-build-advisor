import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Backpack,
  Gem,
  Coins,
  Flag,
  MapPin,
  LogOut,
  Download,
  Target,
  Skull,
  Route,
  Check,
  AlertTriangle,
  FolderSearch,
  FileText,
} from 'lucide-react';
import LogSetupHelp from './LogSetupHelp';
import { type AdvisorInput, type RulePack } from '../lib/build-advisor';
import { type CombatEvent } from '../lib/combat-meter';
import {
  appendTripEvents,
  finishTrip,
  goalsForTrip,
  newTripStream,
  readTripHistory,
  tripAdvice,
  tripContext,
  validateTripGoals,
  type MissedDrop,
  type Trip,
  type TripGoal,
} from '../lib/encounter-journal';
import AdvisorIcon from './AdvisorIcon';
import ZoneGuideLink from './ZoneGuideLink';
import strategy from '../data/trip-strategy.json';
import '../app/encounter-journal.css';

const fmt = (n: number) => new Intl.NumberFormat().format(n);
const money = (n: number) =>
  `${Math.floor(n / 1000)}p ${Math.floor((n % 1000) / 100)}g ${Math.floor((n % 100) / 10)}s ${n % 10}c`;
const labels = {
  kept: 'Kept at drop',
  sold: 'Auto-sold',
  stored: 'Stored in depot',
  upgraded: 'Used in upgrade',
};
const historyKey = 'eqlsak-trip-history-v1',
  goalsKey = 'eqlsak-trip-goals-v1';
const demoGoals: TripGoal[] = [
  {
    id: 'demo-gem',
    zone: '',
    item: 'Demo Gem',
    quantity: 2,
    mob: 'a training dummy',
  },
  {
    id: 'demo-ring',
    zone: '',
    item: 'Demo Ring',
    quantity: 1,
    mob: 'a training dummy',
  },
  {
    id: 'demo-crown',
    zone: '',
    item: 'Demo Crown',
    quantity: 1,
    mob: 'a training dummy',
  },
];
export function useTripJournal(input: AdvisorInput, pack: RulePack) {
  const settings = useRef({ input, pack });
  settings.current = { input, pack };
  const makeContext = (zone: string) =>
    tripContext(settings.current.input, settings.current.pack, zone);
  const stream = useRef(newTripStream('No log selected', '', makeContext));
  const archive = useRef<Trip[]>([]),
    demo = useRef(false),
    ready = useRef(false),
    dirty = useRef(false);
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(''),
    [goals, setGoals] = useState<TripGoal[]>([]);
  function trips() {
    const merged = new Map(
      (demo.current ? [] : archive.current).map((t) => [t.id, t]),
    );
    for (const t of stream.current.trips) merged.set(t.id, t);
    return [...merged.values()]
      .sort((a, b) => a.started - b.started)
      .slice(-40);
  }
  function save() {
    if (!ready.current || !dirty.current || demo.current) return;
    try {
      localStorage.setItem(historyKey, JSON.stringify(trips()));
      dirty.current = false;
    } catch {
      setNotice(
        'Trip details work here, but this device could not save them. Use Save trip report to keep a copy.',
      );
    }
  }
  function publish() {
    dirty.current = !demo.current;
    setRevision((n) => n + 1);
  }
  useEffect(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved)
        archive.current = readTripHistory(JSON.parse(saved)).map((t) =>
          t.ended === null
            ? {
                ...t,
                ended: t.last,
                exit: 'Recording ended; exit was not recorded',
                exitConfirmed: false,
              }
            : t,
        );
      const savedGoals = localStorage.getItem(goalsKey);
      if (savedGoals) setGoals(validateTripGoals(JSON.parse(savedGoals)));
    } catch {
      setNotice(
        'Some saved trip data could not be read. New trips still work.',
      );
    }
    ready.current = true;
    setRevision((n) => n + 1);
    const timer = setInterval(save, 5000);
    window.addEventListener('pagehide', save);
    return () => {
      save();
      clearInterval(timer);
      window.removeEventListener('pagehide', save);
    };
  }, []);
  function begin(source: string, player: string, isDemo = false) {
    if (!demo.current) {
      finishTrip(
        stream.current,
        stream.current.active?.last || Date.now(),
        'Recording changed; exit was not recorded',
        false,
      );
      archive.current = trips();
      dirty.current = true;
      save();
    }
    demo.current = isDemo;
    stream.current = newTripStream(source, player, makeContext);
    publish();
  }
  function ingest(events: CombatEvent[]) {
    const existingIds = new Set(stream.current.trips.map((t) => t.id));
    const before = stream.current.trips.filter((t) => t.ended !== null).length;
    appendTripEvents(stream.current, events);
    publish();
    if (!demo.current)
      for (const trip of stream.current.trips) {
        const saved = archive.current.find((t) => t.id === trip.id);
        if (
          !existingIds.has(trip.id) &&
          saved &&
          !trip.missed.length &&
          saved.missed.length
        )
          trip.missed = saved.missed.map((row) => ({ ...row }));
      }
    if (stream.current.trips.filter((t) => t.ended !== null).length !== before)
      save();
  }
  function finish(at: number, reason: string) {
    finishTrip(stream.current, at, `You reported leaving: ${reason}`, true);
    publish();
    save();
  }
  function addMissed(id: string, row: MissedDrop) {
    if (
      !row.item.trim() ||
      row.item.length > 240 ||
      !Number.isSafeInteger(row.quantity) ||
      row.quantity < 1 ||
      row.quantity > 1000000 ||
      row.mob.length > 240 ||
      row.reason.length > 240
    )
      throw new Error('Enter an item and a count from 1 to 1,000,000.');
    const trip = trips().find((t) => t.id === id);
    if (!trip || trip.missed.length >= 100)
      throw new Error(
        'This trip cannot hold more notes. Save its report first.',
      );
    trip.missed.push({ ...row, item: row.item.trim() });
    publish();
    save();
  }
  function removeMissed(id: string, index: number) {
    const trip = trips().find((t) => t.id === id);
    if (trip) {
      trip.missed.splice(index, 1);
      publish();
      save();
    }
  }
  function changeGoals(next: TripGoal[]) {
    if (demo.current) {
      setNotice(
        'Demo goals are examples. Load your log to set your own goals.',
      );
      return;
    }
    validateTripGoals(next);
    setGoals(next);
    try {
      localStorage.setItem(goalsKey, JSON.stringify(next));
    } catch {
      setNotice(
        'Goals work in this session, but could not be saved on this device.',
      );
    }
  }
  function restart() {
    begin(stream.current.source, stream.current.player, demo.current);
  }
  return {
    trips: trips(),
    sessionTrips: stream.current.trips,
    revision,
    goals: demo.current ? demoGoals : goals,
    begin,
    restart,
    ingest,
    finish,
    addMissed,
    removeMissed,
    changeGoals,
    notice,
    activeId: stream.current.active?.id,
  };
}

type JournalModel = ReturnType<typeof useTripJournal>;
export default function EncounterJournal({
  model,
  events,
  clock,
  replay,
  demo,
  player,
  source,
  input,
  pack,
  onFindLog,
  logBusy,
  logMode,
}: {
  model: JournalModel;
  events: CombatEvent[];
  clock: number;
  replay: boolean;
  demo: boolean;
  player: string;
  source: string;
  input: AdvisorInput;
  pack: RulePack;
  onFindLog: () => void;
  logBusy: boolean;
  logMode: 'idle' | 'live' | 'paused' | 'replay' | 'demo';
}) {
  const replayTrips = useMemo(() => {
    if (!replay) return [];
    const stream = newTripStream(source, player, (zone) =>
      tripContext(input, pack, zone),
    );
    return appendTripEvents(
      stream,
      events.filter((e) => e.at <= clock),
    );
  }, [events, clock, replay, source, player, input, pack]);
  const trips = replay ? replayTrips : model.trips;
  const [selected, setSelected] = useState(''),
    [zoneFilter, setZoneFilter] = useState(''),
    [editGoals, setEditGoals] = useState(false);
  const [item, setItem] = useState(''),
    [quantity, setQuantity] = useState('1'),
    [goalZone, setGoalZone] = useState(''),
    [mob, setMob] = useState('');
  const [missedItem, setMissedItem] = useState(''),
    [missedQuantity, setMissedQuantity] = useState('1'),
    [missedReason, setMissedReason] = useState('Left behind');
  const [exitReason, setExitReason] = useState('Finished the run'),
    [notice, setNotice] = useState('');
  // Prefer the file just loaded, even if a newer report exists in saved history.
  // Preserve a user's manual selection until another trip completes or a new session opens.
  const sessionTrips = replay ? replayTrips : model.sessionTrips;
  const preferred = [...sessionTrips].reverse().find((t) => t.ended !== null)
    || sessionTrips.at(-1) || [...trips].reverse().find((t) => t.ended !== null);
  const preferredId = preferred?.id;
  useEffect(() => {
    if (preferredId) {
      setSelected(preferredId);
      setZoneFilter('');
    }
  }, [preferredId]);
  const visible = trips.filter((t) => !zoneFilter || t.baseZone === zoneFilter);
  const trip = visible.find((t) => t.id === selected) || visible.at(-1);
  const goals = trip ? goalsForTrip(model.goals, trip) : [];
  const advice = trip ? tripAdvice(trip, model.goals) : [];
  const lootCount = trip?.drops.reduce((sum, d) => sum + d.quantity, 0) || 0;
  const coin =
    (trip?.coin || 0) +
    (trip?.drops.reduce((sum, d) => sum + d.copper, 0) || 0);
  const missed = trip?.missed.reduce((sum, d) => sum + d.quantity, 0) || 0;
  const totalWanted = goals.reduce((n, g) => n + g.quantity, 0),
    totalSecured = goals.reduce(
      (n, g) => n + Math.min(g.quantity, g.secured),
      0,
    );
  const active = model.trips.find((t) => t.id === model.activeId);
  function saveReport() {
    if (!trip) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: 'eqlsak-trip-report',
            version: 1,
            trip,
            goals,
            advice,
            strategyProvenance: 'heuristic/inference',
            note: 'Trip gains are not current inventory. Missing goals are not proof of missed drops.',
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = `EQLSaK-Trip-${new Date(trip.started).toISOString().replaceAll(':', '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="cm-panel cm-trip-board"
      aria-label="Norrath loot and trip reports"
    >
      <div className="cm-chart-heading">
        <h3>
          <Backpack /> Norrath loot &amp; trip report
        </h3>
        <button onClick={() => setEditGoals(!editGoals)}>
          <Target /> Loot goals
        </button>
      </div>
      <section className="cm-trip-log-source" aria-label="Trip report data source">
        <div className="cm-chart-heading">
          <h4><FileText aria-hidden="true" /> Where this report gets its data</h4>
          <button disabled={logBusy} onClick={onFindLog}><FolderSearch aria-hidden="true" /> Find loot log</button>
        </div>
        <p>Loot comes from the same character log as your combat. BA adds entries while watching a live log, or when you load a saved log. A zone exit or <strong>I left the instance</strong> completes the trip.</p>
        <dl>
          <div><dt>Current reader</dt><dd>{logMode === 'demo' ? 'Demo — made-up events' : `${logMode === 'live' ? 'Watching new lines' : logMode === 'paused' ? 'Paused' : logMode === 'idle' ? 'Not watching' : 'Saved events'} · ${source}`}</dd></div>
          <div><dt>This report</dt><dd>{demo ? 'Demo — made-up loot and goals' : trip ? trip.source : 'No trip recorded yet'}</dd></div>
          {trip && <div><dt>Recorded span</dt><dd>{new Date(trip.started).toLocaleString()} – {new Date(trip.ended ?? trip.last).toLocaleString()}</dd></div>}
        </dl>
        {trip?.source.includes('partial recent snapshot') && <p className="cm-note">Partial history: this report comes from the recent end of the file. Earlier events may be missing.</p>}
        <p className="cm-note">Watching starts with new lines. Choose <strong>Load recent trips</strong> after finding your log to see earlier loot. Saved reports stay on this device. Goals and missed-drop notes are entries you add; they do not come from a loot database.</p>
        {logBusy && <p className="cm-note">Stop live reading before choosing a different log. Your current reader already supplies new loot events.</p>}
        <LogSetupHelp />
      </section>
      <p className="cm-note">
        Tracks your logged drops in any zone or named instance. Entering another
        zone ends the previous trip and opens its report. If you log out or
        disconnect without a zone message, use <b>I left the instance</b>.
      </p>
      {replay && (
        <p className="cm-trip-banner">
          <Gem /> {demo ? 'DEMO · invented loot and goals' : 'Replay window'} ·
          Only events up to the replay clock are shown. Saved history stays
          unchanged.
        </p>
      )}
      {model.notice && (
        <p role="status" className="cm-message">
          {model.notice}
        </p>
      )}
      {editGoals && (
        <div className="cm-timer-editor">
          <h3>
            <Target /> Items you want from a trip
          </h3>
          <p className="cm-note">
            Use exact item names. A blank zone applies to every trip. These are
            your goals, not a verified list of possible drops.
          </p>
          <div className="cm-timer-fields">
            <label>
              Goal item
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                maxLength={240}
                placeholder="Exact item name"
              />
            </label>
            <label>
              How many?
              <input
                type="number"
                min={1}
                max={1000000}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label>
              Zone for this goal
              <input
                value={goalZone}
                onChange={(e) => setGoalZone(e.target.value)}
                maxLength={240}
                placeholder={trip?.baseZone || 'Any zone if blank'}
              />
            </label>
            <label>
              Target enemy, if known
              <input
                value={mob}
                onChange={(e) => setMob(e.target.value)}
                maxLength={240}
                placeholder="A source you have checked"
              />
            </label>
          </div>
          <button
            disabled={demo}
            onClick={() => {
              try {
                model.changeGoals([
                  ...model.goals,
                  {
                    id: crypto.randomUUID(),
                    item: item.trim(),
                    quantity: Number(quantity),
                    zone: goalZone.trim(),
                    mob: mob.trim(),
                  },
                ]);
                setItem('');
                setNotice('Loot goal saved.');
              } catch (error) {
                setNotice(String(error));
              }
            }}
          >
            <Check /> Add loot goal
          </button>
          <div className="cm-saved-timers">
            {model.goals.map((g) => (
              <div key={g.id}>
                <span>
                  {g.quantity} × {g.item} · {g.zone || 'Any zone'}
                </span>
                <button
                  disabled={demo}
                  onClick={() =>
                    model.changeGoals(
                      model.goals.filter((row) => row.id !== g.id),
                    )
                  }
                  aria-label={`Remove loot goal ${g.item}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="cm-trip-selectors">
        <label>
          Zone or dungeon
          <select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value);
              setSelected('');
            }}
          >
            <option value="">All recorded zones</option>
            {[...new Set(trips.map((t) => t.baseZone))].sort().map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <label>
          Trip / instance
          <select
            value={trip?.id || ''}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!trips.length && <option value="">No trip recorded yet</option>}
            {[...visible].reverse().map((t) => (
              <option key={t.id} value={t.id}>
                {t.zone} · {new Date(t.started).toLocaleString()} ·{' '}
                {t.ended === null ? 'Open' : 'Report'} · {t.player || t.source}
              </option>
            ))}
          </select>
        </label>
      </div>
      {active && !replay && (
        <div className="cm-trip-finish">
          <span>
            <MapPin /> Open trip: <b>{active.zone}</b>
          </span>
          <label>
            Reason for leaving
            <select
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
            >
              {[
                'Finished the run',
                'Died and left',
                'Ported or escaped',
                'Disconnected',
                'Logged out',
                'Time ran out',
                'Other reason',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              model.finish(Math.max(clock, active.last), exitReason);
              setNotice('Trip report saved. Log reading continues.');
            }}
          >
            <LogOut /> I left the instance
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="cm-message">
          {notice}
        </p>
      )}
      {!trip ? (
        <div className="cm-spell-empty">
          <Gem />
          <strong>Your next hunt starts here</strong>
          <p>
            Choose a live log, load a saved log, or try the demo. Add loot goals
            to compare what you gained with what you wanted.
          </p>
        </div>
      ) : (
        <>
          <div className="cm-trip-title">
            <div>
              <p className="cm-trip-kicker">
                {trip.ended === null
                  ? 'TRIP IN PROGRESS'
                  : trip.exitConfirmed
                    ? 'TRIP COMPLETE'
                    : 'RECORDING SUMMARY'}
              </p>
              <h3>{trip.zone}</h3>
              <p className="cm-note">
                {trip.zoneBasis} ·{' '}
                {trip.exit ||
                  'Waiting for a zone exit or your end-of-trip note'}
                {trip.ended !== null && !trip.exitConfirmed
                  ? ' · Leaving the instance was not confirmed.'
                  : ''}
              </p>
            </div>
            <div className="cm-effect-actions">
              <ZoneGuideLink zone={trip.baseZone} />
              <button onClick={saveReport}>
                <Download /> Save trip report
              </button>
            </div>
          </div>
          <div className="cm-trip-party">
            {trip.context.builds.map((build, index) => (
              <span key={index}>
                <b>P{index + 1}</b>
                {build.map((code) => (
                  <span key={code}>
                    <AdvisorIcon code={code} /> {code}
                  </span>
                ))}
              </span>
            ))}
            <small>Advisor setup when this trip started</small>
          </div>
          <div className="cm-trip-totals">
            <article>
              <Gem />
              <span>Items looted</span>
              <strong>{fmt(lootCount)}</strong>
              <small>Includes auto-sold and used drops</small>
            </article>
            <article>
              <Coins />
              <span>Logged coin gained</span>
              <strong>{money(coin)}</strong>
              <small>Corpse / split coin + auto-sales</small>
            </article>
            <article>
              <Flag />
              <span>Missed drops you reported</span>
              <strong>{fmt(missed)}</strong>
              <small>Separate from items not seen</small>
            </article>
            <article>
              <Skull />
              <span>Confirmed kills / deaths</span>
              <strong>
                {fmt(Object.values(trip.kills).reduce((n, v) => n + v, 0))} /{' '}
                {trip.deaths}
              </strong>
              <small>Only kills credited to you</small>
            </article>
          </div>
          <div
            className="cm-loot-spectrum"
            aria-label="How your logged loot was handled"
          >
            {Object.entries(labels).map(([type, label]) => {
              const count = trip.drops
                .filter((d) => d.disposition === type)
                .reduce((n, d) => n + d.quantity, 0);
              return (
                <div key={type} className={`cm-loot-${type}`}>
                  <span>
                    {label} <b>{fmt(count)}</b>
                  </span>
                  <div
                    role="meter"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, lootCount)}
                    aria-valuenow={count}
                  >
                    <i
                      style={{
                        width: `${lootCount ? (count / lootCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cm-table cm-loot-table">
            <table>
              <caption>Confirmed drops from your encounters</caption>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Enemy / corpse</th>
                  <th>Count</th>
                  <th>What happened</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {trip.drops.length ? (
                  [...trip.drops]
                    .sort((a, b) => b.at - a.at)
                    .map((d, index) => (
                      <tr key={index}>
                        <td>
                          <Gem /> {d.item}
                        </td>
                        <td>{d.mob}</td>
                        <td>{fmt(d.quantity)}</td>
                        <td>
                          <span
                            className={`cm-loot-badge cm-loot-${d.disposition}`}
                          >
                            {labels[d.disposition]}
                          </span>
                          {d.result && <small>Created: {d.result}</small>}
                          {d.copper > 0 && <small>{money(d.copper)}</small>}
                        </td>
                        <td>{new Date(d.at).toLocaleTimeString()}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      No supported personal loot messages in this trip.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="cm-note">
            This table records what happened at the drop. It is not your current
            inventory. Later trades, sales, bag sales and turn-ins may not name
            the items. Shared kills and loot rolls are not guessed.
          </p>
          {(trip.ignoredLoot > 0 || trip.limited) && (
            <p className="cm-message">
              <AlertTriangle /> {trip.ignoredLoot} loot line(s) could not be
              read.
              {trip.limited
                ? ' This trip reached the detail limit. Some rows are missing; these totals are partial.'
                : ''}{' '}
              Check Recent log messages below.
            </p>
          )}
          <div className="cm-goal-heading">
            <h3>
              <Target /> Gained vs. still wanted
            </h3>
            <strong>
              {totalSecured} / {totalWanted} goal items recorded
            </strong>
          </div>
          <div
            className="cm-goal-progress"
            role="meter"
            aria-label="Loot goal progress"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, totalWanted)}
            aria-valuenow={totalSecured}
          >
            <span
              style={{
                width: `${totalWanted ? (totalSecured / totalWanted) * 100 : 0}%`,
              }}
            />
          </div>
          {goals.length ? (
            <div className="cm-table">
              <table>
                <thead>
                  <tr>
                    <th>Goal item</th>
                    <th>Wanted</th>
                    <th>Kept / stored / made</th>
                    <th>Still wanted</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((g) => (
                    <tr key={g.id}>
                      <td>{g.item}</td>
                      <td>{g.quantity}</td>
                      <td>{g.secured}</td>
                      <td>{g.remaining}</td>
                      <td>
                        <span
                          className={`cm-loot-badge ${g.remaining === 0 ? 'cm-loot-kept' : 'cm-loot-sold'}`}
                        >
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="cm-note">
              Set a loot goal above to show what is still missing from your
              plan.
            </p>
          )}
          <p className="cm-note">
            <b>Not recorded</b> means the item was not shown as gained in this
            log. It does not mean that it dropped, was available, or was left
            behind.
          </p>
          <details className="cm-missed-notes">
            <summary>
              <Flag /> Record a drop you missed
            </summary>
            <p className="cm-note">
              Use this only for a drop you saw. These notes are labeled as your
              report, separate from log-confirmed loot.
            </p>
            <div className="cm-timer-fields">
              <label>
                Missed item
                <input
                  value={missedItem}
                  onChange={(e) => setMissedItem(e.target.value)}
                  maxLength={240}
                />
              </label>
              <label>
                Missed count
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={missedQuantity}
                  onChange={(e) => setMissedQuantity(e.target.value)}
                />
              </label>
              <label>
                What happened?
                <select
                  value={missedReason}
                  onChange={(e) => setMissedReason(e.target.value)}
                >
                  {[
                    'Left behind',
                    'Lost the roll',
                    'Passed to another player',
                    'Left before looting',
                    'Other',
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              disabled={replay}
              onClick={() => {
                try {
                  model.addMissed(trip.id, {
                    item: missedItem,
                    quantity: Number(missedQuantity),
                    mob: '',
                    reason: missedReason,
                  });
                  setMissedItem('');
                  setNotice('Missed-drop note saved as your report.');
                } catch (error) {
                  setNotice(String(error));
                }
              }}
            >
              Save missed-drop note
            </button>
            {replay && (
              <p className="cm-note">
                Pause at the end of a saved log to add a note to its full trip
                report.
              </p>
            )}
          </details>
          {trip.missed.length > 0 && (
            <ul className="cm-missed-list">
              {trip.missed.map((d, index) => (
                <li key={index}>
                  <Flag /> {d.quantity} × {d.item} · {d.reason}{' '}
                  <small>You reported this</small>
                  <button
                    disabled={replay}
                    onClick={() => model.removeMissed(trip.id, index)}
                    aria-label={`Remove missed-drop note ${d.item}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {trip.ended !== null && (
            <div className="cm-trip-strategy">
              <div className="cm-chart-heading">
                <h3>
                  <Route /> Plan your next trip
                </h3>
                <span>Local advice · heuristic / inference</span>
              </div>
              <p className="cm-note">
                Based on this report, your loot goals and the saved party setup.
                These suggestions do not promise better drops.
              </p>
              {advice.map((a) => (
                <article key={a.id}>
                  <h4>{a.title}</h4>
                  <p>{a.action}</p>
                  <small>
                    <b>Why:</b> {a.evidence}
                  </small>
                  <small>
                    <b>Tradeoff:</b> {a.tradeoff}
                  </small>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <details className="cm-trip-sources">
        <summary>Trip history &amp; sources</summary>
        <p className="cm-note">
          Up to 40 recent trips are saved on this device, with up to 250
          distinct loot rows per trip. Save reports to keep older runs. Trips
          work across Norrath without a zone whitelist; this is your observed
          loot history, not a complete drop database. Instance number and tier
          stay on the report. Reopening the same log and trip updates its saved
          record.
        </p>
        {strategy.sources.map((s) => (
          <p key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title} ↗
            </a>{' '}
            · reviewed {s.reviewed}
          </p>
        ))}
      </details>
    </section>
  );
}
