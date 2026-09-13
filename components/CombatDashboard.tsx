import { useId, useMemo, useState } from 'react';
import {
  Activity,
  Crosshair,
  Sparkles,
  Flame,
  ShieldPlus,
  Heart,
  Timer,
  AlertTriangle,
  RefreshCw,
  Settings2,
  Check,
} from 'lucide-react';
import {
  combatSeries,
  trackEffects,
  validateEffectRules,
  type EffectRule,
  type ManualEffect,
  type EffectKind,
} from '../lib/combat-visuals';
import {
  isDamage,
  isSelf,
  type CombatEvent,
  type summarizeCombat,
} from '../lib/combat-meter';
import '../app/combat-dashboard.css';
const fmt = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
const duration = (seconds: number) =>
  Math.ceil(seconds) >= 60
    ? `${Math.floor(Math.ceil(seconds) / 60)}m ${Math.ceil(seconds) % 60}s`
    : `${Math.ceil(seconds)}s`;
const kindNames: Record<EffectKind, string> = {
  unknown: 'Effect type unknown',
  buff: 'Beneficial buff',
  debuff: 'Debuff',
  DoT: 'Damage over time',
  HoT: 'Healing over time',
};
export function CombatDashboard({
  events,
  stats,
  player,
  pet,
  clock,
  rolling,
}: {
  events: CombatEvent[];
  stats: ReturnType<typeof summarizeCombat>;
  player: string;
  pet: string;
  clock: number;
  rolling: boolean;
}) {
  const id = useId().replaceAll(':', '');
  const series = useMemo(
    () => combatSeries(events, player, pet, clock),
    [events, player, pet, clock],
  );
  const points = (field: 'damage' | 'dot' | 'healing') =>
    series.buckets
      .map(
        (bucket, index) =>
          `${index * 10},${180 - (bucket[field] / series.peak) * 155}`,
      )
      .join(' ');
  const dotDps = stats.dotDamage / stats.seconds;
  const gauges = [
    {
      label: 'Damage / second',
      value: fmt(stats.dps),
      fill: (stats.dps / Math.max(series.peakDps, stats.dps, 1)) * 100,
      note: rolling
        ? `Recent 30s peak: ${fmt(series.peakDps === 1 && !stats.hits ? 0 : series.peakDps)}`
        : 'Rate for the selected time window',
      icon: Activity,
      tone: 'gold',
    },
    {
      label: 'Hits & ticks',
      value: fmt(stats.hits),
      fill: (stats.hits / Math.max(series.peakHits, stats.hits, 1)) * 100,
      note: `${stats.weaponHits} weapon hits · ${stats.dotTicks} DoT ticks · spells included`,
      icon: Crosshair,
      tone: 'blue',
    },
    {
      label: 'Critical hits',
      value: fmt(stats.criticalHits),
      fill: stats.criticalRate,
      note: `${fmt(stats.criticalRate)}% of damage events marked Critical`,
      icon: Sparkles,
      tone: 'pink',
    },
    {
      label: 'DoT / second',
      value: fmt(dotDps),
      fill: stats.damage ? (stats.dotDamage / stats.damage) * 100 : 0,
      note: `${stats.damage ? fmt((stats.dotDamage / stats.damage) * 100) : 0}% of your damage · ${fmt(stats.dotDamage)} total`,
      icon: Flame,
      tone: 'violet',
    },
  ];
  const recent = stats.scope
    .filter(
      (event) =>
        isDamage(event) &&
        (isSelf(event.actor, player) ||
          Boolean(pet && event.actor.toLowerCase() === pet.toLowerCase())) &&
        !isSelf(event.target, player),
    )
    .slice(-6)
    .reverse();
  return (
    <div className="cm-dashboard">
      <div className="cm-gauges">
        {gauges.map((gauge) => (
          <article
            key={gauge.label}
            className={`cm-gauge cm-accent-${gauge.tone}`}
          >
            <h3>
              <gauge.icon aria-hidden="true" />
              {gauge.label}
            </h3>
            <div
              className="cm-dial"
              role="img"
              aria-label={`${gauge.label}: ${gauge.value}. ${gauge.note}`}
            >
              <svg viewBox="0 0 120 82" aria-hidden="true">
                <path
                  className="cm-dial-track"
                  d="M12 69 A48 48 0 0 1 108 69"
                  pathLength="100"
                />
                <path
                  className="cm-dial-fill"
                  d="M12 69 A48 48 0 0 1 108 69"
                  pathLength="100"
                  strokeDasharray={`${Math.max(0, Math.min(100, gauge.fill))} 100`}
                />
              </svg>
              <strong>{gauge.value}</strong>
            </div>
            <small>{gauge.note}</small>
          </article>
        ))}
      </div>
      <div className="cm-visual-grid">
        <article className="cm-panel cm-wave-panel">
          <div className="cm-chart-heading">
            <h3>
              <Activity /> Combat pulse
            </h3>
            <span>Last 60 seconds · each second shown</span>
          </div>
          <div className="cm-chart-legend">
            <span className="cm-gold-dot">All damage</span>
            <span className="cm-violet-dot">DoT portion</span>
            <span className="cm-green-dot">Healing</span>
          </div>
          <svg
            className="cm-wave-svg"
            viewBox="0 0 590 205"
            role="img"
            aria-label={`Damage and healing over the last sixty seconds. Highest one-second value ${fmt(series.peak === 1 && !stats.hits && !stats.healing ? 0 : series.peak)}.`}
          >
            <defs>
              <linearGradient id={`${id}-pulse`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#efb95e" stopOpacity=".35" />
                <stop offset="100%" stopColor="#efb95e" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 77, 128, 180].map((y) => (
              <line
                key={y}
                x1="0"
                x2="590"
                y1={y}
                y2={y}
                stroke="#354655"
                strokeDasharray="3 6"
              />
            ))}
            <polygon
              points={`0,180 ${points('damage')} 590,180`}
              fill={`url(#${id}-pulse)`}
            />
            <polyline
              points={points('damage')}
              fill="none"
              stroke="#efbd69"
              strokeWidth="2.5"
            />
            <polyline
              points={points('dot')}
              fill="none"
              stroke="#be9bff"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
            <polyline
              points={points('healing')}
              fill="none"
              stroke="#6de3b1"
              strokeWidth="2.5"
            />
            <text x="3" y="17" fill="#c4d5e2" fontSize="12">
              {fmt(series.peak)} / sec
            </text>
            <text x="0" y="201" fill="#c4d5e2" fontSize="12">
              60s ago
            </text>
            <text x="545" y="201" fill="#c4d5e2" fontSize="12">
              Now
            </text>
          </svg>
          <p className="cm-note">
            Purple is part of the gold damage line. Quiet seconds fall to zero.
          </p>
        </article>
        <article className="cm-panel cm-hit-stream">
          <h3>
            <Crosshair /> Latest hits
          </h3>
          {recent.length ? (
            recent.map((event, index) => (
              <div
                key={`${event.at}-${index}`}
                className={event.critical ? 'cm-hit cm-hit-critical' : 'cm-hit'}
              >
                <span>
                  {event.critical ? (
                    <Sparkles />
                  ) : event.kind === 'DoT' ? (
                    <Flame />
                  ) : (
                    <Crosshair />
                  )}
                  <b>{fmt(event.amount)}</b>
                </span>
                <div>
                  <strong>{event.ability}</strong>
                  <small>{event.target}</small>
                </div>
                <em>
                  {event.critical
                    ? 'CRITICAL'
                    : event.kind === 'DoT'
                      ? 'DoT tick'
                      : event.kind === 'DD'
                        ? 'Direct spell'
                        : 'Hit'}
                </em>
              </div>
            ))
          ) : (
            <p className="cm-empty">Your next logged hit will appear here.</p>
          )}
        </article>
      </div>
    </div>
  );
}

