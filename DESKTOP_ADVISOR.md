# EQLSaK Build Advisor — Installation and update guide

Version 1.6.7

Install the app, check for new information, and update your build rules when you choose.

> **✓ Use the advisor without the internet**
>
> The setup file includes what you need to run the app. Build advice and the background art work offline. **You do not need an AI service or a cloud account.**

## 01 · Install the app

1. **Use a Windows computer.** The app needs 64-bit Windows.
2. **Open the setup file.** `EQLSaK-Build-Advisor-1.6.7-Setup.exe`
3. **Follow the steps on the screen.** Choose where to install the app. Then open EQLSaK Build Advisor from the Start menu or desktop.

> **! Windows may show “Unknown Publisher”**
>
> This version has no digital signature. That means Windows cannot confirm who made the file. **Use a setup file from a source you trust.**

This Windows app includes Build Advisor, Combat Meter, the game overlay, local Maps & Routes, zone faction tracking, trip reports and My Guild. The larger EQLSaK website keeps its world maps and command center.

## Keep stats above EQL

In **Combat Meter**, choose a live log and select **Show game overlay**. Use EQL in windowed or borderless mode. Drag the title to move the panel, then choose **Lock for play** to let clicks pass through. Keep BA running; you can minimize its main window.

**Ctrl + Shift + F10** shows or hides the opened panel. **Ctrl + Shift + F11** locks or unlocks it. BA also has buttons for these actions and options for size and opacity. The overlay starts hidden each time. Current HP is unavailable from the log; spell timers are estimates. See [Game overlay](GAME_OVERLAY.md).

## Read local maps

Open **Maps & Routes**. BA finds installed map folders. Search **Dungeon or zone** and choose a name; the base map and layers open together. BA remembers your folder and last map. If your folder is not found, choose it once. Use **Folder options → Refresh map list** after updating a pack. Search landmarks, switch layers, filter by height, or mark a typed /loc. These EverQuest maps are not verified for EQL. See [Maps & Routes](MAPS_AND_ROUTES.md).

## Sounds & volume

1. **Turn sounds on.** Choose **Sound Off** at the top of the app. It changes to **Sound On**.
2. **Pick a comfortable level.** Open **Sound settings**, move **Sound volume**, then try the button, report or trip sound.
3. **Go quiet at any time.** Choose **Sound On** to turn sounds off right away. Text and charts still show all results.

Sounds start off. Your choice is saved on this device. When you reopen the app, your first click starts sound. Short fantasy taps and chimes mark clicks, completed reports and trips. There is no background music or sound for each combat hit. The sounds work offline.

## My Guild: your parchment roster

Open **My Guild** at the top. In EQL, open the **Guild** window and choose **Dump** with the full member list showing. Back in BA, choose **Import guild dump** and select the text file from your game folder.

The scroll shows members, levels, class trios, rank titles, last-seen dates and locations from that file. Search by name, filter by class or rank, and open **More exported details** for extra fields. Use **Class presence** to see how many members have each class. It counts roster entries, not combat strength.

This is a saved snapshot, not live online status. Import a fresh dump to update it. The roster stays on your device. **Remove saved roster** clears BA's copy without changing your game file.

## Free downloads and optional support

