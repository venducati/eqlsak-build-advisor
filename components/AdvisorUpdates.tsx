'use client';
import { useEffect, useState } from 'react';
import { playAdvisorSound } from '../lib/advisor-audio';
import { recommend, teammateBuilds, validateRulePack } from '../lib/build-advisor';
import type { AdvisorInput, RulePack } from '../lib/build-advisor';
import { refreshBuiltInWording } from '../lib/advisor-wording';
type Snapshot = {
  title: string;
  excerpt: string;
  hash: string;
  checkedAt: string;
  observedDate: string | null;
  lastModified: string | null;
};
type SourceResult = {
  id: string;
  title: string;
  url: string;
  status: 'first-check' | 'changed' | 'unchanged' | 'unavailable';
  snapshot?: Snapshot;
  previous?: Snapshot | null;
  error?: string;
};
type Update = {
  payload: {
    format: string;
    schemaVersion: number;
    release: string;
    publishedAt: string;
    notes: string;
    rules: RulePack;
  };
  hash: string;
  url: string;
  hashVerified: boolean;
};
declare global {
  interface Window {
    eqlDesktop?: {
      version: string;
      getSourceHistory: () => Promise<{
        version: number;
        sources: Record<string, Snapshot>;
      }>;
      checkSources: (
        classes: string[],
      ) => Promise<{ checkedAt: string; results: SourceResult[] }>;
      getRuleUpdate: (url: string, expectedHash: string) => Promise<Update>;
      onProgress: (
        callback: (p: { done: number; total: number }) => void,
      ) => () => void;
    };
  }
}
const permissionKey = 'eqlsak-online-enabled-v1',
  rollbackKey = 'eqlsak-advisor-rollback-v1',
  feedKey = 'eqlsak-rule-feed-v1';
