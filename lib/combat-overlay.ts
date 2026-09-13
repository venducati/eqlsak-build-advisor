import { summarizeCombat, type CombatEvent } from './combat-meter.ts';
import { combatSeries, trackEffects, type EffectRule, type ManualEffect } from './combat-visuals.ts';
export type OverlayState = { visible: boolean; locked: boolean; opacity: number; size: 'small'|'medium'|'large'; shortcuts: boolean; shortcutHide: boolean; shortcutLock: boolean; error: string };
export type OverlayFrame = ReturnType<typeof overlaySnapshot> & { receivedAt?: number };
export type OverlayAction = {action:'show'|'hide'|'reset-position'|'controls'} | {action:'lock';locked:boolean} | {action:'settings';settings:Partial<Pick<OverlayState,'opacity'|'size'|'shortcuts'>>};
export type OverlayInput = { events:CombatEvent[]; player:string; pet:string; clock:number; rolling:boolean; mode:'idle'|'live'|'paused'|'replay'|'demo'; rules:EffectRule[]; manual:ManualEffect[] };
export const emptyOverlayState:OverlayState = {visible:false,locked:false,opacity:0.9,size:'medium',shortcuts:true,shortcutHide:false,shortcutLock:false,error:''};
export function overlaySnapshot(input:OverlayInput) {
  const {events,player,pet,clock,rolling,mode,rules,manual}=input;
  const stats=summarizeCombat(events,player,pet,clock,rolling);
  const latest=events.reduce((last,e)=>e.kind!=='unknown' && e.at<=clock?Math.max(last,e.at):last,0);
  return {mode,player:player.slice(0,80),clock,rolling,lastEventAt:latest||null,
    stats:{dps:stats.dps,damage:stats.damage,incoming:stats.incoming,hps:stats.hps,healing:stats.healing,criticalHits:stats.criticalHits,criticalRate:stats.criticalRate,hits:stats.hits,dotDps:stats.dotDamage/stats.seconds,ddDamage:stats.ddDamage},
    series:combatSeries(events,player,pet,clock).buckets.map(b=>b.damage),
    effects:trackEffects(events,rules,manual,player,pet,clock).slice(0,3).map(effect=>({ability:effect.ability.slice(0,120),target:effect.target.slice(0,120),kind:effect.kind,status:effect.status,remaining:effect.remaining})),
  };
}
declare global {
  interface Window {
    eqlOverlay?: { getState:()=>Promise<OverlayState>; control:(action:OverlayAction)=>Promise<OverlayState>; publish:(frame:OverlayFrame)=>void; onState:(cb:(state:OverlayState)=>void)=>()=>void; onOpenControls:(cb:()=>void)=>()=>void };
    eqlOverlayView?: { get:()=>Promise<{state:OverlayState;frame:OverlayFrame|null}>; control:(action:OverlayAction)=>Promise<OverlayState>; onState:(cb:(state:OverlayState)=>void)=>()=>void; onFrame:(cb:(frame:OverlayFrame|null)=>void)=>()=>void };
    eqlWindow?: {isVisible:()=>boolean;onVisibility:(cb:(visible:boolean)=>void)=>()=>void};
  }
}
