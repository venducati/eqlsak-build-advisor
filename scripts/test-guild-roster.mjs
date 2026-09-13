import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGuildDump, restoreGuild, readGuildFile, guildFileLimit } from '../lib/guild-roster.ts';
const member = (name = 'Sampleleaf', extra = '') => [name, '50', 'RNG/BRD/ROG', 'Warden', '', '09/13/26', 'Felwithe', extra, '', 'off', 'off', '0', '', '', ''].join('\t');

test('observed EQL column layout preserves trios, rank titles, dates and unknown fields', () => {
  const roster = parseGuildDump(member('Sampleleaf', 'Example note'), 'Silver_Testrealm-20260913-131442.txt');
  assert.equal(roster.guild, 'Silver'); assert.equal(roster.server, 'Testrealm');
  assert.equal(roster.exportedAt, '2026-09-13 13:14:42 (file name)');
  assert.equal(roster.members[0].classes, 'RNG/BRD/ROG');
  assert.equal(roster.members[0].rank, 'Warden');
  assert.equal(roster.members[0].location, 'Felwithe');
  assert.ok(roster.members[0].extra.some(field => field.label === 'Export column 8' && field.value === 'Example note'));
  assert.equal(roster.members[0].extra.length, 4);
  assert.equal(parseGuildDump(member('Member01').replace('Warden', 'Member'), 'roster.txt').members.length, 1, 'A Member rank is not a heading row');
});

test('named TSV and quoted CSV preserve text, newlines and missing optional fields', () => {
  const csv = 'Name,Level,Classes,Rank,Public Note\r\nSampleleaf,42,RNG/BRD/ROG,Warden,"A note, with a comma\nand ""quotes"""';
  const roster = parseGuildDump(csv, 'roster.csv');
  assert.equal(roster.members[0].extra[0].value, 'A note, with a comma\nand "quotes"');
  assert.equal(roster.members[0].location, '');
  assert.equal(parseGuildDump('Member\tLvl\tClass\nSampleleaf\t10\tCleric', 'roster.tsv').members[0].level, 10);
});

test('duplicate names are counted once with a visible warning', () => {
  const roster = parseGuildDump(member() + '\n' + member(), 'roster.txt');
  assert.equal(roster.members.length, 1);
  assert.match(roster.warnings[0], /repeated member/);
});

test('wrong, malformed, oversized or truncated files are rejected', () => {
  for (const text of ['', 'Name,Level,Classes', 'combat\tlog', member() + '\nBad row', 'Name,Class\nTest,Ranger', 'Name,Level,Class\nTest,0,Ranger', 'Name,Level,Class\nTest,5,"Bard', 'x'.repeat(guildFileLimit + 1)]) {
    assert.throws(() => parseGuildDump(text, 'wrong.txt'));
  }
});

test('UTF-8 and BOM-marked UTF-16 exports give the same roster', async () => {
  const original = member();
  const utf8 = new File([original], 'roster.txt');
  const utf16 = new File([Buffer.from('\ufeff' + original, 'utf16le')], 'roster.txt');
  assert.equal(await readGuildFile(utf8), original);
  assert.equal(await readGuildFile(utf16), original);
});

test('saved local rosters are validated again; notes remain plain text', () => {
  const text = member('Sampleleaf', '<img src=x onerror=alert(1)>');
  const saved = JSON.stringify({ version: 1, text, fileName: 'roster.txt', importedAt: '2026-09-13T12:00:00Z' });
  const roster = restoreGuild(saved).roster;
  assert.ok(roster.members[0].extra[0].value.includes('<img'));
  assert.throws(() => restoreGuild('{"version":2}'));
});
