const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  mkdtemp,
  writeFile,
  appendFile,
  rename,
  mkdir,
} = require('node:fs/promises');
const { join } = require('node:path');
const { LogTail } = require('../log-tail.cjs');
async function fixture() {
  await mkdir('../work/tail-tests', { recursive: true });
  const dir = await mkdtemp('../work/tail-tests/case-');
  const path = join(dir, 'eqlog_Test.txt');
  await writeFile(path, 'old\n');
  return { path, dir, tail: new LogTail(path) };
}
test('tail begins at end and does not reread old or already consumed content', async () => {
  const { path, tail } = await fixture();
  assert.equal((await tail.start()).skipPartial, false);
  assert.equal((await tail.poll()).text, '');
  await appendFile(path, 'new\n');
  assert.equal((await tail.poll()).text, 'new\n');
  assert.equal((await tail.poll()).text, '');
});
test('truncated log resets cursor and marks a new session', async () => {
  const { path, tail } = await fixture();
  await tail.start();
  await writeFile(path, 'a\n');
  const batch = await tail.poll();
  assert.equal(batch.reset, true);
  assert.equal(batch.text, 'a\n');
});
test('replacement file at same path is detected', async () => {
  const { path, dir, tail } = await fixture();
  await tail.start();
  await rename(path, join(dir, 'old.txt'));
  await writeFile(path, 'replaced\n');
  const batch = await tail.poll();
  assert.equal(batch.reset, true);
  assert.equal(batch.text, 'replaced\n');
});
test('UTF-8 split across reads is decoded once and correctly', async () => {
  const { path, tail } = await fixture();
  await tail.start();
  const bytes = Buffer.from('é\n');
  await appendFile(path, bytes.subarray(0, 1));
  assert.equal((await tail.poll()).text, '');
  await appendFile(path, bytes.subarray(1));
  assert.equal((await tail.poll()).text, 'é\n');
});
test('a preexisting incomplete line is flagged and reads stay bounded', async () => {
  const { path, tail } = await fixture();
  await writeFile(path, 'partial');
  assert.equal((await tail.start()).skipPartial, true);
  await appendFile(path, 'x'.repeat(300000));
  const b = await tail.poll();
  assert.equal(b.text.length, 262144);
  assert.equal(b.backlog, 37856);
});
