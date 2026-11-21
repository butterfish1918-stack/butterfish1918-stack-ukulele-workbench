# Source-Based Guitar Part Adaptation

**Purpose:** Convert a user-provided six-string guitar part into playable **standard high-G GCEA ukulele notes**, preserving the written pitches when physically possible, musical timing and section boundaries, and flagging any unavoidable octave displacement.

This feature does **not** reconstruct guitar riffs from a chord chart or infer original guitar lines from a recording. Existing song-form accompaniments in the repository are useful practice scores but have **not** been checked note-for-note against the original guitar performances. Never label them source-accurate.

## Use in the app

1. Obtain or prepare a transcription you are entitled to use (your own work, authorized notation, or material in the public domain). A guitar tab *without rhythm* is insufficient to certify timing.
2. Go to **Score Studio** and choose **Download Guitar Source Template** to see the supported JSON format.
3. Enter or convert the guitar notes with exact string numbers, frets and durations. Use **0 = lowest E string**, **5 = highest e string**; frets are 0–24. For nonstandard tuning, provide `guitarTuning` as six MIDI note numbers, low to high.
4. Choose **Adapt Guitar Notes (JSON)**. The app first validates the complete source and adapted score; no current draft is overwritten until you confirm. The confirmation reports how many notes need octave movement.
5. Inspect the new staff and optional tab, practise the result, and save it to **My Songbook**. Preserve the source and record your editorial choices separately.

## Format

The included original two-bar example looks like this:

```json
{
  "format": "ukulele-workbench-guitar-source",
  "schemaVersion": 1,
  "title": "Original guitar phrase",
  "guitarTuning": [40,45,50,55,59,64],
  "key": "C",
  "meter": "4/4",
  "tempo": 96,
  "measures": [
    {
      "section": "Original riff",
      "events": [
        {"type":"note","string":0,"fret":0,"duration":1},
        {"type":"note","string":0,"fret":2,"duration":0.5},
        {"type":"note","string":0,"fret":3,"duration":0.5},
        {"type":"note","string":1,"fret":0,"duration":1},
        {"type":"rest","duration":1}
      ]
    }
  ]
}
```

Durations are in quarter-note units: `1` = quarter, `0.5` = eighth, `2` = half, `1.5` = dotted quarter, etc. The allowed values match Score Studio, which currently supports **3/4, 4/4 and 6/8 only**. Include a complete source with sections rather than guessing durations from plain monospaced ASCII fret spacing.

The output is an independent, validated ukulele score. It chooses the closest playable note and fingering through a global voice-leading search, considering octave displacement, melodic intervals, fret movement and string changes. A note below the high-G range often rises by one or more octaves, and this is reported as an adaptation decision rather than concealed as a faithful original pitch.

## Technical limitations

- The current canonical Score Studio model is single-voice. It supports notes, rests and certain complete chords, but does not support two-note dyads and freely moving polyphonic guitar parts. The source importer therefore **rejects simultaneous guitar notes** until independent voice handling is implemented. It never silently drops a recorded voice.
- Slides, bends, palm muting, tremolo and other guitar articulations are not preserved by this importer.
- Four re-entrant strings cannot preserve all low-register guitar bass lines. The adapter reports octave displacement and keeps pitch class and rhythm; where that destroys the character of a bass riff, a low-G ukulele or a manual rewrite may be preferable.
- A correct programmatic adaptation depends on the accuracy of the **supplied transcription**. This feature does not verify a score against an audio recording or certify authenticity.
- Importing a source into Score Studio affects only the current local browser draft after confirmation. Your repository library and existing Songbook entries are not automatically changed.

## Existing repertoire

The 14 modern-song scores in `library/songs/` at revision 2 are **song-form, harmony-led accompaniment studies**, not exact source-guitar scores. Only publish a replacement as guitar-source-verified after obtaining the actual guitar notes, rhythms and articulation, adapting the playable part, listening against the recording, and documenting remaining compromises. The original historical Scarborough Fair melody remains separately identified.
