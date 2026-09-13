# Game overlay

The installed Windows app can keep a small stats panel above EQL while you play. Use **windowed or borderless mode** in the game. Exclusive fullscreen can cover an ordinary desktop overlay.

1. In **Combat Meter**, choose your live character log. In EQL, use `/log on` if needed.
2. Choose **Show game overlay**. Drag its title to a clear spot.
3. Choose **Lock for play**. Mouse clicks now pass through to the game.
4. Keep BA running. You may minimize its main window.

The panel shows damage per second, critical hits and their rate, damage taken, healing per second, DoT damage per second, hits/ticks, total damage, and a graph of damage each second. Values use the Combat Meter's character, pet and selected time window. The graph always covers the last minute.

**Spell watch** shows up to three effects using the Meter's timer rules, with the most urgent first. Times are estimates. A cast or tick alone cannot prove when a spell ends. Current HP is unavailable because these logs do not contain it.

## Change or close the panel

- **Ctrl + Shift + F10** shows or hides an overlay you have already opened.
- **Ctrl + Shift + F11** locks or unlocks it.
- In BA, open **Overlay size, transparency & shortcuts** to change size, opacity or keyboard shortcuts. **Reset overlay position** brings it back into view.
- If another app owns a shortcut, BA reports this. Use the buttons in Combat Meter instead.
- The small settings button on an unlocked overlay returns you to its controls in BA.

The overlay starts hidden each time. Only its position, size, opacity and shortcut preference are saved. Closing BA closes the overlay and releases its shortcuts. Sounds from the main app stay quiet while that window is minimized.

## Read the status before trusting a number

**LIVE LOG** follows new lines. **PAUSED**, **SAVED LOG** and **DEMO** identify other modes. **WAITING FOR METER** means the overlay has not received a recent update; the last numbers are dimmed. Quiet logs can mean no combat, logging is off, or the wrong character file was chosen. BA cannot tell which from silence alone.

## For maintainers

`lib/combat-overlay.ts` projects the existing parser, summary, graph and effect tracker into a bounded display frame. It contains no independent scoring or damage formulas. `desktop/overlay-state.cjs` validates each frame and keeps window bounds on an available display. `desktop/overlay.cjs` owns the separate window, settings and shortcuts; `overlay-preload.cjs` exposes only its display controls. `offline/overlay-entry.tsx` renders the panel.

The overlay has no network access, game-memory access or injected game code. It cannot control gameplay. The main renderer continues log processing while the overlay is visible. Its native visibility bridge preserves the audio mute behavior when background throttling is disabled. See Electron's [window API](https://www.electronjs.org/docs/latest/api/browser-window) and [global shortcuts](https://www.electronjs.org/docs/latest/api/global-shortcut).

Run `npm run test:overlay-maps-ui` on Windows after building. This uses invented data and hidden windows; it does not prove compatibility with every game's display mode.
