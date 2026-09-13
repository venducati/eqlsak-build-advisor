import { useEffect, useRef, useState } from 'react';
import { Crown, ScrollText, Upload, Users, Search, Shield, Trash2, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import AdvisorIcon from './AdvisorIcon';
import { defaultRules, parseBuild } from '../lib/build-advisor';
import { playAdvisorSound } from '../lib/advisor-audio';
import { guildStorageKey, parseGuildDump, readGuildFile, restoreGuild, type GuildRoster, type SavedGuild } from '../lib/guild-roster';
import '../app/my-guild.css';

export default function MyGuild() {
  const [roster, setRoster] = useState<GuildRoster | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(''), [rank, setRank] = useState(''), [classId, setClassId] = useState('');
  const [sort, setSort] = useState('name'), [page, setPage] = useState(0);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(guildStorageKey);
      if (raw) setRoster(restoreGuild(raw).roster);
    } catch { setMessage('Your saved roster could not be loaded. Import your guild dump again.'); }
  }, []);
  async function load(file: File) {
    setBusy(true);
    try {
      const text = await readGuildFile(file);
      const importedAt = new Date().toISOString();
      const next = parseGuildDump(text, file.name, importedAt);
      const saved: SavedGuild = { version: 1, text, fileName: file.name, importedAt };
      setRoster(next); setPage(0); setQuery(''); setRank(''); setClassId('');
      try {
        localStorage.setItem(guildStorageKey, JSON.stringify(saved));
        setMessage(`${next.members.length} guild members loaded. This roster is saved on this device.`);
      } catch { setMessage(`${next.members.length} guild members loaded for this session. This device could not save them; import the dump again next time.`); }
      playAdvisorSound('report');
    } catch (error) {
      setMessage((error instanceof Error ? error.message : 'The guild file could not be read.') + ' Your current roster has not changed.');
      playAdvisorSound('notice');
    } finally { setBusy(false); }
  }
  function clear() {
    try { localStorage.removeItem(guildStorageKey); }
    catch { setMessage('The saved roster could not be removed. Try again.'); return; }
    setRoster(null); setMessage('Roster removed from BA. Your original guild dump file is unchanged.');
  }
  const ranks = [...new Set(roster?.members.map(member => member.rank).filter(Boolean))].sort();
  const members = roster?.members.map(member => ({ ...member, build: parseBuild(member.classes, defaultRules) })) || [];
  const filtered = members.filter(member => (!rank || member.rank === rank) && (!classId || member.build.includes(classId)) &&
    [member.name, member.classes, member.rank, member.location].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((a, b) => sort === 'level' ? b.level - a.level || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(currentPage * 25, currentPage * 25 + 25);
  const availableClasses = defaultRules.classes.filter(cls => members.some(member => member.build.includes(cls.id)));
  return <section className="my-guild" aria-labelledby="my-guild-title">
    <header className="guild-heading">
      <div className="guild-seal" aria-hidden="true"><Crown /><span>✦</span></div>
      <div><p className="guild-eyebrow">The fellowship ledger</p><h2 id="my-guild-title">My Guild: {roster?.guild || 'Your scroll awaits'}</h2>
        <p>A place for your guildmates, their class trios, and the journeys you share.</p></div>
    </header>
    <div className="guild-actions">
      <button type="button" disabled={busy} onClick={() => picker.current?.click()}><Upload aria-hidden="true" /> {busy ? 'Reading guild dump…' : roster ? 'Import fresh guild dump' : 'Import guild dump'}</button>
      {roster && <button type="button" disabled={busy} onClick={clear}><Trash2 aria-hidden="true" /> Remove saved roster</button>}
      <input ref={picker} hidden type="file" accept=".txt,.tsv,.csv,text/plain,text/tab-separated-values,text/csv" aria-label="Guild dump file"
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void load(file); }} />
    </div>
    <p className="guild-message" role="status">{message}</p>
    <details className="guild-help" open={!roster}>
      <summary><BookOpen aria-hidden="true" /> How to fill your guild scroll</summary>
      <ol><li>Open the <strong>Guild</strong> window in EQL. Show the full member list if that option is available.</li>
        <li>Choose <strong>Dump</strong>. Look for the new text file in your EQL game folder.</li>
        <li>Choose <strong>Import guild dump</strong> here and select that file. Import a fresh dump when you want an updated roster.</li></ol>
      <p>Member names and notes stay on this device. This is a saved roster, so it does not show who is online right now. BA does not change ranks, send guild messages, or edit the game file.</p>
    </details>
    {roster ? <>
      <div className="guild-summary">
        <div><Users aria-hidden="true" /><strong>{members.length}</strong><span>Guildmates in this dump</span></div>
        <div><Shield aria-hidden="true" /><strong>{availableClasses.length}</strong><span>Classes represented</span></div>
        <div><Crown aria-hidden="true" /><strong>{ranks.length}</strong><span>Rank titles listed</span></div>
      </div>
      <dl className="guild-source"><div><dt>Guild export</dt><dd>{roster.fileName}</dd></div><div><dt>Export time</dt><dd>{roster.exportedAt}</dd></div>
        {roster.server && <div><dt>Server</dt><dd>{roster.server}</dd></div>}<div><dt>Imported on this device</dt><dd>{new Date(roster.importedAt).toLocaleString()}</dd></div></dl>
      <details className="guild-class-summary"><summary><Shield aria-hidden="true" /> Class presence in this roster</summary>
        <p>Each class counts every member who has it in their exported trio. One member can appear in up to three bars. These counts do not measure skill or combat strength.</p>
        <div className="guild-class-grid">{availableClasses.map(cls => {
          const count = members.filter(member => member.build.includes(cls.id)).length;
          return <div className="guild-class-row" key={cls.id}><span><AdvisorIcon code={cls.id} />{cls.name}</span><meter min="0" max={members.length} value={count} aria-label={`${cls.name}: ${count} of ${members.length} guildmates`} /><b>{count}</b></div>;
        })}</div>
      </details>
      <div className="guild-filters">
        <label><span><Search aria-hidden="true" /> Find a guildmate</span><input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Name, trio, rank or place" /></label>
        <label>Class<select value={classId} onChange={e => { setClassId(e.target.value); setPage(0); }}><option value="">All classes</option>{availableClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label>
        <label>Rank<select value={rank} onChange={e => { setRank(e.target.value); setPage(0); }}><option value="">All ranks</option>{ranks.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Sort by<select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}><option value="name">Name A–Z</option><option value="level">Highest level first</option></select></label>
      </div>
      <p className="guild-count" role="status">{filtered.length ? `${currentPage * 25 + 1}–${Math.min((currentPage + 1) * 25, filtered.length)} of ${filtered.length} matching guildmates` : 'No guildmates match those choices.'}</p>
      <div className="guild-members">{shown.map(member => <article className="guild-member" key={member.name}>
        <header><h3>{member.name}</h3><span className="guild-level">Level {member.level}</span></header>
        <p className="guild-rank"><Crown aria-hidden="true" /> {member.rank || 'Rank not listed'}</p>
        <div className="guild-trio">{member.build.map(id => <span key={id}><AdvisorIcon code={id} />{id}</span>)}</div>
        <p className="guild-build-text">Exported classes: <strong>{member.classes}</strong></p>
        <dl><div><dt>Last seen in dump</dt><dd>{member.lastSeen || 'Not listed'}</dd></div><div><dt>Location in dump</dt><dd>{member.location || 'Not listed'}</dd></div></dl>
        {member.extra.length > 0 && <details><summary><ScrollText aria-hidden="true" /> More exported details</summary><dl>{member.extra.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></details>}
      </article>)}</div>
      {pages > 1 && <nav className="guild-pagination" aria-label="Guild roster pages"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden="true" /> Previous page</button><span>Page {currentPage + 1} of {pages}</span><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next page <ChevronRight aria-hidden="true" /></button></nav>}
      {roster.warnings.map(warning => <p className="guild-footnote" key={warning}>{warning}</p>)}
    </> : <div className="guild-empty"><ScrollText aria-hidden="true" /><h3>Your fellowship belongs here</h3><p>Import a guild dump to fill this scroll with your guildmates. Their names, levels, class icons and ranks will appear here.</p></div>}
  </section>;
}
