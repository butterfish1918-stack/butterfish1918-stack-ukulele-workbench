## 24 November 2026 — v1.11.4 beta: external MusicXML regression and adaptive engraving

- Added eight unchanged, MIT-licensed fixtures from the independently maintained W3C community MusicXML test suite, covering a missing voice tag, multiple rhythmic voices, simultaneous chord notes, ties, repeats, alternative endings, nested repeats and contradictory ending markers. Tests parse the actual MusicXML bytes with a test-only Python XML parser adapter; the shipped app continues using browser DOMParser.
- Safely accepts standard Recordare MusicXML public DTD prologues by removing only a recognised declaration before parsing; arbitrary external DTDs, XML entities and unsupported entity names remain rejected. No external XML resources are fetched.
- Expanded simple repeat support to two through eight passes, bounded by the existing 200-measure expansion limit. Detected and rejected an ambiguous implicit repeat interpretation discovered by the external fixtures.
- Added adaptive SVG staff geometry for imported polyphonic scores: spacing based on distinct rhythmic onsets, aligned attacks across instrumental parts, sideways offsets for adjacent chord noteheads, increased vertical clearance for ledger-heavy passages, and horizontally scrollable fixed-size SVGs on narrow screens.
- Automated tests cover new renderer spacing, crowded chords and ledger-extreme staff separation, in addition to the external MusicXML suite.
- This is a limited interoperability regression suite, not certification against MuseScore/Sibelius/Dorico or physical Android acceptance. Rich score metadata, lyrics, arbitrary MusicXML constructs, polished page engraving and real-device audio calibration remain outstanding.

---

## 23 November 2026 — v1.11.3 Beta: bounded MusicXML repeat expansion

- Added a strict, deterministic repeat planner for MusicXML partwise scores. Standard forward/backward repeat signs are supported for two to four passes; conventional first/second endings are supported for exactly two passes.
- Repeat playback is linearized across all instruments before schema-2 validation, preserving independent parts and voices, written pitch spellings, dynamics, ties and rhythmic onsets where the result forms a valid score. Source-written measure numbers remain attached for navigation.
- Imported score view labels repeated measures with their original source measure numbers and explicitly warns that exported MusicXML will contain the fully expanded measures without repeat barlines.
- Detects contradictory repeat instructions between instruments, nested/overlapping repeats, orphaned or incomplete endings, unsupported directions and excessive expansion beyond 200 measures, rather than silently playing the wrong order.
- Original song-score editing and single-voice score formats remain unchanged.
- Automated tests cover repeat counts, first/second endings, multipart import-to-playback consistency and unsupported structures. This is intentionally not general MusicXML 4.0 support: D.S./D.C. navigation, segno/coda, nested repeats, third endings and complex repeat structures remain unsupported. Physical Android testing remains outstanding.

---

## 23 November 2026 — v1.11.2 Beta: contiguous MusicXML ties

- Added validated note-to-note ties within independent instrumental voices, including ties spanning multiple measures and middle notes that both stop and restart a tie.
- MusicXML import accepts supported `<tie>` and `<notations><tied>` markers, checks mismatches, rejects orphaned/unfinished ties and exports both sounding and engraved markers.
- Imported ensemble playback merges tied note segments into a single sustained attack. A playback excerpt beginning partway through a tied note restarts the clipped remainder, rather than skipping it.
- Multi-part score preview displays lightweight tie curves between consecutive notated events, including partial curves when a system boundary intervenes.
- Six additional regression cases cover multimeasure continuity, malformed chains, sounded/exported tie markers, excerpt clipping, independently voiced unisons and displayed curves.
- All 249 automated tests passed and GitHub Pages deployment succeeded in run 45208042410 before this version-label commit.
- Scope remains deliberately limited: complete MusicXML 4.0 compliance, arbitrary score engraving, advanced repeats, sampled articulation fidelity and physical Android audio verification are not yet certified.

---

## 23 November 2026 — v1.11.1 Beta: score fidelity, guided learning and microphone reliability

