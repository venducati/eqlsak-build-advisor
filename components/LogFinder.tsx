import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import LogSetupHelp from './LogSetupHelp';
import {readRecentBrowserLog, type LogSnapshot} from '../lib/log-history';
import {
  FolderSearch,
  FolderOpen,
  Play,
  RefreshCw,
  Radio,
  FileText,
} from 'lucide-react';
import {
  findBrowserLogs,
  type LogDirectory,
  type LogFileHandle,
  type LogSearch,
} from '../lib/log-discovery';
import '../app/log-finder.css';
declare global {
  interface Window {
    showDirectoryPicker?: (options: unknown) => Promise<LogDirectory>;
  }
}
export type LogFinderActions = {search: () => void};
export default function LogFinder({
  ref,
  disabled,
  onDetected,
  onBrowser,
  onSnapshot,
}: {
  ref?: Ref<LogFinderActions>;
  disabled: boolean;
  onDetected: (id: string) => Promise<void>;
  onBrowser: (handle: LogFileHandle) => Promise<void>;
  onSnapshot: (snapshot: LogSnapshot) => Promise<void>;
}) {
  const panel = useRef<HTMLElement>(null);
  const [desktop, setDesktop] = useState(false),
    [working, setWorking] = useState(false),
    [search, setSearch] = useState<LogSearch | null>(null),
    [selected, setSelected] = useState(''),
    [message, setMessage] = useState('');
  const folder = useRef<LogDirectory | null>(null),
    handles = useRef(new Map<string, LogFileHandle>());
  useEffect(() => {
    setDesktop(Boolean(window.eqlMeter?.detect));
  }, []);
  async function find(choose = false) {
    if (disabled || working) return;
    setWorking(true);
    setMessage('Looking for character logs…');
    try {
      let result: LogSearch | null;
      if (window.eqlMeter?.detect)
        result = choose
          ? await window.eqlMeter.chooseFolder!()
          : await window.eqlMeter.detect();
      else {
        if (!window.showDirectoryPicker) {
          setMessage(
            'Automatic folder search is available in the Windows app. Here, use Choose live log or Load saved log.',
          );
          return;
        }
        if (choose || !folder.current)
          folder.current = await window.showDirectoryPicker({
            id: 'eqlsak-log-folder',
            mode: 'read',
          });
        const found = await findBrowserLogs(folder.current!);
        handles.current = found.handles;
        result = found.search;
      }
      if (!result) {
        setMessage('Folder choice cancelled. Your current log is unchanged.');
        return;
      }
      setSearch(result);
      setSelected(result.candidates[0]?.id || '');
      setMessage(
        result.candidates.length
          ? `Found ${result.candidates.length} character log${result.candidates.length === 1 ? '' : 's'}. Check the character and server, then start watching.`
          : 'No character logs found. Enter /log on in EQL, then search again or choose your game or Logs folder.',
      );
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Folder choice cancelled. Your current log is unchanged.'
          : 'The folder could not be checked. Choose your game or Logs folder and try again.',
      );
    } finally {
      setWorking(false);
    }
  }
  useImperativeHandle(ref, () => ({search: () => {
    panel.current?.scrollIntoView({block:'start'});
    panel.current?.focus({preventScroll:true});
    void find();
  }}));
  async function loadRecent() {
    if (!selected || disabled || working) return;
    setWorking(true);
    setMessage('Reading the recent part of your selected log on this device…');
    try {
      let snapshot: LogSnapshot;
      if (desktop) {
        if (!window.eqlMeter?.readRecent) throw new Error('Update the Windows app to load recent trips. You can still use Load saved log.');
        snapshot = await window.eqlMeter.readRecent(selected);
      } else {
        const handle = handles.current.get(selected);
        if (!handle) throw new Error('Search again and choose a log.');
        snapshot = await readRecentBrowserLog(handle);
      }
      await onSnapshot(snapshot);
      setMessage(snapshot.text ? 'Recent events loaded. Look below for your loot and trip reports. Watch selected log starts a new live recording from now on.' : 'No complete log lines found. Turn logging on in EQL and follow the steps below.');
    } catch (error) {setMessage(error instanceof Error ? error.message : 'This log could not be read. Search again or choose the file by hand.');}
    finally {setWorking(false);}
  }
  async function watch() {
    if (!selected) return;
    setWorking(true);
    try {
      if (desktop) await onDetected(selected);
      else {
        const handle = handles.current.get(selected);
        if (handle) await onBrowser(handle);
      }
    } catch {
      setMessage(
        'That log could not be opened. Search again or choose the file directly.',
      );
    } finally {
      setWorking(false);
    }
  }
  const blocked = disabled || working;
  return (
    <section ref={panel} tabIndex={-1} className="cm-log-finder" aria-label="Find EQL character logs">
      <div className="cm-finder-heading">
        <div>
          <h3>
            <FolderSearch /> Find your EQL log
          </h3>
          <p>
            {desktop
              ? 'Search common EQL folders and your last chosen location.'
              : 'In a browser, choose your game or Logs folder once. The Windows app can find common locations for you.'}
          </p>
        </div>
        <div className="cm-finder-actions">
          <button disabled={blocked} onClick={() => void find()}>
            <FolderSearch />
            {working ? 'Checking…' : 'Auto-detect log'}
          </button>
          <button disabled={blocked} onClick={() => void find(true)}>
            <FolderOpen />
            Choose game folder
          </button>
        </div>
      </div>
      {message && (
        <p className="cm-note" role="status">
          {message}
        </p>
      )}
      <LogSetupHelp open={search?.candidates.length === 0} />
      {disabled && (
        <p className="cm-note">
          Stop the current live log before choosing another character.
        </p>
      )}
      {search && search.candidates.length > 0 && (
        <>
          <p className="cm-note">
            {search.candidates[0].growing
              ? 'First match: new log data was seen during the search.'
              : 'First match: the most recently updated log.'}{' '}
            A recent file is a suggestion; it does not prove which character you
            are playing.
          </p>
          <div
            className="cm-log-matches"
            role="radiogroup"
            aria-label="Detected character logs"
          >
            {search.candidates.map((row, index) => (
              <label
                key={row.id}
                className={
                  selected === row.id
                    ? 'cm-log-match cm-log-selected'
                    : 'cm-log-match'
                }
              >
                <input
                  type="radio"
                  name="eql-log-choice"
                  checked={selected === row.id}
                  disabled={blocked}
                  onChange={() => setSelected(row.id)}
                />
                <FileText />
                <span>
                  <strong>
                    {row.character} <small>· {row.server}</small>
                  </strong>
                  <small className="cm-log-path">
                    {row.folder} / {row.name}
                  </small>
                  <small>
                    Updated {new Date(row.modified).toLocaleString()} ·{' '}
                    {(row.size / 1048576).toFixed(1)} MB
                    {row.lastUsed ? ' · Last used' : ''}
                  </small>
                </span>
                <span className="cm-log-tag">
                  {row.growing ? (
                    <>
                      <Radio /> Activity seen
                    </>
                  ) : index === 0 ? (
                    'Latest log'
                  ) : (
                    ''
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="cm-finder-actions">
            <button
              disabled={blocked || !selected}
              onClick={() => void watch()}
            >
              <Play />
              Watch selected log
            </button>
            <button disabled={blocked || !selected} onClick={() => void loadRecent()}>
              <FileText /> Load recent trips
            </button>
            <button disabled={blocked} onClick={() => void find()}>
              <RefreshCw />
              Search again
            </button>
          </div>
          <p className="cm-note">
            Watching starts with new lines. Load recent trips reads up to the last 4 MB of your chosen log, including loot. It is a saved snapshot; earlier events may be left out. Use Load saved log for a complete file up to 25 MB.
          </p>
        </>
      )}
      {search?.truncated && (
        <p className="cm-note">
          Search limits were reached. Choose a specific Logs folder or choose
          the log file directly.
        </p>
      )}
      {search?.warnings.map((warning) => (
        <p className="cm-note" key={warning}>
          {warning}
        </p>
      ))}
    </section>
  );
}
