import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdvisorAudio, readSoundSettings, soundCues } from '../lib/advisor-audio.ts';

function fixture({ resume, unavailable = false } = {}) {
  let visible = true, now = 0, contexts = 0;
  const oscillators = [], gains = [];
  const parameter = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const context = {
    state: resume ? 'suspended' : 'running', currentTime: 0, destination: {},
    resume: async () => { await resume?.(); context.state = 'running'; },
    createGain() { const node = { gain: parameter(), connect() {}, disconnect() { this.disconnected = true; } }; gains.push(node); return node; },
    createOscillator() { const node = { frequency: parameter(), connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stops = (this.stops || 0) + 1; } }; oscillators.push(node); return node; },
  };
  const audio = new AdvisorAudio({ createContext: () => { contexts++; if (unavailable) throw Error('No audio'); return context; }, visible: () => visible, clock: () => now });
  return { audio, oscillators, gains, context, contexts: () => contexts, hidden: () => { visible = false; }, advance: (ms) => { now += ms; } };
}

test('safe, bounded settings and silent first launch', async () => {
  assert.deepEqual(readSoundSettings(null), { enabled: false, volume: 35 });
  assert.deepEqual(readSoundSettings('{broken'), { enabled: false, volume: 35 });
  assert.deepEqual(readSoundSettings('{"enabled":"true","volume":999}'), { enabled: false, volume: 100 });
  assert.equal(readSoundSettings('{"volume":-1}').volume, 0);
  const f = fixture();
  assert.equal(await f.audio.play('click', true), 'quiet');
  f.audio.configure({ enabled: true, volume: 35 });
  assert.equal(await f.audio.play('report'), 'quiet');
  assert.equal(f.contexts(), 0, 'Restored settings and background reports cannot unlock audio');
  assert.equal(await f.audio.play('navigate', true), 'played');
  assert.equal(f.contexts(), 1);
});

test('mute stops the current cue; volume zero and hidden pages cannot play', async () => {
  const f = fixture();
  f.audio.configure({ enabled: true, volume: 35 });
  await f.audio.play('report', true);
  f.audio.configure({ enabled: false, volume: 35 });
  assert.equal(f.gains[0].gain.value, 0);
  assert.ok(f.oscillators.every(node => node.stops === 2));
  const count = f.oscillators.length;
  assert.equal(await f.audio.play('trip', true), 'quiet');
  f.audio.configure({ enabled: true, volume: 0 });
  assert.equal(await f.audio.play('click', true), 'quiet');
  f.audio.configure({ enabled: true, volume: 35 });
  f.hidden();
  assert.equal(await f.audio.play('trip', true), 'quiet');
  assert.equal(f.oscillators.length, count);
});

test('muting during resume cancels pending sound even when quickly re-enabled', async () => {
  let release;
  const f = fixture({ resume: () => new Promise(resolve => { release = resolve; }) });
  f.audio.configure({ enabled: true, volume: 35 });
  const pending = f.audio.play('report', true);
  f.audio.configure({ enabled: false, volume: 35 });
  f.audio.configure({ enabled: true, volume: 35 });
  release();
  assert.equal(await pending, 'quiet');
  assert.equal(f.oscillators.length, 0);
});

test('rapid clicks and repeated report completions cannot pile up', async () => {
  const f = fixture();
  f.audio.configure({ enabled: true, volume: 35 });
  assert.equal(await f.audio.play('click', true), 'played');
  assert.equal(await f.audio.play('click', true), 'quiet');
  assert.equal(await f.audio.play('report'), 'played', 'Completion takes priority over its initiating click');
  const count = f.oscillators.length;
  f.advance(200);
  assert.equal(await f.audio.play('report'), 'quiet');
  assert.equal(await f.audio.play('click', true), 'quiet');
  assert.equal(f.oscillators.length, count);
  f.advance(700);
  assert.equal(await f.audio.play('click', true), 'played');
  assert.equal(f.contexts(), 1);
});

test('a report from the first click waits for that click to unlock audio', async () => {
  let release;
  const f = fixture({ resume: () => new Promise(resolve => { release = resolve; }) });
  f.audio.configure({ enabled: true, volume: 35 });
  const click = f.audio.play('click', true);
  const report = f.audio.play('report');
  release();
  assert.equal(await click, 'played');
  assert.equal(await report, 'played');
  assert.equal(f.contexts(), 1);
});

test('missing or blocked audio cannot break the calling feature', async () => {
  const f = fixture({ unavailable: true });
  f.audio.configure({ enabled: true, volume: 35 });
  assert.equal(await f.audio.play('report', true), 'unavailable');
  const suspended = fixture({ resume: () => { throw Error('Blocked'); } });
  suspended.audio.configure({ enabled: true, volume: 35 });
  assert.equal(await suspended.audio.play('click', true), 'unavailable');
});

test('all original cue definitions are short and have conservative amplitude bounds', () => {
  for (const [name, cue] of Object.entries(soundCues)) {
    assert.ok(cue.label && cue.notes.length > 0 && cue.notes.length <= 6, name);
    assert.ok(cue.notes.reduce((sum, note) => sum + note.gain, 0) <= 0.4, name + ': headroom');
    for (const note of cue.notes) {
      assert.ok(['sine', 'triangle'].includes(note.wave));
      assert.ok(note.hz >= 100 && note.hz <= 1600);
      assert.ok(note.at >= 0 && note.seconds >= 0.03 && note.at + note.seconds <= 0.8);
      assert.ok(note.gain > 0 && note.gain <= 0.2);
    }
  }
});
