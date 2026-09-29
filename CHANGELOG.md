# Changelog

## 1.6.9 — 2026-09-29

- Add Race & trio fit: a local, explainable comparison for all 15 EQL launch races.
- Show race strengths, tradeoffs, start region, icons, and source labels alongside any selected trio.
- Store the editable race roster separately in `data/race-advisor.json`; race advice makes no network or AI calls.

## 1.6.8 — 2026-09-13

- Click a loaded map or use Expand map to open a full-screen view with zoom, direction, Fit map and Close controls inside the map.
- Add pointer-centered wheel zoom, click/drag separation, keyboard controls and a collapsible tools panel for layers, labels, landmarks and height filters.
- Preserve the map position, zoom, filters and marker across expansion and closing. Support Escape, focus return, background scroll locking, native fullscreen exit and a window-filling fallback.
- Redraw the map at the current display size. Keep fullscreen permission limited to the trusted local main app document; other permissions stay denied.


## 1.6.7 — 2026-09-13

- Find installed EQL map folders automatically in the Windows app, preferring Brewall. Remember the folder and last successfully opened map.
- Add a searchable dungeon/zone list built from local files; load base and numbered layers together. Support friendly names and common aliases, with filenames for unknown locations.
- Open exact matching local maps from zone cards. Keep manual browsing available and show mismatched planning zones clearly.
- Let browser users choose a whole folder once per session. Collapse setup and individual-file tools. Add a refresh action for changed map packs.
- Keep map reads local and bounded. Preserve existing tools and distribute no third-party map pack.


## 1.6.6 — 2026-09-13

- Add a Windows game overlay with local log stats, critical-hit rate, damage taken, healing, damage graph and up to three estimated spell timers. Keep updates running while BA is minimized; label demo, saved, paused and stale data.
- Add drag placement, click-through locking, three sizes, opacity, optional show/hide and lock shortcuts, saved display preferences and monitor recovery. Keep the overlay hidden at startup and release it when BA closes.
- Add Maps & Routes with credited Brewall and Good’s source pages, local EQ text-map import, base/numbered layers, landmark search, height filters, pan/zoom, an accessible label list and manual /loc markers.
- Add Open local map actions to zone and trip cards. Include map pages in optional source checks. Imported map details are labeled as community EverQuest references with unverified EQL compatibility; no map pack is redistributed or used to change build scores.
- Update the color-coded installation guide and add focused overlay/map guides. Preserve sounds, guild, advisor, combat, faction and trip tools.


## 1.6.5 — 2026-09-13

- Add original offline fantasy sounds for buttons, navigation, report completion and finished trips. Include saved Sound On/Off and volume controls with previews. Start silent and stop active or pending sound immediately when muted.
- Add restrained fantasy button finishes while keeping readable spacing, focus outlines and the distinct Combat Meter tab.
- Add **My Guild**, an original parchment roster with local Guild Dump import, class icons, member search, class/rank filters, level sorting, class-presence bars, pagination and expandable exported details.
- Support the observed 15-column EQL guild dump and tables with named columns, including UTF-8 and UTF-16 files. Keep imports local, label their source and date, preserve the old roster on failed imports, and allow clearing BA's saved copy.
- Include no private guild roster or game recordings in public downloads.

## 1.6.4 — 2026-09-13

- Make the Combat Meter tab stand out with a teal background, bright border, larger waveform icon and clear selected state.
- Show the app version beside the Build Advisor title in both downloadable editions. Read it from the app package version and verify it during packaged startup checks.

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
