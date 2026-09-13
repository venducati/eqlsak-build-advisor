import AdvisorIcon from './AdvisorIcon';

const wordGroups = [
  {
    title: 'Your classes & choices',
    words: [
      { term: 'Primary, secondary, tertiary', icon: 'settings', meaning: 'Your first, second, and third classes.' },
      { term: 'MCE', icon: 'buddy', meaning: 'Monk / Cleric / Enchanter.' },
      { term: 'Tradeoff', icon: 'faction', meaning: 'A benefit you gain and a weakness you still need to handle.' },
    ],
  },
  {
    title: 'Combat basics',
    words: [
      { term: 'DPS', icon: 'dps', meaning: 'Damage per second.' },
      { term: 'Tank', icon: 'tank', meaning: 'A character who takes enemy hits for the group.' },
      { term: 'Melee', icon: 'dps', meaning: 'Fighting up close.' },
    ],
  },
  {
    title: 'Hunting & handling enemies',
    words: [
      { term: 'Crowd control (CC)', icon: 'control', meaning: 'Keeping extra enemies from joining the fight.' },
      { term: 'Pulling', icon: 'pulling', meaning: 'Bringing enemies to a chosen spot.' },
      { term: 'Named hunting', icon: 'target', meaning: 'Hunting enemies with their own names.' },
    ],
  },
  {
    title: 'Spells & attack speed',
    words: [
      { term: 'Buff', icon: 'why', meaning: 'A helpful spell.' },
      { term: 'Debuff', icon: 'warning', meaning: 'A spell that weakens an enemy.' },
      { term: 'Haste', icon: 'dps', meaning: 'Faster attacks.' },
      { term: 'Slow', icon: 'dps', meaning: 'Slower attacks.' },
      { term: 'DoT', icon: 'WIZ', meaning: 'Damage over time.' },
    ],
  },
  {
    title: 'Movement & enemy control',
    words: [
      { term: 'Snare', icon: 'mobility', meaning: 'Slows movement.' },
      { term: 'Root', icon: 'DRU', meaning: 'Stops movement.' },
      { term: 'Mez', icon: 'control', meaning: 'Holds an enemy out of the fight.' },
      { term: 'Charm', icon: 'ENC', meaning: 'Puts an enemy under your control for a time.' },
    ],
  },
  {
    title: 'Faction & character progress',
    words: [
      { term: 'Faction', icon: 'faction', meaning: 'A group in the game and how it views your character.' },
      { term: 'XP', icon: 'why', meaning: 'Experience points.' },
      { term: 'AA', icon: 'book', meaning: 'Alternate Advancement skills.' },
    ],
  },
];

export default function GameWordsExplained() {
  return (
    <details className="ba-rules ba-glossary">
      <summary><AdvisorIcon code="book" /> Game words explained</summary>
      <div className="ba-glossary-matrix">
        {wordGroups.map((group) => (
          <section className="ba-glossary-group" key={group.title}>
            <h3>{group.title}</h3>
            <dl>
              {group.words.map(({ term, icon, meaning }) => (
                <div className="ba-glossary-word" key={term}>
                  <dt><AdvisorIcon code={icon} /> {term}</dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </details>
  );
}
