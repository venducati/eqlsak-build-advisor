# Loot and trip reports — version 1.5.0

In **Combat Meter**, open **Norrath loot & trip report**. It records your logged encounters across zones and named instances, including zones outside the Advisor's hunting list.

## Plan, hunt, review

1. Set your classes and party in Build Advisor. Each new trip keeps this setup.
2. Open **Loot goals**. Enter an exact item name, count, and optional zone and enemy. A blank zone means any zone.
3. Choose a live log before entering the dungeon, or load a saved log.
4. The table shows item, corpse, count, time and **Kept at drop**, **Auto-sold**, **Stored in depot**, or **Used in upgrade**. Bars compare these groups. Coin includes corpse/split money plus recorded auto-sales.
5. A recorded zone change opens the prior trip's report. Instance number and tier stay on it, such as `Befallen 4 (Refined)`.
6. If you left after a death, logout, disconnect or another event without a zone message, choose **I left the instance** and give the reason. Log reading continues.
7. Read **Plan your next trip**. Each suggestion gives a reason and a tradeoff. **Save trip report** downloads a JSON copy.

## Gained, missed and unknown

**Gained vs. still wanted** compares recorded kept/stored/made items with your goals. Auto-sold and consumed items are separate. These are trip gains, not current bag contents.

**Not recorded this trip** does not prove that an item dropped or was left behind. The meter does not invent drop chances or roll results.

For a drop you saw but lost, passed or left behind, use **Record a drop you missed**. Notes say **You reported this** and can be removed. They stay separate from log-confirmed loot.

Only your supported loot messages count as gains. Kills count only when credited to your character. A death alone does not prove an exit. If recording ends without one, the summary says the exit was not confirmed.

## Advice and sources

Local suggestions respond to deaths, resists, auto-sold goal items, unfinished goals, party control/healing gaps, incomplete logs and protected factions. They use the party setup saved for that trip. Advice is labeled **heuristic/inference** and does not promise better drops.

Formats were checked against [EQL Atlas message descriptions](https://github.com/blastlaster/eql-log-reader/blob/main/eql_atlas.py). Instance names and log limits are also described by [Sky Ledger](https://www.eqlsource.com/tools/sky-ledger). No third-party parser code or drop database was copied.

## History and limits

Up to 40 recent trips are saved on this device, with 250 distinct loot rows and 100 missed-drop notes per trip. A notice appears if details are limited. Save reports to keep older runs. Trip totals continue independently of the combat display's 20,000-event limit.

The character/server log name identifies each source. Reopening the same file and trip updates its record; renamed copies may appear separately. A log that starts mid-zone uses your selected starting zone, clearly labeled, or says the zone is missing.

History uses `eqlsak-trip-history-v1`; goals use `eqlsak-trip-goals-v1`. Clearing browser data can remove these records. Demo history is separate and is not saved. Exports contain summaries, goals and advice, not raw chat.

## Extend the feature

- `lib/encounter-journal.ts` parses loot, groups trips and compares goals. Add a redacted sample and test for new formats.
- `data/trip-strategy.json` holds ordered advice, triggers, tradeoffs and sources. Wording and order can change without editing the engine. New triggers need code. Rebuild to distribute data edits in the bundled app.
- `components/EncounterJournal.tsx` saves reports and draws the tables and charts.
- `scripts/test-encounter-journal.mjs` checks loot handling, quantities, instances, long runs, missed/unknown distinctions and saved data.

Every recorded zone name is accepted. This is support for trips across Norrath, not a claim to list every possible dungeon drop.
