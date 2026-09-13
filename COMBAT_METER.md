# Combat Meter — version 1.6.2

Open **Combat Meter** beside Build Advisor. It reads the log you choose. Your data stays on this device. No AI service, account or cloud model is used.

## Start here

1. In EQL, enter `/log on`. Enable the combat and loot messages you want in the game's chat filters.
2. Choose **Auto-detect log**. Check the character and server, then press **Watch selected log**. If your game is in a different folder, use **Choose game folder**. You can still use **Choose live log** to pick a file yourself.
3. To review earlier play, use **Load saved log**, then **Replay last minute**. Pause, move the time slider, or change speed. A saved file is not a live feed.
4. Check the character name filled in from the file name. Add an exact pet name to include its damage in the gauges.
5. **Try demo** uses made-up combat, spells and loot. It does not replace your saved spell rules, goals or history.

Windows checks new log data about twice per second; supported browsers check about once per second. Game log writing and background limits can delay the display.

## Find your character log

The Windows app searches common EQL folders, your last chosen folder, and the folder of your last log. The usual location is:

`C:\Users\Public\Daybreak Game Company\Installed Games\EverQuest Legends\Logs`

Matches show the character, server, folder, size and last update time. **Activity seen** means the file grew during the search. Those files come first; other matches are sorted by their last update time. Check the character before watching. A recent file alone cannot prove who you are playing.

Choose **Watch selected log** to start the gauges, damage spikes, spell watch and loot journal with new log lines. No activity yet? Enter `/log on`, check your game chat filters, and create a combat event. **Load saved log** and **Replay last minute** show older events. Press **Stop** before choosing a different character.

In a browser, you must first allow access to your game or Logs folder. The choice lasts for this page session. Browsers without folder access can use the manual file controls when supported, or the Windows app. A browser cannot search your whole computer.

The search checks file names, sizes and dates. It does not read chat or combat text until you select a log. It checks named folders only; it does not scan every drive or follow folder links. For a custom install, choose the actual game or Logs folder. No log data is sent online.

## Read the graphics

| Display | Meaning |
| --- | --- |
| Gold gauge | Damage per second, compared with the recent 30-second peak. |
| Blue gauge | Hits and damage ticks, including direct spell hits. |
| Pink gauge | Damage events marked Critical in the log. The arc shows their share of all damage events. |
| Purple gauge | DoT damage per second. The arc shows the DoT share of total damage. |
| Combat pulse | Each second of the last minute: gold damage, purple DoT portion, green healing. DoT is already included in gold. |
| Latest hits | Amount, target, ability and critical markers. |
| Lower cards | Direct spell damage, healing rate, damage taken and health availability. |

**Current health stays unknown.** The log does not give current or full HP. Healing uses the first logged amount; it may differ from health restored. The 30-second rate includes quiet time. Full retained rates use the first-to-last combat/healing span, with a one-second minimum. The display keeps the latest 20,000 events.

## Spell refresh cues

**Spell watch** uses green for buffs and healing over time, purple for DoTs, and red for debuffs. Each card names its target.

1. Open **Spell timer settings**, or **Set timer** on a card.
2. Enter the spell name, type and a duration in seconds that you checked in game. Spell level and upgrades may change it.
3. To start automatically, copy the exact landing message without its time stamp. Put `{target}` in place of an enemy or ally name. Without that placeholder, the message tracks **You**.
4. Add an optional fade message. **Save timer rule** keeps your settings on this device.
5. Without a landing message, choose a target and use **Save & start now** when the spell lands. **Start / refresh** starts that estimate again.

Cards show time left, **Refresh soon**, **Check / refresh**, or **Worn off / ended**. Harmful effects on you say **Fading soon**. Worn-off messages empty the bar. Death or zoning asks you to recheck effects.

A cast start does not prove a spell landed. A tick does not reveal its start time, and repeated ticks never restart a countdown. Unknown durations say **Seen · time unknown**. Same-named enemies share an effect row. This release has no complete spell-duration database.

## Loot and trip reports

Below Spell watch, **Norrath loot & trip report** shows drops, coin, goals, missed-drop notes and next-run advice. A recorded zone change closes the prior trip. Otherwise, choose **I left the instance** and state why. See [LOOT_TRIPS.md](LOOT_TRIPS.md).

## Saving and limits

Spell rules use local storage key `eqlsak-spell-timers-v1`. Combat events and manual countdowns last for this session. **Save event list** downloads retained events as JSON. Trip summaries and goals are saved separately, without raw chat.

Saved logs must be 25 MB or smaller. Live reading is incremental. Partial lines and split text characters wait until complete. Detected file replacement or shortening starts a fresh recording. If a file is shortened and rewritten past its old size between checks, reselect it to be sure. The app has no game overlay.

## Maintenance

`lib/combat-meter.ts` holds the parser; `lib/combat-visuals.ts` holds graph buckets and effect tracking. `components/CombatDashboard.tsx` draws gauges and spell cards. `data/combat-messages.json` holds message labels, limits and sources. `desktop/log-tail.cjs` reads the local log. `desktop/log-discovery.cjs` finds Windows logs; `lib/log-discovery.ts` searches a browser-approved folder; `components/LogFinder.tsx` shows matches. The desktop app saves the last folder and log path in `log-discovery.json` in its app data folder. Add more known install paths in `commonLogFolders`, and test with sample files before release.

Critical tags, archery and incoming DoT formats were checked against the [EQL community combat tracker](https://github.com/blastlaster/eql-log-reader/blob/main/eql_combat_tracker.py). Setup guidance is linked from [EQL Meter](https://eqlmeter.com/docs.html). These are community references, not proof that every client emits every pattern. The implementation is original. EQLSaK is not affiliated with EQL Meter.

Add a redacted sample and a test for each new format. Keep ambiguous messages unknown. Run the combat, visual, encounter and desktop log-reader tests. Real in-game checks are still needed before claiming complete client compatibility.

## Find loot logs and read earlier trips (1.6.2)

The trip report now has **Find loot log**, a data-source panel, and simple logging instructions. Use **Load recent trips** after selecting a found log to read up to its last 4 MB. Large saved imports use the same partial snapshot. This keeps your actual log unchanged. See [TRIP_LOG_GUIDE.md](TRIP_LOG_GUIDE.md).
