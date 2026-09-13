'use client';
import { useEffect, useState } from 'react';
import { playAdvisorSound } from '../lib/advisor-audio';
import '../app/build-advisor.css';
import AdvisorUpdates from './AdvisorUpdates';
import AdvisorIcon from './AdvisorIcon';
import GameWordsExplained from './GameWordsExplained';
import BuildFitReport from './BuildFitReport';
import AdvisorZonePicker from './AdvisorZonePicker';
import ZoneFactionAdvisor from './ZoneFactionAdvisor';
import BuildWorkbench from './BuildWorkbench';
import ZoneGuideLink from './ZoneGuideLink';
import { PartyEditor, PartyZoneChart } from './PartyAdvisor';
import { allZones } from '../lib/zone-catalog';
import {
  refreshBuiltInWording,
  roleLabels,
  modeLabels,
  sourceStatusLabels,
} from '../lib/advisor-wording';
import '../app/advisor-fantasy.css';
import {
  defaultInput,
  defaultRules,
  parseBuild,
  recommend,
  validateInput,
  validateRulePack,
} from '../lib/build-advisor';
import type { AdvisorInput, Evidence, RulePack } from '../lib/build-advisor';

type Profile = {
  name: string;
  build: string;
  level: string;
  location: string;
  goal: string;
};
const inputKey = 'eqlsak-advisor-input-v1',
  rulesKey = 'eqlsak-advisor-rules-v1';
const label: Record<string, string> = {
  dps: 'Damage',
  tank: 'Taking hits',
  heal: 'Healing',
  control: 'Enemy control',
  mobility: 'Movement',
  travel: 'Travel',
  stealth: 'Stealth',
  pulling: 'Pulling',
  survivability: 'Staying alive',
  faction: 'Faction access',
  overlap: 'Shared skills',
  workload: 'Effort to play',
};

