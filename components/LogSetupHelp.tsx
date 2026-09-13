import {FileText} from 'lucide-react';
export default function LogSetupHelp({open = false}: {open?: boolean}) {
  return <details className="cm-log-help" open={open || undefined}>
    <summary><FileText aria-hidden="true" /> How to start a loot log in EQL</summary>
    <p>BA uses your character log for both combat and loot. You do not need a separate loot file.</p>
    <ol>
      <li>Enter the game with the character you want to track.</li>
      <li>In the game chat box, type <code>/log on</code> and press Enter.</li>
      <li>Check that your chat filters show your own loot messages. Loot an item and look for its message in chat.</li>
      <li>Return here and press <strong>Auto-detect log</strong>. Choose your character and server. Use <strong>Choose game folder</strong> if no match appears.</li>
      <li>Press <strong>Watch selected log</strong> for new events, or <strong>Load recent trips</strong> for events already recorded.</li>
    </ol>
    <p className="cm-note">Look in your EQL installation’s <strong>Logs</strong> folder for <code>eqlog_Character_Server.txt</code>. BA cannot recover loot from before logging was on. If no new entries appear, check logging and chat filters again. BA only reads your log; it does not change game settings.</p>
    <a href="https://eqlparse.com/en/instalacion" target="_blank" rel="noreferrer">EQL logging setup reference</a>
  </details>;
}
