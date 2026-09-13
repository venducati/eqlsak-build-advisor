import mapping from '../data/combat-messages.json' with { type: 'json' };
export type CombatKind =
  | 'melee'
  | 'DD'
  | 'DoT'
  | 'damage'
  | 'heal'
  | 'HoT'
  | 'beneficial'
  | 'cast'
  | 'worn-off'
  | 'death'
  | 'zone'
  | 'unknown';
export type CombatEvent = {
  at: number;
  kind: CombatKind;
  actor: string;
  target: string;
  amount: number;
  ability: string;
  raw: string;
  critical?: boolean;
};
export const EVENT_LIMIT = 20000;
export function parseCombatLine(line: string): CombatEvent | null {
  const stamp = line.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!stamp) return null;
  const at = Date.parse(stamp[1]);
  if (!Number.isFinite(at)) return null;
  const raw = stamp[2].trim();
  if (raw.length > 8192) return null;
  let body = raw;
  let critical = false;
  let tag: RegExpMatchArray | null;
  while ((tag = body.match(/\s+\(([^()]*)\)$/))) {
    if (tag[1].toLowerCase() === 'critical') critical = true;
    body = body.slice(0, tag.index).trimEnd();
  }
  const make = (
    kind: CombatKind,
    actor = '',
    target = '',
    amount = 0,
    ability = '',
  ): CombatEvent =>
    Number.isSafeInteger(amount) && amount >= 0
      ? { at, kind, actor, target, amount, ability, raw, critical }
      : {
          at,
          kind: 'unknown',
          actor: '',
          target: '',
          amount: 0,
          ability: '',
          raw,
        };
  let m: RegExpMatchArray | null;
  if (
    (m = body.match(/^You have taken ([\d,]+) damage from (.+?) by (.+?)\.$/i))
  )
    return make('DoT', m[3], 'You', Number(m[1].replaceAll(',', '')), m[2]);
  if (
    (m = body.match(
      /^(.+?) healed (.+?)( over time)? for ([\d,]+)(?:\s*\(([\d,]+)\))? hit points?(?: by (.+?))?\.$/i,
    ))
  )
    return make(
      m[3] ? 'HoT' : 'heal',
      m[1],
      m[2],
      Number(m[4].replaceAll(',', '')),
      m[6] || 'Unnamed heal',
    );
  if (
    (m = body.match(
      /^(.+?) has taken ([\d,]+) damage from (?:your|(.+?)'s) (.+?)\.$/i,
    ))
  )
    return make(
      'DoT',
      m[3] || 'You',
      m[1],
      Number(m[2].replaceAll(',', '')),
      m[4],
    );
  if (
    (m = body.match(
      /^(.+?) hits? (.+?) for ([\d,]+) points? of ([\w-]+) damage by (.+?)\.(?: \([^)]*\))?$/i,
    ))
  )
    return make('DD', m[1], m[2], Number(m[3].replaceAll(',', '')), m[5]);
  if (
    (m = body.match(
      /^(.+?) (hit|hits|slash(?:es)?|pierce[sd]?|crush(?:es)?|bash(?:es)?|kick[sd]?|punch(?:es)?|backstab[sd]?|bite[sd]?|claw[sd]?|gore[sd]?|maul[sd]?|rend[sd]?|slice[sd]?|sting[sd]?|strike[sd]?|cleave[sd]?|frenzy on|shoots?|smash(?:es)?|smite[sd]?|reave[sd]?|slams?) (.+?) for ([\d,]+) points? of (non-melee )?damage\.(?: \([^)]*\))?$/i,
    ))
  )
    return make(
      m[5] ? 'damage' : 'melee',
      m[1],
      m[3],
      Number(m[4].replaceAll(',', '')),
      m[5] ? 'Unclassified non-melee' : m[2],
    );
  if ((m = body.match(/^(You begin|.+? begins) casting (.+?)\.$/i)))
    return make('cast', m[1].replace(/ begins?$/i, ''), '', 0, m[2]);
  if ((m = body.match(/^Your (.+?) spell has worn off(?: of (.+?))?\.$/i)))
    return make('worn-off', 'You', m[2] || 'You', 0, m[1]);
  if ((m = body.match(/^You have been slain by (.+?)[!.]$/i)))
    return make('death', m[1], 'You');
  if (/^You died\.$/i.test(body)) return make('death', 'Unknown', 'You');
  if ((m = body.match(/^You have slain (.+?)[!.]$/i)))
    return make('death', 'You', m[1]);
  if ((m = body.match(/^(.+?) has been slain by (.+?)[!.]$/i)))
    return make('death', m[2], m[1]);
  if ((m = body.match(/^You have entered (.+?)\.$/i)))
    return make('zone', 'You', m[1]);
  const known = mapping.messages.find((x) => x.text === body);
  if (known) return make('beneficial', 'Unknown', 'You', 0, known.label);
  return make('unknown');
}
export function isSelf(name: string, player: string) {
  return (
    /^(you|yourself)$/i.test(name) ||
    Boolean(player.trim() && name.toLowerCase() === player.trim().toLowerCase())
  );
}
export const isDamage = (e: CombatEvent) =>
  ['melee', 'DD', 'DoT', 'damage'].includes(e.kind);