export function useBuildAdvisor(profile: Profile, buddy?: Profile) {
  const [input, setInput] = useState<AdvisorInput>(defaultInput);
  const [pack, setPack] = useState<RulePack>(defaultRules);
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  useEffect(() => {
    try {
      let restoredPack = defaultRules;
      const rules = localStorage.getItem(rulesKey);
      if (rules) {
        const p = JSON.parse(rules);
        validateRulePack(p);
        restoredPack = refreshBuiltInWording(p);
        setPack(restoredPack);
      }
      const saved = localStorage.getItem(inputKey);
      if (saved) {
        const i = JSON.parse(saved);
        if (validateInput(i, restoredPack).length) throw new Error();
        setInput(i);
      }
    } catch {
      setStorageMessage(
        'Some saved data could not be loaded. You can still use the starting settings and rules.',
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(inputKey, JSON.stringify(input));
      localStorage.setItem(rulesKey, JSON.stringify(pack));
    } catch {
      setStorageMessage(
        'The app cannot save data right now. Advice still works while it is open. Save a rule backup to keep your changes.',
      );
    }
  }, [input, pack, ready]);
  function fromProfile() {
    const build = parseBuild(profile.build, pack);
    setInput((i) => ({
      ...i,
      primary: build[0] || '',
      secondary: build[1] || '',
      tertiary: build[2] || '',
      level: profile.level.trim() ? Number(profile.level) : null,
      zone: profile.location,
      buddy: buddy?.build ? parseBuild(buddy.build, pack) : [],
      mode: buddy?.build ? 'duo' : i.mode,
    }));
  }
  return { input, setInput, pack, setPack, ready, storageMessage, fromProfile };
}
export function BuildName({ ids, pack }: { ids: string[]; pack: RulePack }) {
  return (
    <span className="ba-build">
      {ids.filter(Boolean).map((id, i) => (
        <span key={id + '-' + i}>
          <AdvisorIcon code={id} medallion />{' '}
          {pack.classes.find((c) => c.id === id)?.name || id}
        </span>
      ))}
    </span>
  );
}
function Breakdown({ entries }: { entries: Evidence[] }) {
  return (
    <details className="ba-evidence">
      <summary>How the score was worked out</summary>
      <div className="ba-table-wrap">
        <table>
          <thead>
            <tr>
              <th>What matters</th>
              <th>Points</th>
              <th>Reason & source</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.label + i}>
                <th scope="row">
                  {label[e.label] ||
                    (e.label.includes('-') ? 'Build match' : e.label)}
                </th>
                <td>
                  {e.points > 0 ? '+' : ''}
                  {e.points}
                </td>
                <td>
                  {e.why}
                  <small className="ba-source">
                    {e.provenance.label} · {e.provenance.reference}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
function saveJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Sources({ build, pack }: { build: string[]; pack: RulePack }) {
  const evidence = pack.evidence.filter(
    (e) => !e.classes.length || e.classes.some((id) => build.includes(id)),
  );
  return (
    <details className="ba-sources">
      <summary>📚 Class guides & player opinions ({evidence.length})</summary>
      <p>
        These sources help describe what each class can do. The point values are
        still estimates that can be edited. Players may disagree. Claims marked
        as not used for scoring add no points.
      </p>
      {evidence.map((e) => (
        <article key={e.id}>
          <strong>
            {e.status === 'excluded'
              ? '⛔'
              : e.status === 'opinion'
                ? '💬'
                : '📖'}{' '}
            {e.kind} · {e.provenance.label}
          </strong>
          <p>{e.summary}</p>
          <p className="ba-note">{e.limitation}</p>
          <div>
            {e.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                {l.title} ↗{' '}
              </a>
            ))}
          </div>
          <small className="ba-source">
            Reviewed {e.reviewedOn} · {sourceStatusLabels[e.status]}. A link
            opens a website only when you select it.
          </small>
        </article>
      ))}
    </details>
  );
}
export function ContextualAdvisor({
  input,
  pack,
  zone,
  onOpen,
}: {
  input: AdvisorInput;
  pack: RulePack;
  zone?: string;
  onOpen: () => void;
}) {
  const i = zone ? { ...input, zone } : input,
    result = recommend(i, pack);
  const zoneResult = zone
    ? result.zones.find((z) =>
        [z.zone.name, z.zone.id, ...z.zone.aliases].some(
          (n) => n.toLowerCase() === zone.toLowerCase(),
        ),
      )
    : null;
  return (
    <section
      className="ba-context"
      aria-label={zone ? 'Zone build advice' : 'Character build advice'}
    >
      <div>
        <small>🧭 LOCAL BUILD ADVISOR{zone ? ' · ' + zone : ''}</small>
        <BuildName
          ids={[input.primary, input.secondary, input.tertiary]}
          pack={pack}
        />
        {result.errors.length ? (
          <p>{result.errors[0]}</p>
        ) : (
          <>
            {zone ? (
              zoneResult ? (
                <p>
                  {zoneResult.blocked
                    ? '⚖️ Left out because it conflicts with your faction choices.'
                    : input.level === null
                      ? '📍 Add your level to check how well this zone fits.'
                      : '📍 Saved hunting levels ' +
                        zoneResult.zone.min +
                        '–' +
                        zoneResult.zone.max +
                        ' · ' +
                        zoneResult.score +
                        ' fit points.'}{' '}
                  {zoneResult.cautions.join(' ')}
                </p>
              ) : (
                <p>
                  There are no saved rules for this zone yet. Add zone data to
                  check levels, loot, and factions.
                </p>
              )
            ) : (
              <p>
                {input.tertiary
                  ? 'This build needs help with: ' +
                    (result.assessment?.gaps.map((m) => label[m]).join(', ') ||
                      'no major needs in the starting rules') +
                    '.'
                  : 'Suggested third class: ' +
                    result.rankings[0]?.name +
                    '. ' +
                    (result.rankings[0]?.rules[0]?.why ||
                      'Adds skills your current classes need.')}
              </p>
            )}
            {zoneResult && <Breakdown entries={zoneResult.breakdown} />}
            <small className="ba-source">
              Heuristic/inference · An estimate based on your settings. All
              scores are worked out on your computer.
            </small>
          </>
        )}
      </div>
      <button type="button" onClick={onOpen}>
        Open Build Advisor →
      </button>
    </section>
  );
}
export default function BuildAdvisor({
  model,
  profileName,
  onZone,
  showProfile = true,
  appVersion,
}: {
  model: ReturnType<typeof useBuildAdvisor>;
  profileName: string;
  onZone?: (zone: string) => void;
  showProfile?: boolean;
  appVersion?: string;
}) {
  const { input, setInput, pack, setPack, storageMessage, fromProfile } = model;
  const [combo, setCombo] = useState('');
  const [reportClass, setReportClass] = useState('');
  const [resultView, setResultView] = useState<'build' | 'factions'>('build');
  const [comboError, setComboError] = useState('');
  const [ruleMessage, setRuleMessage] = useState('');
  const [buddyDraft, setBuddyDraft] = useState(input.buddy.join(' / '));
  const [gearDraft, setGearDraft] = useState(input.gearGoals.join(', '));
  const [factionDraft, setFactionDraft] = useState(
    input.factionConstraints.join(', '),
  );
  useEffect(() => setBuddyDraft(input.buddy.join(' / ')), [input.buddy]);
  useEffect(() => setGearDraft(input.gearGoals.join(', ')), [input.gearGoals]);
  useEffect(
    () => setFactionDraft(input.factionConstraints.join(', ')),
    [input.factionConstraints],
  );
  const result = recommend(input, pack);
  const selected = result.rankings.find((r) => r.id === input.tertiary);
  const build = [input.primary, input.secondary, input.tertiary].filter(
    Boolean,
  );
  const assessment = result.assessment;
  const currentZone = result.zones.find((z) =>
    [z.zone.name, z.zone.id, ...z.zone.aliases].some(
      (n) => n.toLowerCase() === input.zone.toLowerCase(),
    ),
  );
  function change<K extends keyof AdvisorInput>(
    key: K,
    value: AdvisorInput[K],
  ) {
    setInput((i) => ({ ...i, [key]: value }));
  }
  async function importRules(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1000000)
        throw new Error('Rules files must be smaller than 1 MB.');
      const next = JSON.parse(await file.text());
      validateRulePack(next);
      setPack(refreshBuiltInWording(next));
      setRuleMessage(
        'Rules loaded on your computer. The build scores have been updated.',
      );
    } catch (e) {
      setRuleMessage(e instanceof Error ? e.message : 'Could not read rules.');
    }
  }
  return (
    <section className="build-advisor" aria-label="Build Advisor">
      <header className="ba-heading">
        <div className="ba-title-group">
          <AdvisorIcon code="compass" medallion />
          <div>
            <small>EQLSaK · EverQuest Legends companion</small>
            <h2 className="ba-title-line">Build Advisor {appVersion && <span className="ba-app-version">v{appVersion}</span>}</h2>
            <p>
              Choose your classes. See what works well, what needs help, and
              which buddy build may fit.
            </p>
          </div>
        </div>
        <span className="ba-badge">
          <AdvisorIcon code="why" /> Works offline
        </span>
      </header>
      <AdvisorUpdates
        input={input}
        pack={pack}
        onApply={(next) => setPack(refreshBuiltInWording(next))}
      />
      <div className="ba-presets">
        {showProfile && <button type="button" onClick={fromProfile}>
          Use {profileName}&apos;s profile + buddy
        </button>}
        <button
          type="button"
          onClick={() =>
            setInput({
              ...defaultInput,
              primary: 'RNG',
              secondary: 'ROG',
              tertiary: 'BRD',
            })
          }
        >
          <AdvisorIcon code="RNG" /> Ranger / Rogue / Bard
        </button>
        <button
          type="button"
          onClick={() =>
            setInput({
              ...defaultInput,
              primary: 'MNK',
              secondary: 'CLR',
              tertiary: 'ENC',
            })
          }
        >
          <AdvisorIcon code="MNK" /> Monk / Cleric / Enchanter (MCE)
        </button>
        <button
          type="button"
          onClick={() =>
            setInput({
              ...defaultInput,
              primary: 'MNK',
              secondary: 'CLR',
              tertiary: 'ROG',
              mode: 'duo',
              buddy: ['WAR', 'CLR', 'ENC'],
            })
          }
        >
          <AdvisorIcon code="buddy" /> Monk / Cleric / Rogue duo
        </button>
      </div>
      <form
        className="ba-combo"
        onSubmit={(e) => {
          e.preventDefault();
          const ids = parseBuild(combo, pack);
          if (ids.length < 2 || ids.length > 3) {
            playAdvisorSound('notice');
            setComboError(
              'Enter two or three classes with / between them. You can also enter MCE for Monk / Cleric / Enchanter.',
            );
            return;
          }
          const next = {
            ...input,
            primary: ids[0],
            secondary: ids[1],
            tertiary: ids[2] || '',
          };
          const errors = validateInput(next, pack);
          if (errors.length) {
            playAdvisorSound('notice');
            setComboError(errors.join(' '));
            return;
          }
          setInput(next);
          setComboError('');
          setResultView('build');
          setReportClass(ids[2] || recommend(next, pack).rankings[0]?.id || '');
        }}
      >
        <label>
          Enter your classes
          <input
            value={combo}
            onChange={(e) => setCombo(e.target.value)}
            placeholder="Ranger / Rogue / Bard or MCE"
          />
        </label>
        <button type="submit">Explain this build</button>
      </form>
      {comboError && (
        <p role="alert" className="ba-warning">
          {comboError}
        </p>
      )}
      <GameWordsExplained />
      <div className="ba-layout">
        <div className="ba-controls">
          <h3>
            <AdvisorIcon code="settings" /> Your build & goals
          </h3>
          <div className="ba-fields">
            {(['primary', 'secondary', 'tertiary'] as const).map((key) => (
              <label key={key}>
                {
                  {
                    primary: 'First class (Primary)',
                    secondary: 'Second class (Secondary)',
                    tertiary: 'Third class (Optional)',
                  }[key]
                }
                <select
                  value={input[key]}
                  onChange={(e) => change(key, e.target.value)}
                >
                  <option value="">
                    {key === 'tertiary'
                      ? 'Recommend a third class'
                      : 'Choose class'}
                  </option>
                  {pack.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Level
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                placeholder="Unknown"
                value={input.level ?? ''}
                onChange={(e) =>
                  change(
                    'level',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              Who you play with
              <select
                value={input.mode}
                onChange={(e) =>
                  change('mode', e.target.value as AdvisorInput['mode'])
                }
              >
                {(Object.keys(modeLabels) as AdvisorInput['mode'][]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {modeLabels[m]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Your main job or goal
              <select
                value={input.role}
                onChange={(e) => change('role', e.target.value)}
              >
                {Object.keys(pack.roles).map((m) => (
                  <option key={m} value={m}>
                    {roleLabels[m] || m}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(['mobility', 'healing', 'control', 'complexity'] as const).map(
            (key) => (
              <label className="ba-range" key={key}>
                {
                  {
                    complexity: 'How much effort you want to put in',
                    control: 'Need to control extra enemies',
                    mobility: 'Need to move quickly',
                    healing: 'Need for healing',
                  }[key]
                }{' '}
                <b>{input[key]} / 5</b>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={input[key]}
                  onChange={(e) => change(key, Number(e.target.value))}
                />
                <small>
                  {key === 'complexity'
                    ? '0 = easy to manage · 5 = many skills to manage is fine'
                    : '0 = no extra need · 5 = very important'}
                </small>
              </label>
            ),
          )}
          <PartyEditor input={input} pack={pack} onChange={setInput} />
          <details className="ba-party-editor">
            <summary>Paste Player 2’s trio (optional)</summary>
          <label>
            Player 2’s classes
            <input
              value={buddyDraft}
              onChange={(e) => setBuddyDraft(e.target.value)}
              onBlur={() => change('buddy', parseBuild(buddyDraft, pack))}
              placeholder="MNK / CLR / ENC (or MCE)"
            />
          </label>
          <button
            type="button"
            onClick={() => change('buddy', parseBuild(buddyDraft, pack))}
          >
            Apply buddy build
          </button>
          {input.mode === 'solo' && input.buddy.length > 0 && (
            <p className="ba-note">
              Choose Duo or Group to include help from your buddy. Solo means
              you play alone.
            </p>
          )}
          </details>
          <h3>
            <AdvisorIcon code="zone" /> Where & what you hunt
          </h3>
          <AdvisorZonePicker
            value={input.zone}
            zones={allZones(pack.zones)}
            onChange={(zone, continent) =>
              setInput((i) => ({
                ...i,
                zone,
                ...(continent ? { continent } : {}),
              }))
            }
          />
          <label>
            Current continent
            <select
              value={input.continent}
              onChange={(e) => change('continent', e.target.value)}
            >
              <option value="">Unknown</option>
              {Array.from(
                new Set([
                  ...allZones(pack.zones).map((z) => z.continent),
                  'Kunark',
                  'Velious',
                  'Luclin',
                ]),
              ).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Factions to protect or avoid
            <input
              value={factionDraft}
              onChange={(e) => setFactionDraft(e.target.value)}
              onBlur={() =>
                change(
                  'factionConstraints',
                  factionDraft
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
              placeholder="Faction names, separated by commas"
            />
          </label>
          <label>
            Gear you want to find
            <input
              value={gearDraft}
              onChange={(e) => setGearDraft(e.target.value)}
              onBlur={() =>
                change(
                  'gearGoals',
                  gearDraft
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
              placeholder="Item names, separated by commas"
            />
          </label>
          <p className="ba-note">
            Zones with a known faction conflict are left out. If faction access
            is unknown, the advisor will say so. Gear searches use saved item
            names.
          </p>
        </div>
        <div className="ba-results" aria-live="polite">
          <nav className="ba-view-switch" aria-label="Advisor views">
            <button
              type="button"
              aria-pressed={resultView === 'build'}
              onClick={() => setResultView('build')}
            >
              <AdvisorIcon code="settings" /> Build & compare
            </button>
            <button
              type="button"
              aria-pressed={resultView === 'factions'}
              onClick={() => setResultView('factions')}
            >
              <AdvisorIcon code="faction" /> Zone factions
            </button>
          </nav>
          <div hidden={resultView !== 'factions'}>
            {!input.zone.trim() && (
              <p className="ba-note">
                Choose a current zone to see its faction guide.
              </p>
            )}
            <ZoneFactionAdvisor
              zone={input.zone}
              profileName={profileName}
              protectedNames={input.factionConstraints}
            />
          </div>
          <div hidden={resultView !== 'build'}>
            {result.errors.length > 0 ? (
              <div role="alert" className="ba-warning">
                <h3>Check your combination</h3>
                {result.errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            ) : (
              <>
                <BuildWorkbench input={input} pack={pack} onLoad={setInput} />
                {assessment && (
                  <article className="ba-assessment">
                    <small>
                      YOUR{' '}
                      {input.tertiary ? 'COMPLETE BUILD' : 'TWO-CLASS BUILD'}
                    </small>
                    <h3>
                      <BuildName ids={build} pack={pack} />
                    </h3>
                    {input.level !== null &&
                      input.level < pack.tertiaryUnlockLevel && (
                        <p className="ba-warning">
                          These rules say your third class unlocks at level{' '}
                          {pack.tertiaryUnlockLevel}. You can plan for it now,
                          but it does not count toward your current zone score
                          yet.{' '}
                          <a
                            href="https://eqlwiki.com/index.php/Newbie_Guide"
                            target="_blank"
                            rel="noreferrer"
                          >
                            EQL Wiki — Newbie Guide
                          </a>
                        </p>
                      )}
                    <div className="ba-two">
                      <section>
                        <h4>
                          <AdvisorIcon code="why" /> Why it works
                        </h4>
                        <p>
                          {assessment.strengths.length
                            ? 'Best at: ' +
                              assessment.strengths
                                .map(([m]) => label[m] || m)
                                .join(', ') +
                              '.'
                            : 'No skill in this build scores 4 or higher in the current rules.'}
                        </p>
                        {(selected?.rules || []).map((r) => (
                          <p key={r.id}>
                            {r.why}
                            <small className="ba-source">
                              {r.provenance.label}
                            </small>
                          </p>
                        ))}
                      </section>
                      <section>
                        <h4>
                          <AdvisorIcon code="warning" /> What needs care
                        </h4>
                        <p>
                          {assessment.gaps.length
                            ? 'Needs help with: ' +
                              assessment.gaps.map((m) => label[m]).join(', ') +
                              '.'
                            : 'The rules show no major gaps in healing, enemy control, staying alive, or travel.'}
                        </p>
                        <p>
                          Effort to play this build: {assessment.workload}/5.
                          Effort you are comfortable with: {input.complexity}/5.
                        </p>
                        {assessment.tradeoffs.map((t) => (
                          <p key={t}>{t}</p>
                        ))}
                      </section>
                    </div>
                    <h4>
                      <AdvisorIcon code="target" /> How this fits your goals
                    </h4>
                    <p>
                      {modeLabels[input.mode]} ·{' '}
                      {roleLabels[input.role] || input.role} ·{' '}
                      {selected
                        ? 'Your third class ranks #' +
                          (result.rankings.indexOf(selected) + 1) +
                          ' of ' +
                          result.rankings.length +
                          ' at ' +
                          selected.score +
                          ' points.'
                        : 'Choose a third class below to see the full build.'}{' '}
                      Points help compare builds. They do not show your chance
                      of winning a fight.
                    </p>
                    <p className="ba-note">
                      Skill ratings run from 0 (none) to 5 (very strong). They
                      are planning estimates.
                    </p>
                    <div className="ba-capabilities">
                      {Object.entries(assessment.ratings).map(([m, v]) => (
                        <div key={m}>
                          <span>
                            <AdvisorIcon code={m} /> {label[m] || m}
                          </span>
                          <meter
                            aria-label={label[m] || m}
                            min="0"
                            max="5"
                            value={v}
                          />
                          <b>{v}/5</b>
                        </div>
                      ))}
                    </div>
                    <h4>
                      <AdvisorIcon code="buddy" /> Buddy fit
                    </h4>
                    {input.buddy.length > 0 && input.mode !== 'solo' ? (
                      <>
                        <BuildName ids={input.buddy} pack={pack} />
                        <p>
                          {assessment.buddyFills.length
                            ? 'Your buddy helps with: ' +
                              assessment.buddyFills
                                .map((m) => label[m])
                                .join(', ') +
                              '.'
                            : 'These rules do not show this buddy fully covering a major gap in your build.'}
                        </p>
                      </>
                    ) : (
                      <p>Buddy help is not included right now.</p>
                    )}
                    {assessment.companions.map((r) => (
                      <p key={r.id}>
                        {r.why} {r.tradeoff}
                        <small className="ba-source">
                          {r.provenance.label} · {r.provenance.reference}
                        </small>
                      </p>
                    ))}
                    {assessment.suggestedCompanions.map((r) => (
                      <div key={r.id} className="ba-buddy">
                        <BuildName ids={r.suggested} pack={pack} />
                        <p>
                          {r.why} {r.tradeoff}
                        </p>
                        <small className="ba-source">
                          {r.provenance.label}
                        </small>
                        <button
                          type="button"
                          onClick={() =>
                            setInput((i) => ({
                              ...i,
                              buddy: r.suggested,
                              mode: 'duo',
                            }))
                          }
                        >
                          Compare with this buddy
                        </button>
                      </div>
                    ))}
                    <small className="ba-source">
                      Skill ratings use heuristic/inference, which means
                      estimates. This is not a fight simulator. It does not
                      check every class or skill unlock, your gear, or how you
                      play.
                    </small>
                    {selected && <Breakdown entries={selected.breakdown} />}
                    <Sources build={build} pack={pack} />
                  </article>
                )}
                <section className="ba-ranking">
                  <h3>
                    <AdvisorIcon code="compass" /> Third-class choices, ranked
                  </h3>
                  <p>
                    Your first two classes stay the same. Change your goals to
                    see how the ranks change.
                  </p>
                  {result.rankings.map((r, n) => (
                    <article
                      key={r.id}
                      className={
                        r.id === input.tertiary
                          ? 'ba-choice ba-selected'
                          : 'ba-choice'
                      }
                    >
                      <header>
                        <span className="ba-rank">#{n + 1}</span>
                        <h4>
                          <AdvisorIcon code={r.id} medallion /> {r.name}
                          {r.id === input.tertiary ? ' · Your choice' : ''}
                        </h4>
                        <strong>{r.score} pts</strong>
                      </header>
                      <p>
                        {r.rules[0]?.why ||
                          r.breakdown
                            .filter((b) => b.points > 0)
                            .sort((a, b) => b.points - a.points)
                            .slice(0, 2)
                            .map((b) => b.why)
                            .join(' ')}
                      </p>
                      <p className="ba-note">⚠️ {r.tradeoffs[0]}</p>
                      <button
                        type="button"
                        onClick={() => setReportClass(r.id)}
                        aria-haspopup="dialog"
                      >
                        See why {r.name} fits
                      </button>
                      <Breakdown entries={r.breakdown} />
                    </article>
                  ))}
                </section>
                <section className="ba-zone-results">
                  <h3>
                    <AdvisorIcon code="zone" /> Zone fit for this build & party
                  </h3>
                  <p>
                    {input.tertiary
                      ? 'Uses all the classes you chose.'
                      : 'Uses your two chosen classes. It does not add a suggested third class.'}{' '}
                    {pack.zones.length} zones are saved in these rules. More
                    zones can be added to the rule file.
                  </p>
                  {input.zone && !currentZone && (
                    <p className="ba-warning">
                      No saved rule for {input.zone}. The advisor cannot tell
                      how well this zone fits yet.
                    </p>
                  )}
                  {[...result.zones]
                    .sort(
                      (a, b) =>
                        Number(b === currentZone) - Number(a === currentZone),
                    )
                    .map((z) => (
                      <article key={z.zone.id} className="ba-choice">
                        <header>
                          <h4>
                            {z.zone.name}
                            {z === currentZone ? ' · Current zone' : ''}
                          </h4>
                          <strong>
                            {z.blocked ? 'Left out' : z.score + ' pts'}
                          </strong>
                        </header>
                        <p>
                          Levels {z.zone.min}–{z.zone.max} · {z.zone.continent}
                        </p>
                        {z.cautions.map((c) => (
                          <p className="ba-note" key={c}>
                            ⚠️ {c}
                          </p>
                        ))}
                        <ZoneGuideLink zone={z.zone.name} onZone={onZone} />
                        <PartyZoneChart input={input} pack={pack} zone={z.zone} />
                        <Breakdown entries={z.breakdown} />
                      </article>
                    ))}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
      <details className="ba-rules">
        <summary>📚 Saved rules, sources & backups</summary>
        <p>
          Rule format version {pack.version}. The starting build scores are
          estimates, marked heuristic/inference. User-verified EQL means a rule
          cites a player check. EQL-sourced means it cites an EQL source. These
          labels need evidence. A label alone does not prove a claim is true.
        </p>
        <div className="ba-presets">
          <button
            type="button"
            onClick={() => saveJSON(pack, 'eqlsak-advisor-rules.json')}
          >
            Save a rule backup (JSON)
          </button>
          <label className="ba-import">
            Load a rule file (JSON)
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void importRules(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setPack(defaultRules);
              setRuleMessage('Starting rules restored.');
            }}
          >
            Restore starting rules
          </button>
          <button
            type="button"
            onClick={() =>
              saveJSON({ input, result }, 'eqlsak-build-explanation.json')
            }
          >
            Save this build explanation
          </button>
        </div>
        <p role="status">{ruleMessage}</p>
        <p>
          Settings and rules stay in this app or browser on your computer. JSON
          is the file format used to save them. Build advice needs no AI
          service, API key, paid plan, or internet connection.
        </p>
      </details>
      {storageMessage && (
        <p role="status" className="ba-warning">
          {storageMessage}
        </p>
      )}
      {reportClass && <BuildFitReport input={input} candidate={reportClass} pack={pack} onClose={() => setReportClass('')} onChoose={() => { change('tertiary', reportClass); setReportClass(''); }} />}
    </section>
  );
}
