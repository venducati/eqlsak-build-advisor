'use strict';
const defaults = { opacity: 0.9, size: 'medium', shortcuts: true, x: null, y: null };
const scales = { small: 0.85, medium: 1, large: 1.2 };
function settingsFrom(value) {
  const v = value && typeof value === 'object' ? value : {};
  return {
    opacity: Number.isFinite(v.opacity) ? Math.min(1, Math.max(0.45, v.opacity)) : defaults.opacity,
    size: Object.hasOwn(scales, v.size) ? v.size : defaults.size,
    shortcuts: typeof v.shortcuts === 'boolean' ? v.shortcuts : true,
    x: Number.isFinite(v.x) ? Math.round(v.x) : null,
    y: Number.isFinite(v.y) ? Math.round(v.y) : null,
  };
}
function fitBounds(settings, displays, primary) {
  const s = settingsFrom(settings);
  const target = displays.find(({ workArea: a }) => s.x !== null && s.y !== null && s.x >= a.x && s.x < a.x + a.width && s.y >= a.y && s.y < a.y + a.height) || primary;
  const a = target.workArea, scale = scales[s.size];
  const width = Math.min(Math.round(380 * scale), a.width), height = Math.min(Math.round(520 * scale), a.height);
  return { x: Math.min(a.x + a.width - width, Math.max(a.x, s.x ?? a.x + a.width - width - 24)),
    y: Math.min(a.y + a.height - height, Math.max(a.y, s.y ?? a.y + 40)), width, height };
}
function frameFrom(value) {
  if (!value || typeof value !== 'object' || !['idle','live','paused','replay','demo'].includes(value.mode)) throw Error('Invalid overlay frame.');
  const text = (v, max) => { if (typeof v !== 'string' || v.length > max) throw Error('Invalid overlay text.'); return v; };
  const number = v => { if (!Number.isFinite(v) || v < 0 || v > 1e16) throw Error('Invalid overlay number.'); return v; };
  const keys = ['dps','damage','incoming','hps','healing','criticalHits','criticalRate','hits','dotDps','ddDamage'];
  const stats = Object.fromEntries(keys.map(key => [key, number(value.stats?.[key])]));
  if (typeof value.rolling !== 'boolean' || !Array.isArray(value.series) || value.series.length !== 60 ||
      !Array.isArray(value.effects) || value.effects.length > 3) throw Error('Invalid overlay frame size.');
  return { mode: value.mode, player: text(value.player,80), rolling: value.rolling, clock: number(value.clock),
    lastEventAt: value.lastEventAt === null ? null : number(value.lastEventAt), stats,
    series: value.series.map(number), effects: value.effects.map(effect => {
      if (!['due','soon','ended','check','timed','observed'].includes(effect.status) || !['buff','debuff','DoT','HoT','unknown'].includes(effect.kind)) throw Error('Invalid effect state.');
      return { ability: text(effect.ability,120), target: text(effect.target,120), kind: effect.kind, status: effect.status,
        remaining: effect.remaining === null ? null : Math.min(86400,number(effect.remaining)) };
    }) };
}
module.exports = { defaults, scales, settingsFrom, fitBounds, frameFrom };
