/** Notation-first key-signature and pitch-reading curriculum.
 * Pure music/lesson logic; the UI is deliberately independent of microphone input.
 */
import {TUNINGS,LETTERS,mod,notePc,optionsForMidi,spelledScale} from './music.js';
import {KEY_SIGNATURES,createScore,appendEvent,timeline,validateScore} from './score.js';

export const KEY_SEQUENCE=Object.freeze(['C','G','F','D','Bb','A','Eb','E','Ab','B','Db','F#','Gb','C#','Cb']);
export const READING_STUDIES=Object.freeze([
 {id:'SR-01',key:'C',title:'Stepwise C major',level:1,degrees:[0,1,2,4,4,2,1,0],goal:'Identify lines and spaces without note-name labels.'},
 {id:'SR-02',key:'G',title:'One sharp',level:1,degrees:[0,2,4,6,6,4,2,0],goal:'Remember that the F in the key of G is F♯.'},
 {id:'SR-03',key:'F',title:'One flat',level:1,degrees:[0,3,5,6,6,5,3,0],goal:'Read B♭ as part of the key signature.'},
 {id:'SR-04',key:'D',title:'Two sharps',level:2,degrees:[0,1,2,3,4,3,1,0],goal:'Find F♯ and C♯ without printed accidental signs.'},
 {id:'SR-05',key:'Bb',title:'Two flats',level:2,degrees:[0,2,3,5,5,3,2,0],goal:'Read B♭ and E♭ without note-name prompts.'},
 {id:'SR-06',key:'A',title:'Three sharps',level:2,degrees:[0,2,4,5,6,5,2,0],goal:'Identify the F♯, C♯ and G♯ scale tones.'},
 {id:'SR-07',key:'Eb',title:'Three flats',level:3,degrees:[0,1,3,5,6,5,1,0],goal:'Recognize the three-flat signature before looking at the fretboard.'},
 {id:'SR-08',key:'G',title:'A short G-major phrase',level:3,degrees:[4,3,2,1,0,1,2,4],goal:'Follow a full phrase, not just isolated notes.'}
]);
export function relativeMinor(key){
 if(!Object.hasOwn(KEY_SIGNATURES,key))throw new Error('Unsupported key signature');
 return spelledScale(key,'major')[5].name;
}
export function keyQuestion(index,mode='major'){
 if(!Number.isInteger(index)||index<0||!['major','relativeMinor'].includes(mode))throw new Error('Invalid key-signature exercise');
 const key=KEY_SEQUENCE[index%KEY_SEQUENCE.length];
 const correct=mode==='major'?key:relativeMinor(key);
 const pool=KEY_SEQUENCE.map(k=>mode==='major'?k:relativeMinor(k));
 const correctIndex=pool.indexOf(correct);
 // Deterministic, distinct answer choices: the intended key plus three nearby signatures.
 const values=[correctIndex,mod(correctIndex+1,15),mod(correctIndex+4,15),mod(correctIndex+9,15)].map(i=>pool[i]);
 const choices=[values[2],values[0],values[3],values[1]];
 return {key,mode,correct,choices,accidentals:KEY_SIGNATURES[key],index:index%KEY_SEQUENCE.length};
}
const WRITTEN_NATURAL={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function writtenOctave(midi,spelling){
 if(!Number.isInteger(midi)||typeof spelling!=='string'||notePc(spelling)!==mod(midi,12))throw new Error('Invalid written pitch');
 const accidental=[...spelling.slice(1)].reduce((a,c)=>a+(c==='#'?1:-1),0);
 return Math.round((midi-WRITTEN_NATURAL[spelling[0]]-accidental)/12)-1;
}
export function writtenName(midi,spelling){return `${spelling}${writtenOctave(midi,spelling)}`;}
export function sightStudy(id){const study=READING_STUDIES.find(s=>s.id===id);if(!study)throw new Error('Unknown reading study');return study;}
export function sightStudyScore(id,tuning='highG'){
 const lesson=sightStudy(id);
 if(!Object.hasOwn(TUNINGS,tuning))throw new Error('Invalid tuning');
 const notes=spelledScale(lesson.key,'major');
 const rootPc=notePc(lesson.key);
 // Choose a tonic octave for which all printed pitches can be fretted on this instrument.
 const candidates=[];
 for(let tonicMidi=48;tonicMidi<=74;tonicMidi++){
  if(mod(tonicMidi,12)!==rootPc)continue;
  const playable=lesson.degrees.map(d=>{
   const midi=tonicMidi+notes[d].step;
   const options=optionsForMidi(midi,tuning,12);
   return {midi,spelling:notes[d].name,options};
  });
  if(playable.some(v=>!v.options.length))continue;
  const score=playable.reduce((sum,v)=>sum+Math.min(...v.options.map(o=>o.fret*.35+Math.abs(v.midi-66)*.18)),0);
  candidates.push({score,playable});
 }
 if(!candidates.length)throw new Error('No playable placement for the reading étude');
 candidates.sort((a,b)=>a.score-b.score);
 const best=candidates[0].playable;
 const score=createScore({title:'Sight-reading exercise',key:lesson.key,tuning,meter:'4/4',tempo:72,sample:false});
 let previousString=2,previousFret=0;
 for(const note of best){
  const opts=[...note.options].sort((a,b)=>
   (a.fret*.5+Math.abs(a.string-previousString)*.6+Math.abs(a.fret-previousFret)*.14)
   -(b.fret*.5+Math.abs(b.string-previousString)*.6+Math.abs(b.fret-previousFret)*.14));
  const choice=opts[0];
  appendEvent(score,{type:'note',midi:note.midi,spelling:note.spelling,duration:1,position:{string:choice.string,fret:choice.fret}});
  previousString=choice.string;previousFret=choice.fret;
 }
 validateScore(score);
 if(score.measures.length!==2)throw new Error('Reading study must contain two measures');
 return score;
}
export function sightEvent(score,index){
 validateScore(score);if(!Number.isInteger(index)||index<0)throw new Error('Invalid sight-reading position');
 return timeline(score).filter(e=>e.type==='note')[index]??null;
}
export function sightChoices(score,index){
 const current=sightEvent(score,index);if(!current)throw new Error('No note at this position');
 const correct=writtenName(current.midi,current.spelling);
 const pool=timeline(score).filter(e=>e.type==='note').map(e=>writtenName(e.midi,e.spelling));
 const alternates=[];
 for(const name of pool){if(name!==correct&&!alternates.includes(name))alternates.push(name);}
 const octave=writtenOctave(current.midi,current.spelling);
 for(const letter of LETTERS){const name=letter+octave;if(name!==correct&&!alternates.includes(name))alternates.push(name);}
 const choices=[correct,...alternates.slice(0,3)];
 // Stable presentation order changes with the note index but never changes correctness.
 const shift=index%choices.length;
 return {correct,choices:[...choices.slice(shift),...choices.slice(0,shift)]};
}
export function gradeSightNote(score,index,answer){
 const {correct,choices}=sightChoices(score,index);
 if(typeof answer!=='string'||!choices.includes(answer))throw new Error('Unsupported answer');
 return {correct,passed:answer===correct};
}
export function recordReadingProgress(prev,id,passed){
 if(!prev||typeof prev!=='object'||Array.isArray(prev)||typeof passed!=='boolean')throw new Error('Invalid reading progress');
 if(id!=='keys-major'&&id!=='keys-relativeMinor'&&!READING_STUDIES.some(s=>s.id===id))throw new Error('Unknown reading exercise');
 const old=prev[id]??{attempts:0,correct:0};
 return {...prev,[id]:{attempts:Math.min(100000,old.attempts+1),correct:Math.min(100000,old.correct+(passed?1:0))}};
}
export function validReadingProgress(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 return Object.entries(value).every(([id,v])=>
  (id==='keys-major'||id==='keys-relativeMinor'||READING_STUDIES.some(s=>s.id===id))
  &&v&&typeof v==='object'&&!Array.isArray(v)
  &&Number.isInteger(v.attempts)&&v.attempts>=0&&v.attempts<=100000
  &&Number.isInteger(v.correct)&&v.correct>=0&&v.correct<=v.attempts);
}
