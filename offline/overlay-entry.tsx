import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, X, LockKeyhole, Settings2, Sparkles, Shield, Heart, Flame } from 'lucide-react';
import { emptyOverlayState, type OverlayFrame, type OverlayAction } from '../lib/combat-overlay';
import '../app/game-overlay.css';
const fmt=(n:number)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:1,notation:n>=100000?'compact':'standard'}).format(n);
const labels={idle:'NO LIVE LOG',live:'LIVE LOG',paused:'PAUSED',replay:'SAVED LOG',demo:'DEMO'};
function Overlay() {
  const [state,setState]=useState(emptyOverlayState),[frame,setFrame]=useState<OverlayFrame|null>(null),[now,setNow]=useState(Date.now()),[error,setError]=useState('');
  useEffect(()=>{
    const bridge=window.eqlOverlayView;if(!bridge)return;
    const offState=bridge.onState(setState),offFrame=bridge.onFrame(setFrame);
    void bridge.get().then(value=>{setState(value.state);setFrame(value.frame);}).catch(()=>setError('Could not connect. Open the Combat Meter in BA.'));
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>{offState();offFrame();clearInterval(timer);};
  },[]);
  async function act(action:OverlayAction){try{setState(await window.eqlOverlayView!.control(action));setError('');}catch{setError('Open BA to change overlay settings.');}}
  const stale=!frame || now-(frame.receivedAt||0)>3500;
  const quiet=frame?.mode==='live' && (!frame.lastEventAt || Math.abs(frame.clock-frame.lastEventAt)>60000);
  const peak=Math.max(1,...(frame?.series||[]));
  const points=frame?.series.map((value,i)=>`${i*5},${53-value/peak*48}`).join(' ')||'';
  const stats=frame?.stats;
  return <main className={'game-overlay'+(state.locked?' overlay-locked':'')}>
    <header><div className="overlay-drag"><Activity aria-hidden="true"/><strong>EQLSaK</strong><span>{state.locked?'LOCKED':'Drag to move'}</span></div>
      <div className="overlay-buttons"><button aria-label="Overlay settings in BA" title="Overlay settings in BA" onClick={()=>void act({action:'controls'})}><Settings2/></button><button aria-label="Lock overlay for play" title="Lock: let clicks pass to the game" onClick={()=>void act({action:'lock',locked:true})}><LockKeyhole/></button><button aria-label="Hide overlay" title="Hide overlay" onClick={()=>void act({action:'hide'})}><X/></button></div>
    </header>
    <div className="overlay-status"><b className={'overlay-mode mode-'+(frame?.mode||'idle')}>{stale?'WAITING FOR METER':labels[frame!.mode]}</b><span>{frame?.rolling?'Last 30 seconds':'Meter time window'}</span></div>
    <p className="overlay-character" title={frame?.player}>{frame?.player||'Your character'}{frame?.mode==='live'&&quiet?' · no recent log events':''}</p>
    <div className={'overlay-stats'+(stale?' overlay-stale':'')}>
      <article className="overlay-dps"><Activity aria-hidden="true"/><span>Damage / sec</span><strong>{stats?fmt(stats.dps):'—'}</strong></article>
      <article><Sparkles aria-hidden="true"/><span>Critical hits</span><strong>{stats?fmt(stats.criticalHits):'—'}</strong><small>{stats?fmt(stats.criticalRate)+'% of hits & ticks':''}</small></article>
      <article><Shield aria-hidden="true"/><span>Damage taken</span><strong>{stats?fmt(stats.incoming):'—'}</strong></article>
      <article><Heart aria-hidden="true"/><span>Healing / sec</span><strong>{stats?fmt(stats.hps):'—'}</strong><small>Logged healing</small></article>
    </div>
    <div className="overlay-secondary"><span><Flame aria-hidden="true"/> DoT/sec <b>{stats?fmt(stats.dotDps):'—'}</b></span><span>Hits &amp; ticks <b>{stats?fmt(stats.hits):'—'}</b></span><span>Damage <b>{stats?fmt(stats.damage):'—'}</b></span></div>
    <figure className="overlay-graph"><figcaption>Damage each second · last minute <span>{frame?.mode==='demo'||frame?.mode==='replay'?'Recorded time':''}</span></figcaption><svg viewBox="0 0 295 56" preserveAspectRatio="none" role="img" aria-label="Recorded damage each second over the last minute"><path d="M0 54H295" className="overlay-baseline"/><polyline points={points}/></svg></figure>
    <div className="overlay-effects"><div className="overlay-effects-label">Spell watch <span>Estimated timers</span></div>
      {!frame?.effects.length?<p>No active timers. Set them in the Combat Meter.</p>:frame.effects.map((effect,i)=><div key={i} className={'overlay-effect effect-'+effect.status} title={`${effect.ability} · ${effect.target}`}><span>{effect.kind==='unknown'?'Effect':effect.kind} · {effect.ability}</span><b>{effect.status==='check'?'Recheck':effect.status==='ended'?'Ended':effect.status==='due'?'Refresh?':effect.remaining===null?'Time unknown':Math.ceil(effect.remaining)+'s'}</b></div>)}
    </div>
    <footer>{error|| (stale?'Meter is not sending updates. Open BA to check it.':state.locked?(state.shortcutLock?'Ctrl + Shift + F11 to unlock':'Unlock from the Combat Meter in BA'):'Place the panel, then lock it for play.')}<span>Current HP is not available from the log.</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Overlay/>);
