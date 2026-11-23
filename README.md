# Ukulele Workbench 1.10.0 BETA — Extended rehearsal, import and learning foundations

## Implemented and available in the existing interface

- **A–B song practice:** Choose arbitrary start/end bars in the Songbook, loop a passage, gradually raise tempo at each repetition, bookmark current bar and resume later. A local song-practice history records durations and repetitions; the Practice Room shows song statistics and an adjustable daily-duration goal.
- **Polyphonic guitar-to-ukulele source conversion:** An authorized guitar JSON source can contain one-note events or simultaneous 2–4-note chords. The converter finds distinct playable GCEA strings, retains rhythmic durations and reports any octave changes. Independent counterpoint across multiple guitar voices is not yet supported by the legacy ukulele score editor.
- **Additional instrument playback:** Credited guitar, strings and synthesizer parts can have specifically labelled synthesized harmonic practice lines. Source-supplied flute and wordless vocal reference notes are supported without inventing missing commercial melodies. These are modeled WebAudio reference timbres, NOT recorded sample banks for the original performers.
- **Multi-part MusicXML:** Score Studio imports a separate MusicXML score document with multiple parts and up to eight independent rhythmic voices per part; grouped SVG staves retain basic dynamics, tuplets, fingering and articulation symbols. A multi-part export is available, with unsupported overlaps rejected instead of silently flattened.
- **Advanced theory and guided learning:** A chord-inversion/arpeggio and interval-listening activity is accessible from Fretboard & Theory. The Practice Room offers higher-level technique goals including campanella, chord melody, two-voice playing and phrasing, with review records. These are introductory drills and manual self-assessments, not a complete graded course.
- **Score export and organisation:** Print / Save PDF uses the browser's print dialog and a clean A4 music-only layout. Songbook includes personal annotations and local playlists; ChordPro import preserves user-supplied text and chords; MusicXML export is available for supported personal scores.
- **Experimental microphone comparison:** In Songbook, tap a note and start the private on-device YIN pitch estimator to compare heard frequency and cents against a single notated note. It does not upload/store recordings, calibrate actual phone latency or recognise full chords.
- **Instrument configuration:** Four-string custom open pitches, a capo-aware Fretboard Explorer and left-handed mirrored fretboard are local preferences. These do not silently retune saved scores or imported ensembles.
- **Physical Android acceptance checklist:** Practice Room lists 10 real-device tests; mark Pass/Fail *only after* using your phone. Browser API inspection is separate from physical-device testing.
- **Encrypted private backups:** Practice Room can export and restore a user-managed portable AES-256-GCM / PBKDF2-encrypted backup for manual storage on a cloud drive. Your passphrase is not stored or sent. This is **not account-based automatic cloud syncing**.

## Remaining limitations and unfinished work

1. The 14 modern-song studies and generated backing parts are **not verified note-for-note commercial transcriptions**. The mandatory two-independent-source score verification rule remains unchanged, including source and redistribution rights; app-generated accompaniment must remain labelled as a reconstruction.
2. Professional engraving still needs advanced beam/tie/slur placement, engraving collisions, multiple voices fully integrated into the editable legacy Songbook score, repeats/alternate endings, multi-staff spacing, and comprehensive dynamics/tuplet round-trip. The new multi-voice SVG document viewer is an honest preview, not a replacement for a professional score editor.
3. Full imported multi-part scores are stored/viewed/exported independently; live multi-part playback and completely lossless MusicXML 4.0 roundtrip are not certified. ChordPro is a chord/lyric text interchange, not a staff transcription.
4. Physical Android audio/microphone/gesture/tuner calibration and offline airplane-mode reload still **require the owner's actual phone**. Automated tests and simulated browser sessions cannot certify these.
5. Automated private cloud syncing requires an approved account/provider and authenticated storage workflow; this release provides encrypted files for user-managed cloud backup only. Do not put personal OAuth tokens or credentials in a public Pages script.

Project standing policy: docs/SCORE_VERIFICATION_POLICY.md; never mark unverified instrumental data as confirmed. Personal Songbook data and private microphone streams stay on the user's device.

## Testing and deployment

CI executes `npm test`, `npm run qa:library`, `npm run qa:arrangements`, and `npm run qa:sources`, then deploys a freshly cache-stamped service worker. Real-device acceptance results remain separate and user-recorded.

---

# Ukulele Workbench v1.9.1 — Actual historical lyrics added

The **Scarborough Fair / Whittingham Fair — Complete Traditional Tune (1882)** arrangement now includes 12 public-domain, bar-anchored lyric lines from selected verses of the historical text in Bruce and Stokoe's *Northumbrian Minstrelsy* (1882), not the Simon & Garfunkel/Canticle recording. Three eight-bar traditional-verse repeats begin at bars 5, 13 and 21; four phrase cues are assigned to each repeat. Repeated refrains are editorial to support this three-verse arrangement; the phrase-to-bar alignment is pedagogical and not a verified syllable transcription.

Historical text source: https://www.springthyme.co.uk/ballads/balladtexts/02_ElfinKnight.html and *Northumbrian Minstrelsy*, pp. 79–80. Source and alignment notes are available in `library/songs/scarborough-fair-traditional-1882.json`.

The bundled lyric edition is revision 2; `library/catalog.json` publishes the matching revision. In Approved Songs, opening the historical arrangement automatically fetches the updated version if the browser has the earlier cached score. Existing personal song copies are left unchanged, with the updated edition available from Approved Songs. Lyrics are enabled by default unless the user previously switched the option off.

**Copyright boundary:** The 14 modern commercial-song entries do not contain full copyrighted lyrics; the app cannot republish their complete words from web lyric sites without a license. Use **Add lyric cues** to enter text you are authorized to use; these personal cues remain in the browser and are included in backups. Do not confuse an online link to lyrics with permission to bundle them.

All previously adopted source-verification and notation rules remain mandatory.

---
# Ukulele Workbench v1.9.0 — Measure-aligned lyrics and strict instrument-source verification

## Optional lyrics and reading markers

The **Show lyrics / sections** button operates independently of chords, note names, and the Notation / Notation + Tab / Tab Only display. Text appears beneath the appropriate music system, aligned to numbered measures, never atop notes, stems, chord symbols or fret numbers. When no authorized lyric text exists, the arrangement's authentic section names appear as *Section* navigation cues; they are never passed off as original lyrics.

