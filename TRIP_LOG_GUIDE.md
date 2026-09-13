# Where Trip Complete gets its data

BA reads the character log you choose. Loot and combat are recorded in the same file, usually named `eqlog_Character_Server.txt` in your EQL installation's `Logs` folder. BA does not need a separate loot log.

## When the report fills in

1. **Watch selected log** starts with new lines written after you connect. BA reads those lines locally and adds supported loot, combat, and zone events to your trip.
2. **Load recent trips** reads up to the last 4 MB already in the selected file. This is useful for large logs. The report marks partial history, and the first trip may be incomplete.
3. **Load saved log** reads the whole file up to 25 MB. Larger files now load the recent 4 MB instead, with the same partial-history notice.
4. A zone-change message completes the previous trip and starts another. If you leave without a recorded zone change, use **I left the instance**. This records your report of leaving; it does not guess why you left.
5. Saved trips stay on this device. The source panel shows the current reader separately from the file behind the selected report, plus its recorded time span.

Goals and missed-drop notes are entries you add. They are separate from loot read from the log. Trip advice uses the trip data, your goals, and saved party rules. A goal that was not met does not prove that the item dropped.

## Find your loot data

In **Norrath loot & trip report**, press **Find loot log**. BA moves to the log finder and starts a search. Check the character and server, then choose:

- **Watch selected log** for new events.
- **Load recent trips** for events already recorded.

Stop an active live reader before changing files. Automatic discovery checks file names and dates; it reads a file's contents only after you choose to watch or load it. The browser version needs permission to access a folder you choose. All log reading stays local.

## If no log appears

1. Enter EQL with the character you want to track.
2. Type `/log on` in the game chat box and press Enter.
3. Check that your chat filters show your own loot messages. Loot an item and look for its message in chat.
4. Return to BA and press **Auto-detect log**. If needed, use **Choose game folder** and select your EQL installation or its `Logs` folder.
5. Choose the matching character log, then watch new events or load recent trips.

BA cannot recover loot from before logging was turned on. Some game messages may not match the current parser; the report notes unrecognized own-loot lines. **Try demo** uses made-up events and is labeled separately.

The EQL-specific [EQL Parse setup guide](https://eqlparse.com/en/instalacion) documents `/log on`. The [EQL Wiki log page](https://eqlwiki.com/Logfiles) also lists it but carries a legacy-content warning; its older installation paths are not used as proof of a current EQL install location.
