import soundData from '../data/interface-sounds.json' with { type: 'json' };

export type SoundCue = keyof typeof soundData.cues;
export type SoundSettings = { enabled: boolean; volume: number };
export const soundSettingsKey = 'eqlsak-interface-sounds-v1';
export const defaultSoundSettings: SoundSettings = { enabled: false, volume: 35 };
export const soundCues = soundData.cues;

export function readSoundSettings(raw: string | null): SoundSettings {
  try {
    const value = JSON.parse(raw || 'null');
    return {
      enabled: value?.enabled === true,
      volume: typeof value?.volume === 'number' && Number.isFinite(value.volume)
        ? Math.round(Math.max(0, Math.min(100, value.volume))) : 35,
    };
  } catch { return { ...defaultSoundSettings }; }
}

// Shared by real-time playback and the offline audio-render check.
export function scheduleSound(context: BaseAudioContext, output: AudioNode, cue: SoundCue, at: number) {
  return [...soundCues[cue].notes].sort((a, b) => (a.at + a.seconds) - (b.at + b.seconds)).map((note) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = at + note.at, end = start + note.seconds;
    oscillator.type = note.wave as OscillatorType;
    oscillator.frequency.setValueAtTime(note.hz, start);
    if ('endHz' in note && typeof note.endHz === 'number')
      oscillator.frequency.exponentialRampToValueAtTime(note.endHz, end);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(note.gain, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.008);
    envelope.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start);
    oscillator.stop(end);
    return oscillator;
  });
}

// One lazy context, one short cue at a time. A click can unlock audio; loading
// the app, restoring saved settings or receiving log lines cannot unlock it.
export class AdvisorAudio {
  private context: AudioContext | null = null;
  private resuming: Promise<void> | null = null;
  private master: GainNode | null = null;
  private active: { output: GainNode; nodes: OscillatorNode[] } | null = null;
  private settings = { ...defaultSoundSettings };
  private generation = 0;
  private lastAt = -Infinity;
  private protectedUntil = -Infinity;
  private recent = new Map<SoundCue, number>();
  private createContext: () => AudioContext;
  private visible: () => boolean;
  private clock: () => number;

  constructor(options: { createContext?: () => AudioContext; visible?: () => boolean; clock?: () => number } = {}) {
    this.createContext = options.createContext || (() => new AudioContext());
    this.visible = options.visible || (() => typeof document !== 'undefined' && document.visibilityState !== 'hidden' && window.eqlWindow?.isVisible() !== false);
    this.clock = options.clock || (() => performance.now());
  }

  configure(settings: SoundSettings) {
    this.settings = readSoundSettings(JSON.stringify(settings));
    if (!this.settings.enabled || !this.settings.volume) this.silence();
    this.master?.gain.setValueAtTime(this.settings.enabled ? this.settings.volume / 100 : 0, this.context!.currentTime);
  }

  silence() {
    this.generation++;
    this.master?.gain.setValueAtTime(0, this.context!.currentTime);
    this.clearActive();
    this.lastAt = this.protectedUntil = -Infinity;
    this.recent.clear();
  }

  private clearActive() {
    if (!this.active || !this.context) return;
    const active = this.active;
    this.active = null;
    active.output.gain.cancelScheduledValues(this.context.currentTime);
    active.output.gain.setValueAtTime(0, this.context.currentTime);
    for (const node of active.nodes) { try { node.stop(); } catch { /* Already ended. */ } }
    active.output.disconnect();
  }

  async play(cue: SoundCue, gesture = false): Promise<'played' | 'quiet' | 'unavailable'> {
    if (!this.settings.enabled || !this.settings.volume || !this.visible()) return 'quiet';
    const ticket = this.generation;
    try {
      if (!this.context) {
        if (!gesture) return 'quiet';
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      if (this.context.state !== 'running') {
        if (!gesture && !this.resuming) return 'quiet';
        if (!this.resuming) this.resuming = this.context.resume().finally(() => { this.resuming = null; });
        await this.resuming;
      }
      if (ticket !== this.generation || !this.settings.enabled || !this.settings.volume || !this.visible()) return 'quiet';
      if (this.context.state !== 'running') return 'unavailable';
      const now = this.clock();
      const completion = cue === 'report' || cue === 'trip' || cue === 'notice';
      if ((!completion && (now - this.lastAt < 80 || now < this.protectedUntil)) ||
          (completion && now - (this.recent.get(cue) ?? -Infinity) < 800)) return 'quiet';
      this.clearActive();
      this.master!.gain.setValueAtTime(this.settings.volume / 100, this.context.currentTime);
      const output = this.context.createGain();
      output.connect(this.master!);
      const nodes = scheduleSound(this.context, output, cue, this.context.currentTime + 0.008);
      this.active = { output, nodes };
      // The last note releases the cue bus as well as its own envelope.
      const last = nodes.at(-1)!;
      const release = last.onended;
      last.onended = (event) => {
        release?.call(last, event);
        if (this.active?.output === output) { output.disconnect(); this.active = null; }
      };
      this.lastAt = now;
      this.recent.set(cue, now);
      this.protectedUntil = completion ? now + 700 : now;
      return 'played';
    } catch {
      this.silence();
      return 'unavailable';
    }
  }
}

export const advisorAudio = new AdvisorAudio();
// Completion hooks never unlock audio or throw into an app action.
export function playAdvisorSound(cue: SoundCue) { void advisorAudio.play(cue); }
