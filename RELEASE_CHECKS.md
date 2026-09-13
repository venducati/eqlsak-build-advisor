# Version 1.6.5 checks and limits

Checked on Windows on 2026-09-13, using Node.js 24.18.0 and Electron 44.3.0.

## Passed

- Public standalone source: engine/parser/render tests, TypeScript checking, lint, and offline/desktop UI build.
- Desktop suite: 25 checks for log discovery, bounded local file reading, incomplete lines, replacement/truncation handling, URL restrictions, redirects, and source extraction.
- Browser and desktop recent-log readers agree on a bounded 4 MB snapshot. Tests verify completed loot trips and that quoted player chat is not counted as loot.
- Isolated interface scenario: all 14 third-class reports for the Ranger/Rogue pair, report close/save/use, entered-build validation, presets, saved-build controls, rule imports and backups, and source-update preview/apply/rollback.
- The same scenario checks buddy controls, zone browsing including Dagnor's Cauldron, faction character/add/save/remove/import actions, spell timer save/refresh/remove, demo controls, log start/pause/resume/stop, saved-log loading and replay, loot goals, trip exit, missed-drop notes, and exports.
- New interface checks cover Find loot log, keyboard focus, automatic no-log instructions, selected-file history loading, partial-history labels, preservation on empty/error reads, live-reader guards, and selecting a newly loaded trip over newer saved history. The source panel was visually reviewed at desktop width.
- Tests used a hidden app window, an isolated profile, and invented events. Online requests, file selection, and native log subscription were simulated in these interface tests; the real log reader is tested separately with temporary files. Real gameplay logs are excluded from source and release files.
- The earlier panel spacing, distinct Combat Meter tab and title version are preserved. The sound controls and parchment roster were reviewed at wide, medium and narrow widths; member cards wrap without page overflow.
- Seven audio unit checks cover silent startup, saved-setting bounds, immediate mute, cancellation while audio resumes, completion priority, click-rate limits and unavailable audio. Actual Chromium rendering produces finite short waveforms with headroom and no trailing audio for all five cues.
- The isolated audio/guild interface scenario verifies real pointer clicks, sound on/off, volume persistence, report cues, silent combat ticks, a trip-exit cue, hidden-page silence, and no autoplay on reload. Speaker output is muted during these checks.
- Six guild parser checks cover the observed 15-column EQL layout, named TSV/CSV, quoted and multiline fields, duplicate names, malformed/oversized inputs, UTF-8/UTF-16 and saved-data validation. A rank named Member is not treated as a header.
- Guild interface checks cover import, search, pagination, persistence, removal and safe rendering of HTML-like note text. Source and screenshots use invented guildmates. A local user-selected guild export was also parsed and loaded privately; its contents are excluded from public files.
- Packaged Windows startup verified version 1.6.5 and the matching title badge, glossary, Advisor and log/update bridges. Packaged code and styles match the source. The NSIS installer archive integrity check passed.

## Limits

- The installer is unsigned. A fresh Windows installation and a complete live-game acceptance test have not been performed.
- Audio rendering and controls are checked automatically; perceived loudness and tone still depend on the listener's speakers, headphones and preferences. New installations start with sounds off and volume at 35%.
- Guild data is a saved export, not live online status. Headerless dump fields beyond the identified roster columns retain column-number labels. Other game-client export layouts may need a parser update. Guild imports are capped at 2 MB and 5,000 member rows.
- Live watching starts at the end of the selected log. Load recent trips reads at most the last 4 MB; earlier events and unfinished lines may be missing. A full saved-log import is supported up to 25 MB; larger imports use the recent snapshot.
- These checks do not certify every external site's availability, every browser file-picker behavior, or the accuracy of all third-party game data. The linked companion website has its own access and availability requirements.
- Build rankings and trip advice are planning estimates. Rule provenance and differing source opinions remain visible.
- Log data cannot reveal events filtered out of chat or not recorded. Health from game memory, guaranteed effect durations, exhaustive dungeon drops, and automatic AA inspection are not provided.
- The public source begins with a reviewed 1.6.1 snapshot. Private development history and real gameplay captures are not included.

Run the commands in README.md to repeat the available checks. Release assets include SHA-256 checksums; these identify file contents and are not a publisher signature.
