# Interface sounds

## Choose what you hear

Use **Sound Off** at the top of the app to turn sounds on. Use **Sound On** to turn them off right away. Open **Sound settings** to set the volume and try the button, report and trip sounds.

Sounds start off, with the volume set to 35%. The app saves your choice on this device. If that choice cannot be saved, it tells you. Your first click starts sound after you reopen the app. At 0% volume, sounds stay silent even when the toggle says On.

The sounds are short, original fantasy cues:

| Action | Sound |
| --- | --- |
| Press a button, change a list choice or tick a box | Soft wooden tap |
| Switch tools, open instructions or follow a link | Runestone chime |
| Open a class-fit report, finish loading a saved log, find logs or finish a successful source check/update preview | Scholar's harp |
| A watched log records a trip ending, or you choose **I left the instance** | Treasure chime |
| An entered build needs fixing, a search finds no log, or a source check has a problem | Gentle reminder |

All results stay visible as text and charts. There is no background music, hover sound, typing sound or sound for each combat hit. Loading old trips gives one report cue. Restoring saved history does not play old trip sounds. Hidden pages stay quiet and do not queue sounds for later.

## How it works

Audio is generated on the device with the browser's Web Audio API, also included in the Windows app. It uses no downloaded audio, game recordings, AI API, microphone, telemetry or new network access. The app's existing security policy stays in place.

- `data/interface-sounds.json` contains the original notes, wave types, pitches, timings and gains. Edit it and rebuild to change the cues.
- `lib/advisor-audio.ts` handles the shared audio context, smooth note envelopes, volume, immediate mute, completion priority and repeated-click limits. Creating audio requires a user action. Pending playback is cancelled when muted or hidden.
- `components/AdvisorSoundControls.tsx` provides the saved controls and one shared click listener, including keyboard-activated buttons. It skips disabled controls, generated downloads, and programmatic clicks. `data-sound="navigate"` gives a group the navigation cue; `data-sound="off"` skips automatic click sounds.
- Feature code calls `playAdvisorSound('report' | 'trip' | 'notice')` after the relevant result exists. Do not infer success from button text or play completion cues when a request merely starts.
- `app/advisor-sounds.css` adds the original fantasy button finish and readable sound controls. Keep the existing focus states, labels, spacing and distinct Combat Meter tab.

Keep cues under 0.8 seconds, with no more than six notes and conservative combined gain. Notes are sorted by ending time for safe cleanup. Only one cue bus plays at a time; a completion can replace its click, and a following click cannot cut off the completion. Repeated completion cues are limited to one of each kind per 800 milliseconds. Audio failures cannot block an Advisor action.

Run `npm test` for mute, startup, suspended-audio, repeated-click and cue-definition checks. After `npm run build`, run `npm run test:audio-ui` for actual Chromium audio rendering, interface controls, report/trip events and screenshots. This uses a separate profile, invented logs and muted speaker output. Listening on a user's own speakers or headphones is still the final check for personal comfort.