export default function AdvisorUpdates({
  input,
  pack,
  onApply,
}: {
  input: AdvisorInput;
  pack: RulePack;
  onApply: (p: RulePack) => void;
}) {
  const [desktop, setDesktop] = useState(false),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(''),
    [message, setMessage] = useState(''),
    [results, setResults] = useState<SourceResult[]>([]);
  const [url, setURL] = useState(''),
    [hash, setHash] = useState(''),
    [pending, setPending] = useState<Update | null>(null),
    [previous, setPrevious] = useState<RulePack | null>(null);
  const [lastCheck, setLastCheck] = useState('');
  useEffect(() => {
    setDesktop(Boolean(window.eqlDesktop));
    try {
      setEnabled(localStorage.getItem(permissionKey) === 'yes');
      setURL(localStorage.getItem(feedKey) || '');
      const stored = localStorage.getItem(rollbackKey);
      if (stored) {
        const p = JSON.parse(stored);
        validateRulePack(p);
        setPrevious(refreshBuiltInWording(p));
      }
    } catch {
      setMessage('Saved update settings could not be loaded.');
    }
    const bridge = window.eqlDesktop;
    if (!bridge) return;
    void bridge
      .getSourceHistory()
      .then((h) => {
        const dates = Object.values(h.sources)
          .map((s) => s.checkedAt)
          .filter(Boolean)
          .sort();
        if (dates.length) setLastCheck(dates[dates.length - 1]);
      })
      .catch(() =>
        setMessage('The app could not load your past source checks.'),
      );
    return bridge.onProgress((p) =>
      setProgress('Checked ' + p.done + ' of ' + p.total + ' source pages…'),
    );
  }, []);
  function toggle(value: boolean) {
    setEnabled(value);
    try {
      localStorage.setItem(permissionKey, value ? 'yes' : 'no');
    } catch {
      setMessage(
        'This online setting lasts only while the app is open. It could not be saved.',
      );
    }
  }
  async function checkSources() {
    if (!enabled || !window.eqlDesktop || busy) return;
    setBusy(true);
    setMessage('');
    setProgress('Checking sources for your chosen classes…');
    try {
      const report = await window.eqlDesktop.checkSources([
        ...new Set(
          [
            input.primary,
            input.secondary,
            input.tertiary,
            ...teammateBuilds(input).flat(),
          ].filter(Boolean),
        ),
      ]);
      setResults(report.results);
      setLastCheck(report.checkedAt);
      const changed = report.results.filter(
          (r) => r.status === 'changed',
        ).length,
        unavailable = report.results.filter(
          (r) => r.status === 'unavailable',
        ).length;
      setMessage(
        changed +
          ' source pages changed; ' +
          unavailable +
          ' could not be read. Build scores have not changed.',
      );
      playAdvisorSound(unavailable ? 'notice' : 'report');
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'The source check failed. Your saved data is still in place.',
      );
      playAdvisorSound('notice');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }
  async function downloadRules() {
    if (!enabled || !window.eqlDesktop || busy) return;
    setBusy(true);
    setPending(null);
    setMessage('');
    setProgress('Downloading a rule update for review…');
    try {
      const update = await window.eqlDesktop.getRuleUpdate(
        url.trim(),
        hash.trim(),
      );
      validateRulePack(update.payload.rules);
      setPending(update);
      try {
        localStorage.setItem(feedKey, url.trim());
      } catch {
        /* Feed can be entered again. */
      }
      setMessage(
        'The update file passed its format check. Read the changes below before using it.',
      );
      playAdvisorSound('report');
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'The update failed. Your current rules are still in place.',
      );
      playAdvisorSound('notice');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }
  function apply() {
    if (!pending) return;
    setPrevious(pack);
    let persisted = true;
    try {
      localStorage.setItem(rollbackKey, JSON.stringify(pack));
    } catch {
      persisted = false;
    }
    onApply(pending.payload.rules);
    setPending(null);
    setMessage(
      persisted
        ? 'New rules are in use. You can still go back to your last rules.'
        : 'New rules are in use, but the app cannot save them. Save a rule backup before you close it.',
    );
  }
  function rollback() {
    if (!previous) return;
    onApply(previous);
    setPrevious(null);
    try {
      localStorage.removeItem(rollbackKey);
    } catch {
      /* In-memory rollback still works. */
    }
    setMessage('Previous rules restored.');
  }
  const changes = pending
    ? (
        [
          'classes',
          'weights',
          'tuning',
          'roles',
          'rules',
          'companionRules',
          'zones',
          'zoneScoring',
          'evidence',
          'tertiaryUnlockLevel',
          'aliases',
        ] as const
      ).filter(
        (k) =>
          JSON.stringify(pack[k]) !== JSON.stringify(pending.payload.rules[k]),
      )
    : [];
  const before = recommend(input, pack),
    after = pending ? recommend(input, pending.payload.rules) : null;
  return (
    <details className="ba-rules ba-updates">
      <summary>🌐 Updates — optional online information</summary>
      <p>
        The advisor works offline. A source check reads websites about your
        classes and looks for changes. It shows short pieces of text for you to
        review. It does not change your build scores.
      </p>
      {!desktop ? (
        <p className="ba-note">
          Online checks are part of the Windows app. In this browser version,
          use Load a rule file (JSON) below to add rules that someone has
          reviewed.
        </p>
      ) : (
        <>
          <label className="ba-online-toggle">
            <input
              type="checkbox"
              checked={enabled}
              disabled={busy}
              onChange={(e) => toggle(e.target.checked)}
            />{' '}
            Allow online checks when I request them
          </label>
          <p className="ba-note">
            Checks run only when you press the button. The app asks the source
            sites for their pages. It does not send them your character data.
          </p>
          <div className="ba-presets">
            <button
              type="button"
              disabled={!enabled || busy}
              onClick={() => void checkSources()}
            >
              Check original sources now
            </button>
            <button
              type="button"
              disabled={!previous || busy}
              onClick={rollback}
            >
              Roll back last rule update
            </button>
          </div>
          {lastCheck && (
            <p className="ba-note">
              Most recent source check: {new Date(lastCheck).toLocaleString()}.
              This date says when the app checked a page. It does not prove your
              build rules are up to date.
            </p>
          )}
          <div role="status" aria-live="polite">
            {progress || message}
          </div>
          {results.length > 0 && (
            <div className="ba-source-updates">
              {results.map((r) => (
                <details key={r.id}>
                  <summary>
                    {r.status === 'changed'
                      ? '🔎'
                      : r.status === 'unavailable'
                        ? '⚠️'
                        : '📖'}{' '}
                    {r.title} ·{' '}
                    {r.status === 'first-check' ? 'Baseline saved' : r.status}
                  </summary>
                  {r.error ? (
                    <p>{r.error}</p>
                  ) : (
                    <>
                      <p>
                        {r.status === 'first-check'
                          ? 'The app saved its first copy of the page text. Later checks will compare with this copy.'
                          : r.status === 'changed'
                            ? 'The page text changed. Read the source before changing any rules.'
                            : 'The page text has not changed since the last successful check.'}
                      </p>
                      {r.previous && r.status === 'changed' && (
                        <p>
                          <b>Earlier page text:</b> {r.previous.excerpt}
                        </p>
                      )}
                      {r.snapshot && (
                        <p>
                          <b>Part of the current page text:</b>{' '}
                          {r.snapshot.excerpt}…
                        </p>
                      )}
                      {r.snapshot?.observedDate && (
                        <p className="ba-note">
                          Date shown by the page: {r.snapshot.observedDate}
                        </p>
                      )}
                      {r.status === 'changed' &&
                        r.previous?.excerpt === r.snapshot?.excerpt && (
                          <p>
                            The change is in another part of the page. Open the
                            source to see it.
                          </p>
                        )}
                    </>
                  )}
                  <a href={r.url} target="_blank" rel="noreferrer">
                    Open source to review ↗
                  </a>
                </details>
              ))}
            </div>
          )}
          <h3>📦 Update the build rules</h3>
          <p>
            Use an update address from someone you trust who maintains the
            advisor. It must start with https://. No update address is built in
            yet. The app checks the file format and lets you review changes
            before using the new rules.
          </p>
          <label>
            Rule update web address
            <input
              type="url"
              value={url}
              onChange={(e) => setURL(e.target.value)}
              placeholder="https:// address for a reviewed rule update"
            />
          </label>
          <label>
            File check code: SHA-256 (optional)
            <input
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="Paste the 64-character check code, if provided"
            />
          </label>
          <button
            type="button"
            disabled={!enabled || busy || !url.trim()}
            onClick={() => void downloadRules()}
          >
            Download & preview rules
          </button>
          {pending && (
            <article className="ba-choice">
              <h4>{pending.payload.release}</h4>
              <p>Published: {pending.payload.publishedAt}</p>
              <p>{pending.payload.notes}</p>
              <p>
                Changed sections:{' '}
                {changes
                  .map(
                    (k) =>
                      ({
                        classes: 'Class ratings',
                        weights: 'Point weights',
                        tuning: 'Scoring settings',
                        roles: 'Roles',
                        rules: 'Build rules',
                        companionRules: 'Buddy rules',
                        zones: 'Zones',
                        zoneScoring: 'Zone scoring',
                        evidence: 'Sources',
                        tertiaryUnlockLevel: 'Third-class unlock level',
                        aliases: 'Class shortcuts',
                      })[k],
                  )
                  .join(', ') || 'None — same rules.'}
              </p>
              <p>
                Top third class for your settings:{' '}
                {before.rankings[0]?.name || 'Check your settings'} →{' '}
                {after?.rankings[0]?.name ||
                  'Check your settings with the new rules'}
                .
              </p>
              {after?.errors.length ? (
                <p className="ba-warning">{after.errors.join(' ')}</p>
              ) : null}
              <p className="ba-note">
                {pending.hashVerified
                  ? 'This file matches the SHA-256 check code you gave.'
                  : 'No check code was supplied. The code below can identify this file, but it does not prove who made it.'}
              </p>
              <code className="ba-update-hash">{pending.hash}</code>
              <p className="ba-note">
                The update author chooses its source labels. Read the sources
                before treating the claims as proven.
              </p>
              <div className="ba-presets">
                <button
                  type="button"
                  onClick={apply}
                  disabled={!changes.length}
                >
                  Apply this update
                </button>
                <button type="button" onClick={() => setPending(null)}>
                  Discard download
                </button>
              </div>
            </article>
          )}
        </>
      )}
    </details>
  );
}
