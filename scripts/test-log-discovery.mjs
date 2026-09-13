import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrowserLogs } from '../lib/log-discovery.ts';
import {readRecentBrowserLog,RECENT_BYTES} from '../lib/log-history.ts';
import {newTripStream,appendTripEvents} from '../lib/encounter-journal.ts';
import {defaultInput,defaultRules} from '../lib/build-advisor.ts';
import {tripContext} from '../lib/encounter-journal.ts';
import { createRequire } from 'node:module';
import { parseCombatLine } from '../lib/combat-meter.ts';
import { combatSeries } from '../lib/combat-visuals.ts';
const require = createRequire(import.meta.url);
const { LogDiscovery } = require('../desktop/log-discovery.cjs');
const { LogTail } = require('../desktop/log-tail.cjs');
const {readRecentLog} = require('../desktop/log-history.cjs');
import { mkdir, mkdtemp, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const handle = (name, modified) => ({
  kind: 'file',
  name,
  getFile: async () => ({
    name,
    size: 42,
    lastModified: modified,
    text: () => {
      throw new Error('Discovery must not read contents');
    },
  }),
});
const directory = (name, entries, child) => ({
  kind: 'directory',
  name,
  async *values() {
    yield* entries;
  },
  async getDirectoryHandle() {
    if (!child) throw new Error('Not found');
    return child;
  },
});
test('browser and desktop recent snapshots agree, create a completed loot trip, and never treat player chat as loot',async()=>{
 const text='x'.repeat(RECENT_BYTES+100)+'\n[Sun Sep 13 10:00:00 2026] You have entered The Estate of Unrest.\n[Sun Sep 13 10:01:00 2026] --You have looted a Test Gem from a rat\'s corpse.--\n[Sun Sep 13 10:02:00 2026] Friend tells you, \'You have looted a False Gem from a rat\'s corpse.\'\n[Sun Sep 13 10:03:00 2026] You have entered Dagnor\'s Cauldron.\nunfinished';
 const file = new File([text],'eqlog_Test_Example.txt');
 const browser = await readRecentBrowserLog({getFile:async()=>file});
 await mkdir('work/history-tests',{recursive:true});const dir=await mkdtemp('work/history-tests/case-'),path=join(dir,file.name);await writeFile(path,text);
 assert.deepEqual(await readRecentLog(path),browser);assert(browser.partial);assert(browser.bytesRead<=RECENT_BYTES);
 const events=browser.text.split('\n').map(parseCombatLine).filter(Boolean);
 const stream=newTripStream(file.name,'Test',zone=>tripContext(defaultInput,defaultRules,zone));
 appendTripEvents(stream,events);assert(stream.trips[0].exitConfirmed);assert.equal(stream.trips[0].drops.length,1);assert.equal(stream.trips[0].drops[0].item,'Test Gem');
});
test('browser checks chosen folder and Logs child, keeping matching file handles', async () => {
  const newest = handle('eqlog_Bram_Server.txt', 200);
  const logs = directory('Logs', [newest, handle('notes.txt', 300)]);
  const folder = directory(
    'EverQuest Legends',
    [
      handle('eqlog_Aria_Server.txt', 100),
      directory('unrelated', [handle('eqlog_Hidden_Server.txt', 400)]),
    ],
    logs,
  );
  const { search, handles } = await findBrowserLogs(folder);
  assert.deepEqual(
    search.candidates.map((row) => row.character),
    ['Bram', 'Aria'],
  );
  assert.equal(handles.get(search.candidates[0].id), newest);
  assert.equal(search.candidates[0].growing, false);
});
test('browser skips removed files and returns a useful empty result', async () => {
  const removed = {
    kind: 'file',
    name: 'eqlog_Gone_Server.txt',
    getFile: async () => {
      throw new Error('Gone');
    },
  };
  assert.equal(
    (await findBrowserLogs(directory('Logs', [removed]))).search.candidates
      .length,
    0,
  );
});
test('detected live combat produces the damage spike and critical-hit statistic', async () => {
  const root = resolve('work/discovery-tests');
  await mkdir(root, { recursive: true });
  const dir = await mkdtemp(join(root, 'graph-')),
    file = join(dir, 'eqlog_Test_Server.txt');
  await writeFile(file, 'old lines\n');
  const finder = new LogDiscovery(join(dir, 'settings.json'), {
    defaultFolders: [dir],
    sampleMs: 0,
  });
  const found = await finder.find();
  const tail = new LogTail(await finder.resolve(found.candidates[0].id));
  await tail.start();
  const at = Date.parse('2026-09-11T12:00:00Z');
  await appendFile(
    file,
    '[2026-09-11T12:00:00Z] You slash a target for 120 points of damage. (Critical)\n',
  );
  const batch = await tail.poll();
  const event = parseCombatLine(batch.text.trim());
  assert.equal(event.critical, true);
  assert.equal(event.amount, 120);
  const points = combatSeries([event], 'Test', '', at);
  assert.ok(points.buckets.some((point) => point.damage === 120));
});
