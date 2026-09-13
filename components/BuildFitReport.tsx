import { useEffect, useId, useRef, useState } from 'react';
import AdvisorIcon from './AdvisorIcon';
import { buildFitReport, fitReportText } from '../lib/build-fit-report';
import type { AdvisorInput, RulePack } from '../lib/build-advisor';

export default function BuildFitReport({ input, candidate, pack, onClose, onChoose }: {
  input: AdvisorInput; candidate: string; pack: RulePack; onClose: () => void; onChoose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [message, setMessage] = useState('');
  const report = buildFitReport(input, candidate, pack);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function save() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([fitReportText(report)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `EQLSaK-${candidate}-Fit-Report.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Report download started. Check your Downloads folder.');
  }
  return <dialog ref={dialog} className="ba-fit-report" aria-labelledby={heading} onClose={onClose}>
    <header><h2 id={heading}><AdvisorIcon code={candidate} medallion /> Why {report?.name || candidate} fits</h2><button type="button" onClick={onClose}>Close report</button></header>
    {!report ? <p role="alert">This report is no longer available. Close it and check your class choices.</p> : <>
      <p className="ba-fit-build">{report.build}</p>
      <p className="ba-fit-score">Rank #{report.rank} of {report.total} · {report.score} planning points</p>
      <p>Based on your saved rules and current choices. Points compare options; they do not measure damage or promise success.</p>
      <div className="ba-fit-grid">
        <section><h3><AdvisorIcon code="why" /> Why it helps</h3><ul>{report.reasons.map((row, index) => <li key={index}>{row.why}<small className="ba-source">{row.provenance.label} · {row.provenance.reference}</small></li>)}</ul>{!report.reasons.length && <p>The current rules give this class no positive score contributions.</p>}</section>
        <section><h3><AdvisorIcon code="warning" /> Tradeoffs & weak spots</h3><ul>{report.cautions.map(text => <li key={text}>{text}</li>)}</ul><p className="ba-note">These are saved planning estimates.</p></section>
        <section><h3><AdvisorIcon code="target" /> Your goals & setting</h3><ul>{report.context.map(text => <li key={text}>{text}</li>)}</ul></section>
        <section><h3><AdvisorIcon code="buddy" /> Other choices</h3><ul>{report.alternatives.map(row => <li key={row.name}><strong>{row.name} · {row.score} pts</strong><p>{row.why}</p><p className="ba-note">Tradeoff: {row.tradeoff}</p></li>)}</ul></section>
      </div>
      <details><summary>All score reasons & sources</summary><ul>{report.breakdown.map((row, index) => <li key={index}><strong>{row.points > 0 ? '+' : ''}{row.points} points:</strong> {row.why}<small className="ba-source">{row.provenance.label} · {row.provenance.reference}</small></li>)}</ul></details>
      <footer>{input.tertiary === candidate ? <p>This is already your chosen third class.</p> : <button type="button" onClick={onChoose}>Use {report.name} as my third class</button>}<button type="button" onClick={save}>Save report (.txt)</button></footer>
      <p role="status">{message}</p>
    </>}
  </dialog>;
}
