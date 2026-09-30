# Spell & Hotbar Planner

Open **Build Advisor → Spell & hotbars** after choosing your classes and level.

The planner has three parts:

1. **Suggested live spell bar** orders the spells most useful for your goal. It reserves space for more than damage: a control plan can keep a heal or cure, while a travel plan can include movement tools.
2. **Preparation, travel & buff set** holds long-duration buffs, pets, travel spells and other actions that can crowd a combat bar.
3. **Suggested actions / melee hotbar** orders practical class actions, such as Backstab, Taunt, Feign Death or Lay on Hands, when the selected trio has them in the local starter list.

Choose the number of spell-bar and action-bar slots to match your own interface. Search the full catalog by spell name, class or type. **Available to this trio** limits the list to the classes and level you entered.

## How recommendations work

The planner is local and deterministic. It reads the selected primary, secondary and tertiary classes, level, role, solo/duo/group setting, and mobility, healing and control priorities. It then:

1. Keeps only spells available to at least one selected class at the chosen level.
2. Sorts spell types for the chosen goal. A DPS plan favors direct damage, damage over time and debuffs. A healer plan favors healing, cures and buffs. A control plan reserves a recovery slot before filling the remaining slots.
3. Chooses one practical spell from each high-priority type, then fills remaining slots with the best matches.
4. Places travel, long buffs, pet spells and utilities in a separate preparation set where possible.
5. Orders the local melee/action starter list by its role and the chosen goal.

The order is **heuristic/inference**. It does not know which spells you have scribed, your AA choices, focus effects, gear, spell-gem count, key bindings or the latest balance patch. Check the in-game Spell Book and Abilities window before changing a saved setup.

## Spell catalog and sources

`data/eql-spell-catalog.json` is a local snapshot containing the factual table fields for 500 spells: name, class availability, level, mana, range, cast/recast time, duration, target, type and resist. It intentionally excludes copied spell descriptions.

The catalog is labeled **EQL-sourced** and links to the public [TJK Gaming EQL Spell Lookup](https://tjk-gaming.com/eq-legends/spells), which attributes its spell data to the [EverQuest Legends Wiki spell category](https://eqlwiki.com/Category:Spells). The in-app catalog works without a network connection.

To refresh the snapshot as a maintainer, review the source and run:

```sh
node scripts/update-eql-spell-catalog.mjs
```

The importer rejects a table with fewer than 400 records, then rewrites the catalog with factual fields only. Review the resulting change, source date and licensing before releasing it. `data/eql-hotbar-abilities.json` holds the editable starter action list. Its suggested action positions are labeled **heuristic/inference**.