- Improved MusicXML multi-part import/export: written pitch spelling and enharmonic distinctions are retained alongside independent voices, simultaneous chord-note groups, basic dynamics, articulations, tuplets and finger numbers.
- MusicXML explicitly rejects unsupported ties, transposition, complex repeat endings and harmonies instead of silently discarding musical information; complete MusicXML compatibility remains an open milestone.
- Expanded imported polyphonic staff preview with corrected written notehead positions, ledger lines, solo eighth/sixteenth flags, more visible multi-voice offsets, open half-note heads, whole-note heads without stems, explicit accidentals, clefs and time signatures. Full collision avoidance and page engraving are still unfinished.
- Added a structured non-gated guided learning pathway with timed exercises, practical steps, success checks and self-reported spaced reviews.
- Local microphone note comparison now requires consecutive confident, stable monophonic pitch estimates before presenting a cents-based assessment; unstable input is reported as uncertain and neither saved nor uploaded.
- 243 automated Node tests passed at commit b05a10859e55fb92e4205f27cc6db8d5585e20bb. Real Android hardware validation and source-backed verification of commercial-song transcriptions remain outstanding.
- This changelog update starts a fresh Pages deployment after the previous workflow's redeploy encountered duplicate action artifacts.

---

# v1.6.0 Preview — Connected Song Repository

- New separate repository tab in Songbook, two bundled original practice scores, search and difficulty filters, safe remote sync and independent personal copying.
- Strict schema and score validation prevents incomplete/malformed remote catalogs from overwriting cached song references.
- HTTPS/same-origin source URL support, app-cache integration, atomic local snapshot storage, provenance metadata, future GitHub submission workflow.
- No existing guitar repository edited; no direct GitHub deployment yet.

---

## v1.5.0 Preview — Underground Edition UI (19 November 2026)

- Implemented the approved Underground Garage × Industrial Racing design throughout the existing app.
- Score Studio is now notation-first, with a dominant light score, separate event inspector, synchronized fretboard below it and a distinct transport / reference-pitch bar.
- Reordered desktop and mobile navigation around the music workflows and added accessible, high-contrast, responsive CSS without external fonts or asset fetches.
- Redesigned shared cards, lesson states, Practice Room, Songbook and tuner gauge styling; kept all editing, playback, backups and MusicXML logic.
- Added offline-readable design-system documentation and acid-lime PWA app icons. Cache version incremented to 1.5.0.
- Updated existing test fixtures for cache-version changes. New browser UI smoke validates editing, saving, learning navigation and mobile width.
- This remains a preview. Genuine browser-origin PWA testing, real acoustical tuner calibration and actual VexFlow rendering remain outstanding.

## v1.4.0 Preview — 19 November 2026

- Repaired service-worker cache cleanup: previous versions deleted all other origin caches during activation; now only `uke-workbench-*` keys are deleted, preserving unrelated apps. Added install atomicity, app-scope request handling, offline navigation fallback, query-insensitive precache lookup and static-response caching.
- Added six Node service-worker lifecycle/cache tests, two device cache-diagnostic tests, and a dependency-free Node HTTP server with automated serving checks. A separate Python HTTP check is also available.
- Replaced font-dependent missing-glyph installation icon with a stable, geometric SVG and 192/512 PNG manifest icons.
- Practice Room checks cached essential shell files without pretending that real offline installation or persistence has been tested.
- Preserved all existing music-model, Score Studio, MusicXML, tuner-signal and backup functionality.
- Limitations: no actual browser-origin service-worker install/reload or physical ukulele tuner calibration in this environment, no real VexFlow library render, no GitHub deployment.

## v1.3.0 Preview — 19 November 2026
- New Practice Room device-readiness check for secure origin, temporary local-storage read/write, service-worker activation, microphone API presence and persistence-grant status. Never starts microphone or network requests.
- Full backup preflight and staged, verified storage writes with rollback on error; clear warning if rollback fails. Invalid scores and practice records fail without replacing current work.
- Restore compatible notation+tab view, tuning and score-draft identity more safely.
- Updated offline pre-cache for the two new pure modules and added a dedicated browser/UI and rollback test suite.
- **109/109 Node tests pass; new desktop/mobile browser tests and selected prior backup, MusicXML and progression regression suites pass.**
- Still unverified: real-browser-origin service worker/install/persistence, actual VexFlow drawing, physical ukulele tuner calibration and production deployment.

## v1.2.0 Preview — 19 November 2026

