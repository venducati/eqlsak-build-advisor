# EQLSaK offline Build Advisor

The existing companion now includes **Build Advisor** in its navigation, full-combination search, contextual advice in the character profile/Character Lab, Atlas waypoint context, and Dungeon Dossiers. Existing map, loot, faction, log and command tools are retained.

## Use it

1. Open **Build Advisor**. Enter `Ranger / Rogue / Bard`, `RNG / ROG / BRD`, or `MCE`, then choose **Explain this build**. Two classes are enough to request a third.
2. Set your level, who you play with, and your main goal. Choose how much movement, healing, and enemy control you need. Set how much effort you want to put in. Add your buddy's classes and choose **Apply buddy build**.
3. Read **Why it works**, **What needs care**, the skill ratings, **Buddy fit**, and the ranked choices. Choosing a third class explains that build. It does not change your character profile.
4. **Use profile + buddy** copies the active character and other profile into the advisor. Character context itself uses the actual profile. Dungeon/Atlas advice uses the shared advisor settings and names the combination being assessed.
5. Expand **How the score was worked out** to audit every point. Expand **Class guides & player opinions** for local research summaries and optional source links.
6. Use **Save this build explanation** to save your settings, ranks, sources, and zone scores in a JSON file.

The portable **EQLSaK-Offline-Advisor.html** opens directly in a browser with no server, login, API key or internet. It contains the same advisor UI, engine, and bundled evidence. Zone dossier navigation belongs to the full companion; the portable file includes the local zone assessments. Browser storage availability for local files varies, so export edited rules before moving the file or clearing browser data.

## How scoring works

This is a deterministic rules engine, not a language model. The same inputs and rule pack yield the same results. No model downloads, cloud inference, fetch requests or remote AI services are used by the advisor.

For each possible tertiary class, the engine keeps the primary and secondary fixed:

- Build coverage uses the **maximum** class rating for a capability, not an additive skill-cap estimate.
- Existing coverage is the larger of own coverage and discounted buddy coverage (ignored in Solo).
- Each capability contributes `(max(0, candidateRating - existingCoverage) + retainedStrength * candidateRating) * weight`.
- The role and mobility/healing/control priorities adjust the relevant weights. Solo/duo/group modifies survivability importance.
- Repeated capabilities incur an overlap penalty. Candidate workload beyond pilot tolerance incurs a penalty.
- Matching synergy and companion rules add their stated points.
- Displayed scores are sums of rounded breakdown entries. Ties sort by class ID, independent of locale.

Ratings are relative 0–5 planning judgments, not measured damage, spell potency, actual tanking mitigation or win probability. Class order is preserved; the model does not assume undocumented slot potency multipliers. Current class levels, race/deity unlocks, equipment ownership, rituals, pet setup, AAs and encounter execution are not simulated.

The seeded Ranger/Rogue defaults favor Bard overall, Enchanter for CC, Shaman for sustained named hunting and Druid for travel. These are **heuristic choices**, not universal community consensus. The requested MCE ↔ Ranger/Rogue/Bard and Monk/Cleric/Rogue ↔ Warrior/Cleric/Enchanter pairings are likewise explicit, editable heuristic bonuses.

## Zone scoring and limitations

Zone scoring is separate from class ranking so unrelated loot or travel preferences do not masquerade as class damage.

Six initial zone records reuse the existing companion's recorded ranges: Blackburrow, Castle Mistmoore, Splitpaw Lair, Befallen, Najena and Lower Guk. Range membership adds XP-fit points; being below/above reduces them. Current zone/continent modifies travel cost. Missing party control/healing reduces suitability. Known item matches add loot points. Unknown item matches are labeled unknown, not absent.

Faction constraints are exact, case-insensitive names. A matching recorded `factionEffects` or `accessFactions` entry excludes a zone. Null means unknown; an empty array means explicitly recorded as no conflicts. Initial faction access/effect data is unknown, so the advisor does **not** claim a safe route. Race/deity-specific faction behavior requires additional evidence.

At levels below the configured tertiary unlock level, third-class advice is marked future planning and third-class capabilities are omitted from current-zone scoring. Other ability unlock levels are not simulated. A blank level omits XP scoring and shows unknown fit. A zone absent from the rules explicitly shows missing coverage.

## Local files