export function SpellActivity({
  events,
  rules,
  onRules,
  manual,
  onManual,
  player,
  pet,
  clock,
  demo = false,
}: {
  events: CombatEvent[];
  rules: EffectRule[];
  onRules: (rules: EffectRule[]) => void;
  manual: ManualEffect[];
  onManual: (marker: ManualEffect) => void;
  player: string;
  pet: string;
  clock: number;
  demo?: boolean;
}) {
  const effects = useMemo(
    () => trackEffects(events, rules, manual, player, pet, clock),
    [events, rules, manual, player, pet, clock],
  );
  const [edit, setEdit] = useState(false),
    [ability, setAbility] = useState(''),
    [kind, setKind] = useState<EffectKind>('buff'),
    [seconds, setSeconds] = useState(''),
    [applied, setApplied] = useState(''),
    [faded, setFaded] = useState(''),
    [target, setTarget] = useState('You'),
    [notice, setNotice] = useState('');
  const canRefresh = (effect: (typeof effects)[number]) =>
    effect.kind !== 'unknown' &&
    !(['debuff', 'DoT'].includes(effect.kind) && effect.target === 'You');
  const due = effects.filter(
    (effect) =>
      ['soon', 'due', 'ended'].includes(effect.status) &&
      canRefresh(effect) &&
      effect.basis !== 'Target defeated',
  );
  function configure(name: string, type: EffectKind, who = 'You') {
    const rule = rules.find(
      (rule) => rule.ability.toLowerCase() === name.toLowerCase(),
    );
    setAbility(name);
    setKind(rule?.kind || type);
    setSeconds(rule?.seconds ? String(rule.seconds) : '');
    setApplied(rule?.applied || '');
    setFaded(rule?.faded || '');
    setTarget(who);
    setEdit(true);
    setNotice('');
  }
  function saveRule(start = false) {
    if (demo) {
      setNotice(
        'Demo rules are examples. Load your log to save your own timers.',
      );
      return;
    }
    try {
      const rule = {
        ability: ability.trim(),
        kind,
        seconds: seconds.trim() ? Number(seconds) : null,
        applied: applied.trim(),
        faded: faded.trim(),
      };
      const next = validateEffectRules([
        ...rules.filter(
          (row) => row.ability.toLowerCase() !== rule.ability.toLowerCase(),
        ),
        rule,
      ]);
      if (start && (rule.seconds === null || !target.trim()))
        throw new Error('Enter a duration and target before starting a timer.');
      onRules(next);
      if (start)
        onManual({
          ability: rule.ability,
          kind,
          target: target.trim(),
          at: clock,
          seconds: rule.seconds!,
        });
      setNotice(
        start
          ? 'Timer started from the time shown on the meter.'
          : 'Timer rule saved. It starts when its landing message appears, or when you press Start / refresh.',
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Check the timer settings.',
      );
    }
  }
  const renderEffect = (effect: (typeof effects)[number]) => {
    const ownHarm = !canRefresh(effect);
    const status =
      effect.basis === 'Target defeated'
        ? 'Target defeated'
        : effect.status === 'ended'
          ? 'Worn off / ended'
          : effect.status === 'soon'
            ? ownHarm
              ? 'Fading soon'
              : 'Refresh soon'
            : effect.status === 'due'
              ? ownHarm
                ? 'Check if faded'
                : 'Check / refresh'
              : effect.status === 'timed'
                ? 'Estimated time left'
                : effect.status === 'check'
                  ? 'Check in game'
                  : 'Seen · time unknown';
    const rule = rules.find(
      (rule) => rule.ability.toLowerCase() === effect.ability.toLowerCase(),
    );
    return (
      <article
        className={`cm-effect-card cm-effect-${effect.kind} cm-effect-${effect.status}`}
        key={effect.key}
      >
        <div className="cm-effect-title">
          <span className="cm-spell-glyph">
            {effect.kind === 'buff' ? (
              <ShieldPlus />
            ) : effect.kind === 'HoT' ? (
              <Heart />
            ) : effect.kind === 'DoT' ? (
              <Flame />
            ) : (
              <AlertTriangle />
            )}
          </span>
          <div>
            <strong>{effect.ability}</strong>
            <small>
              {effect.target} · {kindNames[effect.kind]}
            </small>
          </div>
          <b>
            {effect.ended !== null
              ? 'Ended'
              : effect.remaining !== null
                ? duration(effect.remaining)
                : '—'}
          </b>
        </div>
        <div
          className="cm-effect-track"
          role="meter"
          aria-label={`${effect.ability} on ${effect.target}: ${status}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={effect.percent ?? 0}
          aria-valuetext={
            effect.remaining === null
              ? 'Remaining time unknown'
              : `${duration(effect.remaining)} estimated remaining`
          }
        >
          <span
            className={effect.percent === null ? 'cm-effect-unmeasured' : ''}
            style={{
              width: effect.percent === null ? '100%' : `${effect.percent}%`,
            }}
          />
        </div>
        <div className="cm-effect-caption">
          <span>{status}</span>
          <small>{effect.basis}</small>
        </div>
        {effect.tick !== null && (
          <p className="cm-note">
            Last tick {Math.max(0, Math.floor((clock - effect.tick) / 1000))}s
            ago
          </p>
        )}
        <div className="cm-effect-actions">
          <button
            onClick={() =>
              configure(effect.ability, effect.kind, effect.target)
            }
          >
            <Settings2 /> Set timer
          </button>
          {rule?.seconds && (
            <button
              onClick={() =>
                onManual({
                  ability: effect.ability,
                  kind: effect.kind,
                  target: effect.target,
                  at: clock,
                  seconds: rule.seconds!,
                })
              }
            >
              <RefreshCw /> {ownHarm ? 'Restart estimate' : 'Start / refresh'}
            </button>
          )}
        </div>
      </article>
    );
  };
  return (
    <section
      className="cm-panel cm-spell-board"
      aria-label="Spell activity and refresh timers"
    >
      <div className="cm-chart-heading">
        <h3>
          <Timer /> Spell watch
        </h3>
        <button onClick={() => setEdit(!edit)}>
          <Settings2 /> Spell timer settings
        </button>
      </div>
      <div className="cm-spell-counts">
        <span>
          <ShieldPlus />{' '}
          {
            effects.filter(
              (effect) =>
                ['buff', 'HoT'].includes(effect.kind) &&
                effect.status !== 'ended',
            ).length
          }{' '}
          helpful effects seen
        </span>
        <span>
          <Flame />{' '}
          {
            effects.filter(
              (effect) =>
                ['debuff', 'DoT'].includes(effect.kind) &&
                effect.status !== 'ended',
            ).length
          }{' '}
          harmful effects seen
        </span>
        <span className={due.length ? 'cm-refresh-alert' : ''}>
          <RefreshCw /> {due.length} to check / refresh
        </span>
      </div>
      <p className="cm-note">
        Green shows helpful spells. Purple and red show DoTs and debuffs, with
        the target beside each name. A saved duration gives an estimated
        countdown. Cast starts and ticks alone do not prove how much time is
        left.
      </p>
      {edit && (
        <div className="cm-timer-editor">
          <h3>
            <Settings2 /> {demo ? 'Demo timer settings' : 'Your spell timers'}
          </h3>
          <div className="cm-timer-fields">
            <label>
              Spell name
              <input
                value={ability}
                onChange={(event) => setAbility(event.target.value)}
                maxLength={120}
                placeholder="Name as shown in your log"
              />
            </label>
            <label>
              Effect type
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as EffectKind)}
              >
                {Object.entries(kindNames).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Duration in seconds
              <input
                type="number"
                min="1"
                max="86400"
                value={seconds}
                onChange={(event) => setSeconds(event.target.value)}
                placeholder="Use a duration you checked"
              />
            </label>
            <label>
              Target for a manual timer
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                maxLength={120}
                placeholder="You, ally, or enemy name"
              />
            </label>
            <label>
              Exact landing message (optional)
              <input
                value={applied}
                onChange={(event) => setApplied(event.target.value)}
                maxLength={500}
                placeholder="Copy the message when the effect lands"
              />
            </label>
            <label>
              Exact fade message (optional)
              <input
                value={faded}
                onChange={(event) => setFaded(event.target.value)}
                maxLength={500}
                placeholder="Copy the message when the effect ends"
              />
            </label>
          </div>
          <p className="cm-note">
            Leave off the time stamp. Use {'{target}'} in place of a name in a
            message; messages without it track You. Without a landing message,
            press Start / refresh when the spell lands. Durations are your
            settings; spell level and upgrades may change them.
          </p>
          {demo && <p className="cm-note">These are demo timers. Load your log to save or remove your own timer rules.</p>}
          {!demo && <div className="cm-effect-actions">
            <button onClick={() => saveRule()}>
              <Check /> Save timer rule
            </button>
            <button onClick={() => saveRule(true)}>
              <PlayIcon /> Save &amp; start now
            </button>
          </div>}
          {notice && (
            <p role="status" className="cm-message">
              {notice}
            </p>
          )}
          {rules.length > 0 && (
            <div className="cm-saved-timers">
              {rules.map((rule) => (
                <div key={rule.ability}>
                  <button onClick={() => configure(rule.ability, rule.kind)}>
                    {rule.ability} ·{' '}
                    {rule.seconds ? duration(rule.seconds) : 'time unknown'}
                  </button>
                  {!demo && <button
                    aria-label={`Remove timer rule for ${rule.ability}`}
                    onClick={() => onRules(rules.filter((row) => row !== rule))}
                  >
                    Remove
                  </button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {effects.length ? (
        <div className="cm-effect-grid">{effects.map(renderEffect)}</div>
      ) : (
        <div className="cm-spell-empty">
          <Timer />
          <strong>Watching for spell activity</strong>
          <p>
            DoT ticks and known spell messages will appear here. Add a timer
            rule for a buff or debuff you want to track.
          </p>
          <button onClick={() => setEdit(true)}>Add a spell timer</button>
        </div>
      )}
      <p className="cm-note">
        Worn-off messages stop a timer. Ticks do not restart it. Timers are
        estimates, not live spell-slot readings. Targets with the same name
        share a row.
      </p>
    </section>
  );
}
function PlayIcon() {
  return <RefreshCw aria-hidden="true" />;
}
