import { useEffect, useRef, useState } from 'react';
import { PanelsTopLeft, LockKeyhole, UnlockKeyhole, LocateFixed, Eye, EyeOff } from 'lucide-react';
import { emptyOverlayState, overlaySnapshot, type OverlayInput, type OverlayAction } from '../lib/combat-overlay';
import '../app/combat-overlay-controls.css';
export default function CombatOverlayControls({input}:{input:OverlayInput}) {
  const [state,setState]=useState(emptyOverlayState),[available,setAvailable]=useState(false),[message,setMessage]=useState('');
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    const bridge=window.eqlOverlay;if(!bridge)return;
    let active=true;setAvailable(true);
    void bridge.getState().then(value=>{if(active)setState(value);}).catch(()=>setMessage('Overlay settings could not be loaded. Try opening the overlay again.'));
    const off=bridge.onState(setState);
    const focus=bridge.onOpenControls(()=>setTimeout(()=>{panel.current?.scrollIntoView({block:'center'});panel.current?.focus({preventScroll:true});},100));
    return()=>{active=false;off();focus();};
  },[]);
  useEffect(()=>{
    if(state.visible && window.eqlOverlay) window.eqlOverlay.publish(overlaySnapshot(input));
  },[state.visible,input]);
  async function control(action:OverlayAction) {
    try{setMessage('');const next=await window.eqlOverlay!.control(action);setState(next);}
    catch(error){setMessage(error instanceof Error?error.message:'The overlay could not be changed. Try again.');}
  }
  return <section className="cm-overlay-controls" aria-label="Game overlay" ref={panel} tabIndex={-1}>
    <div className="cm-overlay-heading"><h3><PanelsTopLeft aria-hidden="true" /> Game overlay</h3><span>{available?(state.visible?'Showing over other windows':'Hidden'):'Windows app feature'}</span></div>
    {!available?<p>Use the installed Windows app to put live stats above EQL. The browser edition keeps its meters here in the page.</p>:<>
      <p>Keep your combat stats in view while you play. Choose a live log above, use windowed or borderless mode in EQL, then open the overlay. Drag its title to place it.</p>
      <div className="cm-overlay-actions">
        <button onClick={()=>void control({action:state.visible?'hide':'show'})}>{state.visible?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}{state.visible?'Hide game overlay':'Show game overlay'}</button>
        <button disabled={!state.visible} onClick={()=>void control({action:'lock',locked:!state.locked})}>{state.locked?<UnlockKeyhole aria-hidden="true"/>:<LockKeyhole aria-hidden="true"/>}{state.locked?'Unlock overlay':'Lock for play'}</button>
        <button disabled={!state.visible} onClick={()=>void control({action:'reset-position'})}><LocateFixed aria-hidden="true"/> Reset overlay position</button>
      </div>
      <p>{state.locked?'Locked: mouse clicks pass through to the game. Unlock here to move or use the overlay.':'Unlocked: move the overlay, then choose Lock for play to let mouse clicks pass through.'}</p>
      <details><summary>Overlay size, transparency &amp; shortcuts</summary>
        <div className="cm-overlay-options">
          <label>Size<select value={state.size} onChange={e=>void control({action:'settings',settings:{size:e.target.value as typeof state.size}})}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
          <label>Opacity · {Math.round(state.opacity*100)}%<input type="range" min="45" max="100" step="5" value={Math.round(state.opacity*100)} onChange={e=>void control({action:'settings',settings:{opacity:Number(e.target.value)/100}})}/></label>
          <label className="cm-overlay-check"><input type="checkbox" checked={state.shortcuts} onChange={e=>void control({action:'settings',settings:{shortcuts:e.target.checked}})}/> Use overlay keyboard shortcuts</label>
        </div>
        <p><kbd>Ctrl + Shift + F10</kbd> shows or hides an opened overlay. <kbd>Ctrl + Shift + F11</kbd> locks or unlocks it.</p>
        {state.shortcuts && state.visible && (!state.shortcutHide||!state.shortcutLock) && <p>One or more shortcuts are already in use. Use the buttons here, or turn shortcuts off.</p>}
        <p>Position, size and opacity are saved on this device. The overlay starts hidden each time BA opens. Keep BA running; you can minimize its main window.</p>
      </details>
      <p className="cm-note">Stats come from the same selected log and time window as the Combat Meter. Demo, saved and paused data are labeled. Spell times are estimates from your timer settings. Current HP is not recorded in these logs.</p>
    </>}
    {(message||state.error)&&<p role="status">{message||state.error}</p>}
  </section>;
}
