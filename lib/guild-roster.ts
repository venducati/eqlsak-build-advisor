export const guildStorageKey = 'eqlsak-guild-roster-v1';
export const guildFileLimit = 2 * 1024 * 1024;
export type GuildMember = {
  name: string; level: number; classes: string; rank: string;
  lastSeen: string; location: string; extra: { label: string; value: string }[];
};
export type GuildRoster = {
  guild: string; server: string; exportedAt: string; fileName: string;
  importedAt: string; members: GuildMember[]; warnings: string[];
};
export type SavedGuild = { version: 1; text: string; fileName: string; importedAt: string };

// Preserve quoted fields, tabs, embedded newlines and blank trailing columns.
function rowsFrom(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && (!cell || quoted)) {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === separator || ch === '\n')) {
      row.push(cell.replace(/\r$/, '').trim()); cell = '';
      if (ch === '\n') { if (row.some(Boolean)) rows.push(row); row = []; }
    } else cell += ch;
    if (cell.length > 4000 || row.length > 40 || rows.length > 5000) throw Error('This file is too large for a guild roster. Use a fresh guild Dump file with up to 5,000 members.');
  }
  if (quoted) throw Error('A quoted field is unfinished. Make a fresh guild dump and try again.');
  row.push(cell.replace(/\r$/, '').trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');
export function parseGuildDump(text: string, fileName: string, importedAt = new Date().toISOString()): GuildRoster {
  if (text.length > guildFileLimit || text.includes('\0')) throw Error('Choose a text guild dump up to 2 MB. This file could not be read as text.');
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/).find(line => line.trim()) || '';
  const rows = rowsFrom(text, first.includes('\t') ? '\t' : ',');
  if (!rows.length) throw Error('The guild dump is empty. Open your Guild window in EQL and use Dump again.');
  const labels = rows[0].map(normalized);
  const named = ['name', 'character', 'charactername', 'member'].some(label => labels.includes(label)) &&
    ['level', 'lvl', 'class', 'classes', 'classcombo', 'loadout'].some(label => labels.includes(label));
  const pick = (names: string[], fallback: number) => named ? labels.findIndex(label => names.includes(label)) : fallback;
  const fields = {
    name: pick(['name', 'character', 'charactername', 'member'], 0),
    level: pick(['level', 'lvl'], 1), classes: pick(['class', 'classes', 'classcombo', 'loadout'], 2),
    rank: pick(['rank', 'guildrank'], 3), lastSeen: pick(['laston', 'lastonline', 'lastseen', 'lastlogin'], 5),
    location: pick(['zone', 'location'], 6),
  };
  if ([fields.name, fields.level, fields.classes].includes(-1)) throw Error('This export needs Name, Level and Class columns. Choose the file made by Guild → Dump.');
  if (!named && rows[0].length !== 15) throw Error('This does not match the EQL guild dump format. Use Guild → Dump, or a table with Name, Level and Class headings.');
  const used = new Set(Object.values(fields));
  const members: GuildMember[] = [], seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows.slice(named ? 1 : 0)) {
    const get = (key: keyof typeof fields) => row[fields[key]] || '';
    const name = get('name'), levelText = get('level'), classes = get('classes');
    if ((!named && row.length !== 15) || !name || name.length > 80 ||
        !/^\d{1,3}$/.test(levelText) || Number(levelText) < 1 || Number(levelText) > 200 ||
        !classes || classes.length > 100) throw Error('A member row has missing or unreadable fields. Make a fresh guild dump. Your previous roster has been kept.');
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    members.push({ name, level: Number(levelText), classes, rank: get('rank'), lastSeen: get('lastSeen'), location: get('location'),
      extra: row.flatMap((value, index) => value && !used.has(index) ? [{ label: named ? rows[0][index] || `Column ${index + 1}` : `Export column ${index + 1}`, value }] : []),
    });
    if (members.length > 5000) throw Error('This roster has more than 5,000 members. Use a smaller export.');
  }
  if (!members.length) throw Error('There are no member rows in this file. Use Dump again with the full roster showing.');
  const safeFile = fileName.split(/[\\/]/).at(-1)!.slice(0, 240);
  const match = safeFile.match(/^(.*)_([^_]+)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.txt$/i);
  return { guild: match?.[1].replaceAll('_', ' ') || 'Guild roster', server: match?.[2] || '',
    exportedAt: match ? `${match[3]}-${match[4]}-${match[5]} ${match[6]}:${match[7]}:${match[8]} (file name)` : 'Not listed in the file name',
    fileName: safeFile, importedAt, members,
    warnings: [ ...(duplicates ? [`${duplicates} repeated member row${duplicates === 1 ? ' was' : 's were'} skipped; the first entry was kept.`] : []),
      ...(!named ? ['Extra columns are kept under their column numbers because this dump has no headings. Their meaning is not guessed.'] : []) ],
  };
}

export function restoreGuild(raw: string): { saved: SavedGuild; roster: GuildRoster } {
  if (raw.length > guildFileLimit * 2 + 10000) throw Error('Saved guild data is too large. Import the dump again.');
  const saved = JSON.parse(raw);
  if (saved?.version !== 1 || typeof saved.text !== 'string' || typeof saved.fileName !== 'string' ||
      typeof saved.importedAt !== 'string' || !Number.isFinite(Date.parse(saved.importedAt))) throw Error('Saved guild data could not be read. Import the dump again.');
  return { saved, roster: parseGuildDump(saved.text, saved.fileName, saved.importedAt) };
}

export async function readGuildFile(file: File): Promise<string> {
  if (file.size > guildFileLimit) throw Error('Choose a guild dump smaller than 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}
