/**
 * Maintainer tool. Downloads cited public EQL spell facts into the offline catalog.
 * It deliberately keeps only factual table fields and omits the source descriptions.
 */
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { load } = require('../desktop/node_modules/cheerio');
const sourceUrl = 'https://tjk-gaming.com/eq-legends/spells';
const classIds = {
  Bard: 'BRD', Beastlord: 'BST', Cleric: 'CLR', Druid: 'DRU', Enchanter: 'ENC',
  Magician: 'MAG', Monk: 'MNK', Necromancer: 'NEC', Paladin: 'PAL', Ranger: 'RNG',
  Rogue: 'ROG', Shaman: 'SHM', 'Shadow Knight': 'SHD', Warrior: 'WAR', Wizard: 'WIZ'
};
const text = value => value.replace(/\s+/g, ' ').trim();
const number = value => /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null;
const html = await (await fetch(sourceUrl, { headers: { 'user-agent': 'EQLSaK catalog maintainer' } })).text();
const $ = load(html), spells = [];

$('.eql-spell-table tbody tr').each((_index, row) => {
  const cells = $(row).find('td');
  if (cells.length !== 11) return;
  const classes = [], classText = text($(cells[2]).text());
  for (const match of classText.matchAll(/([A-Za-z ]+)\s*\(L(\d+)\)/g)) {
    const id = classIds[text(match[1])];
    if (id) classes.push({ id, level: Number(match[2]) });
  }
  const name = text($(cells[0]).find('.eql-spell-name').text());
  const level = number(text($(cells[1]).text()));
  if (!name || !level || !classes.length) return;
  spells.push({
    name, level, classes, mana: number(text($(cells[3]).text())), range: text($(cells[4]).text()),
    cast: number(text($(cells[5]).text())), recast: number(text($(cells[6]).text())),
    duration: text($(cells[7]).text()), target: text($(cells[8]).text()), type: text($(cells[9]).text()), resist: text($(cells[10]).text())
  });
});

const unique = [...new Map(spells.map(spell => [JSON.stringify(spell), spell])).values()]
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
if (unique.length < 400) throw new Error(`Expected at least 400 spell rows, found ${unique.length}. Source layout may have changed.`);
const catalog = {
  version: 1,
  reviewedOn: new Date().toISOString().slice(0, 10),
  provenance: { label: 'EQL-sourced', reference: 'Public EQL spell table; factual fields were reviewed and bundled for offline use.' },
  source: { title: 'TJK Gaming — EQ Legends Spell Lookup', url: sourceUrl, upstream: 'https://eqlwiki.com/Category:Spells', note: 'Spell descriptions are intentionally excluded. Verify recent balance changes in-game before relying on a layout.' },
  spells: unique
};
await writeFile(new URL('../data/eql-spell-catalog.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n');
console.log(`Wrote ${unique.length} spell records to data/eql-spell-catalog.json.`);
