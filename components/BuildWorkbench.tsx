'use client';
import { useEffect, useState } from 'react';
import AdvisorIcon from './AdvisorIcon';
import {
  assessBuild,
  validateInput,
  type AdvisorInput,
  type RulePack,
} from '../lib/build-advisor';
import {
  comparisonInput,
  planStorageKey,
  readPlan,
  readPlanFile,
  type SavedPlan,
} from '../lib/advisor-plans';
import '../app/build-workbench.css';

const labels: Record<string, string> = {
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
};
const codes = (i: AdvisorInput) =>
  [i.primary, i.secondary, i.tertiary].filter(Boolean);
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function BuildWorkbench({
  input,
  pack,
  onLoad,
}: {
  input: AdvisorInput;
  pack: RulePack;
  onLoad: (input: AdvisorInput) => void;
}) {
  const [plans, setPlans] = useState<SavedPlan[]>([]),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState('');
  const [name, setName] = useState(''),
    [filter, setFilter] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [initialPack] = useState(pack);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(planStorageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (!Array.isArray(saved) || saved.length > 4) throw new Error();
        setPlans(saved.map((p) => readPlan(p, initialPack)));
      }
    } catch {
      setMessage(
        'Saved builds could not be loaded. Your current build is still available.',
      );
    }
    setReady(true);
  }, [initialPack]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(planStorageKey, JSON.stringify(plans));
      } catch {
        setMessage(
          'This browser cannot save builds. Download a build file to keep a copy.',
        );
      }
  }, [plans, ready]);
  const selected = codes(input)
    .map((id) => pack.classes.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const assessment = assessBuild(codes(input), input, pack);
  const metrics = pack.metrics.filter(
    (m) =>
      (labels[m] || m).toLowerCase().includes(filter.toLowerCase()) &&
      (!onlyGaps || assessment.ratings[m] < 3),
  );
  const validPlans = plans.filter((p) => !validateInput(p.input, pack).length);
  const comparisons = [
    { name: 'Current build', input },
    ...validPlans.map((p) => ({
      name: p.name,
      input: comparisonInput(input, p.input),
    })),
  ].map((p) => ({ ...p, result: assessBuild(codes(p.input), p.input, pack) }));
  function snapshot(): SavedPlan {
    return {
      id:
        Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      name: name.trim() || codes(input).join(' / '),
      savedAt: new Date().toISOString(),
      input: structuredClone(input),
    };
  }
  async function importPlan(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100_000)
        throw new Error('Choose a build file smaller than 100 KB.');
      const p = readPlanFile(await file.text(), pack);
      if (plans.length >= 4)
        throw new Error(
          'Four builds are saved. Remove one before importing another.',
        );
      setPlans((old) => [...old, { ...p, id: snapshot().id }]);
      setMessage('Build imported. Choose Load build to use its settings.');
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'The build could not be read.',
      );
    }
  }
  return (
    <section className="bw-panel" aria-label="Build workbench">
      <h3>
        <AdvisorIcon code="settings" /> Build workbench
      </h3>
      <p>See what each class adds. Keep up to four builds to compare later.</p>
      <details className="bw-matrix" open>
        <summary>Who brings each strength?</summary>
        <div className="bw-tools">
          <label>
            Find a strength
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Healing, travel, damage…"
            />
          </label>
          <label className="bw-check">
            <input
              type="checkbox"
              checked={onlyGaps}
              onChange={(e) => setOnlyGaps(e.target.checked)}
            />{' '}
            Show ratings below 3 only
          </label>
        </div>
        <div className="ba-table-wrap" aria-label="Class strength table">
          <table>
            <caption>
              Planning ratings: 0 = none in these rules; 5 = very strong. These
              are estimates, not spell levels or measured damage.
            </caption>
            <thead>
              <tr>
                <th scope="col">Strength</th>
                {selected.map((c) => (
                  <th scope="col" key={c.id}>
                    <AdvisorIcon code={c.id} /> {c.name}
                  </th>
                ))}
                <th scope="col">Build</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m}>
                  <th scope="row">
                    <AdvisorIcon code={m} />
                    {labels[m] || m}
                  </th>
                  {selected.map((c) => (
                    <td key={c.id}>
                      <meter
                        min={0}
                        max={5}
                        value={c.ratings[m] || 0}
                        aria-label={`${c.name} ${labels[m] || m}`}
                      />{' '}
                      <span>{c.ratings[m] || 0}/5</span>
                    </td>
                  ))}
                  <td>
                    <b>{assessment.ratings[m]}/5</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!metrics.length && <p>No strengths match this filter.</p>}
        </div>
        <p className="ba-note">
          The build column uses the highest class rating. Shared strengths do
          not add together. The recommendation score also weighs your goals,
          overlap, and effort to play.{' '}
          <span className="ba-source">heuristic/inference</span>
        </p>
        {input.level !== null &&
          input.level < pack.tertiaryUnlockLevel &&
          input.tertiary && (
            <p className="ba-warning">
              This table previews all three classes. Your third class is still
              locked at your entered level. Zone advice uses your first two
              classes.
            </p>
          )}
      </details>
      <details>
        <summary>Save, compare & share builds</summary>
        <div className="bw-tools">
          <label>
            Build name
            <input
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="My named-hunting build"
            />
          </label>
          <button
            type="button"
            disabled={!ready || plans.length >= 4}
            onClick={() => {
              setPlans((old) => [...old, snapshot()]);
              setMessage('Saved on this device.');
            }}
          >
            Save current build ({plans.length}/4)
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                JSON.stringify(
                  { format: 'eqlsak-build-plan', version: 1, plan: snapshot() },
                  null,
                  2,
                ),
                'EQLSaK-Build-Plan.json',
                'application/json',
              )
            }
          >
            Download build file
          </button>
        </div>
        <label>
          Import a shared build file
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              void importPlan(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <p>
          Build files include your classes and hunt settings. They leave out
          character faction points and combat logs. Nothing is sent to a
          website.
        </p>
        {plans.map((p) => (
          <div className="bw-saved" key={p.id}>
            <div>
              <b>{p.name}</b>
              <small>
                {codes(p.input).join(' / ')} ·{' '}
                {new Date(p.savedAt).toLocaleDateString()}
              </small>
            </div>
            <button
              type="button"
              disabled={!!validateInput(p.input, pack).length}
              onClick={() => {
                onLoad(structuredClone(p.input));
                setMessage('Loaded ' + p.name + ' and its saved goals.');
              }}
            >
              Load {p.name}
            </button>
            <button
              type="button"
              onClick={() =>
                setPlans((old) => old.filter((x) => x.id !== p.id))
              }
              aria-label={'Remove saved build ' + p.name}
            >
              Remove
            </button>
          </div>
        ))}
        {validPlans.length > 0 && (
          <>
            <h4>
              <AdvisorIcon code="target" /> Compare your builds
            </h4>
            <p>
              Ratings preview every selected class. The buddy row uses the buddy
              and play mode currently on screen. Loading a saved build restores
              its own goals and settings.
            </p>
            <div className="ba-table-wrap" aria-label="Saved build comparison">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Planning check</th>
                    {comparisons.map((c, index) => (
                      <th scope="col" key={index}>
                        {c.name}
                        <small>{codes(c.input).join(' / ')}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pack.metrics.map((m) => (
                    <tr key={m}>
                      <th scope="row">{labels[m] || m}</th>
                      {comparisons.map((c, index) => (
                        <td key={index}>{c.result.ratings[m]}/5</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Effort to play</th>
                    {comparisons.map((c, index) => (
                      <td key={index}>{c.result.workload}/5</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Buddy helps with</th>
                    {comparisons.map((c, index) => (
                      <td key={index}>
                        {c.result.buddyFills
                          .map((m) => labels[m] || m)
                          .join(', ') ||
                          'No added coverage in the checked gaps'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Needs help with</th>
                    {comparisons.map((c, index) => (
                      <td key={index}>
                        {c.result.gaps.map((m) => labels[m] || m).join(', ') ||
                          'No major gaps in the checked areas'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
