/** Workbench arrangement views from the actual available data.
 * These derived backing lines are NEW practice accompaniments, not original stems.
 * Never claim absent guitar, vocal or orchestral transcriptions were recovered.
 */
import {notePc,midiName} from './music.js';
import {measureBeats,validateScore} from './score.js';
import {extractChordSymbols,chordPitchClasses} from './song-practice.js';

export const SONG_ARRANGEMENT_MODES=Object.freeze([
 {id:'guitar-uke',label:'Guitar → ukulele',description:'Playable ukulele adaptation with optional instrumental backing; source guitar notes are not yet verified'},
 {id:'ensemble',label:'Full ensemble',description:'Separate ukulele, bass and electric-piano practice parts, reconstructed from available harmony'},
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
   const chords=extractChordSymbols(row?.slice(row.indexOf(':')+1)||'');
   if(!chords.length)continue;
   for(let bar=section.startBar-1;bar<section.endBar&&bar<harmonies.length;bar++)harmonies[bar]=chords[(bar-section.startBar+1)%chords.length];
  }
 }
 const fallback=extractChordSymbols(arrangement.body||'');
 for(let i=0;i<harmonies.length;i++){
  const event=score.measures[i].events.find(ev=>ev.type==='chord' && ev.symbol);
  if(!harmonies[i])harmonies[i]=event?.symbol||fallback[i%fallback.length]||null;
 }
 return harmonies;
}
function scorePart(source,title,instrument){
 return {...source,id:source.id+'-'+instrument,title:title.slice(0,120),clef:instrument==='bass'?'bass':'treble',measures:[]};
}
function noteAt(midi,duration,id){
 return {id,type:'note',midi,spelling:midiName(midi).replace(/-?\d+$/,''),duration};
}
export function buildPracticeParts(arrangement){
 const score=arrangement?.score;
 if(!score)throw Error('A published ukulele score is required');
 validateScore(score);
 const chords=chartChordsPerBar(arrangement);
 const bass=scorePart(score,score.title+' — Bass practice line','bass');
 const keys=scorePart(score,score.title+' — Keyboard practice harmony','piano');
 const cap=measureBeats(score.meter);
 for(let i=0;i<score.measures.length;i++){
  const pcs=chordPitchClasses(chords[i]||'');
  const root=pcs?.[0]??null;
  // A bar without known harmony remains silent, rather than inventing notes.
  if(root===null){
   bass.measures.push({events:[{id:'practice-bass-rest-'+i,type:'rest',duration:cap}],section:score.measures[i].section});
   keys.measures.push({events:[{id:'practice-keys-rest-'+i,type:'rest',duration:cap}],section:score.measures[i].section});
   continue;
  }
  // Fingering-style electric bass played around C2–B2.
  const bassMidi=36+root;
  bass.measures.push({events:[noteAt(bassMidi,cap,'practice-bass-'+i)],section:score.measures[i].section});
  // Harmonic tones played separately by the FM electric piano; no invented vocal melody.
  const roots=pcs.map(pc=>60+pc);
  const notes=cap===4?[0,1,2,1]:cap===3?[0,1,2]:[0];
  keys.measures.push({events:notes.map((n,j)=>noteAt(roots[n%roots.length],cap/notes.length,'practice-keys-'+i+'-'+j)),section:score.measures[i].section});
 }
 validateScore(bass);validateScore(keys);
 return [
  {id:'ukulele',label:'Ukulele · study arrangement',instrument:'ukulele',score,source:'published practice score'},
  {id:'bass',label:'Electric bass · reconstructed',instrument:'bass',score:bass,source:'generated harmonic accompaniment'},
  {id:'piano',label:'Electric piano · reconstructed',instrument:'piano',score:keys,source:'generated harmonic accompaniment'}
 ];
}
export function arrangementModeTracks(arrangement,mode){
 const all=buildPracticeParts(arrangement);
 if(mode==='solo')return all.slice(0,1);
 if(mode==='ensemble'||mode==='guitar-uke')return all;
 throw Error('Unknown arrangement view');
}
