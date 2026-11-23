/** Workbench arrangement views from the actual available data.
 * These derived backing lines are NEW practice accompaniments, not original stems.
 * Never claim absent guitar, vocal or orchestral transcriptions were recovered.
 */
import {notePc,midiName} from './music.js';
import {measureBeats,validateScore} from './score.js';
import {chartChordSequence,chordPitchClasses} from './song-practice.js';
import {availableSongParts,originalInstrumentProfile} from './song-instrumentation.js';
import {playbackInstrumentFamily} from './instrument-voices.js';

export const SONG_ARRANGEMENT_MODES=Object.freeze([
 {id:'guitar-uke',label:'Guitar → ukulele',description:'Playable ukulele adaptation with optional instrumental backing; source guitar notes are not yet verified'},
 {id:'ensemble',label:'Full ensemble',description:'Ukulele and only source-confirmed bass, piano or drums; additional available parts are reconstructed practice arrangements'},
 {id:'solo',label:'Solo ukulele',description:'Only the available ukulele melody, chords and fingering; no other instruments'}
]);
export function chartChordsPerBar(arrangement){
 const {score}=arrangement;
 if(!score?.measures?.length)return [];
 const lines=String(arrangement.body||'').split(/\r?\n/);
 const sections=Array.isArray(arrangement.sections)&&arrangement.sections.length?arrangement.sections:null;
 const harmonies=Array.from({length:score.measures.length},()=>null);
 if(sections){
  for(const section of sections){
   const row=lines.find(line=>line.split(':')[0].trim().toLowerCase()===section.label.trim().toLowerCase());
   const chords=chartChordSequence(row?.slice(row.indexOf(':')+1)||'');
   if(!chords.length)continue;
   for(let bar=section.startBar-1;bar<section.endBar&&bar<harmonies.length;bar++)harmonies[bar]=chords[(bar-section.startBar+1)%chords.length];
  }
 }
 const fallback=chartChordSequence(arrangement.body||'');
 for(let i=0;i<harmonies.length;i++){
  const event=score.measures[i].events.find(ev=>ev.type==='chord' && ev.symbol);
  if(!harmonies[i])harmonies[i]=event?.symbol||fallback[i%fallback.length]||null;
 }
 return harmonies;
}
function scorePart(source,title,instrument){
 return {...source,id:source.id+'-'+instrument,title:title.slice(0,120),clef:instrument==='bass'?'bass8vb':instrument==='drums'?'percussion':'treble',measures:[]};
}
function noteAt(midi,duration,id){
 return {id,type:'note',midi,spelling:midiName(midi).replace(/-?\d+$/,''),duration};
}
function drumStudyMeasure(score,index,kind='acoustic'){
 const beats=measureBeats(score.meter);
 const subdivisions=Math.round(beats*2);
 const isCompound=score.meter==='6/8';
 const events=Array.from({length:subdivisions},(_,step)=>{
  const t=step*.5;
  const kick=step===0||(!isCompound&&step===4);
  const snare=isCompound?step===3:step===2||step===6;
  const hits=[...(kick?['kick']:[]),...(snare?['snare']:[]),'hat'];
  const midi=snare?38:kick?36:42;
  return {...noteAt(midi,.5,'practice-drum-'+index+'-'+step),drumHits:hits,drumStyle:kind};
 });
 return {events,...(score.measures[index].section?{section:score.measures[index].section}:{})};
}
export function buildPracticeParts(arrangement){
 const score=arrangement?.score;
 if(!score)throw Error('A published ukulele score is required');
 validateScore(score);
 const known=availableSongParts(arrangement);
 const profile=originalInstrumentProfile(arrangement);
 const chords=chartChordsPerBar(arrangement);
 const bass=scorePart(score,score.title+' — Bass practice line','bass');
 const keys=scorePart(score,score.title+' — Keyboard practice harmony','piano');
 const drums=scorePart(score,score.title+' — Drum study groove','drums');
 const cap=measureBeats(score.meter);
 for(let i=0;i<score.measures.length;i++){
  if(known.includes('drums'))drums.measures.push(drumStudyMeasure(score,i,profile.percussion||'acoustic'));
  const pcs=chordPitchClasses(chords[i]||'');
  const root=pcs?.[0]??null;
  // A bar without known harmony remains silent, rather than inventing notes.
  if(root===null){
   bass.measures.push({events:[{id:'practice-bass-rest-'+i,type:'rest',duration:cap}],section:score.measures[i].section});
   keys.measures.push({events:[{id:'practice-keys-rest-'+i,type:'rest',duration:cap}],section:score.measures[i].section});
   continue;
  }
  // Fingering-style electric bass recorded in E1–D#2 (shown one octave higher for bass guitar).
  const bassMidi=28+((root-4+12)%12);
  bass.measures.push({events:[noteAt(bassMidi,cap,'practice-bass-'+i)],section:score.measures[i].section});
  // Harmonic tones played separately by the FM electric piano; no invented vocal melody.
  const roots=pcs.map(pc=>60+pc);
  const notes=cap===4?[0,1,2,1]:cap===3?[0,1,2]:[0];
  keys.measures.push({events:notes.map((n,j)=>noteAt(roots[n%roots.length],cap/notes.length,'practice-keys-'+i+'-'+j)),section:score.measures[i].section});
 }
 const parts=[{id:'ukulele',label:'Ukulele · study arrangement',instrument:'ukulele',score,source:'published practice score'}];
 const available=arrangement.instrumentParts&&typeof arrangement.instrumentParts==='object'?arrangement.instrumentParts:{};
 const suppliedPart=(family)=>{
  const candidate=available[family]?.score;
  if(!candidate)return null;
  validateScore(candidate);
  if(candidate.meter!==score.meter||candidate.tempo!==score.tempo||candidate.measures.length!==score.measures.length)
   throw Error('Imported '+family+' score is not synchronized with the ukulele score');
  return {id:family,label:family+' · supplied score',instrument:family,score:candidate,
   source:'user-provided part · not independently verified'};
 };
 if(known.includes('bass')||available.bass){
  const supplied=suppliedPart('bass');
  if(!supplied)validateScore(bass);
  parts.push(supplied||{id:'bass',label:'Bass · rehearsal line',instrument:'bass',score:bass,source:'generated accompaniment · not a transcription'});
 }
 if(known.includes('piano')||available.piano){
  const supplied=suppliedPart('piano');
  if(!supplied)validateScore(keys);
  parts.push(supplied||{id:'piano',label:'Piano · rehearsal harmony',instrument:'piano',score:keys,source:'generated accompaniment · not a transcription'});
 }
 if(known.includes('drums')||available.drums){
  const supplied=suppliedPart('drums');
  if(!supplied)validateScore(drums);
  parts.push(supplied||{id:'drums',label:(profile.percussion==='electronic'?'Electronic drums':'Drum kit')+' · rehearsal groove',instrument:'drums',score:drums,source:'generated drum practice pattern · not the original beat'});
 }
 // Credited instruments may have generated exercises; user-supplied source
 // tracks are allowed for private songs even if there is no commercial credit.
 const supported=new Set([...profile.other.map(playbackInstrumentFamily).filter(Boolean),...Object.keys(available)]);
 for(const family of ['guitar','strings','synthesizer','flute','vocals']){
  if(!supported.has(family))continue;
  const supplied=suppliedPart(family);
  if(supplied){parts.push(supplied);continue}
  // Do not invent unprovided original sung lines or flute solos.
  if(!['guitar','strings','synthesizer'].includes(family))continue;
  const part=scorePart(score,score.title+' — '+family+' harmonic practice',family);
  for(let i=0;i<score.measures.length;i++){
   const pcs=chordPitchClasses(chords[i]||'');
   if(!pcs?.length){part.measures.push({events:[{id:family+'-rest-'+i,type:'rest',duration:cap}]});continue;}
   const midi=60+pcs[0],events=[noteAt(midi,cap,family+'-practice-'+i)];
   part.measures.push({events,section:score.measures[i].section});
  }
  validateScore(part);
  parts.push({id:family,label:family+' · harmonic study',instrument:family,score:part,
   source:'generated harmonic exercise · not an original recording transcription'});
 }
 return parts;
}
export function arrangementModeTracks(arrangement,mode){
 const all=buildPracticeParts(arrangement);
 if(mode==='solo')return all.slice(0,1);
 if(mode==='ensemble'||mode==='guitar-uke')return all;
 throw Error('Unknown arrangement view');
}