export function summarizeCombat(
  events: CombatEvent[],
  player: string,
  pet: string,
  now: number,
  rolling = false,
) {
  const scope = events.filter(
    (e) => e.at <= now && (!rolling || e.at > now - 30000),
  );
  const owned = (e: CombatEvent) =>
    isSelf(e.actor, player) ||
    Boolean(pet.trim() && e.actor.toLowerCase() === pet.trim().toLowerCase());
  const outgoing = scope.filter(
    (e) => isDamage(e) && owned(e) && !isSelf(e.target, player),
  );
  const incoming = scope.filter((e) => isDamage(e) && isSelf(e.target, player));
  const healing = scope.filter(
    (e) => ['heal', 'HoT'].includes(e.kind) && owned(e),
  );
  const received = scope.filter(
    (e) => ['heal', 'HoT'].includes(e.kind) && isSelf(e.target, player),
  );
  const sum = (xs: CombatEvent[]) => xs.reduce((n, e) => n + e.amount, 0);
  const times = [...outgoing, ...incoming, ...healing].map((e) => e.at);
  const seconds = rolling
    ? 30
    : times.length
      ? Math.max(1, (Math.max(...times) - Math.min(...times)) / 1000)
      : 1;
  const breakdown: Record<
    string,
    { kind: CombatKind; ability: string; amount: number; hits: number }
  > = {};
  for (const e of [...outgoing, ...healing]) {
    const key = e.kind + '|' + e.ability;
    const row = (breakdown[key] ??= {
      kind: e.kind,
      ability: e.ability,
      amount: 0,
      hits: 0,
    });
    row.amount += e.amount;
    row.hits++;
  }
  return {
    damage: sum(outgoing),
    incoming: sum(incoming),
    healing: sum(healing),
    received: sum(received),
    hits: outgoing.length,
    weaponHits: outgoing.filter((e) => e.kind === 'melee').length,
    criticalHits: outgoing.filter((e) => e.critical).length,
    criticalRate: outgoing.length
      ? (outgoing.filter((e) => e.critical).length / outgoing.length) * 100
      : 0,
    dotDamage: sum(outgoing.filter((e) => e.kind === 'DoT')),
    dotTicks: outgoing.filter((e) => e.kind === 'DoT').length,
    ddDamage: sum(outgoing.filter((e) => e.kind === 'DD')),
    dps: sum(outgoing) / seconds,
    hps: sum(healing) / seconds,
    seconds,
    breakdown: Object.values(breakdown).sort((a, b) => b.amount - a.amount),
    scope,
    effects: scope
      .filter(
        (e) =>
          (['beneficial', 'worn-off'].includes(e.kind) &&
            isSelf(e.target, player)) ||
          (e.kind === 'DoT' && owned(e)),
      )
      .slice(-20)
      .reverse(),
  };
}
// Complete lines only: a game's partially written final line must not become two events.
export class CombatLines {
  pending = '';
  discard = false;
  push(text: string) {
    const lines = (this.pending + text).split('\n');
    this.pending = lines.pop() || '';
    const result: string[] = [];
    for (const line of lines) {
      if (this.discard) {
        this.discard = false;
        continue;
      }
      if (line.length <= 8192) result.push(line.replace(/\r$/, ''));
    }
    if (this.pending.length > 8192) {
      this.pending = '';
      this.discard = true;
    }
    return result;
  }
  reset(skipPartial = false) {
    this.pending = '';
    this.discard = skipPartial;
  }
}
