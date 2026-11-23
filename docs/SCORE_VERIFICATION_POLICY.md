# Mandatory Score-Source Verification Policy — Ukulele Workbench

**Standing hard rule: applies to every song, instrument and future source revision.**

## A. Never claim an unexamined score is confirmed

Do not call any score **accurate to the original recording**, **verified**, **official**, or **confirmed** merely because it plays or appears on a guitar-tab website, MuseScore, or a general song page. The existing 15 approved-song accompaniments and generated bass, piano and drum lines are practice arrangements, not original instrumental transcriptions.

For every individual instrument (ukulele, guitar, bass, piano, drums, vocals and other supported instruments):

1. Identify the correct recording/edition, section, named instrument, and source arrangement.
2. Inspect **at least two genuinely independent editions** with named transcribers or publisher attribution. Candidate references: MuseScore (https://musescore.com/), Ultimate Guitar (https://www.ultimate-guitar.com/), Songsterr (https://www.songsterr.com/), GuitarTabs (https://www.guitartabs.cc/) and publisher-authorized sheet music. Ratings and search previews are not proof of accuracy.
3. Compare **actual notes, pitch/harmony, rhythm, durations, rests, meter, bar alignment, arrangement form, instrument identity, range and fingering**. For drums, inspect the beat and kit hits, not merely the presence of drums. For vocal parts, verify syllable/bar alignment. Where sources disagree, retain a pending status until resolved.
4. Log the exact URLs, editions/authors, source independence, checking date, reviewer, bars checked, observed disagreements, transposition decisions and adaptations.
5. Assess reuse permissions separately. A publicly viewable user-uploaded guitar tab, score or lyric sheet does not automatically authorize copying or republishing it. Only publish original, public-domain or explicitly licensed score/lyric content.

## B. Project enforcement

src/score-verification.js is the hard gate for declaring any part independently confirmed. It requires instrument identity, checked score editions from **two distinct sources**, a real review date, reviewer, edition, measure count, notes on the comparison, six explicit pitch/rhythm/instrument/range/edition/alignment checks, and a rights basis.

scripts/validate-score-sources.mjs runs in GitHub Pages CI and rejects published confirmation claims without this evidence. The Songbook displays **Instrument-specific score check pending**, **Reconstructed practice part**, or **Independently checked** for each scored instrument. A recording personnel credit or generic sourceUrl does not prove exact notes.

Every new import, arrangement, library update or generated track must preserve this distinction. A guitar part adapted to ukulele range does not become verified just because its note pitches fit.

## C. Lyrics

Only display song lyrics the user has supplied and is entitled to use, or lyrics demonstrably in the public domain or with permission to publish. Lyrics must be assigned to exact measures and remain optional for both notation and tablature. **Never fill gaps by inventing original lyrics.** When lyrics are absent, use **Section** cues (Verse, Chorus, Bridge) for navigation and label them as section headings, not as words sung.

Do not automatically scrape or redistribute commercial lyrics or protected music notation from reference sites.

## D. Current status

The modern approved repertoire remains an unverified harmony-led teaching arrangement catalog. Additional bass, keyboard and drum parts are reconstructed rehearsal material unless independently checked and legally sourced. This rule is mandatory for any future edits and does not imply that the existing songs have already been checked.
