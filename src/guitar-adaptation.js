/** Source-based six-string guitar -> high-G ukulele lead-part adaptation.
 * The source MUST be supplied by the user (or licensed). Never infer recording
 * riffs from chord charts; convert the actual specified note and rhythm data.
 *
 * Monophonic part only. Simultaneous notes and articulations not represented by
 * the existing ukulele score model are rejected, not silently discarded.
 */
import {TUNINGS,optionsForMidi,midiName,notePc} from './music.js';
import {adaptSimultaneousGuitarNotes} from './guitar-polyphony.js';
import {DURATIONS,KEY_SIGNATURES,measureBeats,validateScore} from './score.js';

export const GUITAR_SOURCE_FORMAT='ukulele-workbench-guitar-source';
export const STANDARD_GUITAR_MIDI=Object.freeze([40,45,50,55,59,64]); // E2 A2 D3 G3 B3 E4

const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const supportedString=(x,max=120)=>typeof x==='string'&&x.trim()&&x.length<=max;
const validPitch=(midi)=>Number.isInteger(midi)&&midi>=36&&midi<=96;
const meterOptions=new Set(['3/4','4/4','6/8']);
const close=(x,y)=>Math.abs(x-y)<1e-8;

/** Exhaustively evaluate frets 0-12 and octave transpositions.
 * All candidates preserve pitch class; one octave-shift is only used when
 * needed or explicitly preferable to unplayable source pitch. Contour changes
 * are penalized in global voice-leading, with results reported to the player.
 */
