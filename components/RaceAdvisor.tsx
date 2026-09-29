'use client';
import { recommendRaces } from '../lib/race-advisor';
import type { AdvisorInput, RulePack } from '../lib/build-advisor';

export default function RaceAdvisor({ input, pack, onChoose }: { input:AdvisorInput; pack:RulePack; onChoose:(race:string)=>void }) {
  const ranks=recommendRaces(input,pack);
  const chosen=ranks.find(entry=>entry.race.id===input.race) || ranks[0];
  return <section className="ba-race-advisor" aria-labelledby="race-advisor-title">
    <div className="ba-race-heading"><div><p className="ba-kicker">🧬 CHARACTER ORIGIN</p><h3 id="race-advisor-title">Race & trio fit</h3><p>Choose a race to see how its known start and common strengths fit the trio you entered. Scores compare planning fits; they do not prove a class is available.</p></div><label>Race for this loadout<select value={input.race || ''} onChange={e=>onChoose(e.target.value)}><option value="">Show the best fits</option>{ranks.map(({race})=><option key={race.id} value={race.id}>{race.name}</option>)}</select></label></div>
    {chosen && <article className="ba-race-feature">
      <header><span className="ba-race-icon" aria-hidden="true">{chosen.race.icon}</span><div><p className="ba-kicker">{input.race ? 'YOUR SELECTED RACE' : 'TOP PLANNING FIT'}</p><h4>{chosen.race.name} <small>· Start: {chosen.race.start}</small></h4></div><strong>{chosen.score} fit</strong></header>
      <div className="ba-race-columns"><section><h5>Why it fits</h5><ul>{chosen.reasons.slice(0,3).map(reason=><li key={reason}>✓ {reason}</li>)}</ul></section><section><h5>What to watch</h5><ul>{chosen.tradeoffs.map(item=><li key={item}>⚠️ {item}</li>)}</ul></section></div>
      <small className="ba-source">{chosen.race.provenance.label} · {chosen.race.provenance.reference}</small>
    </article>}
    <details className="ba-race-compare"><summary>Compare all 15 playable races</summary><div className="ba-table-wrap"><table><thead><tr><th>Race</th><th>Start</th><th>Best fit here</th><th>Fit</th><th></th></tr></thead><tbody>{ranks.map(({race,score,matched})=><tr key={race.id}><th scope="row">{race.icon} {race.name}</th><td>{race.start}</td><td>{matched.length ? matched.join(', ') : 'general fit'}</td><td>{score}</td><td><button type="button" onClick={()=>onChoose(race.id)}>See fit</button></td></tr>)}</tbody></table></div><p className="ba-note">The current roster comes from EQL launch information. The detailed strengths and tradeoffs are clearly labeled community guidance or heuristic estimates. Check the game’s character-creation screen before locking a primary class.</p></details>
  </section>;
}
