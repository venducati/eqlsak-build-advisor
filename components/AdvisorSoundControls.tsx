import { useEffect, useState } from 'react';
import { Volume2, VolumeX, SlidersHorizontal, Music2, ScrollText, Gem } from 'lucide-react';
import { advisorAudio, defaultSoundSettings, readSoundSettings, soundSettingsKey, type SoundCue, type SoundSettings } from '../lib/advisor-audio';
import '../app/advisor-sounds.css';

export default function AdvisorSoundControls() {
  const [settings, setSettings] = useState({ ...defaultSoundSettings });
  const [message, setMessage] = useState('');
  useEffect(() => {
    try {
      const saved = readSoundSettings(localStorage.getItem(soundSettingsKey));
      setSettings(saved);
      advisorAudio.configure(saved);
    } catch { setMessage('Sound settings work here, but could not be loaded from this device.'); }
    const hide = () => { if (document.visibilityState === 'hidden') advisorAudio.silence(); };
    const offVisibility = window.eqlWindow?.onVisibility(visible => { if (!visible) advisorAudio.silence(); });
    const click = (event: MouseEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const target = event.target.closest('button, summary, a[href], input[type="checkbox"], input[type="radio"]');
      if (!target?.closest('.advisor-client') || target.closest('[data-sound="off"], [hidden], [inert], [aria-disabled="true"]') || target.matches(':disabled')) return;
      const cue = target.closest('[data-sound="navigate"]') || target.matches('summary, a') ? 'navigate' : 'click';
      void advisorAudio.play(cue, true);
    };
    const change = (event: Event) => {
      if (event.isTrusted && event.target instanceof HTMLSelectElement && event.target.closest('.advisor-client')) void advisorAudio.play('click', true);
    };
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('click', click, true);
    document.addEventListener('change', change, true);
    return () => {
      advisorAudio.silence();
      offVisibility?.();
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('click', click, true);
      document.removeEventListener('change', change, true);
    };
  }, []);

  function update(next: SoundSettings) {
    setSettings(next);
    advisorAudio.configure(next);
    setMessage('');
    try { localStorage.setItem(soundSettingsKey, JSON.stringify(next)); }
    catch { setMessage('Your sound choice works now, but could not be saved. Set it again next time.'); }
  }
  async function preview(cue: SoundCue) {
    const result = await advisorAudio.play(cue, true);
    if (result === 'unavailable') setMessage('Sound is not available right now. Check your device sound settings and try again.');
  }
  return <section className="ba-sound-controls" aria-label="Interface sounds" data-sound="off">
    <div className="ba-sound-bar">
      <button className="ba-sound-toggle" type="button" aria-pressed={settings.enabled}
        onClick={() => {
          const enabled = !settings.enabled;
          update({ ...settings, enabled });
          if (enabled) void preview('navigate');
        }}>
        {settings.enabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        Sound {settings.enabled ? 'On' : 'Off'}
      </button>
      <details className="ba-sound-options">
        <summary><SlidersHorizontal aria-hidden="true" /> Sound settings</summary>
        <div className="ba-sound-body">
          <p>Bring a little fantasy to your clicks and reports. Sounds start off. Your choice stays on this device.</p>
          <label className="ba-sound-volume" htmlFor="ba-sound-volume">Sound volume <output>{settings.volume}%</output>
            <input id="ba-sound-volume" type="range" min="0" max="100" step="5" value={settings.volume}
              onChange={(e) => update({ ...settings, volume: Number(e.target.value) })} />
          </label>
          <div className="ba-sound-previews">
            <button type="button" disabled={!settings.enabled || !settings.volume} onClick={() => void preview('click')}><Music2 aria-hidden="true" /> Try button sound</button>
            <button type="button" disabled={!settings.enabled || !settings.volume} onClick={() => void preview('report')}><ScrollText aria-hidden="true" /> Try report sound</button>
            <button type="button" disabled={!settings.enabled || !settings.volume} onClick={() => void preview('trip')}><Gem aria-hidden="true" /> Try trip sound</button>
          </div>
          <p className="ba-sound-note">Short taps and chimes only. No background music or sounds for each hit. Text and charts still show every result when sound is off.</p>
          {!settings.enabled && <p>Choose <strong>Sound Off</strong> above to turn sounds on.</p>}
          {settings.enabled && settings.volume === 0 && <p>Volume is at zero. Raise it to hear the sounds.</p>}
        </div>
      </details>
    </div>
    <p className="ba-sound-message" role="status">{message}</p>
  </section>;
}
