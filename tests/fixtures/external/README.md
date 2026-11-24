# External MusicXML compatibility corpus

These eight **unchanged**, open-licensed fixture files come from the W3C Music
Notation Community Group's [MusicXML Test Suite](https://github.com/w3c-cg/musicxmlTestSuite),
which is maintained independently of Ukulele Workbench and distributed under
the MIT license reproduced in [LICENSE](LICENSE).

Upstream paths:
- xmlFiles/01c-Pitches-NoVoiceElement.musicxml
- xmlFiles/03b-Rhythm-Backup.musicxml
- xmlFiles/21a-Chord-Basic.musicxml
- xmlFiles/33b-Spanners-Tie.musicxml
- xmlFiles/45a-SimpleRepeat.musicxml
- xmlFiles/45b-RepeatWithAlternatives.musicxml
- xmlFiles/45c-RepeatMultipleTimes.musicxml
- xmlFiles/45f-Repeats-InvalidEndings.musicxml

Tests use actual fixture bytes, Python's standard XML parser as a test-only
DOM adapter, and the application's real MusicXML import/export and playback
logic. The shipped browser importer still uses the native browser DOMParser.

This is a **targeted interoperability regression suite**, not MusicXML
conformance certification. Some XML information, including lyrics, rich
engraving directives and source metadata, is not round-tripped. Unsupported
nested/invalid repeat structures are deliberately rejected, not auto-fixed.
No source from the user's copyrighted song repertoire is embedded here.
