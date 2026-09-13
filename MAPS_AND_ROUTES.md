# Maps & Routes

BA can display standard EverQuest text maps that you choose from your computer. Both downloadable BA editions include this viewer.

1. Open **Maps & Routes**, or choose **Open local map** on a zone recommendation or trip report.
2. Open [Brewall's download page](https://www.eqmaps.info/eq-map-files/) or [Good's map resource](https://www.redguides.com/community/resources/goods-everquest-map-pack.303/). Download and unzip the map pack yourself.
3. Choose the map maker in BA, then **Choose zone map files**. Select one zone's base file and any numbered layers together. For example: `unrest.txt`, `unrest_1.txt`, `unrest_2.txt`, `unrest_3.txt`.
4. Use the layer boxes and landmark search to reduce clutter. Set a height and range to narrow the view to part of a dungeon. Drag to pan, use arrow keys or direction buttons, and choose **Fit map** to reset the view.
5. Choose a landmark in the list to center and mark it. You may also type the three numbers from `/loc` into **Mark a location**. This marker is manual; it does not follow your character.

The planning zone and actual file name are shown separately. BA does not guess that a filename matches a zone or select an old layout for you. When you change zones, check which map is still loaded.

## Get a newer map

Use the creator's download page to find changes. Download the new files, then import them again. A successful import replaces the current view. A failed import leaves the old map in place. The map pages also appear in BA's optional source checks; a page change prompts review and does not install a map or change class scores.

Loaded maps remain available until you close BA or clear the map view. Choose the files again after restarting. BA reads only the files you select and does not write to your game folder. To use a map inside the game, follow the creator's instructions for a separate subfolder within Maps.

## Sources and limits

- [Brewall](https://www.eqmaps.info/) provides detailed zone maps and a world connections reference.
- [Goodurden and contributors](https://www.redguides.com/community/resources/goods-everquest-map-pack.303/) provide layered maps and a label key, shown in BA when you choose Good's Maps.
- These are **community EverQuest references, not verified EQL data**. EQL zone layouts, available expansions, NPCs, loot and portals may differ. No route, faction or combat bonuses are inferred from an imported label.
- The app includes original viewer code, source links and short summaries. It does not redistribute either map pack or world-map artwork. Creator attribution is not a redistribution license.
- Up to four files from one zone, 8 MB combined and 50,000 records total. Text is handled as data, never HTML or script. Unsupported rows are counted. Search results list the first 100 matches; narrow your search to find more.

## For maintainers

Source names, links and Good's short label key live in `data/map-sources.json`. `lib/eq-map.ts` reads standard `L` line and `P` label records with finite bounded coordinates, RGB colors and layer numbers. `components/MapLibrary.tsx` renders them on a local canvas and provides an accessible landmark list. `LocalMapContext` connects zone and trip actions without changing the larger site's existing guide navigation.

Map-file X/Y coordinates are used directly for the drawing. For a game `/loc` tuple (north, west, height), the marker uses X = -west, Y = -north, Z = height. Reference formats were checked against public Good's map records; test fixtures are original invented maps. New formats must add parser and interface tests before release.
