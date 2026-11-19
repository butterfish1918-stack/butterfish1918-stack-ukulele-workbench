# Ukulele Workbench — Underground Garage × Industrial Racing

## Release
v1.5.0 Preview — visual implementation of the approved mid-2000s extreme-racing interface. Applied to the existing application, not a new prototype. The software remains local-first and notation-first. No external stylesheets, fonts or image services are required.

## Visual identity
- **Asphalt** `#101315`: background and dark industrial frame
- **Acid lime** `#B9F700`: active navigation, selected notes, transport PLAY, primary actions and beat-state feedback
- **Burnt orange** `#FF7A24`: speed stripes, tempo, emphasis, warnings and timing markers
- **Industrial silver** `#D8DCE0`: structural borders, primary labels and panels
- **Signal red** `#EF4738`: errors and out-of-tune gauge extremes
- **Clean score surface** `#F0F0EB`: notation must be more legible than the surrounding interface

No logos, interfaces, photography or other assets were copied from the referenced games. Their mid-2000s style vocabulary influenced original, self-authored CSS: diagonal cut corners, racing stripes, industrial texture, mechanical HUD, restrained glow, condensed italic labels and black alloy panels. The app must never place texture over the notation or graded quiz text.

## Interface hierarchy
**Score Studio:** a dominant light notation canvas in the left primary column, narrower note inspector on the right, tuning-aware fretboard underneath, and standalone rehearsal/transport strip with real reference pitch and bar progress. All editing events and Songbook controls are the existing tested actions. Session configuration collapses below the score rather than consuming the primary view. Standard notation remains the default; tablature remains opt-in.

**Practice Room:** rehearsal dashboard with three telemetry-style practice counters, session drill order and local history. Uses the same navigation, but a task-specific rhythm and activity hierarchy.

**Notation Academy:** legible note-reading/quiz area with light music canvases and graduated stage indicators. The music paper must not inherit the dark distressed backgrounds.

**Technique Academy:** drill cards and reference exercises, with orange movement accents.

**Songbook:** track-select style entries and a retained lossless JSON export/restore pathway. The redesign does not change data format.

**Tuner:** high-contrast mechanical gauge with visible numeric cents and clear target note. Design does not imply actual microphone calibration; that is still a separate device QA task.

## Responsive behavior
- Desktop ≥1020 px: sidebar, large Score Studio canvas, narrow note inspector, fretboard beneath score, rehearsal transport following both.
- Tablet: stacked score → fretboard → inspector, so notation remains first.
- Mobile ≤720 px: swipeable inner music staff/fretboard areas; page itself must not scroll sideways; 8-item horizontally scrollable mode navigation remains at the viewport bottom. No musical controls hidden behind decorative material.
- The default workspace opens in Score Studio, with an existing note selected (if present) so that notation/fret/HUD connections are evident.

## Usability and constraints
Preserve native select controls, screen-reader labels, visible focus outlines, reduced-motion preference, all keyboard shortcuts, timed playback, editing, independent Songbook data and backup safety. All animations must be non-essential and respect `prefers-reduced-motion`. Typography falls back to installed sans-serif fonts offline; no redistributable font packages are bundled. The optional VexFlow preview remains online-only and unverified as before.

## Future refinements
Dedicated graphical tachometer for tuner, variable panel texture density, visual scale selection and more custom training-completion feedback. These are design tasks, not claims of working functionality.
