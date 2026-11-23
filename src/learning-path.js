/** Non-gated skill progression. These are short, inspectable practice tasks;
 * confidence is self-reported rather than inferred from the microphone.
 */
export const LEARNING_UNITS=Object.freeze([
 {id:'staff',name:'Read the five-line staff',level:1,category:'notation',target:'Identify treble-clef pitches without labels',
  minutes:6,steps:['Read eight notes on the treble staff without note-name hints.','Name each note and find it on a single ukulele string.','Repeat the phrase at 60 BPM using the notation view.'],success:'Read eight successive notes accurately without prompts.'},
 {id:'rhythm',name:'Count note durations',level:1,category:'rhythm',target:'Read rests, dotted notes and syncopation',
  minutes:6,steps:['Count four steady beats aloud.','Clap a written rhythm containing an eighth-note rest and one dotted note.','Repeat with the metronome at 60 and 80 BPM.'],success:'Keep the pulse through rests without restarting.'},
 {id:'positions',name:'Fretboard position shifts',level:2,category:'technique',target:'Play identical pitches at different positions',
  minutes:7,steps:['Choose a note available on two strings.','Play its two positions at the same pitch and volume.','Alternate between the positions over eight slow beats.'],success:'Change strings without changing the sounding note or pulse.'},
 {id:'fingerstyle',name:'Independent p-i-m-a fingers',level:2,category:'technique',target:'Maintain alternate-bass and arpeggiated textures',
  minutes:8,steps:['Play a slow p-i-m-a sequence on four strings.','Accent each successive finger once without increasing tempo.','Repeat eight cycles with relaxed hand movement.'],success:'Keep eight complete cycles even and relaxed.'},
 {id:'campanella',name:'Campanella fingering',level:3,category:'technique',target:'Allow adjacent notes to ring across different strings',
  minutes:8,steps:['Choose three adjacent playable melody notes on different strings.','Pick each at 55 BPM without muting the preceding string.','Compare their overlapping sustain with notes played on one string.'],success:'Allow consecutive notes to overlap while retaining a steady rhythm.'},
 {id:'chord-melody',name:'Chord melody arranging',level:3,category:'technique',target:'Preserve melody on top while supplying harmony',
  minutes:10,steps:['Write a four-note melody in staff notation.','Find supporting two- or three-note chord shapes on the ukulele.','Play slowly, checking that the melody stays audible above the accompaniment.'],success:'Keep every melody pitch and its onset while adding harmony.'},
 {id:'voices',name:'Two independent musical voices',level:4,category:'notation',target:'Read and practise overlapping rhythmic voices',
  minutes:10,steps:['Read the upper staff voice and count its attacks.','Read the lower staff voice while tapping the upper rhythm.','Practise the two voices together at half tempo.'],success:'Preserve both voices and their independent note lengths.'},
 {id:'phrasing',name:'Expressive phrasing and dynamics',level:4,category:'technique',target:'Apply timing, accents and note lengths intentionally',
  minutes:8,steps:['Mark one phrase peak and its cadence.','Play the phrase first evenly, then with a deliberate dynamic contour.','Record your interpretation in the practice notes and compare.'],success:'Express a clear phrase shape without altering written pitches.'}
]);
const INTERVAL_DAYS=Object.freeze([1,1,2,4,7,14]);
export function learningReview(units,progress={}, {now=Date.now()}={}){
 if(!Array.isArray(units))throw Error('Learning units must be an array');
 const timestamp=now instanceof Date?now.getTime():Number(now);
 if(!Number.isFinite(timestamp))throw Error('Invalid review timestamp');
 return units.map(unit=>{
  const item=progress?.[unit.id]||{},confidence=Number(item.confidence)||0;
  const last=Date.parse(item.reviewedAt||''),days=INTERVAL_DAYS[Math.min(5,Math.max(0,confidence))];
  const dueAt=Number.isFinite(last)?last+days*86400000:null;
  return {...unit,sessions:Math.max(0,Number(item.sessions)||0),confidence,
   intervalDays:days,dueAt,needsReview:dueAt===null||timestamp>=dueAt};
 });
}
export function suggestedLearningUnits(units,progress={}, {now=Date.now(),limit=2}={}){
 if(!Number.isInteger(limit)||limit<1||limit>8)throw Error('Invalid learning plan length');
 return learningReview(units,progress,{now}).sort((a,b)=>
  Number(b.needsReview)-Number(a.needsReview)||
  a.level-b.level||a.sessions-b.sessions||a.id.localeCompare(b.id)).slice(0,limit);
}
export function recordLearningReview(progress,id,confidence){
 if(!LEARNING_UNITS.some(unit=>unit.id===id))throw Error('Unknown learning unit');
 if(!Number.isInteger(confidence)||confidence<1||confidence>5)throw Error('Confidence 1–5 required');
 const old=progress?.[id]||{};
 return {...progress,[id]:{sessions:(old.sessions||0)+1,confidence,reviewedAt:new Date().toISOString()}};
}