- `lib/build-advisor.ts`: pure engine, input/rule validation, deterministic ranking.
- `data/build-advisor.json`: classes, relative ratings, weights, synergy/companion rules, aliases, zones.
- `data/build-evidence.json`: reviewed summaries, class tags, source links, opinion/accepted/excluded status, review dates.
- `components/BuildAdvisor.tsx`: full explanation UI, shared settings, local rule import/export and contextual cards.
- `app/build-advisor.css`: responsive fantasy-themed layout and labeled class/role icons.
- `scripts/test-build-advisor.mjs`: engine regressions and all 560 trio checks.
- `offline/advisor-entry.tsx`, `scripts/build-offline-advisor.mjs`: portable build using the same implementation.

## Extend rules without changing code

**In the app:** expand **Saved rules, sources & backups**, export JSON, edit it, and import it. Imports are validated, replace only the advisor's local rule pack, and immediately recalculate results. Export includes both bundled files as one pack. Files above 1 MB, unknown references, unsupported conditions, invalid numbers and unsafe source URLs are rejected. Restore starting rules to undo an import.

**For the distributed defaults:** edit the two data JSON files and rebuild. No engine change is needed for new facts, numeric weights, class ratings, aliases, rule combinations, evidence, or zone records. Keep the core metric keys. New condition operators require code.

Example synergy rule:

```json
{
  "id": "my-ranger-rogue-healer",
  "when": {
    "baseAll": ["RNG", "ROG"],
    "candidate": "SHM",
    "anyRole": ["named hunting"],
    "modes": ["solo", "duo"],
    "minLevel": 30
  },
  "points": 6,
  "why": "Describe the gap filled and the circumstances that make it valuable.",
  "tradeoff": "Describe the cost or remaining limitation.",
  "provenance": {
    "label": "heuristic/inference",
    "reference": "Your observation/source and date; explain the inferred bonus."
  }
}
```

Supported `when` keys: `baseAll`, `candidate`, `anyRole`, `needAtLeast` (mobility/healing/control), `minLevel`, `maxLevel`, `modes`, `zones`, `continents`. All supplied conditions must match. Omitted conditions are unrestricted. An unknown level never satisfies a level condition. Class requirements use canonical IDs; zone/continent conditions use case-insensitive names. Companion rules match both orientations.

Evidence entries have unique `id`, applicable `classes` (empty = general), `kind`, `status`, `summary`, `limitation`, `reviewedOn`, `provenance`, and HTTPS `links`. Evidence text is explanatory and cannot execute code or add points by itself. A reviewed fact must be deliberately translated into a rating or explicit scoring rule; opinion never silently becomes a verified fact.

## Evidence policy

Research was reviewed on **September 10, 2026**. Broad class capabilities were compared across **EQL Wiki** and **EQLForge**. **EverQuest Guides** supplies model-scope/balance context. Relevant **r/EQLegends** and **r/EQ_Legends** discussions are retained as community opinions, with beta-era and gear/difficulty limitations visible.

- **User-verified EQL**: a recorded direct player observation, including what was tested and when. No new seed class rule is mislabeled user-verified.
- **EQL-sourced**: a specific EQL reference supporting the stated fact. This label does not mean official, independently reproduced, or universally correct.
- **heuristic/inference**: inferred scoring, numeric ratings, seed preferences, and community opinion.

Excluded evidence remains inspectable. For example, the reviewed EQLForge Ranger/Rogue/Enchanter page attributes recovery to Enchanter; the uncorroborated healing claim is excluded. Its external tier is not imported. Classic EQ/THJ ranking tables and unsupported fan-site absolutes do not feed the engine.

Source updates are manual and offline after import. The advisor does not scrape websites or claim its data is always current. The sources panel filters to the selected classes and retains differing community views instead of presenting votes as consensus.

## Class-fit reports (1.6.1)

Every third-class card opens a bulleted report with reasons, tradeoffs, context, alternatives and the complete score breakdown. The report reads the same deterministic engine output as the ranked cards; opening it does not change the build. The player can explicitly use the class or save a text report.

The report is built in lib/build-fit-report.ts and displayed by components/BuildFitReport.tsx. Edit rule wording and weights in data/build-advisor.json, with evidence in data/build-evidence.json. Imported rule files are validated before they replace local rules.

## Optional donations

Set donationUrl in data/project-support.json to the maintainer's actual HTTPS donation-page address and rebuild. An empty or invalid address hides the support link. The free-use notice stays visible. This setting does not collect payments or add a cloud dependency.

## Build and verify

Use Node.js 24 or newer. Run npm ci, npm test, npm run typecheck and npm run lint. The public standalone repository's npm run build compiles the offline HTML and prepares desktop assets. Run npm --prefix desktop ci and npm run package:win there to create an installer. In the larger companion project, use scripts/build-offline-advisor.mjs followed by scripts/prepare-advisor-desktop.mjs, then the desktop packaging command. See README.md and DESKTOP_ADVISOR.md.