- Added opt-in VexFlow 5 engraved score preview; canonical score remains the source of truth and original notation/tabs remain usable offline. The downloadable VexFlow library itself could not be tested in this restricted environment.
- Broadened the MusicXML partwise importer for unchanged repeated attributes, omitted optional note type, and layout-only `<print>` elements; still reject unsupported musical changes.
- Extracted microphone pitch estimator into a local, YIN-style DSP module and added synthetic low/high-G and baritone tests.
- Added static service-worker asset checks, real-device PWA/acoustic tuner QA checklist, and safe-offline-fallback browser test.
- Preserved existing feature data, musical model, Songbook and JSON backup schema.

## v1.1.0 Preview — MusicXML score exchange (19 November 2026)
- Added `src/musicxml.js`: MusicXML 4.0 partwise export of canonical notation-first score events, duration/divisions, written pitch octaves, major key signatures, fret indications, chord stacks, tied/slurred notes and articulation.
- Added Score Studio export/import UI with a confirm-before-overwrite file import, 2 MB import cap and explicit unsupported-file rejection.
- Import is deliberately limited to one non-transposing treble-clef part and a single rhythmic voice; `.mxl`, polyphony, tuplets and unsupported ornamentation are not supported. XML is not a full app backup.
- Native JSON backup and existing Songbook remain unchanged and compatible.
- Tests: 86 Node tests and dedicated DOMParser/browser export/import verification. See `BUILD_LOG_v1.1.0-preview.txt` for regression limits.
- Pending: music engraving engine replacement, MusicXML broader interoperability, actual browser-origin service worker tests, physical tuner QA and dedicated GitHub repository.

## v1.0.0 Preview — 19 November 2026
- Added canonical key-signature and written-pitch reading model (`src/reading-lessons.js`).
- Key identification quiz: 15 major key signatures, relative minor mode, visual staff examples, explanations and local progress.
- Graded pitch sight-reading: eight two-bar études in seven major keys; the selected written note is answered by name and octave, with optional fingering hint, synthesized note playback, instrument tuning selector and Score Studio transfer.
- Preserve actual written accidental/spelling versus sounding MIDI pitch and tuning-specific first-12-fret positions; explicit tests for B♯3/C4 and C♭4/B3.
- Backups include optional `notationReadingProgress`, validated on restore. Previous schema-v2 backups remain readable.
- 81 Node tests passing; original and v0.3–v0.9 browser suites plus v1.0 desktop/mobile and backup smoke tests pass.
- Still not verified: PWA install on real browser origin, persistent real-origin localStorage, tuner accuracy on instrument, professional engraving, deployment. No production release claim.

# Changelog

## v0.9.0 — Notation Academy: Rhythm Sight-Reading (19 November 2026)
- Added eight two-bar notation-first studies across 4/4, 3/4 and 6/8, with explicit rests and dotted durations.
- Added measured count-in and reference audio followed by keyboard/touch onset tapping, tempo-aware matching, missed/extra hit reports and local progress.
- Added a small, reversible rhythm-aware event-spacing improvement to SVG engraving, without claiming professional page layout.
- Included the new optional rhythm-study record in existing schema-2 JSON backup and restore; older backups still load.
- 73/73 Node music-model tests, new desktop/mobile timed-browser and backup round-trip, all seven earlier browser suites passed.
- Remaining: actual browser-origin persistence/PWA install, acoustic tuner calibration, professional engraving/MusicXML, dedicated GitHub repository and TypeScript migration.


## v0.8.0 — Minor keys and notated rhythmic progressions (19 November 2026)
- Added relative-major key signatures for natural and harmonic minor, with playable triads and seventh chords in every supported tuning and conventional key.
- Enabled several chord attacks inside 4/4, 3/4 and 6/8 measures, with selectable durations and explicit rests for gaps when a chord cannot fit.
- Added rhythm presets: four quarter downstrokes, island strum D-D-U-U-D, half-time, waltz and compound 6/8. Score, optional tab, playback and saved song all use the same timeline.
- Preserved v0.7 schema-1 progression drafts and schema-2 JSON backups; older four-beat chords remain unchanged when opened.
- Validated 64/64 automated Node tests; six older browser suites and new v0.8 desktop/mobile browser workflow passed.
- Open limitations: dedicated GitHub repo, real-origin PWA/storage, microphone validation and production notation engraving.