function candidates(sourceMidi){
 const result=[];
 for(let semitones=-48;semitones<=48;semitones+=12){
  const soundingMidi=sourceMidi+semitones;
  if(!validPitch(soundingMidi))continue;
  for(const position of optionsForMidi(soundingMidi,'highG',12)){
   result.push({
    midi:soundingMidi,position,octaveShift:semitones,
    intrinsicCost:Math.abs(semitones/12)*3.5+position.fret*.035
   });
  }
 }
 return result;
}
function bestFingerings(notes){
 if(!notes.length)return [];
 let layers=[];
 for(let i=0;i<notes.length;i++){
  const src=notes[i],options=candidates(src.midi);
  if(!options.length)throw Error('No playable high-G note for source pitch '+src.midi);
  const layer=options.map(option=>{
   let cost=option.intrinsicCost,previous=-1;
   if(i){
    let best=Infinity;
    for(let p=0;p<layers[i-1].length;p++){
     const before=layers[i-1][p],old=before.option,nextInterval=option.midi-old.midi;
     const originalInterval=src.midi-notes[i-1].midi;
     const contourPenalty=Math.abs(nextInterval-originalInterval)*.55;
     const fretMove=Math.abs(option.position.fret-old.position.fret)*.07;
     const stringMove=Math.abs(option.position.string-old.position.string)*.12;
     const candidate=before.cost+option.intrinsicCost+contourPenalty+fretMove+stringMove;
     if(candidate<best){best=candidate;previous=p}
    }
    cost=best;
   }
   return {option,cost,previous};
  });
  layers.push(layer);
 }
 let index=layers.at(-1).reduce((best,x,i,arr)=>x.cost<arr[best].cost?i:best,0);
 const output=Array(notes.length);
 for(let i=notes.length-1;i>=0;i--){
  const node=layers[i][index];output[i]=node.option;index=node.previous;
 }
 return output;
}
export function adaptGuitarPart(source){
 if(!isRecord(source)||source.format!==GUITAR_SOURCE_FORMAT||source.schemaVersion!==1)throw Error('Unsupported guitar-part document');
 if(!supportedString(source.title)||!meterOptions.has(source.meter)||!Object.hasOwn(KEY_SIGNATURES,source.key)||!Number.isInteger(source.tempo)||source.tempo<30||source.tempo>240)
  throw Error('Invalid title, key signature, tempo or meter');
 const tuning=source.guitarTuning??STANDARD_GUITAR_MIDI;
 if(!Array.isArray(tuning)||tuning.length!==6||tuning.some(x=>!Number.isInteger(x)||x<28||x>76))
  throw Error('Provide six open-string MIDI pitches, low to high');
 if(!Array.isArray(source.measures)||source.measures.length<1||source.measures.length>200)
  throw Error('Guitar part must contain 1–200 measures');
 const beats=measureBeats(source.meter),allNotes=[],measureSlots=[],warnings=[];
 let eventCount=0;
 source.measures.forEach((measure,bar)=>{
  if(!isRecord(measure)||!Array.isArray(measure.events)||measure.events.length>128
   ||(measure.section!==undefined&&!supportedString(measure.section,80)))throw Error('Invalid guitar measure '+(bar+1));
  let used=0,output=[];
  for(let j=0;j<measure.events.length;j++){
   const item=measure.events[j];eventCount++;
   if(eventCount>5000)throw Error('Guitar source exceeds 5000 events');
   if(!isRecord(item)||!DURATIONS.includes(item.duration))throw Error('Invalid rhythm in bar '+(bar+1));
   used+=item.duration;
   const id='guitar-adapt-'+(bar+1)+'-'+(j+1);
   if(item.type==='rest'){
    if('string' in item||'fret' in item||'notes' in item)throw Error('Rest has unexpected pitches');
    output.push({id,type:'rest',duration:item.duration});continue;
   }
   if(item.type==='chord'){
    if(!Array.isArray(item.notes)||item.notes.length<2||item.notes.length>4)throw Error('Provide two to four simultaneous source pitches; no voices are discarded');
    const chordNotes=item.notes.map((note,k)=>{
     if(!isRecord(note)||!Number.isInteger(note.string)||note.string<0||note.string>5||!Number.isInteger(note.fret)||note.fret<0||note.fret>24)throw Error('Invalid guitar chord string/fret in bar '+(bar+1));
     const midi=tuning[note.string]+note.fret;
     const spelling=note.spelling??midiName(midi).replace(/-?\d+$/,'');
     if(!/^[A-G][#b]{0,2}$/.test(spelling)||notePc(spelling)!==midi%12)throw Error('Invalid chord note spelling in bar '+(bar+1));
     return {midi,spelling,sourceString:note.string,sourceFret:note.fret};
    });
    output.push({id,type:'chord',sourceChord:chordNotes,symbol:String(item.symbol||'Guitar voicing').slice(0,40),stroke:'none',duration:item.duration});
    continue;
   }
   if(item.type!=='note'||'notes' in item)throw Error('Expected a single guitar note or explicit simultaneous chord');
   if(!Number.isInteger(item.string)||item.string<0||item.string>5||!Number.isInteger(item.fret)||item.fret<0||item.fret>24)
    throw Error('Invalid guitar string or fret in bar '+(bar+1));
   const midi=tuning[item.string]+item.fret;
   const spelling=item.spelling??midiName(midi).replace(/-?\d+$/,'');
   if(!/^[A-G][#b]{0,2}$/.test(spelling)||notePc(spelling)!==midi%12)
    throw Error('Written spelling does not match guitar pitch in bar '+(bar+1));
   const index=allNotes.length;
   allNotes.push({midi,spelling,string:item.string,fret:item.fret,bar:bar+1});
   output.push({id,type:'note',duration:item.duration,sourceIndex:index});
  }
  if(used>beats+1e-8)throw Error('Bar '+(bar+1)+' exceeds '+source.meter);
  if(!close(used,beats))warnings.push('Bar '+(bar+1)+' is incomplete ('+used+' of '+beats+' beats).');
  measureSlots.push({events:output,...(measure.section?{section:measure.section}:{})});
 });
 const matches=bestFingerings(allNotes);
 let transposed=0;const mapping=[];
 const measures=measureSlots.map(measure=>({...measure,
  events:measure.events.map(ev=>{
   if(ev.type==='rest')return ev;
   if(ev.type==='chord'){
    const adapted=adaptSimultaneousGuitarNotes(ev.sourceChord);
    transposed+=adapted.octaveShiftedNotes;
    for(const item of adapted.mapping)mapping.push({bar:measureSlots.indexOf(measure)+1,...item});
    const {sourceChord,...plain}=ev;
    return {...plain,voicing:'custom',notes:adapted.notes};
   }
   const src=allNotes[ev.sourceIndex],mapped=matches[ev.sourceIndex];
   const {sourceIndex,...part}=ev;
   if(mapped.octaveShift)transposed++;
   mapping.push({bar:src.bar,sourceMidi:src.midi,ukeMidi:mapped.midi,octaveShift:mapped.octaveShift,
     sourceString:src.string,sourceFret:src.fret,ukeString:mapped.position.string,ukeFret:mapped.position.fret});
   return {...part,midi:mapped.midi,spelling:src.spelling,position:mapped.position};
  })
 }));
 const score={schema:1,id:'adapted-guitar-source',title:source.title+' — High-G Guitar Part Adaptation',
   tuning:'highG',meter:source.meter,key:source.key,tempo:source.tempo,measures};
 validateScore(score);
 if(transposed)warnings.push(transposed+' of '+mapping.length+' sounding notes shifted by octaves to fit high-G GCEA.');
 return {
  score,sourceNotes:mapping.length,octaveShiftedNotes:transposed,
  mapping,warnings,method:'Source-led monophonic notes and simultaneous 2–4-voice guitar voicings; exact pitch classes and rhythmic positions retained, with octave shifts reported.'
 };
}
export function exampleGuitarSource(){
 return {
  format:GUITAR_SOURCE_FORMAT,schemaVersion:1,title:'Original guitar phrase',
  guitarTuning:[...STANDARD_GUITAR_MIDI],key:'C',meter:'4/4',tempo:96,
  measures:[
   {section:'Original riff',events:[
    {type:'note',string:0,fret:0,duration:1},
    {type:'note',string:0,fret:2,duration:.5},
    {type:'note',string:0,fret:3,duration:.5},
    {type:'note',string:1,fret:0,duration:1},
    {type:'rest',duration:1}
   ]},
   {section:'Original riff',events:[
    {type:'note',string:1,fret:2,duration:1},
    {type:'note',string:2,fret:0,duration:1},
    {type:'note',string:1,fret:0,duration:1},
    {type:'note',string:0,fret:3,duration:1}
   ]}
  ]
 };
}
