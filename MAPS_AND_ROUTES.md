# Maps & Routes

BA can display standard EverQuest text maps from your computer. The Windows app finds installed map folders and remembers your last map. The browser edition lets you choose a whole folder once per session.

1. Open **Maps & Routes**, or choose **Open local map** on a zone recommendation or trip report.
2. The Windows app finds installed EQL Maps folders and map packs such as Brewall. If none are found, choose your game, Maps or map-pack folder once. In the browser edition, choose the whole folder once per session.
3. Search **Dungeon or zone**, or open its drop-down list. Choose a name to open the base file and all available numbered layers together. If several packs are found, use **Map folder** to choose one.
4. Use the layer boxes and landmark search to reduce clutter. Set a height and range to narrow the view to part of a dungeon. Drag to pan, use arrow keys or direction buttons, and choose **Fit map** to reset the view.
5. Choose a landmark in the list to center and mark it. You may also type the three numbers from `/loc` into **Mark a location**. This marker is manual; it does not follow your character.

The planning zone and actual file name are shown separately. Zone and trip cards open exact matching maps using known names and aliases, including Dagnor's Cauldron, Unrest, Upper/Lower Guk and Splitpaw. Unknown files still appear by filename. Missing or ambiguous matches require a choice; BA does not guess between layouts.

## Get a newer map

Open **Map downloads & manual files** for [Brewall](https://www.eqmaps.info/eq-map-files/) and [Good's Maps](https://www.redguides.com/community/resources/goods-everquest-map-pack.303/). Download and unzip the pack yourself, following its creator's guide. After updating the files, choose **Folder options → Refresh map list**. BA reads the current files and notices new layers. A failed read leaves the previous map on screen with an error message. Individual-file import is still available in the collapsed manual section. The map pages also appear in optional source checks; a page change does not install maps or change class scores.

The Windows app remembers your folder and last successfully opened map. Browser security requires choosing the folder again after restarting. BA does not change game files, upload map contents or download packs automatically. To use maps inside the game, follow the creator's guide for a separate subfolder within Maps.

## Sources and limits

- [Brewall](https://www.eqmaps.info/) provides detailed zone maps and a world connections reference.
- [Goodurden and contributors](https://www.redguides.com/community/resources/goods-everquest-map-pack.303/) provide layered maps and a label key, shown in BA when you choose Good's Maps.
- These are **community EverQuest references, not verified EQL data**. EQL zone layouts, available expansions, NPCs, loot and portals may differ. No route, faction or combat bonuses are inferred from an imported label.
- The app includes original viewer code, source links and short summaries. It does not redistribute either map pack or world-map artwork. Creator attribution is not a redistribution license.
- Up to four files from one zone, 8 MB combined and 50,000 records total. Text is handled as data, never HTML or script. Unsupported rows are counted. Search results list the first 100 matches; narrow your search to find more.
- Known display names use factual pairs from the [EQEmu zone table](https://docs.eqemu.dev/server/zones/zone-list/). A location appears only when its files exist locally; a name does not verify that EQL offers the zone.
- Folder discovery is shallow and bounded: named locations and immediate subfolders, up to 32 map folders and 20,000 directory entries per folder. It does not crawl drives. Network paths and file/folder shortcuts are not supported. Only the selected zone's contents are read.

## For maintainers

Source names, links and Good's short label key live in `data/map-sources.json`. `lib/eq-map.ts` reads standard `L` line and `P` label records with finite bounded coordinates, RGB colors and layer numbers. `components/MapLibrary.tsx` renders them on a local canvas and provides an accessible landmark list. `LocalMapContext` connects zone and trip actions without changing the larger site's existing guide navigation.

`desktop/map-library.cjs` discovers map folders, returns opaque selection IDs, bounds reads and saves choices in the app's user-data directory. Trusted main-window handlers expose it through the isolated preload; the overlay has no map-file bridge. `lib/map-library.ts` groups browser directory selections lazily. `components/MapFolderPicker.tsx` handles searches and remembers only successful imports. Edit `data/map-zone-names.json` to add names/aliases, then rebuild. Preserve exact matching and never infer mechanics from filenames.

Run `npm run test:map-folder-ui` after building to verify discovery, saved choices, search, updates, browser folder access and responsive layouts. Fixtures contain invented maps only.

Map-file X/Y coordinates are used directly for the drawing. For a game `/loc` tuple (north, west, height), the marker uses X = -west, Y = -north, Z = height. Reference formats were checked against public Good's map records; test fixtures are original invented maps. New formats must add parser and interface tests before release.
