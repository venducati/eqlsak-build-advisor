# EQLSaK Build Advisor

**Free, offline build planning and combat log tools for EverQuest Legends.**

> **No ChatGPT account or subscription needed.** Download BA and run it on your own computer. EQLSaK is an independent fan project, not affiliated with, sponsored by, or endorsed by OpenAI or ChatGPT. The optional companion website uses ChatGPT Sites hosting; hosting does not imply endorsement.

[Download version 1.6.9 for Windows](https://github.com/venducati/eqlsak-build-advisor/releases/tag/v1.6.9) · [Report a problem or suggest an idea](https://github.com/venducati/eqlsak-build-advisor/issues) · [How to contribute](CONTRIBUTING.md)

## Download and start

1. Open the release page above.
2. Under **Assets**, download **EQLSaK-Build-Advisor-1.6.9-Setup.exe**.
3. Run it on 64-bit Windows and follow the setup steps.

This is a **community preview**. The installer is **unsigned**, so Windows may show Unknown Publisher or a SmartScreen warning. It has not been tested on a fresh Windows installation. Read [the installation guide](DESKTOP_ADVISOR.md) and [the checks and limits](RELEASE_CHECKS.md).

For a version that needs no installation, download **EQLSaK-Offline-Advisor.html** from the same release and open it in your browser. Live file access varies by browser; source checks, automatic map-folder detection and automatic log discovery are supported by the Windows app.

## Do I need to sign in?

| Where you use EQLSaK | ChatGPT sign-in needed? |
| --- | --- |
| Installed Windows Build Advisor | **No.** There is no BA account, activation or sign-in step. |
| Downloaded offline HTML | **No.** Open the saved file in your browser. |
| Optional hosted companion and zone guides | **Yes, under the site's current limited-access setting.** Visitors must sign in with an account that has been granted access. |

The hosted companion is separate from the downloadable BA. **Open zone guide** can take you to that website. A ChatGPT sign-in prompt there is for website access, not app activation or a paid BA feature. How often the host asks you to sign in depends on its session rules; BA does not control that.

The host's sign-in screen is managed by OpenAI. The independent project notice on this page does not change that screen or grant website access. For background, see [Sites sharing and sign-in](https://learn.chatgpt.com/docs/sites#control-access-and-secrets).

## What it does

- Enter two or three classes and your goals. Rank third-class options and open a **See why** report with bullets, tradeoffs, sources, and a text download.
- Pick any of the 15 EQL launch races in **Race & trio fit**. The Advisor ranks each race against your trio and goal, explains strengths and tradeoffs, and shows the start region and source label. The editable roster is `data/race-advisor.json`.
- Compare up to four players, each with their own trio. See party strengths and gaps.
- Search zones, check hunt fit, follow links to the companion's zone guides, and track faction points you enter or import.
- Save and share builds as local files.
- Read a combat log locally for damage, critical hits, spell activity, estimated refresh timers, and loot-trip reports.
- Choose when to check information sources or preview a reviewed rule update. Roll back an applied update.
- Turn on original fantasy sounds for clicks, reports and completed trips. Set the volume or turn them off from either tool. Sounds start off and work offline.
- Import a Guild Dump into **My Guild**, an original parchment scroll with member cards, class trios, rank and class filters, search, and class-presence bars. Guild data stays on your device.

The advisor uses **local rules and fixed scoring**, with no AI API, cloud model, or remote inference. Identical inputs and rules give identical recommendations. Sources and player opinions are labeled; planning scores are estimates, not measured damage or guaranteed game outcomes.

All features in this release are free. Donations are optional. No donation page is configured yet, so the app shows no donation button. Maintainers can set an HTTPS address in `data/project-support.json` and rebuild.

## Build from source

Use Node.js 24 or newer and npm. Windows is needed to produce and test the Windows installer with the commands below.

```sh
npm ci
npm --prefix desktop ci
npm test
npm run typecheck
npm run lint
npm run test:desktop
npm run build
npm run test:ui
npm run test:audio-ui
npm run test:overlay-maps-ui
npm run test:map-folder-ui
npm run test:expanded-map-ui
npm run package:win
```

The offline HTML is written to `outputs/`. The installer is written to `desktop/release/`. UI tests use an isolated profile, invented log data, and simulated update/file-picker responses. They do not use a player's game session.

## Loot logs and Trip Complete

Use **Find loot log** beside the trip report to search your character logs. **Load recent trips** reads up to the last 4 MB of a selected file, including large logs. **Watch selected log** follows new lines. If no log appears, BA opens simple in-game setup steps. The report shows its source file and recorded time span. See [TRIP_LOG_GUIDE.md](TRIP_LOG_GUIDE.md).

## Game overlay and local maps

The Windows **Combat Meter → Game overlay** keeps log stats above windowed or borderless EQL. Move it, lock it for click-through play, and adjust size or opacity. See [GAME_OVERLAY.md](GAME_OVERLAY.md).

**Maps & Routes** finds installed map folders in the Windows app. Search the dungeon or zone list to load its base map and layers together. BA remembers the folder and last map. The browser edition lets you choose a whole folder once per session. Brewall and Good’s source links remain available under Map downloads & manual files. Click the map or choose **Expand map** for a full-screen view with embedded controls. Drag to pan, scroll to zoom, and use **Map tools** for layers, landmarks and height filters. Close or Escape returns to the same view. Manual location markers remain available. Zone and trip cards can open this viewer. These map packs are community EverQuest references; EQL compatibility is not verified. See [MAPS_AND_ROUTES.md](MAPS_AND_ROUTES.md).

## Change the rules

For sound controls and the editable local cue definitions, see [Interface sounds](INTERFACE_SOUNDS.md).

Start with [BUILD_ADVISOR.md](BUILD_ADVISOR.md). Class ratings, race profiles, weights, synergy rules, source evidence, zones, faction plans and trip strategies live in `data/`. Preserve the distinction between **User-verified EQL**, **EQL-sourced**, and **heuristic/inference**. A changed webpage is a reason to review a rule; it does not update the score automatically.

## Forks and the audit trail

Fork this repository for your own version. Use a branch for each change and a pull request to propose changes here. Include what changed, why, sources for game claims, and checks performed. Commits, pull requests, tags, release notes and SHA-256 checksums make changes and downloads traceable. See [CONTRIBUTING.md](CONTRIBUTING.md).

The first public commit is a reviewed **1.6.1 starting snapshot** of the standalone product. It does not recreate private development history. Private gameplay notes, real player logs, personal settings, and deployment credentials are excluded. This repository contains the source needed for the downloadable Advisor and Meter; the larger site's map viewer and command center remain in the separate companion project. Zone-guide links require internet access, and the linked site's availability is separate from this offline app.

## License and independence

Original code uses the [MIT License](LICENSE), which permits forks and redistribution, including commercial use. This project's downloads remain free. Keep the license and identify changes in your fork. See [CONTENT_LICENSE.md](CONTENT_LICENSE.md) for artwork and source-data notes.

EQLSaK is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by Daybreak Game Company or EverQuest Legends.

It is also independent of OpenAI and ChatGPT. Using development tools or hosting services from a company does not make EQLSaK an official product of that company.
