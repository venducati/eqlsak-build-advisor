# Version 1.6.1 checks and limits

Checked on Windows on 2026-09-13, using Node.js 24.18.0 and Electron 44.3.0.

## Passed

- Public standalone source: engine/parser/render tests, TypeScript checking, lint, and offline/desktop UI build.
- Desktop suite: 21 checks for log discovery, bounded local file reading, replacement/truncation handling, URL restrictions, redirects, and source extraction.
- Isolated interface scenario: all 14 third-class reports for the Ranger/Rogue pair, report close/save/use, entered-build validation, presets, saved-build controls, rule imports and backups, and source-update preview/apply/rollback.
- The same scenario checks buddy controls, zone browsing including Dagnor's Cauldron, faction character/add/save/remove/import actions, spell timer save/refresh/remove, demo controls, log start/pause/resume/stop, saved-log loading and replay, loot goals, trip exit, missed-drop notes, and exports.
- The narrow report layout was visually reviewed. Tests used a hidden app window, an isolated profile, and invented events. Online requests, file selection, and native log subscription were simulated in these interface tests; the real log reader is tested separately with temporary files.
- The public source and the larger project's desktop build produced identical Advisor JavaScript. The matching installer was built with NSIS.
- Packaged Windows startup: version 1.6.1, six glossary groups / 21 terms, Advisor and log/update bridges loaded successfully.
- The larger companion project's tests, typecheck, lint and production build also passed after the shared UI changes.

## Limits

- The installer is unsigned. A fresh Windows installation and a complete live-game acceptance test have not been performed.
- These checks do not certify every external site's availability, every browser file-picker behavior, or the accuracy of all third-party game data. The linked companion website has its own access and availability requirements.
- Build rankings and trip advice are planning estimates. Rule provenance and differing source opinions remain visible.
- Log data cannot reveal events filtered out of chat or not recorded. Health from game memory, guaranteed effect durations, exhaustive dungeon drops, and automatic AA inspection are not provided.
- The public source begins with a reviewed 1.6.1 snapshot. Private development history and real gameplay captures are not included.

Run the commands in README.md to repeat the available checks. Release assets include SHA-256 checksums; these identify file contents and are not a publisher signature.
