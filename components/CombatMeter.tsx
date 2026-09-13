'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  Activity,
  Heart,
  ShieldPlus,
  Flame,
  Zap,
  FileUp,
  Pause,
  Play,
  Square,
  Download,
} from 'lucide-react';
import {
  CombatLines,
  EVENT_LIMIT,
  parseCombatLine,
  summarizeCombat,
} from '../lib/combat-meter';
import type { CombatEvent } from '../lib/combat-meter';
import sources from '../data/combat-messages.json';
import { CombatDashboard, SpellActivity } from './CombatDashboard';
import EncounterJournal, { useTripJournal } from './EncounterJournal';
import LogFinder from './LogFinder';
import type { LogFileHandle, LogSearch } from '../lib/log-discovery';
import {
  defaultInput,
  defaultRules,
  type AdvisorInput,
  type RulePack,
} from '../lib/build-advisor';
import {
  combatBounds,
  logPlayerName,
  validateEffectRules,
  type EffectRule,
  type ManualEffect,
} from '../lib/combat-visuals';
import '../app/live-combat-meter.css';
type Batch = { text: string; reset: boolean; backlog: number; error?: string };
type LogBridge = {
  detect: () => Promise<LogSearch>;
  chooseFolder: () => Promise<LogSearch | null>;
  startDetected: (
    id: string,
  ) => Promise<{ name: string; skipPartial: boolean }>;
  start: () => Promise<{ name: string; skipPartial: boolean } | null>;
  stop: () => Promise<void>;
  pause: (paused: boolean) => Promise<void>;
  onData: (cb: (batch: Batch) => void) => () => void;
};
type Handle = LogFileHandle;
declare global {
  interface Window {
    eqlMeter?: LogBridge;
    showOpenFilePicker?: (options: unknown) => Promise<Handle[]>;
  }
}
const number = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
const kinds: Record<string, string> = {
  melee: 'Weapon / skill',
  DD: 'Direct damage',
  DoT: 'Damage over time',
  damage: 'Damage type unknown',
  heal: 'Healing',
  HoT: 'Healing over time',
};
const demoTimers: EffectRule[] = [
  {
    ability: 'Demo Ward',
    kind: 'buff',
    seconds: 20,
    applied: 'You are protected by Demo Ward.',
    faded: '',
  },
  {
    ability: 'Demo Weakness',
    kind: 'debuff',
    seconds: 18,
    applied: '{target} is affected by Demo Weakness.',
    faded: '',
  },
  {
    ability: 'Demo Burn',
    kind: 'DoT',
    seconds: 24,
    applied: '{target} is affected by Demo Burn.',
    faded: '',
  },
];
export default function CombatMeter({
  advisorInput = defaultInput,
  advisorPack = defaultRules,
}: {
  advisorInput?: AdvisorInput;
  advisorPack?: RulePack;
}) {
  const tripJournal = useTripJournal(advisorInput, advisorPack);
  const [timerRules, setTimerRules] = useState<EffectRule[]>([]),
    [timersReady, setTimersReady] = useState(false),
    [manualTimers, setManualTimers] = useState<ManualEffect[]>([]);
  const [playhead, setPlayhead] = useState<number | null>(null),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [events, setEvents] = useState<CombatEvent[]>([]),
    [player, setPlayer] = useState(''),
    [pet, setPet] = useState('');
  const [mode, setMode] = useState<
      'idle' | 'live' | 'paused' | 'replay' | 'demo'
    >('idle'),
    [name, setName] = useState('No log selected'),
    [message, setMessage] = useState('');
  const [now, setNow] = useState(() => Date.now()),
    [rolling, setRolling] = useState(true),
    [filter, setFilter] = useState('all'),
    [dropped, setDropped] = useState(0),
    [busy, setBusy] = useState(false);
  const reader = useRef(new CombatLines()),
    store = useRef<CombatEvent[]>([]),
    handle = useRef<Handle | null>(null),
    offset = useRef(0),
    modified = useRef(0),
    decoder = useRef(new TextDecoder()),
    polling = useRef(false),
    generation = useRef(0),
    modeRef = useRef(mode),
    input = useRef<HTMLInputElement>(null);
  modeRef.current = mode;
  function reset() {
    store.current = [];
    reader.current.reset();
    setEvents([]);
    setDropped(0);
    setManualTimers([]);
    setPlaying(false);
    setPlayhead(null);
  }
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eqlsak-spell-timers-v1');
      if (saved) setTimerRules(validateEffectRules(JSON.parse(saved)));
    } catch {
      setMessage(
        'Saved spell timers could not be loaded. You can add them again in Spell timer settings.',
      );
    }
    setTimersReady(true);
  }, []);
  useEffect(() => {
    if (!timersReady) return;
    try {
      localStorage.setItem(
        'eqlsak-spell-timers-v1',
        JSON.stringify(timerRules),
      );
    } catch {
      setMessage(
        'Timer settings work in this session, but could not be saved on this device.',
      );
    }
  }, [timerRules, timersReady]);
  function ingest(text: string) {
    const parsed = reader.current
      .push(text)
      .map(parseCombatLine)
      .filter((x): x is CombatEvent => Boolean(x));
    if (!parsed.length) return;
    tripJournal.ingest(parsed);
    const all = [...store.current, ...parsed];
    const excess = Math.max(0, all.length - EVENT_LIMIT);
    if (excess) setDropped((n) => n + excess);
    store.current = all.slice(-EVENT_LIMIT);
    setEvents(store.current);
  }
  const ingestLive = useEffectEvent((text: string) => ingest(text));
  const restartLive = useEffectEvent(() => { reset(); tripJournal.restart(); });
  useEffect(() => {
    let disposed = false;
    const off = window.eqlMeter?.onData((batch) => {
      if (batch.error) {
        setMessage(batch.error);
        setMode('paused');
        return;
      }
      if (batch.reset) {
        restartLive();
        setMessage(
          'Log was replaced or shortened. A fresh meter session has started.',
        );
      }
      ingestLive(batch.text);
      if (batch.backlog) setMessage('Catching up with the log…');
    });
    const timer = setInterval(() => {
      setNow(Date.now());
      if (modeRef.current !== 'live' || !handle.current || polling.current)
        return;
      const current = generation.current;
      polling.current = true;
      void (async () => {
        try {
          const file = await handle.current!.getFile();
          if (disposed || current !== generation.current) return;
          if (
            file.size < offset.current ||
            (file.size === offset.current &&
              file.lastModified !== modified.current)
          ) {
            offset.current = 0;
            decoder.current = new TextDecoder();
            restartLive();
            setMessage('Log changed or was shortened. Meter reset.');
          }
          const end = Math.min(file.size, offset.current + 262144);
          const bytes = await file.slice(offset.current, end).arrayBuffer();
          if (disposed || current !== generation.current) return;
          offset.current = end;
          modified.current = file.lastModified;
          ingestLive(decoder.current.decode(bytes, { stream: true }));
        } catch (e) {
          setMessage('Log access stopped. Select the file again. ' + String(e));
          setMode('paused');
        } finally {
          polling.current = false;
        }
      })();
    }, 1000);
    return () => {
      disposed = true;
      clearInterval(timer);
      off?.();
      void window.eqlMeter?.stop().catch(() => {});
    };
  }, []);
  async function stop() {
    try { await window.eqlMeter?.stop(); }
    catch { setMessage('Could not stop the log reader. Try Stop again.'); return false; }
    generation.current++;
    handle.current = null;
    setPlaying(false);
    setPlayhead(
      modeRef.current === 'live'
        ? Date.now()
        : combatBounds(store.current, Date.now()).last,
    );
    setMode('replay');
    setMessage('Stopped. These are the events recorded so far.');
    return true;
  }
  async function attachBrowser(chosen: Handle) {
    const file = await chosen.getFile();
    const skipPartial = Boolean(
      file.size && (await file.slice(-1).text()) !== '\n',
    );
    if (!await stop()) return;
    reset();
    handle.current = chosen;
    offset.current = file.size;
    modified.current = file.lastModified;
    decoder.current = new TextDecoder();
    reader.current.reset(skipPartial);
    setName(file.name);
    const character = logPlayerName(file.name);
    if (character) setPlayer(character);
    tripJournal.begin(file.name, character || player);
    setMode('live');
  }
  async function start(candidateId?: string, browserHandle?: Handle) {
    setBusy(true);
    setMessage('');
    try {
      if (window.eqlMeter) {
        const selected = candidateId
          ? await window.eqlMeter.startDetected(candidateId)
          : await window.eqlMeter.start();
        if (!selected) { setMessage('Log choice cancelled. Your current data is unchanged.'); return; }
        reset();
        reader.current.reset(selected.skipPartial);
        setName(selected.name);
        const character = logPlayerName(selected.name);
        if (character) setPlayer(character);
        tripJournal.begin(selected.name, character || player);
        setMode('live');
      } else if (browserHandle) {
        await attachBrowser(browserHandle);
      } else if (window.showOpenFilePicker) {
        const [chosen] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'EverQuest combat log',
              accept: { 'text/plain': ['.txt', '.log'] },
            },
          ],
        });
        await attachBrowser(chosen);
      } else {
        setMessage(
          'This browser cannot watch a live log. Use the Windows app, or load a saved log below.',
        );
        return;
      }
      setNow(Date.now());
      setMessage(
        'Watching new log lines from now on. Enter /log on in EQL. Check that your combat chat filters show the messages you want to track.',
      );
    } catch (e) {
      setMessage(e instanceof DOMException && e.name === 'AbortError'
        ? 'Log choice cancelled. Your current data is unchanged.'
        : 'Could not open log: ' + String(e));
    } finally {
      setBusy(false);
    }
  }
  async function pause() {
    const paused = mode !== 'paused';
    try { await window.eqlMeter?.pause(paused); }
    catch { setMessage('Could not change log playback. Try again or choose Stop.'); return; }
    if (paused) setPlayhead(Date.now());
    setMode(paused ? 'paused' : 'live');
    setMessage(
      paused
        ? 'Paused. When you resume, the meter will read the lines added during the pause.'
        : 'Resumed.',
    );
  }
  async function importFile(file: File) {
    setBusy(true);
    try {
      if (file.size > 25 * 1024 * 1024)
        throw new Error(
          'Saved logs must be 25 MB or smaller. Use Choose live log for larger files.',
        );
      if (!await stop()) return;
      reset();
      const text = await file.text();
      const character = logPlayerName(file.name);
      tripJournal.begin(file.name, character || player);
      ingest(text + '\n');
      setName(file.name);
      if (character) setPlayer(character);
      setPlayhead(combatBounds(store.current, Date.now()).last);
      setRolling(false);
      setMode('replay');
      setMessage(
        'Saved log loaded. The gauges show recorded totals. Press Replay last minute to watch the graphs move. Choose live log to follow new game activity.',
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    if (!await stop()) return;
    reset();
    const t = Date.now() - 35000;
    const samples: { at: number; text: string }[] = [
      { at: t, text: 'You have entered The Estate of Unrest 7 (Refined).' },
      { at: t, text: 'You are protected by Demo Ward.' },
      { at: t + 1000, text: 'a training dummy is affected by Demo Weakness.' },
      { at: t + 2000, text: 'a training dummy is affected by Demo Burn.' },
      {
        at: t + 19000,
        text: 'Your Demo Weakness spell has worn off of a training dummy.',
      },
      { at: t + 22000, text: 'You are protected by Demo Ward.' },
      { at: t + 12000, text: 'You have slain a training dummy!' },
      {
        at: t + 13000,
        text: "--You have looted 2 Demo Gem from a training dummy's corpse.--",
      },
      {
        at: t + 18000,
        text: "You looted a Demo Ring from a training dummy's corpse and sold it for 2 gold.",
      },
      {
        at: t + 26000,
        text: "You looted 3 Demo Thread from a training dummy's corpse and stored it in your tradeskill depot.",
      },
      {
        at: t + 29000,
        text: 'You receive 3 gold, 2 silver and 5 copper from the corpse.',
      },
      { at: t + 35000, text: "You have entered Dagnor's Cauldron." },
    ];
    for (let second = 0; second < 35; second++) {
      if (second % 2 === 0)
        samples.push({
          at: t + second * 1000,
          text: `You slash a training dummy for ${second % 6 === 0 ? 240 : 85 + second * 3} points of damage.${second % 6 === 0 ? ' (Critical)' : ''}`,
        });
      if (second >= 3 && second <= 24 && second % 3 === 0)
        samples.push({
          at: t + second * 1000,
          text: 'a training dummy has taken 45 damage from your Demo Burn.',
        });
      if (second % 7 === 0)
        samples.push({
          at: t + second * 1000,
          text: 'You healed yourself for 130 hit points by Demo Heal.',
        });
      if (second > 0 && second % 8 === 0)
        samples.push({
          at: t + second * 1000,
          text: 'You hit a training dummy for 175 points of fire damage by Demo Flare.',
        });
      if (second % 5 === 0)
        samples.push({
          at: t + second * 1000,
          text: 'a training dummy hits YOU for 35 points of damage.',
        });
    }
    tripJournal.begin('Example combat messages', '', true);
    ingest(
      samples
        .sort((a, b) => a.at - b.at)
        .map((row) => '[' + new Date(row.at).toISOString() + '] ' + row.text)
        .join('\n') + '\n',
    );
    setName('Example combat messages');
    setMode('demo');
    setRolling(true);
    setPlayhead(t);
    setPlaying(true);
    setMessage(
      'DEMO: made-up hits, spells, loot and timer lengths. Playback shows the gauges, refresh cues and a report when you leave the instance.',
    );
  }
  const bounds = combatBounds(events, now);
  const last = bounds.last;
  const clock = mode === 'live' || mode === 'idle' ? now : (playhead ?? last);
  const stats = summarizeCombat(events, player, pet, clock, rolling);
  const effectEvents = stats.effects;
  const rows = stats.breakdown.filter(
    (r) => filter === 'all' || r.kind === filter,
  );
  const activeTimerRules = mode === 'demo' ? demoTimers : timerRules;
  useEffect(() => {
    if (!playing || !['replay', 'demo'].includes(mode)) return;
    const tick = setInterval(
      () =>
        setPlayhead((current) =>
          Math.min(bounds.last, (current ?? bounds.first) + 1000 * speed),
        ),
      1000,
    );
    return () => clearInterval(tick);
  }, [playing, mode, bounds.first, bounds.last, speed]);
  useEffect(() => {
    if (playing && playhead !== null && playhead >= bounds.last)
      setPlaying(false);
  }, [playing, playhead, bounds.last]);
  function replay() {
    setRolling(true);
    setPlayhead(Math.max(bounds.first, bounds.last - 60000));
    setPlaying(true);
  }
  function exportEvents() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: 'eqlsak-meter-events',
            version: 1,
            mode,
            player,
            pet,
            events,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EQLSaK-combat-events.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="combat-meter" aria-label="EQLSaK combat meter">
      <header className="cm-heading">
        <div>
          <span className="cm-kicker">EQLSaK · Combat Meter</span>
          <h2>
            <Activity aria-hidden="true" /> Your combat, as it happens
          </h2>
        </div>
        <span className={'cm-status cm-' + mode}>
          {mode === 'live'
            ? 'Watching log'
            : mode === 'idle'
              ? 'Ready'
              : mode === 'demo'
                ? 'DEMO'
                : mode === 'replay'
                  ? 'Saved events'
                  : 'Paused'}
        </span>
      </header>
      <LogFinder
        disabled={busy || mode === 'live' || mode === 'paused'}
        onDetected={(id) => start(id)}
        onBrowser={(chosen) => start(undefined, chosen)}
      />
      <div className="cm-toolbar">
        <button
          onClick={() => void start()}
          disabled={busy || mode === 'live' || mode === 'paused'}
        >
          <Play /> Choose live log
        </button>
        <button
          onClick={() => void pause()}
          disabled={busy || !['live', 'paused'].includes(mode)}
        >
          <Pause />
          {mode === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => void stop()}
          disabled={busy || !['live', 'paused'].includes(mode)}
        >
          <Square />
          Stop
        </button>
        <button
          disabled={busy || ['live', 'paused'].includes(mode)}
          onClick={() => input.current?.click()}
        >
          <FileUp />
          Load saved log
        </button>
        <button
          disabled={busy || ['live', 'paused'].includes(mode)}
          onClick={() => void demo()}
        >
          Try demo
        </button>
        <button disabled={!events.length || busy} onClick={exportEvents}>
          <Download />
          Save event list
        </button>
        <input
          ref={input}
          type="file"
          accept=".txt,.log"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = '';
          }}
        />
      </div>
      <p className="cm-note">
        Enable <code>/log on</code> in-game, then select your character’s{' '}
        <code>eqlog_…txt</code> file in the EQL Logs folder. Only this selected
        file is read; combat data stays on your device.
      </p>
      <div className="cm-settings">
        <label>
          Your character name
          <input
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Your name in the log; You is matched too"
          />
        </label>
        <label>
          Include pet damage (optional name)
          <input
            value={pet}
            onChange={(e) => setPet(e.target.value)}
            placeholder="Exact pet name; leave blank to skip pets"
          />
        </label>
        <label>
          Time window
          <select
            value={rolling ? 'rolling' : 'buffer'}
            onChange={(e) => setRolling(e.target.value === 'rolling')}
          >
            <option value="rolling">Last 30 seconds</option>
            <option value="buffer">All events still held by the meter</option>
          </select>
        </label>
      </div>
      <p className="cm-message" role="status">
        {message || 'Choose a log or try the demo to begin.'}
      </p>
      {['replay', 'demo'].includes(mode) && events.length > 0 && (
        <div className="cm-replay-bar" aria-label="Saved combat playback">
          <button onClick={replay}>
            <Play /> Replay last minute
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            disabled={clock >= bounds.last && !playing}
          >
            {playing ? <Pause /> : <Play />}
            {playing ? 'Pause replay' : 'Continue replay'}
          </button>
          <label>
            Speed
            <select
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            >
              {[1, 2, 4, 10].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
          <input
            type="range"
            aria-label="Replay time"
            min={bounds.first}
            max={bounds.last}
            step={1000}
            value={Math.max(bounds.first, Math.min(bounds.last, clock))}
            onChange={(event) => {
              setPlaying(false);
              setPlayhead(Number(event.target.value));
            }}
          />
          <time>
            {new Date(clock).toLocaleTimeString()} ·{' '}
            {playing ? 'Replay running' : 'Recorded time'}
          </time>
        </div>
      )}
      <CombatDashboard
        events={events}
        stats={stats}
        player={player}
        pet={pet}
        clock={clock}
        rolling={rolling}
      />
      <div className="cm-metrics">
        <article className="cm-damage">
          <Zap />
          <span>Direct spell damage</span>
          <strong>{number(stats.ddDamage)}</strong>
          <small>{number(stats.damage)} total damage, all types</small>
        </article>
        <article className="cm-heal">
          <ShieldPlus />
          <span>Healing per second</span>
          <strong>{number(stats.hps)}</strong>
          <small>{number(stats.healing)} healing logged</small>
        </article>
        <article className="cm-incoming">
          <Heart />
          <span>Damage taken</span>
          <strong>{number(stats.incoming)}</strong>
          <small>{number(stats.received)} healing received</small>
        </article>
        <article>
          <Activity />
          <span>Current health</span>
          <strong className="cm-unknown">Not available</strong>
          <small>
            These log messages do not give your current or full health.
          </small>
        </article>
      </div>
      <p className="cm-note">
        {rolling
          ? 'Per-second rates use the full last 30 seconds.'
          : 'Rates use the time from your first to last combat or healing event still held by the meter. Pauses between events count too. The minimum time is one second.'}{' '}
        Healing uses the first amount shown in each log line. It may not equal
        the health actually restored.{' '}
        {dropped > 0
          ? number(dropped) +
            ' older events were removed. The meter keeps up to 20,000 events at a time.'
          : ''}
      </p>
      {mode === 'live' && events.length > 0 && Math.abs(now - last) > 60000 && (
        <p className="cm-message">
          No recent events with a time stamp. Check the game log, combat
          filters, and computer clock. The meter cannot tell whether you are
          resting or log messages are missing.
        </p>
      )}
      <SpellActivity
        events={events}
        rules={activeTimerRules}
        onRules={(rules) => {
          if (mode === 'demo') {
            setMessage(
              'Demo timer settings are examples. Load your log to save your own timers.',
            );
            return;
          }
          setTimerRules(rules);
        }}
        manual={manualTimers}
        onManual={(marker) =>
          setManualTimers((current) => [...current, marker].slice(-200))
        }
        player={player}
        pet={pet}
        clock={clock}
        demo={mode === 'demo'}
      />
      <EncounterJournal
        model={tripJournal}
        events={events}
        clock={clock}
        replay={
          mode === 'demo' || playing || (playhead !== null && playhead < last)
        }
        demo={mode === 'demo'}
        player={player}
        source={name}
        input={advisorInput}
        pack={advisorPack}
      />
      <div className="cm-columns">
        <article className="cm-panel">
          <h3>
            <Zap /> Damage &amp; healing
          </h3>
          <label className="cm-filter">
            Show
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All measured skills and spells</option>
              {Object.entries(kinds).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {rows.length ? (
            <div className="cm-table">
              <table>
                <thead>
                  <tr>
                    <th>Ability</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Events</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.kind + r.ability}>
                      <td>{r.ability}</td>
                      <td>
                        <span className={'cm-type cm-type-' + r.kind}>
                          {kinds[r.kind]}
                        </span>
                      </td>
                      <td>{number(r.amount)}</td>
                      <td>{r.hits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="cm-empty">No matching events in this time range.</p>
          )}
        </article>
        <article className="cm-panel">
          <h3>
            <Flame /> Spell effects seen in the log
          </h3>
          <p className="cm-note">
            Recent helpful spell messages and damage-over-time hits. Use Spell
            watch above for countdowns based on your saved timer settings.
          </p>
          {effectEvents.length ? (
            <ul className="cm-effects">
              {effectEvents.map((e, i) => (
                <li key={i}>
                  <span className={'cm-type cm-type-' + e.kind}>
                    {e.kind === 'beneficial'
                      ? 'Helpful spell message'
                      : e.kind === 'DoT'
                        ? 'DoT tick'
                        : 'Worn off'}
                  </span>
                  <strong>{e.ability}</strong>
                  <small>
                    {e.target} · {new Date(e.at).toLocaleTimeString()}
                    {e.amount ? ' · ' + number(e.amount) + ' damage' : ''}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cm-empty">No known spell-effect messages yet.</p>
          )}
        </article>
      </div>
      <details className="cm-panel">
        <summary>Recent log messages &amp; what the meter can read</summary>
        <p className="cm-note">
          {name} · {number(events.length)} events still held by the meter.
          Starting a cast does not prove the spell worked. Messages the meter
          cannot sort are still shown here.
        </p>
        <div className="cm-event-list">
          {stats.scope
            .slice(-80)
            .reverse()
            .map((e, i) => (
              <p key={i}>
                <time>{new Date(e.at).toLocaleTimeString()}</time>{' '}
                <b>{e.kind === 'unknown' ? 'Other / unknown type' : e.kind}</b>{' '}
                {e.raw}
              </p>
            ))}
        </div>
      </details>
      <details className="cm-panel">
        <summary>What the meter can measure · Sources</summary>
        {sources.limitations.map((s) => (
          <p key={s}>{s}</p>
        ))}
        <p>
          Some spells share the same log message. EQLSaK can read the message
          types listed in its rules. Other lines stay marked as unknown. This
          tool is not part of the separate EQL Meter program.
        </p>
        {sources.sources.map((s) => (
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