Use **Add lyric cues** in any selected song to enter text you are authorized to use. Each line begins with a measure number, e.g. '[9] First lyric phrase' or '[9-12] Longer phrase'. The app refuses invalid or out-of-range bar references; cue text is HTML-escaped and stored only in the current browser's personal local storage. The current lyric/section cue is highlighted as playback progresses. **Export Backup** includes the private lyric cue map; **Restore Backup** validates it before restoring.

This version does not bulk-import copyrighted song lyrics from the web. Public visibility of lyrics is not a licence to reproduce them.

## Mandatory instrument-specific score source verification

The detailed project-wide hard rule is in **docs/SCORE_VERIFICATION_POLICY.md**. All past and future song/track records are presumed **pending** until pitch, rhythm, instrument identity, performance edition, register/fingering and bar alignment have been compared with at least two independent, actually reviewed instrument-specific transcriptions, such as named editions on MuseScore, Ultimate Guitar, Songsterr or publisher-supplied sheet music.

The user's Songbook now includes an expandable **Instrument score verification** panel listing each instrument's true status. The pipeline uses **src/score-verification.js** and **npm run qa:sources** to prohibit publishing a claim of verification that lacks checked source editions, review metadata and reuse rights. Machine-generated backing parts remain labelled as reconstructions; existing scores are not silently promoted to verified originals.

Note: this policy does **not** mean the existing modern-song parts have already been verified. Their underlying accompaniment arrangements remain unconfirmed until source checks are completed. Never reproduce unlicensed third-party tabs or scores.

---

# Ukulele Workbench v1.8.9 — Compact mobile notation and look-ahead

Mobile score presentation was redesigned after inspection of the user's Android screenshot. The former ensemble stacked large white panels for every track, repeating long arrangement headings and allowing chord symbols and tempo labels to collide with music. This version:
- Opens every newly selected song at **Whole arrangement** rather than a brief excerpt. The user may still choose specific sections.
- Shows **ukulele notation only by default** in all three arrangement modes, including Full Ensemble. Separate optional **Display notation for** buttons reveal individual source-supported bass/piano/percussion staves without changing the audio mixer. The visibility resets on changing songs or arrangement modes.
- Removes redundant title, tuning and tempo text from individual compact SVG score systems. Small external instrument labels identify optional backing staves.
- Reduces the blank notation/tab gap, the compact SVG height (347 → 241 logical units for dual notation/tab) and repeated vertical panel borders. Tab rows are tighter while preserving note/fret size.
- Keeps independent **chord names** and **note names** controls. The chord toggle now suppresses duplicated symbols inside source chord events.
- Starts following the first bar during the count-in, moving the current staff toward the upper part of the viewport so *upcoming* systems remain visible. As music advances, the page scrolls when the next material approaches the bottom, not after its first notes have already played.
- Preserves the fixed Pause/Stop transport, synthesized reference playback from recorded samples, individual audio instrument controls and local Songbook storage.

The default is intentionally a reading-friendly ukulele page, *not* a miniature orchestral score. User-selected additional instruments may require more vertical screen space. These arrangements remain licensed/original practice transcriptions and reconstructed parts, not authenticated note-for-note commercial instrumental stems.

## Test coverage
`npm test` includes mobile layout, compressed dual-staff systems, independent backing-staff visibility, full-score default and proactive scrolling. Manual inspection in a mobile browser and on real Android remains recommended for subjective legibility.

---

# Ukulele Workbench v1.8.7 — Song-specific percussion and touch transport

**What changed:**
- Song-specific reference-backed instrumentation chooses which sampled backing staves appear. Every song retains its provided ukulele study; no drum kit, bass or piano is fabricated for the Beatles' `Blackbird` or the 1882 traditional-air `Scarborough Fair`. The selected commercial recording personnel references are retained with the song profile, and the UI shows a reference and lists other original instruments that are not yet individually scored.
- Source-backed drum-kit presence adds a **newly composed rehearsal drum groove** to relevant songs. Each bar is shown on a percussion staff (K kick, S snare, H closed hi-hat). No percussion track is generated for unsupported/unverified songs. This is not a transcription of the drummer's performance.
- The app plays 3 acoustic drum and 3 electronic drum one-shot recordings from a CC0 sound bank. The static-site build downloads them from `adewale/keyboardia` pinned to `aa67598560f8eaf2509a3ad4bc73edee2f8bea8a`; this repo's instrument license file attributes acoustic parts to Versilian Studios/Karoryfer Virtuosity Drums and electronic parts to the CC0 TR-808 set.
- A **fixed mobile playback dock** stays within reach above the bottom navigation, with Pause/Resume and Stop controls.
- **Double-tap the score to pause; single-tap to resume.** The implementation ignores scroll gestures and does not override note preview when playback is stopped. A paused Web Audio context retains position and stops the score-follow.
- The scrolling playhead uses AudioContext time rather than wall-clock timeouts, maintaining measure synchronization after suspension and resume.

**Important limits:** The existing 15 song scores are still practice adaptations, not exact original multitrack transcriptions. Some authentic instruments (vocals, acoustic/electric guitars, strings, flutes, synthesizers, sound effects) do not yet have isolated score/playback support. The current drums are **original accompaniment patterns** sampled using real drum recordings, not the recording's extracted drum part. A song without published instrumental credits does not gain automatic imaginary instruments. The user's saved Songbook is left intact.

**Checks:** `npm test`, `npm run qa:library`, `npm run qa:arrangements` and GitHub Pages deployment. Playback sound and mobile double-tap behaviour additionally require an Android device test.

---

# Ukulele Workbench v1.8.6 Preview — Score Follow & Arrangement Modes

## Playback and notation
- **Whole arrangement** renders and plays the same full score: selecting a song section renders and plays only that section. The score no longer ends early while audio keeps going.
- **Auto-follow** highlights current notes and moves the page to the next stave group when the music advances. For ensemble view the score groups all instruments by the same bar range.
- The play/loop/speed controls appear above the score, not after an entire lengthy composition.
- Ukulele notation shows harmonic chord names directly above the bars; ledger lines, bass clef and octave-transposing bass notation are supported.

