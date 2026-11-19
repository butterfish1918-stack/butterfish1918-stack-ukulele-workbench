# Device checks in v1.4.0

**Automated verification achieved:** real HTTP transport for local shell assets and Node-simulated service-worker install, activate, fetch and offline fallback. **Not yet achieved:** browser-controlled service-worker offline reload, actual persistence over browser restart, online VexFlow rendering, or acoustic tuner calibration. Device-readiness 'Offline shell cached' verifies only that five required URLs are in CacheStorage.

**Important:** The service worker now removes only obsolete `uke-workbench-*` caches. It must never remove the cache of a separate guitar or utility app on a shared host. This is covered by an automated regression test. The manifest now provides proper 192- and 512-pixel PNG icons.

**To perform missing acceptance tests:** Run `npm start` (Node 20+, no Python required) and open `http://127.0.0.1:4173/` in a normal browser on the same computer to serve the `index.html` project, inspect `Application → Service Workers`, reload twice, toggle Network Offline and reload, then verify the score, Songbook and tuner reference tone work offline. Reopen the normal browser after closing it and check locally saved songs. Record PASS/FAIL with the browser version and screenshots; if it fails, do not mark PWA ready. Follow the tuner frequency table further below using a real instrument and independent reference.

---

# Device checks in v1.3.0

**New:** In Practice Room, choose **Run device checks**. In the standalone HTML demo, expect that installation and microphone checks may show *TO TEST*: the demo is not served over HTTPS/localhost. From an installed app, this check can verify that a service-worker registration is active, but it cannot replace a true offline reload.

**Backups:** Before trying imports or clearing browser data, download a JSON backup from Songbook. v1.3 validates backup data before making changes and attempts rollback after a storage failure; browsers may clear site storage without warning, so a local exported copy remains essential.

# Ukulele Workbench — Real-browser and physical-instrument acceptance checklist

**Build:** 1.2.0 Preview. **Status:** Not executed on an actual device by ChatGPT. This is a reproducible protocol, not a test result.

## Start on a trusted local origin

1. Extract the ZIP, open a terminal in `ukulele-workbench` and run `npm start` (Python 3 is required; this serves port 4173). Open `http://localhost:4173/` on that same computer. Avoid using `file://` for PWA or microphone acceptance tests.
2. Verify `window.isSecureContext === true` in the browser Console (localhost is treated as potentially trustworthy in Chromium), then verify `navigator.serviceWorker` and `navigator.mediaDevices?.getUserMedia` are present.
3. Reload twice. In **DevTools → Application → Service workers**, verify the new worker is registered, activated and controls the page; check **Cache Storage** for the v1.2.0 cache. Simulate **Network → Offline**, reload, and confirm Fretboard Explorer, Score Studio, original notation and saved Songbook content still work.
4. For local persistence: compose a score, save to Songbook, create a practice result, then reload the same origin and confirm both survive. Export a JSON backup; clear only app storage on a disposable test profile; import backup and confirm title, notes, pitch spelling, fingering, scores and practice results. Test an older v1.1 backup as well. **Do not clear personal browser storage containing irreplaceable songs.**
5. Test **Professional engraving preview** online in Score Studio. Verify that the enhanced SVG appears, matches the written pitches and durations, and selects the correct event when clicked. Disconnect, reload offline, and confirm that the classic editable notation works unchanged even if the enhancement cannot load. The optional VexFlow script is fetched on demand; it is not an offline dependency.

## Microphone tuner calibration

Use a physical ukulele *and* a known calibrated frequency generator / independent chromatic tuner, with headphones for any reference tone. Set A4 = 440 Hz. Grant microphone permission. In a quiet room, play one open string at a time at moderate volume and repeat three times:

| Tuning | Strings, low-to-high software order | Expected fundamentals, Hz |
|---|---|---|
| high-G GCEA | G4 C4 E4 A4 | 392.00, 261.63, 329.63, 440.00 |
| low-G GCEA | G3 C4 E4 A4 | 196.00, 261.63, 329.63, 440.00 |
| baritone DGBE | D3 G3 B3 E4 | 146.83, 196.00, 246.94, 329.63 |

For each note, record: reference source, app detected note, app Hz, independent tuner Hz, absolute cents error, octave mistake, ambient noise, microphone/browser model and latency. Suggested evaluation: median |cents error| ≤ 5, 95th percentile ≤ 15, zero sustained octave misidentifications in a quiet room, and no false note during silence. These are **provisional targets**, not certified performance.

For privacy: microphone input should remain entirely local; after clicking Stop, verify the browser recording/permission indicator is no longer active. Also verify that denial of permission leaves reference-tone tuning usable.

## Report template

Device/browser/OS: ____  |  App origin: ____

PWA installed: PASS / FAIL / NOT TESTED

Offline reload + Songbook: PASS / FAIL / NOT TESTED

Export/import backup: PASS / FAIL / NOT TESTED

VexFlow online score rendering and note selection: PASS / FAIL / NOT TESTED

Tuner measured against reference: PASS / FAIL / NOT TESTED

Evidence (screen capture, error details, frequency table): ____
