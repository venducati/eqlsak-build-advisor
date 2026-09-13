# Changelog

## 1.6.3 — 2026-09-13

- Add more space inside and between instruction panels, headings, paragraphs, glossary cells, class-fit reports and combat help.
- Increase text line spacing and separate numbered steps, table rows and colored callouts in the installation and update guide.
- Let teammate class fields stack when their panel is narrow; restore readable field text and padding.
- Document shared layout rules so future contributions preserve readable spacing.

## 1.6.2 — 2026-09-13

- Add **Find loot log** beside the trip report; it starts the existing character-log search and moves keyboard focus to it.
- Explain the current reader, the selected report's source file, and its recorded time span. Clarify when trips become complete and which entries the player supplies.
- Open simple `/log on` and loot-chat setup steps automatically when no character logs are found.
- Add **Load recent trips** for a user-selected log. Read at most its last 4 MB locally and label incomplete coverage. Large saved-log imports use the same bounded snapshot instead of failing at 25 MB.
- Preserve old data when an empty snapshot is selected, show read errors, and block changing the source during live reading.
- Show a trip from the log just loaded, even when saved history contains a newer trip from another file.
- Add regression checks for byte limits, incomplete lines, unchanged source files, desktop/browser agreement, trip completion and the new interface actions.

## 1.6.1 — 2026-09-13

First public source snapshot and Windows community preview.

- Add class-fit reports with bullet reasons, tradeoffs, goals, alternatives, source labels and text downloads.
- Keep report viewing separate from choosing a third class. Explain this build opens the report for entered classes.
- Remove the example-profile action from the standalone app.
- Add a free-use notice and optional donation-link configuration. Hide the donation link until configured.
- Include all entered teammates in optional class source checks.
- Keep live log subscriptions current without restarting them on each render; improve log-control error and cancellation messages.
- Hide ineffective timer save/remove actions in the demo.
- Include the glossary matrix, searchable zones, faction charts, party comparisons, live combat graphs, spell timers, log discovery and loot-trip reports from the local development version.
- Add isolated interface action checks using invented data.

Earlier development occurred privately. This public history starts with the source represented by this release, so that future changes can be reviewed through commits and pull requests.