## Three selectable score modes
1. **Guitar → ukulele:** The default song-structured accompaniment remains a playable, range-limited ukulele practice adaptation; it is NOT a verified original guitar transcription. Use **Import authorized six-string guitar notes (JSON)** to load a source-led monophonic transcription with octave changes reported. This requires matching bar count, tempo and meter. Polyphonic original guitar chords are not yet supported by the source adapter.
2. **Full ensemble:** Three separately notated and individually mutably audible tracks, grouped by the same musical systems: ukulele study score, electric bass (FreePats recorded bass samples) and FM electric piano (FreePats recorded piano samples). Bass and keyboard parts are original **harmonic practice reconstructions** generated from available chord charts, not extracted original instrumental recordings. Live track mute controls allow isolated listening.
3. **Solo ukulele:** The published score is played only on ukulele samples; the known chart harmonies are printed above its notation. This does not reconstruct melodic voices absent from the licensed source material, and cannot be assumed to reproduce every note from the artist's recording.

## CC0 sources
- Ukulele: FreePats Ukulele, tenor ukulele plucks by Mateusz Dąbrowski, pinned commit `86d345f6f7b79a106ace98eca0da19b087786dba`.
- Electric bass: FreePats Electric Bass YR recordings by Andrea Biasior, pinned `8dcb7ea9116f417273ef8c030d15e7b3aa654301`.
- Electric piano: FreePats FM Piano 2, pinned `2e1241f5db3ff6b938b1645a2f2f82f7e510c708`.

The build downloads these 13+12+6 recorded FLACs and publishes them as first-party assets. A fallback oscillator may sound if a sample is unavailable. All compositions preserve the user's local Songbook entries; optional imported source-based guitar parts are held in local storage and included in user-exported backups.

## Validation
`npm test`, `npm run qa:library`, `npm run qa:arrangements` run as GitHub Pages deployment gates. Mobile audio playback, automatic scrolling, and first-load sample decoding additionally require browser verification.

---

# Ukulele Workbench v1.8.5 Preview — Printed Staffs and Recorded Ukulele

**Sheet music:** Songbook and Score Studio now use multiple staff systems rather than a single endless horizontal score. Dense measures occupy their own line; shorter bars share a system. Scores preserve measure numbers and support notation, ukulele tab or both.

**Recorded ukulele:** Songbook playback and tap-to-hear note/chord previews use recorded plucks from Mateusz Dąbrowski's FreePats tenor ukulele sample library. The 13 FLAC recordings are dedicated to the public domain under CC0 1.0. Source and license: https://github.com/freepats/ukulele1 and https://freepats.zenvoid.org/GuitarFamily/ukulele.html. Source commit pinned to `86d345f6f7b79a106ace98eca0da19b087786dba`. GitHub Pages downloads the samples as static first-party assets during deployment. The service worker caches successfully fetched FLACs for repeat/offline practice. The old oscillator is used only as a fallback if a recorded pitch cannot load; metronome clicks still use generated tones.

**Technical limits:** The fallback SVG score renderer currently uses simplified single-voice notation; there is not yet professional polyphonic engraving or an exact transcription of protected recordings. Recorded ukulele samples are a real instrument, but the audio is a synthesized *performance* of notated arrangements using those samples, not a commercially recorded performance.

## Testing
Run `npm test` and `npm run qa:library`. GitHub Pages downloads the CC0 bank in `scripts/fetch-ukulele-samples.mjs`; the source code is fully editable without binary media in Git. Test browser audio permission, first-load sample fetches and offline playback before treating a release as fully validated.

---

# Ukulele Workbench v1.8.4 Preview — Listen & Practise Songs

The Songbook now offers a **playable rehearsal view** for the fifteen approved practice titles. Each available score can be opened directly in **Approved Songs**, the **Repository Library**, or **My Songbook**. In all three places the written arrangement supports:

- Standard notation, ukulele tablature, or both in the existing display modes.
- **Listen to score** with synthesized notes/chords, a count-in, note highlighting and a Stop button.
- A separate **Practice speed** setting (60, 75, 90, 100, 110 or 125% of the score tempo), **loop playback**, and a choice between the selected musical section and the complete accompaniment.
- Tapping a written note or chord to hear it individually without overwriting Score Studio.
- A chord fingering guide showing actual G-C-E-A positions, with fallback chord symbols from the written section chart for note-only scores such as **Blackbird**.
- Existing title-only song entries receive their published score when opened, without discarding the local song ID or the user's annotations. If a score is missing, the app fetches the single validated arrangement rather than forcing a full library sync.

The 14 modern-song files remain **original, harmony-led ukulele accompaniment adaptations**, not complete licensed commercial guitar or vocal transcriptions. This release makes their existing musical data usable for listening and guided practice; it does not add copyrighted lyrics or promise exact original riffs. A full traditional 1882 Whittingham Fair melody is available under Scarborough Fair. The original audio is not included.

For updated hosting, the service worker cache name is `uke-workbench-v1.8.4-rehearsal-audio`. Reload after deployment and preserve existing browser storage. The user-facing repertoire, external-source instructions and MusicXML interoperability remain intact.

Validation: `npm test`, `npm run qa:library`, `npm run qa:arrangements` and `npm run qa:http`. A live Android browser playback check is still required; repository static checks alone do not certify sound or PWA caching.

---

# Ukulele Workbench v1.8.1 Preview — Source-Based Guitar Part Adaptation

## Recorded guitar parts versus chord accompaniments

The fourteen modern-song scores remain **harmony-led accompaniments**, not accurate transcriptions of the original recorded guitar parts. The new **Score Studio → Adapt Guitar Notes (JSON)** feature accepts *supplied six-string guitar note-and-rhythm data* and maps the original note sequence to high-G GCEA ukulele, using a voice-leading algorithm and reporting octave shifts. It does not reconstruct riffs from chord symbols, and it refuses polyphonic guitar events rather than dropping notes without warning. Download the original-data template directly in Score Studio.

To complete source-accurate adaptations of the fourteen modern recordings, first obtain authorized original guitar tab or notation for each part; use the [source-guitar adaptation instructions](GUITAR_PART_ADAPTATION.md) and validate the resulting lead/picking part by ear against the recording. The current converter handles only a single guitar voice at a time, so full multi-voice riffs may require the score editor to gain polyphonic support.

---


## Song-structured high-G accompaniments (14 modern recordings)