Download the Windows setup file and matching source from [GitHub Releases](https://github.com/venducati/eqlsak-build-advisor/releases/tag/v1.6.7). All features are free. A donation is never required. No donation page is set up yet, so there is no donation button.

## See why a class fits

Select **See why [class] fits** to open a report. Read the bullet points under **Why it helps**, **Tradeoffs & weak spots**, **Your goals & setting**, and **Other choices**. Open **All score reasons & sources** for the full breakdown.

Opening the report keeps your chosen classes. To choose that class, press **Use [class] as my third class**. Press **Save report (.txt)** to keep a copy, or **Close report** to return. You can also press Escape to close it. The **Explain this build** button opens a report for the classes you enter.

## Build planning & zone search

Choose **Build & compare** to see what each class adds. The table uses planning ratings from 0 to 5. It does not show exact spell levels or real damage. Open **Save, compare & share builds** to keep up to four builds. You can download a build file and load it on another computer.

1. **Find a zone.** In **Where & what you hunt**, type part of a zone name. Try Dagnor’s or Cauldron. Use the arrow to browse all 127 locations.
2. **Choose a match.** The zone and its continent fill in. Names marked out of era are for planning only. A listed name does not mean the app has hunting advice for that zone.

## Faction points & goals

1. **Open your zone’s factions.** Choose a current zone, then select **Zone factions**.
2. **Add your standing.** In EQL, enter `/outputfile faction`. Import the `Character_Server-Factions.txt` file from your game folder. The usual file name selects that character and server. You can also enter points by hand.
3. **Set your goal.** The blue dot shows your current points. The gold marker shows your goal. The starting goal is +1, the first positive point.
4. **Check the plan.** Open **Ways to raise this faction**. Read both Helps and Hurts. Put factions you want to keep in **Factions to protect or avoid**.
5. **Refresh after a hunt.** Create and import a new faction export. The chart is a saved snapshot; it does not read live game memory.

> **! Positive points do not promise friendly NPCs**
>
> A goal of +1 does not mean Amiable. Check the NPC in game. Some factions have no reviewed route yet. Estimates use listed gains; try one kill or turn-in before repeating.

Faction links cover a reviewed starting set. For other zones, add a faction from the list. Importing your export adds more faction names. An instance note lets you keep local links for a camp or instance. Base-zone links do not prove that an instance works the same way.

> **✓ Sharper background artwork**
>
> The app includes a clean 3840 × 2160 backdrop. It is a lossless 4K-sized export made from a smaller refined image, not native 4K artwork. It works offline.

## 02 · Check for new source information

A **source** is a website the advisor uses for class and build information. These include EQL Wiki, EQLForge, EverQuest Guides, and community sites. The app checks sources linked to your chosen classes and buddy build.

> **① You choose when to go online**
>
> **Online checks are off at first.** Turning them on does not start checks on its own. You must press a button each time. Build advice still runs on your computer.

1. **Open the Updates section.** Find **Updates — optional online information**.
2. **Allow a check.** Select **Allow online checks when I request them**.
3. **Start the check.** Choose **Check original sources now**. You need an internet connection for this step.

| Result | What it means |
| --- | --- |
| Baseline saved | The app saved its first copy of the page text. It will compare later checks with this copy. |
| Changed | The page text has changed. Read the source to see what is new. The app may also show a short part of the text. |
| Unchanged | The page text has not changed since the last successful check. |
| Unavailable | The app could not read the page. The site may block these checks. Your saved information and rules stay in place. |

> **! A changed page does not change your build advice**
>
> A page can change even when the game rules stay the same. **The app does not turn new page text into new build rules.** A check date only tells you when the app read the page. It does not prove the advice is current.

Player opinions can help, but they are not proof. Check the EQL facts before changing a rule. If sources disagree, look into why. Advice for the original EverQuest may not apply to EverQuest Legends.

## 03 · Update the build rules

The advisor uses saved **rules** to score builds and explain its choices. A rule update is a file with new rules that someone has reviewed.

> **! There is no built-in rule download address yet**
>
> Someone who maintains the advisor must review an update, put it online, and give you its web address. **Use an update from a source you trust.**

1. **Enter the update address.** In the Updates section, find the area called Update the build rules. Enter the address you were given. It must begin with `https://`.
2. **Read what will change.** Choose **Download & preview rules**. Read the update notes. Check which rules changed and how they affect the top choice for your build.
3. **Apply the update if you want it.** Choose **Apply this update**. Just downloading or viewing the file does not replace your rules.

> **↶ Go back if you need to**
>
> Choose **Roll back last rule update** to restore the rules you used before the last update. You can also export your rules. This saves a backup file you can keep or move to another computer.

The optional **SHA-256** field checks whether a downloaded file matches a code you were given. This code is called a checksum. Get it separately from a trusted source. A match checks the file; it does not prove who made it.

> **① Updating the rules is different from updating the app**
>
> A rule update changes the data used for build advice. To update the Windows app itself, install a newer setup file when one is available.

## 04 · Use Combat Meter

1. **Turn on the game log.** In EQL, enter `/log on`. The game will save combat messages in a log file.
2. **Open Combat Meter.** Choose the **Combat Meter** tab in the app.
3. **Find your character log.** Press **Auto-detect log**. Check the character and server, then press **Watch selected log**. Use **Choose game folder** for a custom install. New messages drive the live graphs. To see old events, use **Load saved log**, then **Replay last minute**.
4. **Set spell refresh cues.** In Spell timer settings, save a checked duration and a landing message, or start a timer by hand.
5. **Review loot and trips.** In Loot goals, add the exact items you want. A zone exit opens the trip report. If you leave without a zone message, choose I left the instance.

> **! The meter can only show what the log records**
>
> It cannot show exact current health. Spell countdowns use your saved durations; unknown times stay unknown. An item missing from the log is not proof it dropped. See COMBAT_METER.md and LOOT_TRIPS.md.

> **① Browser users choose a folder first**
>
> The Windows app searches common EQL folders and remembers your last location. A browser needs you to choose a game or Logs folder. Newer files are suggestions; check the character before watching. Press Stop before changing characters.

## 05 · Know where your data stays

Your source-check history is saved in the app’s data folder on your computer. The app saves your settings, current rules, and last set of rules in its local browser storage. This is storage on your computer, not an online account.

**Removing the app does not erase this saved data.** The app uses the internet only when you ask it to check sources, download an update, or open a source link.

## Extra help · For people who edit rules or build the app

You can skip this section if you only want to use the app.

### Edit the rule files

The main files are `data/build-advisor.json` and `data/build-evidence.json`. They store rules and the evidence behind them. `BUILD_ADVISOR.md` explains the scores and the labels that show where each rule came from.

When you change a rule, update its source links, reasons, and tradeoffs too. Test the rule before you share it.

The Windows app has a set list of sites it can check. Adding a new site to this list requires a new app build. Importing rules does not add sites to the list.

### Share a rule update

Start with `desktop/example-rule-update.json`. It is a sample file with the current rules. It is not a new strategy update.

```text
{
  "format": "eqlsak-rule-update",
  "schemaVersion": 1,
  "release": "your-reviewed-release",
  "publishedAt": "2026-09-10",
  "notes": "Explain the evidence and rule changes here.",
  "rules": { "...": "Replace this with the full rule pack" }
}
```

The short `rules` entry above is only a placeholder. Replace it with the full rules from the sample file or an advisor export.

1. **Check the whole rule file.** Load it in the advisor and run the project tests. Fix any errors.
2. **Put the file on a site you control.** Share its address, starting with `https://`. The download must be no larger than 1 MB. The app rejects files that do not match the required format.
3. **Share a checksum if you want to.** Send the SHA-256 code through a separate trusted source so users can check the file.

This update tool downloads rule data. It does not download or run new app code.

### Build a new Windows app

Use Windows 64-bit and Node.js 24. You need the internet to download the software used to build the app. Open a terminal in the main project folder. Install the saved package versions, then run these commands:

```text
npm ci
node scripts/test-build-advisor.mjs
npm run typecheck
node scripts/build-offline-advisor.mjs
node scripts/prepare-advisor-desktop.mjs
```

Next, open the `desktop` folder in your terminal and run `npm ci`. If install scripts were turned off, also run `node node_modules/electron/install.js`. Then run:

```text
powershell -File build-icon.ps1
node --test test/*.test.cjs
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never
```

The setup file will be in `desktop/release`. To sign a release, use your own Windows code-signing certificate. This lets Windows check who signed the file.

### What has been checked

See RELEASE_CHECKS.md in the public repository for the checks performed for version 1.6.7.

The app has not yet been tested on a fresh Windows computer. The meter still needs tests during real EQL play. Source checks and file-picking are simulated in the automated interface tests.

## Party charts and zone maps

Choose Your party to compare up to four trios. Each zone card shows class icons, strengths, gaps, and healing/control targets. Open zone guide opens the matching EQLSaK map and details in your browser. The website needs internet access and permission to view it.

## Loot logs and Trip Complete

Press **Find loot log** beside the trip report, select your character, and use **Load recent trips** for earlier events or **Watch selected log** for new events. If no log appears, the app opens simple `/log on` instructions. Recent snapshots read at most 4 MB and are marked partial when needed. Saved imports above 25 MB now load recent history instead of failing. See [TRIP_LOG_GUIDE.md](TRIP_LOG_GUIDE.md).