## v0.7.0 — Progression Builder (19 November 2026)
- Added a notation-first diatonic chord progression builder, 16-measure maximum, major keys, triads and seventh chords, per-measure strumming direction and arranged playback.
- Added generated three/four-string ukulele chord voicings to the validated score model, with independent written spellings, exact physical frets and correct tuning transformations.
- Integrated progressions with Fretboard & Theory, Score Studio and Songbook, including save/open controls and local persistence in the existing JSON backup format.
- Maintained earlier score and technique features; 53 automated Node tests plus all six desktop/mobile browser suites pass (new v0.7 suite and original/v0.3/v0.4/v0.5/v0.6 regressions).
- Remaining: 4/4 one-chord-per-bar only, no minor-key progression rules, no production music engraver or MusicXML, no physical tuner/real-origin PWA QA, no GitHub deployment.


## v0.6.0 — Chord transitions, strumming and articulation (19 November 2026)
- Added true four-string chord events with tuning-aware C, F, G7 and Am shapes; notation stacks, optional synchronized tablature and audible up/down strumming.
- Added playable LH-03 chord transitions, RH-04 strumming and MU-02 slurs/staccato studies, bringing the guided lesson total to ten; other syllabus topics remain planned.
- Added distinct adjacent-note slurs, staccato/tenuto/accent markings and simplified reference audio, without conflating slurs with sustained ties.
- Score Studio can add, replace and save four-string chord events and articulation. Changing tuning regenerates chord pitches/frets. Songbook and backups retain the new attributes.
- Added interactive four-symbol reading quiz on ties, slurs, staccato and accents; scores persist locally.
- Validated model through 44 automated Node tests and regression/browser flows on desktop and a 390px mobile viewport; real-device audio/PWA/tuner checks are still pending.

## v0.5.0 — Technique Academy (19 November 2026)
- Seven tuning-aware playable technique études with notation-first scores and optional tablature.
- Optional right/left fingering labels, selectable exercise pitches, step-by-step fingering hints and 4-beat count-in playback.
- Per-lesson adjustable tempo and clearly self-reported confidence progress stored locally.
- Technique practice records included in JSON backup/restore, compatible with older backup files.
- Copy an exercise directly into Score Studio without overwriting the current score silently.
- Tested 33 Node cases (all passing), new desktop/mobile Technique Academy browser smoke, v0.4 and v0.3 regressions.
- Limitations unchanged: not a physical technique assessment, no professional engraving, no real-device mic testing or GitHub deployment.


## 0.4.0 — 19 November 2026
- Added all 15 standard major key signatures to staff engraving and score settings, with key-aware accidental rules and legacy-C-major compatibility.
- Added dotted notes/rests (.375, .75, 1.5, 3 quarter beats) with dot glyphs, timing validation and beat-aware beam grouping.
- Added validated ties between adjacent identical written/sounding notes, including barline ties and tied playback that does not retrigger.
- Added an interactive nine-question rhythm-reading activity with local progress tracking to Notation Academy.
- Added 7 notation tests (25 total) and passed previous and new desktop/mobile browser checks.
- Kept source dependency-free and all user-created scores in existing local storage format; no deployment and no acoustic tuning device validation.

## 0.3.0 — 19 November 2026
- Added score editing Undo/Redo with 60-step in-session history and keyboard shortcuts.
- Added insert before/after a selected event with atomic overflow rejection, plus explicit empty measure creation.
- Improved rhythmic SVG engraving with beams for short-note groups in 4/4, 3/4 and 6/8.
- Added written-octave-aware bar accidentals, including cancellation naturals.
- Preserved physical fingering on same-pitch edits; invalid writes no longer mutate the original score.
- Added the Technique Lab to the mobile bottom navigation.
- Updated offline asset pre-cache to include the history module; bumped service-worker cache version.
- Added six Node tests (18 total) and a browser interaction suite for Undo/Redo, inserts, recovery and mobile.
- Updated the existing Google Docs project tracker; no GitHub deploy and no physical tuner test yet.


## 0.2.0 — 19 November 2026
- Added measured, notation-first Score Studio and independent musical-event model.
- Added note/rest values, supported time signatures, pitch spellings and score-to-tab synchronization.
- Added playable string/fret selection, timeline-based audio and playhead highlighting.
- Integrated score snapshots with Songbook and upgraded JSON backup format to v2 with v1 import compatibility.
- Added six new music-model unit tests (12 total) and desktop/mobile browser smoke checks.
- Updated the existing Google Docs build tracker in place; milestone gates still pending.

## 0.1.0 — 19 November 2026
- Initial dependency-free browser app with scale and chord explorer, note-reading quiz, tuner and metronome prototypes, technique/rhythm sections, and local song sketches.