The fifteen approved practice titles remain unchanged. For fourteen modern copyrighted titles, the earlier sixteen-bar generic studies were replaced by **section-based high-G accompaniment scores** (revision 2). These capture published song harmonies and musical sections, using different ukulele patterns for fingerpicking, chord strumming, suspended textures, off-beat strokes and compound metre. Each score includes labelled sections, exact GCEA fret positions, and chord shapes, with no transcribed lyrics or lead-line riffs. They are playable *adaptations* for an experienced guitarist, **not certified transcriptions of the record's guitar lines**; the precise recording arrangement, bass inversions and vocal melodies cannot always be recreated on four re-entrant strings.

The rhythm engine presently supports 4/4, 3/4 and 6/8. For **Everybody Wants to Rule the World**, every two 6/8 measures represent one original 12/8 bar. Quarter-note playback at 168 BPM gives roughly 112 dotted-quarter beats per minute. The older complete historic melody arrangement of Scarborough Fair remains as the preferred score for that title.

Rebuild the fourteen files with `node scripts/build-repertoire-accompaniments.mjs`, or run `npm run qa:arrangements` to verify score data and section metadata against `library/arrangement-blueprints.json`. Song updates use stable IDs and increment `revision`, leaving previous personal song copies untouched. The new score files stay within the original 150,000-character download cap.

---



## Approved repertoire — 15 selected songs and a historical full melody

### Full traditional Scarborough Fair melody (1882 source)

