/** Harmony and rhythmic progression builder. Canonical score events are the source for audio, staff and tablature. */
import {TUNINGS,spelledScale,harmonizedChords,chordVoicings} from './music.js';
import {KEY_SIGNATURES,METERS,DURATIONS,createScore,appendEvent,validateScore,measureBeats,remainingBeats} from './score.js';

// Schema 1 is intentionally retained: v0.7 documents omit mode, meter and duration.
// A missing duration is precisely one legacy four-beat bar; no data migration is required.
export const PROGRESSION_SCHEMA=1;
export const PROGRESSION_LIMIT=16; // chord attacks, not measures
export const PROGRESSION_MEASURE_LIMIT=16;
export const PROGRESSION_MODES=Object.freeze({major:'Major',naturalMinor:'Natural minor',harmonicMinor:'Harmonic minor'});
export const PROGRESSION_METERS=Object.freeze(['4/4','3/4','6/8']);
export const MINOR_KEY_SIGNATURES=Object.freeze(Object.fromEntries(Object.keys(KEY_SIGNATURES).map(key=>[spelledScale(key,'major')[5].name,key])));
export const RHYTHM_PRESETS=Object.freeze({
 quarters:{label:'Four quarter downstrokes',meter:'4/4',hits:[[1,'down'],[1,'down'],[1,'down'],[1,'down']]},
 island:{label:'Island rhythm · D D U U D',meter:'4/4',hits:[[1,'down'],[.5,'down'],[.5,'up'],[1,'up'],[1,'down']]},
 half:{label:'Half-time · D / U',meter:'4/4',hits:[[2,'down'],[2,'up']]},
 waltz:{label:'Waltz · D U U',meter:'3/4',hits:[[1,'down'],[1,'up'],[1,'up']]},
 compound:{label:'6/8 · dotted pulse',meter:'6/8',hits:[[1.5,'down'],[.75,'up'],[.75,'down']]}
});
const allowedStrokes=['down','up','none'];
const validName=s=>typeof s==='string' && s.trim().length>0 && s.length<=120;
const scaleOf=p=>p.mode??'major';
const meterOf=p=>p.meter??'4/4';
const durationOf=step=>step.duration??4;
const notesFor=(p,step)=>harmonizedChords(p.root,scaleOf(p),step.extension)[step.degree];
export const progressionKeys=mode=>mode==='major'?Object.keys(KEY_SIGNATURES):Object.keys(MINOR_KEY_SIGNATURES);
export function progressionKeySignature(p){return scaleOf(p)==='major'?p.root:MINOR_KEY_SIGNATURES[p.root];}
export function createProgression({title='My chord progression',root,mode='major',meter='4/4',tuning='highG',tempo=80,preset=true}={}){
 if(!Object.hasOwn(PROGRESSION_MODES,mode))throw new Error('Unknown harmony mode');
 if(!PROGRESSION_METERS.includes(meter))throw new Error('Unsupported progression meter');
 const resolvedRoot=root??(mode==='major'?'C':'A');
 const duration=measureBeats(meter);
 const p={schema:PROGRESSION_SCHEMA,title,root:resolvedRoot,mode,meter,tuning,tempo,steps:preset?[0,3,4,0].map(degree=>({degree,extension:3,stroke:'down',duration})):[]};
 validateProgression(p);return p;
}
/** Placement does not assign any hidden beats. If a chord cannot fit, the next bar starts. */
export function progressionPlacement(p){
 const cap=measureBeats(meterOf(p));let bar=0,beat=0;
 return p.steps.map((step,index)=>{
  const duration=durationOf(step);
  if(beat+duration>cap+1e-7){bar++;beat=0;}
  const placement={index,measureIndex:bar,beat,duration};
  beat=Math.round((beat+duration)*1000)/1000;
  if(Math.abs(beat-cap)<1e-7){bar++;beat=0;}
  return placement;
 });
}
export function validateProgression(p){
 if(!p||p.schema!==PROGRESSION_SCHEMA||!validName(p.title))throw new Error('Invalid progression title');
 const mode=scaleOf(p),meter=meterOf(p),root=p.root;
 if(!Object.hasOwn(PROGRESSION_MODES,mode))throw new Error('Unsupported harmony mode');
 if(!PROGRESSION_METERS.includes(meter))throw new Error('Unsupported progression meter');
 if(!progressionKeys(mode).includes(root))throw new Error('Choose a supported key for this harmony mode');
 if(!TUNINGS[p.tuning])throw new Error('Invalid ukulele tuning');
 if(!Number.isInteger(p.tempo)||p.tempo<40||p.tempo>200)throw new Error('Tempo must be 40–200 BPM');
 if(!Array.isArray(p.steps)||p.steps.length>PROGRESSION_LIMIT)throw new Error('Too many chord attacks (maximum 16)');
 const cap=measureBeats(meter);
 for(const s of p.steps){
  if(!s||typeof s!=='object')throw new Error('Invalid progression step');
  const duration=durationOf(s);
  if(!Number.isInteger(s.degree)||s.degree<0||s.degree>6||![3,4].includes(s.extension)||!allowedStrokes.includes(s.stroke)||!DURATIONS.includes(duration)||duration>cap)throw new Error('Invalid progression step, duration or stroke');
  const chord=notesFor(p,s);
  if(!chord||!chordVoicings(chord.pcs,p.tuning).length)throw new Error(`No supported ukulele fingering for chord ${chord?.name??'unknown'} in this tuning`);
 }
 if(progressionPlacement(p).some(x=>x.measureIndex>=PROGRESSION_MEASURE_LIMIT))throw new Error('Too many measures (maximum 16)');
 return true;
}
export function editProgression(p,kind,value,index){
 validateProgression(p);const copy=structuredClone(p);copy.mode=scaleOf(copy);copy.meter=meterOf(copy);
 copy.steps=copy.steps.map(s=>({...s,duration:durationOf(s)}));
 if(kind==='add'){
  if(copy.steps.length>=PROGRESSION_LIMIT)throw new Error('Progression already has 16 chord attacks');
  copy.steps.push({degree:value.degree,extension:value.extension??3,stroke:value.stroke??'down',duration:value.duration??measureBeats(copy.meter)});
 } else if(kind==='remove'){
  if(!Number.isInteger(index)||index<0||index>=copy.steps.length)throw new Error('Invalid chord');
  copy.steps.splice(index,1);
 } else if(kind==='move'){
  const dest=index+value;
  if(!Number.isInteger(index)||!Number.isInteger(dest)||index<0||dest<0||index>=copy.steps.length||dest>=copy.steps.length)throw new Error('Cannot move outside progression');
  [copy.steps[index],copy.steps[dest]]=[copy.steps[dest],copy.steps[index]];
 } else if(kind==='stroke'||kind==='duration'){
  if(!Number.isInteger(index)||index<0||index>=copy.steps.length)throw new Error('Invalid chord');
  if(kind==='stroke'){if(!allowedStrokes.includes(value))throw new Error('Invalid stroke');copy.steps[index].stroke=value;}
  else copy.steps[index].duration=Number(value);
 } else if(kind==='property'){
  if(!['title','root','tuning','tempo','mode','meter'].includes(index))throw new Error('Unsupported field');
  if(index==='mode'){
   if(!Object.hasOwn(PROGRESSION_MODES,value))throw new Error('Invalid harmony mode');
   if(copy.mode==='major'&&value!=='major')copy.root=spelledScale(copy.root,'major')[5].name;
   else if(copy.mode!=='major'&&value==='major')copy.root=MINOR_KEY_SIGNATURES[copy.root];
  }
  if(index==='meter'){
   if(!PROGRESSION_METERS.includes(value))throw new Error('Unsupported meter');
   const cap=measureBeats(copy.meter),newCap=measureBeats(value);
   // A meter switch is lossless only for whole-bar chords; don't rewrite an existing rhythm.
   if(copy.steps.some(s=>s.duration!==cap))throw new Error('Change meter before creating an in-bar rhythm or clear the progression first');
   copy.steps=copy.steps.map(s=>({...s,duration:newCap}));
  }
  copy[index]=value;
 } else throw new Error('Unsupported edit');
 validateProgression(copy);return copy;
}
/** Replace one whole-bar chord with a rhythm pattern while keeping its harmony. */
export function applyRhythmPreset(p,preset,index){
 validateProgression(p);const pattern=RHYTHM_PRESETS[preset];
 if(!pattern||meterOf(p)!==pattern.meter)throw new Error('This rhythm does not match the chosen meter');
 if(!Number.isInteger(index)||index<0||index>=p.steps.length)throw new Error('Choose an existing chord');
 const step=p.steps[index],position=progressionPlacement(p)[index];
 if(position.beat!==0||durationOf(step)!==measureBeats(meterOf(p)))throw new Error('Rhythm presets require a chord occupying a complete measure');
 const copy=structuredClone(p);
 copy.steps.splice(index,1,...pattern.hits.map(([duration,stroke])=>({degree:step.degree,extension:step.extension,duration,stroke})));
 validateProgression(copy);return copy;
}
function appendSilence(score,beats){
 const durations=[...DURATIONS].sort((a,b)=>b-a);let remaining=beats;
 while(remaining>1e-7){const d=durations.find(x=>x<=remaining+1e-7);if(!d)throw new Error('Cannot represent remaining silence');appendEvent(score,{type:'rest',duration:d});remaining=Math.round((remaining-d)*1000)/1000;}
}
export function buildProgressionScore(p){
 validateProgression(p);
 const score=createScore({title:p.title,key:progressionKeySignature(p),tuning:p.tuning,meter:meterOf(p),tempo:p.tempo,sample:false});
 for(const step of p.steps){
  const duration=durationOf(step),left=remainingBeats(score);
  if(left>0&&left<duration)appendSilence(score,left);
  const chord=notesFor(p,step);
  appendEvent(score,{type:'chord',duration,symbol:chord.name,stroke:step.stroke,voicing:'generated',pcs:chord.pcs,spellings:chord.notes});
 }
 validateScore(score);return score;
}
export function progressionChords(p){
 validateProgression(p);
 const placements=progressionPlacement(p);
 return p.steps.map((step,index)=>{
  const chord=notesFor(p,step),voicing=chordVoicings(chord.pcs,p.tuning)[0];
  return {...step,duration:durationOf(step),...placements[index],name:chord.name,quality:chord.quality,notes:chord.notes,frets:voicing.frets,midis:voicing.midis};
 });
}
