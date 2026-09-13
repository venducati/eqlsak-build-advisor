const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  LogDiscovery,
  scanLogFolders,
  commonLogFolders,
} = require('../log-discovery.cjs');
const { LogTail } = require('../log-tail.cjs');
async function fixture() {
  const root = path.resolve('work/discovery-tests');
  await fs.mkdir(root, { recursive: true });
  return fs.mkdtemp(path.join(root, 'case-'));
}
test('default search includes the documented EQL Public install location', () => {
  const folders = commonLogFolders({ PUBLIC: 'C:\\Users\\Public' });
  assert.equal(
    folders[0],
    path.join(
      'C:\\Users\\Public',
      'Daybreak Game Company',
      'Installed Games',
      'EverQuest Legends',
      'Logs',
    ),
  );
});
test('finds character and server logs, newest first, with no nested directory crawl', async () => {
  const dir = await fixture();
  for (const name of [
    'eqlog_Aria_Test.txt',
    'eqlog_Bram_Test.log',
    'notes.txt',
    'eqlog_invalid.txt',
  ])
    await fs.writeFile(path.join(dir, name), 'old content');
  await fs.utimes(path.join(dir, 'eqlog_Aria_Test.txt'), 100, 100);
  await fs.utimes(path.join(dir, 'eqlog_Bram_Test.log'), 200, 200);
  await fs.mkdir(path.join(dir, 'nested'));
  await fs.writeFile(path.join(dir, 'nested', 'eqlog_Hidden_Test.txt'), '');
  const result = await scanLogFolders([dir, dir, path.join(dir, 'missing')], {
    sampleMs: 0,
  });
  assert.equal(result.checked.length, 1);
  assert.deepEqual(
    result.candidates.map((row) => [row.character, row.server]),
    [
      ['Bram', 'Test'],
      ['Aria', 'Test'],
    ],
  );
});
test('recently growing log ranks above a file with a future modified date', async () => {
  const dir = await fixture();
  const active = path.join(dir, 'eqlog_Active_Test.txt');
  const stale = path.join(dir, 'eqlog_Future_Test.txt');
  await fs.writeFile(active, '');
  await fs.writeFile(stale, '');
  await fs.utimes(stale, new Date('2099-01-01'), new Date('2099-01-01'));
  const scan = scanLogFolders([dir], { sampleMs: 150 });
  const writer = setInterval(() => {
    void fs.appendFile(active, 'tick\n');
  }, 15);
  let result;
  try {
    result = await scan;
  } finally {
    clearInterval(writer);
  }
  assert.equal(result.candidates[0].character, 'Active');
  assert.equal(result.candidates[0].growing, true);
});
test('directory junctions are not followed by automatic search', async () => {
  const dir = await fixture(),
    target = path.join(dir, 'target'),
    link = path.join(dir, 'alias');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, 'eqlog_Test_Server.txt'), '');
  await fs.symlink(target, link, 'junction');
  assert.equal(
    (await scanLogFolders([link], { sampleMs: 0 })).candidates.length,
    0,
  );
});
test('bounded search reports truncation', async () => {
  const dir = await fixture();
  for (let i = 0; i < 4; i++)
    await fs.writeFile(path.join(dir, `eqlog_Test${i}_Server.txt`), '');
  const result = await scanLogFolders([dir], { sampleMs: 0, limit: 2 });
  assert.equal(result.candidates.length, 2);
  assert.equal(result.truncated, true);
});
test('chosen game folder and last character survive restart; only issued IDs can be watched', async () => {
  const dir = await fixture(),
    game = path.join(dir, 'game'),
    logs = path.join(game, 'Logs');
  await fs.mkdir(logs, { recursive: true });
  const file = path.join(logs, 'eqlog_Test_Server.txt');
  await fs.writeFile(file, 'old\n');
  const settings = path.join(dir, 'settings.json');
  const finder = new LogDiscovery(settings, {
    defaultFolders: [],
    sampleMs: 0,
  });
  const result = await finder.find(game),
    row = result.candidates[0];
  assert.equal(row.character, 'Test');
  assert.equal(row.path, undefined);
  assert.equal(await finder.resolve(row.id), file);
  await assert.rejects(finder.resolve(file), /Search again/);
  await assert.rejects(finder.resolve({ path: file }), /Search again/);
  await finder.remember(file);
  const restarted = new LogDiscovery(settings, {
    defaultFolders: [],
    sampleMs: 0,
  });
  const next = await restarted.find();
  assert.equal(next.candidates[0].lastUsed, true);
  await assert.rejects(restarted.resolve(row.id), /Search again/);
  await fs.unlink(file);
  await assert.rejects(restarted.resolve(next.candidates[0].id));
});
test('bad saved settings are ignored and network folders rejected', async () => {
  const dir = await fixture(),
    settings = path.join(dir, 'settings.json');
  await fs.writeFile(settings, '{invalid json');
  const finder = new LogDiscovery(settings, {
    defaultFolders: [],
    sampleMs: 0,
  });
  assert.equal((await finder.find()).candidates.length, 0);
  await fs.writeFile(
    settings,
    JSON.stringify({ folder: '\\\\server\\share', lastPath: '../../secrets' }),
  );
  assert.deepEqual(await finder.settings(), { lastPath: '', folder: '' });
  await assert.rejects(finder.find('\\\\server\\share'), /local drive/);
});
test('detected file connects to the live tail and emits only fresh combat lines', async () => {
  const dir = await fixture(),
    file = path.join(dir, 'eqlog_Test_Server.txt');
  await fs.writeFile(file, 'old hit\n');
  const finder = new LogDiscovery(path.join(dir, 'settings.json'), {
    defaultFolders: [dir],
    sampleMs: 0,
  });
  const result = await finder.find();
  const tail = new LogTail(await finder.resolve(result.candidates[0].id));
  await tail.start();
  assert.equal((await tail.poll()).text, '');
  const line =
    '[2026-09-11T12:00:00Z] You slash a target for 120 points of damage. (Critical)\n';
  await fs.appendFile(file, line);
  assert.equal((await tail.poll()).text, line);
  assert.equal((await tail.poll()).text, '');
});