A complete 32-bar instrumental ukulele setting of the eight-bar **Whittingham Fair** tune has been added at `library/songs/scarborough-fair-traditional-1882.json`. Its historical source is Bruce & Stokoe, *Northumbrian Minstrelsy* (1882), pp. 81–82, as transcribed in [The Fiddler's Companion](https://www.ibiblio.org/fiddlers/WHI_WHZ.htm). Three repetitions of the original E-minor, 6/8 tune follow an independently composed four-bar introduction; there is also a new four-bar coda. Exact high-G note positions and durations are validated by the tests.

**Distinction:** this is an older traditional melody, not the Simon & Garfunkel 1966 recording's tune, guitar part, Canticle section, counterpoint, or full production. The Approved Songs list prefers the historic score when importing **Scarborough Fair**. The other fourteen commercial titles still have original harmonic studies only: faithful full-song scores require user-supplied or explicitly licensed source material.


**Songbook → Approved Songs** now lists 15 approved practice titles and their associated **original, fully notated 16-bar harmonic and technique studies**. The notes, chord voicings and fingerings work in standard high-G GCEA; optional tablature follows the app's existing notation display setting. These are newly composed instructional studies based on each song's tonal centre and harmonic vocabulary, **not transcriptions of the song's protected melody, instrumental riffs, lyrics or original rhythmic performance**. The original 2 bundled beginner scores remain available offline. On the hosted app, use **Sync Library** to retrieve the 15 additional studies.

Select **Import available practice studies** after **Sync Library** to copy the 15 scored studies into local My Songbook, or copy one study at a time. The import is idempotent and does not overwrite existing songs or annotations. The dedicated **Repository Library** contains the two starter studies, fifteen original song-associated studies and an additional full traditional melody arrangement. The approved-song title list is bundled for offline browsing; the 15 scores are available through catalog sync and are pre-cached for offline access by the installed service worker.


Songbook now includes **Repository Library** with two bundled original notation-first studies, score previews, search/difficulty filters and **Sync Library**. A song copied to **My Songbook** is independent and is never overwritten by an upstream update. The app's existing editable Score Studio, Technique Academy, MusicXML support and local JSON backup remain available.

**Play instantly:** open `demo.html`. To test repository sync over HTTP, install Node.js 20+, run `npm start` and visit `http://127.0.0.1:4173/`. You can use the default `./library/catalog.json` on a served app or configure an HTTPS catalog URL. To validate the on-disk library, run `npm run qa:library`, `npm test`, and `npm run qa:http`. Full workflow and future ChatGPT song submission instructions: **`SONG_REPOSITORY.md`**.

**GitHub Pages deployment prepared:** This public repository includes a verified static site and an automatic Pages workflow at `.github/workflows/deploy-pages.yml`. A one-time GitHub Pages source selection (**Settings → Pages → GitHub Actions**) may still be needed. See **[PAGES_DEPLOYMENT.md](PAGES_DEPLOYMENT.md)** for the exact activation steps, expected site and song-catalog URLs, testing and safety guidance. Do not put GitHub authentication tokens in a browser-accessible URL. Browser-local practice data is not synced to GitHub.

---

## v1.5.0 Underground Garage × Industrial Racing UI

The approved 2000s-style design is implemented in the original app (not a separate concept). Start in Score Studio, with a large high-contrast standard-notation canvas, selected-note inspector, synced fretboard, and racing-HUD rehearsal transport. The remaining modes share an industrial visual system with differentiated activity layouts. See **DESIGN_SYSTEM.md** for design tokens and responsive rules. Run `npm start` with Node.js 20+ or open `demo.html` for a self-contained preview. All musical data formats and functionality are unchanged. VexFlow CDN, true PWA offline reload and physical tuner calibration are still unverified.

# Previous release: v1.4.0 Preview — Offline Foundation and Safe PWA Caches

**Tested local source release; not a certified installed PWA.** This release corrects two installation defects and adds reproducible service-worker lifecycle tests without changing the music/score model or other projects.

- **Safe cache migration:** The service worker now deletes **only older `uke-workbench-*` caches**, preserving caches belonging to unrelated tools hosted on the same site. It updates its offline shell after all required local assets have cached successfully and keeps requests scoped to the app's own directory.
- **Offline behavior:** A cache-first shell, query-string asset lookup, offline-navigation fallback to `index.html`, and opportunistic caching of only local static files are covered by Node-simulated service-worker event tests. This is not a successful browser offline reload or installability certification.
- **Install icons repaired:** The old icon depended on a missing music-character glyph. The replacement uses pure SVG geometry plus 192×192 and 512×512 PNGs, listed in the PWA manifest and precached for offline use.
- **Practice Room checks:** The existing device-readiness report now checks whether five required offline-shell assets can be read from CacheStorage. A positive result means **present in cache**, not that offline reload was tested. It does not request microphone permission.
- **Real HTTP check:** Run `npm run qa:http` (Node only) to launch an isolated localhost server and verify HTTP status, content types and nonempty response bodies for the actual app entrypoint, service worker, manifest, source modules, and icons. It does not launch a browser.
- **Tests:** `npm test` runs the full theory/notation/backup suite plus service-worker lifecycle tests. `python browser-v14.py` runs a browser-injected UI smoke test. For an actual offline reload and tuner calibration, follow `REAL_DEVICE_QA.md` on a normal HTTPS/localhost origin and a real instrument.

### Run locally

```sh
npm test
npm run qa:http
npm start
```

Then open `http://127.0.0.1:4173/` on that machine. The server is built into Node 20+ and does not require Python or external packages. In a normal browser, use DevTools → Application → Service Workers and Cache Storage. Toggle network Offline and reload twice to verify the installed app. **Do not test the PWA using `file://` or the standalone demo.**

---

# Ukulele Workbench v1.3.0 Preview — Data Safety and Device Readiness

**Local prototype.** This release builds on v1.2.0, with no changes to existing guitar projects and no GitHub deployment. All music/notation features from v1.2.0 remain available.

## New in v1.3

- **Practice Room → Device & data safety → Run device checks.** Reports whether the current browser is served via HTTP(S), is a secure context, can write/read a temporary local-storage value, has an active service worker, exposes the microphone API and has persistent storage permission. **The check never requests microphone permission, records sound, uploads anything or asserts that an offline reload has passed.** In standalone HTML the PWA-related checks are expected to say *TO TEST*.
- **Backup restore preflight:** Before confirmation, every included song score and current score/progression, reading results, rhythm data and supported display/tuning settings is validated. Invalid files do not overwrite previous songs or scores.
- **Storage failure recovery:** Validated backup fields are written with read-after-write verification. If any write fails, the app attempts to roll back the affected keys to their previous values and warns explicitly if recovery cannot be verified. **This is not an ACID database transaction. Keep exported JSON backups**, especially before restoring a different collection.
- **Bug fix:** A restored `dual` (notation + tab) view and tuning are retained; a restored score draft clears the old Songbook identity so subsequent saves do not accidentally overwrite an unrelated song.

## Run / inspect

Open the standalone `demo.html` in a browser for a file-based demo. For real device testing, start the source app on an HTTP(S) origin (see `REAL_DEVICE_QA.md`). The browser here blocks navigation to localhost, so PWA install, actual persistent origin storage, VexFlow online rendering and physical microphone accuracy are **not** certified.

```sh
npm test
python browser-v13.py
```

The browser script requires Python Playwright and a local Chromium executable, and uses **injected HTML + simulated localStorage**, not an unrestricted browser origin. Five older browser regressions (v0.8, v0.9 backup, v1.0 backup, v1.1 MusicXML, v1.2 MusicXML/offline fallback) were re-run successfully.

---

# Ukulele Workbench v1.2.0 Preview — Optional VexFlow, MusicXML compatibility and tuner testing

**Not a certified production release.** This version extends v1.1.0 in the same source tree. The original browser-native notation remains the offline and editable default; the VexFlow 5 professional engraving **preview** is optional and loads its pinned library from a CDN **only after the user requests it**. In this build environment CDN/npm downloads were blocked, so the integration code and fallback were tested, but the actual third-party renderer could not be exercised. No third-party font files or binary packages are included.

- In **Score Studio**, use **Professional engraving preview (online)** to request formatted staff engraving. The rendered score can be clicked to select corresponding canonical note events. The regular edit surface, tablature, fingering and Songbook remain below the preview. If disconnected or blocked, the editable classic score continues working.
- **MusicXML** now imports a broader, still bounded group of single-part XML scores: repeated unchanged attributes, omitted optional note types, and nonmusical print/page layout. Any actual score changes (new meter/key/divisions/clef), polyphony, tuplets and MXL remain explicitly rejected rather than discarded. Import errors do not overwrite the draft.
- **Tuner** fundamental detection has been replaced by a testable YIN-style local DSP module. Open-string tests on synthetic 44.1/48-kHz data pass. Actual instrument, microphone and latency acceptance have **not** been carried out.
- **Offline/PWA** core assets are covered by static pre-cache checks; see `REAL_DEVICE_QA.md` for a reproducible real-device and browser-origin test procedure. Running `npm start` uses Python 3 on localhost.
- **Verification:** `npm test` runs Node theory/music/engraving-adapter/tuner/PWA checks, `python browser-v12.py` covers XML compatibility, offline renderer failure and mobile. `python browser-v11.py` covers the older MusicXML round-trip.

# Ukulele Workbench v1.1.0 Preview — MusicXML interchange

**Stage (historical v1.1 description):** local development preview, not a production release or a professionally engraved score editor. This build extends the existing v1.0.0 preview and leaves the original guitar projects untouched.

## New in v1.1.0 — First MusicXML 4.0 interchange

- Score Studio has **Download MusicXML** and **Import MusicXML** controls. Downloads are uncompressed `.musicxml` `score-partwise` XML. Browser import requires a native XML parser and explicit confirmation before replacing the working score. A failed import leaves the draft unchanged.
- The exporter writes the authored title, one ukulele part in treble clef, divisions/durations (including dotted values), 3/4, 4/4 or 6/8, key signatures, tempo, rests, written pitch spelling and octave, ties, slurs, articulation, chord symbols, chord stacks and chosen string/fret positions. The export uses sounding pitches; it does not quietly transpose high-G ukulele notation.
- The **intentionally restricted importer** accepts one part, one rhythmic voice, unchanged key/time, treble clef, supported values/accidentals, supported fixed/generated chord voicings, and 1–200 measures. It rejects additional voices, repeats, tuplets, unsupported directions, fingering markup, complex chord structures, DTDs/entities and compressed `.mxl` files; it does **not** claim to import arbitrary professional scores. The importer uses ukulele tuning metadata when available, otherwise the current Score Studio tuning.
- For a **complete lossless backup** of original drafts, technique progress, rhythm results and songs, continue using the existing app JSON backup. MusicXML is for score interchange, not a replacement for your full library backup.
- Pure Node export tests and a browser test cover written enharmonic octaves, dotted rhythms, pitches and frets, chord stacks, ties/slurs, XML parsing, browser download/upload, input rejection and responsive layout.

### Try MusicXML

1. Open the standalone `demo.html` or the server-based app. Go to **Score Studio**.
2. Compose notes or chords. Select **↓ MusicXML** to download an interoperable single-part score.
3. Select **↑ Import MusicXML** to reopen a supported XML file. Confirm replacing the active score; save the original to Songbook first when appropriate.
4. Use **Songbook → Backup** to preserve all app content in JSON, since importing another musical score does not restore the entire practice history.

**Current limitations:** no MusicXML layout/page engraving, transposition, multiple voices, independently moving chord notes, tuplets, repeats, ornaments, lyrics or complex imported measures. The existing SVG score remains a simplified notation display. Physical tuner calibration, PWA installation on a served origin and GitHub deployment remain unverified.

---

# Ukulele Workbench — v1.0.0 Preview: Key & Pitch Reading Academy

A **notation-first ukulele learning, instrument practice and personal music app**, built from browser-native modules. This is an **early runnable prototype**, not a hosted application or full notation engraver.

## New in v1.0.0 Preview — Key signatures and graded melodic sight-reading

- **Key Signature Lab:** 15 conventional major-key signatures, with switches between naming the major key and its relative minor. Every question displays an actual treble-clef key signature on the stave, offers four distinct choices, reveals an explanation after answering, and saves practice counts locally.
- **Pitch Sight-Reading Lab:** eight two-bar, eight-note études in C, G, F, D, B-flat, A and E-flat major, plus an additional G-major phrase. The player reads one highlighted note at a time and selects its **written pitch and octave**. Accidentals from the key signature are part of the printed exercise; the answer checks the written spelling instead of merely the same-sounding chromatic pitch.
- **Instrument-specific fingerings:** a lesson selects only notes playable within the first 12 frets on GCEA high-G, GCEA low-G and baritone DGBE. The learner can reveal the exact string/fret hint, hear the sounding note, change tuning or copy a study to Score Studio. Standard notation remains the default: tablature is not revealed automatically.
- **Local practice record:** correct/attempted answers for each key mode and each melodic étude are saved locally and included in JSON schema-v2 backup. Import also supports earlier backups lacking the optional `notationReadingProgress` field.
- **Testing:** **81/81 Node tests pass**, including eight new tests across all signatures, relative minors, written-pitch octave edge cases, 24 tuning-specific study builds, note-answer validation and immutable progress storage. The new desktop/mobile UI and backup round-trip checks pass; previous browser regressions through v0.9 also pass.
- **Not a production 1.0 release:** the app remains a local, simplified-engraving preview. Actual browser-origin PWA installation, persistent IndexedDB (the prototype uses localStorage), live microphone tuner calibration and device audio latency are **not verified**. The app is not yet published on GitHub.

### Try the new notation course

1. Open **Notation Academy** and scroll to **Key signatures · identify the key**. Identify major keys or relative minors from the notated key signatures; answers remain hidden until selected.
2. Continue to **Read a melody · pitch by pitch**. Choose a study (`SR-01` to `SR-08`), read the highlighted note and select its written pitch and octave.
3. Reveal the fingering or hear the note only when you need help. Change ukulele tuning to compare playable positions. Optionally copy the complete exercise into Score Studio.
4. Export a JSON backup from **My Songbook** to preserve your reading statistics. No cloud account is required.

## New in v0.9.0 — Read, hear, and tap the score

- **Eight graded, two-measure rhythm études** in the Notation Academy: steady quarter pulse; written rests; pairs of eighths; upbeats; dotted-quarter phrasing; dotted-eighth/sixteenth; waltz in 3/4; and compound 6/8.
- Read **standard notation** as the primary representation. A one-measure audible count-in is followed by synthetic reference-note playback. Press **Space** or the **Tap the rhythm** button only for notated attacks; leave rests silent. 6/8 is counted in two dotted-quarter pulses.
- After each attempt, see matched, missed and extra attacks, an approximate match percentage, and average timing error for matched taps. The matching window is tempo-dependent (85–220 ms). **This measures browser taps, not audio recorded from the ukulele**, and latency makes it unsuitable as a precise musicianship examination.
- Save attempts and best performance locally per lesson. The existing JSON schema-v2 backup includes the new optional `rhythmLabProgress` record, preserving compatibility with older backups without that field.
- The existing score renderer now uses **rhythm-aware horizontal event spacing**, blending actual onset positions with minimum separation for legibility. This is still simplified SVG notation, not professional engraving.
- **73 of 73 Node tests passed** (64 earlier + 9 new). New desktop/mobile browser workflow and backup round-trip passed; **all seven earlier browser regression suites passed**. Chrome refused navigation to `http://127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR` in this environment, so service-worker installation and origin-backed browser storage remain unverified.

### Try the new lesson

1. Open **Notation Academy**, scroll to **Read and perform a rhythm**, then choose an étude from `RT-01` through `RT-08`.
2. Read the two-bar score. Choose **Count in & play** and listen to the one-measure preparatory pulse.
3. Starting when the score begins, tap the button or press Space at each written note onset. **Do not tap during a rest**. You can abort using Stop; aborted attempts are not recorded.
4. Review matched and missed attacks and your locally saved best result. If you want a durable copy of your results, export the backup from **My Songbook**.

## New in v0.8.0 — Minor-key harmony and rhythmic arranging

- The Progression Builder now supports **major, natural minor and harmonic minor** in all 15 conventional key-signature families, across high-G, low-G and baritone tunings. Minor-mode tonic selection uses its **relative-major signature**; harmonic minor raises the leading tone with an accidental. For example, A minor has a C-major key signature, while the harmonic-minor dominant is E major rather than E minor.
- Meter options are **4/4, 3/4 and 6/8**. Chords can last half a beat, one beat, one and a half, two, three or four beats (subject to the meter). Several chord attacks now fit in the same measure; the UI shows bar/beat placement and the score shows the individual rhythmic values. Chords that do not fit start a new measure and any gap is written as a **real rest**.
- Expand an entire measure of one chord into a **notation-linked rhythm preset**: quarter downstrokes, island D-D-U-U-D, half-time strokes, a 3/4 waltz or a dotted 6/8 figure. Each attack has an independent down/up stroke in the score and audio. Select an attack to cycle its length, direction or order.
- Every chord retains its exact note spelling, sounding pitch and string/fret assignment. Score Studio, optional tablature, Songbook scores and playback all use the shared score-event model. Synthetic reference audio remains a limitation.
- **Backward compatibility**: v0.7 progression drafts without mode/meter/duration are interpreted as C-major-style four-beat steps; no change to the portable backup schema is required. New optional fields are persisted and restored with the same JSON format. Chord-attack limit remains 16; the current builder is not an unlimited DAW arranger.
- The app includes **64 passing Node tests** (11 new) and a new desktop/mobile v0.8 browser test. All six earlier browser suites pass as regressions. **Real-origin offline PWA, microphone calibration and persistent storage are still unverified**; an HTTP server was refused by this execution environment.

### Quick practice flow

1. Open **Progression Builder**, choose *Natural minor*, *A* and *4/4*.
2. Choose **1 beat** under *New chord length* and add i, iv, V (use *Harmonic minor* for a major V) and i. You now have four chord attacks in one notated measure.
3. Alternatively, use **I–IV–V–I** to create four full-bar chords, and choose **Island rhythm** on any whole-bar chord to replace it with five written strokes.
4. Toggle notation + tab to check physical fingerings, then play or save the score to **Songbook**.

## New in v0.7.0 — Score-first diatonic progressions

- **Progression Builder** is accessible in desktop navigation, the mobile navigation and the Fretboard & Theory chord explorer. Build up to **16 measures**; reorder, remove or change each measure’s stroke direction.
- Supports **15 conventional major-key signatures**, **triads and seventh chords**, and high-G, low-G and baritone tuning. The current editor is intentionally **one chord per 4/4 measure**; minor-key progression rules and custom beat lengths are not part of this version.
- The harmony engine generates playable three- or four-string voicings (muting a fourth string when needed) and preserves their individual written note spellings, sounding pitches and exact string/fret locations. The rendered standard notation, optional tablature and playback use the **same canonical score events**.
- Change key, tuning and tempo; audition the progression with a highlighted active measure. Save a complete score to Songbook without modifying the current Score Studio draft, or explicitly open it in Score Studio after a confirmation.
- Progression drafts persist locally and travel in the **existing schema-v2 JSON backup**. Older backups without this new optional field remain supported; malformed imported progression data is rejected.
- **53 automated Node tests pass**, including 630 valid major-key/degree/extension/tuning combinations. New desktop/mobile browser tests and all five older browser regression suites pass.
- No publication or physical tuner verification is claimed. Real-device PWA installation and browser storage remain to be tested on an actual served origin.

## Try the complete interactive demo

Extract the archive and open `ukulele-workbench/demo.html` in your browser. This demo includes all JavaScript and CSS inline and requires **no package downloads or network access**. The normal source version uses ES modules and a PWA.

Browser behavior for files opened via `file://` varies: if storage is disabled, try the server-based version below. Microphone features require browser permission and generally HTTPS or localhost; for real tuning, use the served version.

## Run the source/PWA version

From the extracted `ukulele-workbench` folder:

```sh
python3 -m http.server 4173
```

Open <http://localhost:4173>. There is no npm installation step: the prototype uses no external dependencies.

Run tests with Node 20 or later:

```sh
npm test
```

`build-demo.py` regenerates the single-file preview by inlining known local modules. It is a prototype bundler for this fixed file list, not a substitute for a production bundler.

## Earlier work in v0.6.0

### v0.6.0: Reading technique symbols and playing real chord stacks
- Ten **playable, notation-linked technique studies** (three more than v0.5): **C–F–G7–C chord transitions**, **down/up strumming** with standard Π/V indicators, and **slur vs staccato** phrasing. Five additional topics remain explicitly labelled planned rather than represented as working content.
- A **four-string chord is now one musical event**, with four simultaneous sounding pitches, exact tuning-aware fret positions, a chord symbol, a strum direction, and one written rhythmic duration. Stacked noteheads appear in the staff; optional tabs display all four frets. Downstrokes/arpeggiated strums sound from G to A (or D to E for baritone); upstrokes use reverse physical order.
- The first supported chord shapes are C, F, G7 and Am, with known frets for both GCEA variants and baritone DGBE. Chord pitch/fret correctness is validated by automated tests in all three tunings. This is not yet a generalized arbitrary chord-stack editor.
- **Score Studio** supports adding, replacing, and editing chord events, their durations, stroke direction and accent/staccato/tenuto marks. Slur-to-next is available for adjacent single notes and remains distinct from a tie (the latter sustains a repeated pitch without re-attacking).
- **Notation Academy** adds a four-question interactive expression lesson on ties, slurs, staccato and accents, saving its quiz score locally.
- Technique practice continues to use optional score/tab views, removable fingering hints, reference audio and self-reported progress. Score copies, saved songs and JSON backups persist the new chord and articulation fields without breaking earlier scores.

## Previous release: v0.5.0

### v0.5.0: Guided, notation-first Technique Academy
- Seven original **playable, notation-linked lessons**: clear fretting, chromatic finger independence, thumb strokes, index–middle alternation, p–i–m–a arpeggio, an introductory campanella string-distribution study, and musical phrasing with a written rest. The remaining syllabus topics were intentionally marked as **planned** in that release instead of pretending to be implemented lessons.
- Each lesson builds a validated standard score from a physically playable string/fret pattern. High-G, low-G and baritone tuning adapt the **actual sounding pitches and the written staff** together. Exact string/fret assignments are preserved.
- Default staff display with selectable score + optional tab / tab only. On-staff suggested fingering labels (right-hand p/i/m/a and left-hand 0–4) can be hidden or revealed. Tapping staff notes or step cards identifies and plays the selected pitch.
- Adjustable 40–140 BPM exercise tempo, **four-beat audible count-in**, and synchronized note-cursor playback. The oscillator is only a reference sound, not a realistic demonstration of attack or technique.
- Manual confidence rating (*Still learning*, *Comfortable*, *Confident*) records an explicit, self-reported practice attempt. This does not automatically assess performance. Local progress is included in backup exports and restored from compatible backups. Existing schema-1 and schema-2 backups still load.
- Copy a guided étude directly into Score Studio to change its notes, duration or fingering and save an arrangement in the Songbook. Lessons never overwrite the working score without an explicit copy action.
- Mobile navigation and 390px layout checks for Technique Academy.

## Earlier features (retained)

### v0.4.0: Notation, rhythm reading and tied playback
- Major key-signature selector covering all 15 standard major keys (seven sharps to seven flats). This affects engraving and accidental cancellation, **not** the sounding MIDI pitches or transposition. Older score files without a key field continue to work as C major.
- Dotted sixteenth, eighth, quarter and half durations for notes and rests; corresponding timing and SVG dots. Beam grouping supports dotted-eighth + sixteenth pairs.
- Tie-to-next control on a selected note, limited to adjacent identical written and sounding pitches. Ties across bars require a full preceding bar, and playback sustains the joined duration without re-attacking the second note. Editing incompatible notes is rejected safely.
- New **interactive rhythm-reading lesson** under Notation Academy: interpret notes/rests directly on the staff, identify their quarter-note beat values, and save quiz progress locally.
- Updated mobile layouts and source/PWA cache assets; all new score elements retain Undo/Redo and Songbook persistence.

### Score Studio (v0.3.0 improvements)
- Bounded Undo/Redo for score edits (buttons and Ctrl/⌘+Z, Ctrl+Y / ⌘+Shift+Z). Session-only history, not in backup files.
- Insert before/after a selected event when the measure has space; otherwise refuse safely without altering later measures. Explicitly add a blank measure.
- Beat-aware engraving of grouped eighth/sixteenth notes, including dotted-quarter grouping in 6/8. A simplified SVG renderer remains in use.
- Accidentals are applied per written letter and octave within each bar: repeated signs are suppressed, and naturals cancel a prior sharp/flat. Major key signatures were added in v0.4.0.
- If duration or written spelling changes without changing the sounding pitch, retain the user-selected physical fingering.
- Technique Lab is now accessible from the mobile navigation.

### Score Studio (carried over from v0.2.0)
- A monophonic event model for notes and rests in complete or partially filled measures. New measures are opened automatically when necessary.
- A notation-first SVG staff with treble clef, simple time signatures, ledger lines, explicit accidentals, quarter/eighth/sixteenth/half/whole notes, and corresponding rests.
- 3/4, 4/4 and 6/8 support (in quarter-note timing units); add, replace, select or delete notes and rests.
- Written pitch spelling separate from sounding MIDI pitch. You can choose such spellings as C♯ and D♭ while preserving the same sounding note.
- Four-string fingering options specific to high-G, low-G or baritone tuning. Assign a physical string/fret without changing pitch. Switching tuning clears invalid fret assignments.
- Standard notation (default), notation + synchronized tablature, or tablature-only display.
- Timed score playback with current-event highlighting and a Stop control.
- Local autosaved working score and saving/reopening a full score in the existing Songbook. JSON backups now include score drafts and remain import-compatible with v0.1 schema 1.

### Still available from v0.1.0
- Interactive four-string fretboard, modes, scale spelling, diatonic chords and chord voicings.
- Beginner note-reading quiz, technique-learning outline and basic rhythm/strumming patterns.
- Metronome with adjustable tempo/tap tempo; tuner with guided tones and on-device microphone pitch estimates.
- Local song metadata, lyrics/ChordPro sketches, practice logs and portable backups.
- Local-first installable PWA shell for browser use.

## Test evidence

`npm test` passes **64 of 64** Node model tests, including the ten tuning-aware technique études, four-string chord voicing invariants, chord-stack engraving, up/down strokes, slurs vs ties, articulation and atomic editing. Browser smoke suites cover the original app, v0.3/v0.4/v0.5 regressions and a dedicated v0.6 workflow: chord scores in three tunings; notation-tab switching; playback/count-in; fingering hints; local practice; Score Studio chord entry; saving and reopening a song; expression quiz; and a 390px mobile layout with no page-wide overflow. Browser testing used a self-contained injected HTML page and a simulated `localStorage` object; it does **not** verify persistence across a real-origin reload or HTTPS microphone permissions. Physical ukulele tuner accuracy, service-worker install and full-device audio timing remain unverified.

## Important limitations

- The editor currently supports **one rhythmic voice** (including four-string chord stacks); beaming, chord-note collision layout and accidental engraving remain simplified. Independent voices, tuplets, complex rhythms, arbitrary chord stacks, printable professional scores and MusicXML import/export are **not** ready. Basic single-note slurs and articulations are available. Basic ties, major key signatures and dotted rhythms are available, but still use a simplified SVG engraver. Do not use its SVG as a professional engraving source.
- The notation engine currently displays **sounding pitch** rather than handling conventional optional octave-transposed ukulele notation. The choice of octave convention remains a recorded design decision.
- Current score editor supports append, replace, delete, insertion within a bar, explicit blank bars and session-scoped Undo/Redo. Drag-and-drop, automatic rhythmic reflow, and full score engraving are not implemented. Deleting an event in a non-final bar preserves later bar positions, which can leave an incomplete bar.
- Playback uses an oscillator placeholder; actual recorded ukulele samples, realistic technique articulation and complete expression interpretation are not implemented.
- Pitch detection is experimental and can make octave/harmonic errors. Do not use as a replacement for a verified physical tuner before testing on a real instrument.
- Persistence is localStorage for this prototype (including technique ratings), not IndexedDB. Browser-data deletion can remove your songs. **Export JSON backups regularly.**
- There is no React/Vite deployment yet. Planned target remains React + TypeScript, but this build is dependency-free to maintain an immediately testable proof of concept without package registry access.

## Source of truth and build tracking

[Google Docs living build plan](https://docs.google.com/document/d/10rZ38StT_s6_RRjAf6oq38NeCxa0CTUylJwVGba1stY/edit)

Feature IDs `UW-N01`–`UW-S08` and milestone gates M0–M6 live in that document. Existing P0 requirements are **IN PROGRESS**, not prematurely marked done. An individual functioning component does not satisfy a complete acceptance gate.

Next priority: improve progression editing (ties, grouped rhythm, minor-key cadence teaching), notation engraving and technique curriculum; verify tuning and audio on a real device; create a dedicated source repository; and evaluate a mature notation renderer/MusicXML before migrating to a TypeScript component architecture.

## Privacy and licensing

Microphone audio is analyzed only on the device and is never transmitted or recorded by this prototype. All app files in this archive are original code generated for this project; there are no bundled third-party fonts, samples or commercial songs.
