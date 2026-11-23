/** Music score document with independent instruments and rhythmic voices.
 * Unlike legacy Score.schema=1, this permits overlapping note onsets.
 * Old single-voice ukulele scores remain compatible.
 */
export const SCORE_DOCUMENT_SCHEMA=2;
const WRITTEN_STEPS=Object.freeze({C:0,D:2,E:4,F:5,G:7,A:9,B:11});
export function writtenPitchForMidi(midi,spelling){
 if(typeof spelling!=='string'||!/^([A-G])([#]{1,2}|b{1,2})?$/.test(spelling))throw Error('Invalid written note spelling');
 const accidental=[...spelling.slice(1)].reduce((n,c)=>n+(c==='#'?1:-1),0);
 const octave=(midi-WRITTEN_STEPS[spelling[0]]-accidental)/12-1;
 if(!Number.isInteger(octave)||octave<0||octave>8)throw Error('Written spelling does not match MIDI pitch');
 return {step:spelling[0],alter:accidental,octave};
}
export const SUPPORTED_DYNAMICS=Object.freeze(['pp','p','mp','mf','f','ff']);
export const SUPPORTED_ARTICULATIONS=Object.freeze(['none','staccato','tenuto','accent','marcato','fermata','trill']);
export function validateScoreDocument(doc){
 if(!doc||doc.schema!==SCORE_DOCUMENT_SCHEMA||!Array.isArray(doc.parts)||!doc.parts.length||doc.parts.length>16)throw Error('Invalid multi-part score document');
 if(typeof doc.title!=='string'||doc.title.length>120||!Number.isInteger(doc.tempo)||doc.tempo<30||doc.tempo>240)throw Error('Invalid score metadata');
 if(!/^([2-9]|1[0-2])\/(4|8)$/.test(doc.meter))throw Error('Unsupported score meter');
 const maxBars=doc.measures;
 const [numerator,denominator]=doc.meter.split('/').map(Number);
 const barBeats=numerator*4/denominator;
 if(!Number.isInteger(maxBars)||maxBars<1||maxBars>200)throw Error('Invalid bar count');
 const seen=new Set();
 for(const part of doc.parts){
  if(typeof part.id!=='string'||!part.id||seen.has(part.id)||typeof part.name!=='string'||part.name.length>80)throw Error('Invalid instrument part');
  seen.add(part.id);
  if(!Array.isArray(part.voices)||part.voices.length<1||part.voices.length>8)throw Error('Part requires one to eight voices');
  const voiceIds=new Set();
  for(const voice of part.voices){
   if(voiceIds.has(voice.id))throw Error('Duplicate voice ID in '+part.id);
   voiceIds.add(voice.id);
   if(typeof voice.id!=='string'||!Array.isArray(voice.measures)||voice.measures.length!==maxBars)throw Error('Invalid rhythmic voice');
   for(const [i,bar] of voice.measures.entries()){
    if(!Array.isArray(bar.events)||bar.events.length>128)throw Error('Invalid measure '+(i+1));
    let end=0;
    for(const e of bar.events){
     if(!Number.isFinite(e.onset)||e.onset<0||!Number.isFinite(e.duration)||e.duration<=0||e.duration>barBeats+1e-8||e.onset+e.duration>barBeats+1e-8)throw Error('Invalid note timing: measure overflow');
     if(e.type!=='rest'&&(!Number.isInteger(e.midi)||e.midi<20||e.midi>110))throw Error('Invalid pitch');
     if(e.type!=='note'&&e.type!=='rest')throw Error('Unsupported event type in voice');
     if(e.spelling!==undefined){if(e.type!=='note')throw Error('Rest cannot have written pitch');writtenPitchForMidi(e.midi,e.spelling)}
     if(e.dynamics!==undefined&&!SUPPORTED_DYNAMICS.includes(e.dynamics))throw Error('Invalid dynamics');
     if(e.articulation!==undefined&&!SUPPORTED_ARTICULATIONS.includes(e.articulation))throw Error('Invalid articulation');
     if(e.finger!==undefined&&(!Number.isInteger(e.finger)||e.finger<0||e.finger>4))throw Error('Invalid finger number');
     if(e.tuplet&&(!Number.isInteger(e.tuplet.actual)||!Number.isInteger(e.tuplet.normal)||e.tuplet.actual<2||e.tuplet.normal<1||e.tuplet.actual>12))throw Error('Invalid tuplet ratio');
     end=Math.max(end,e.onset+e.duration);
    }
    // Consecutive voices may overlap one another, but a single rhythmic voice
    // can only overlap notes at the SAME onset, i.e. a written chord. Fractional
    // overlaps are invalid because they would imply a second hidden voice.
    const ordered=[...bar.events].sort((a,b)=>a.onset-b.onset||b.duration-a.duration);
    let previousOnset=-1,previousEnd=0,previousDuration=0;
    for(const e of ordered){
     if(e.onset<previousEnd-1e-8){
      if(Math.abs(e.onset-previousOnset)>1e-8||Math.abs(e.duration-previousDuration)>1e-8||
       e.type==='rest')throw Error('Overlapping events within one voice; split independent counterpoint into separate voices');
     }else{previousOnset=e.onset;previousEnd=e.onset+e.duration;previousDuration=e.duration}
    }
   }
  }
 }
 return true;
}
export function flattenDocumentEvents(doc){
 validateScoreDocument(doc);
 const [numerator,denominator]=doc.meter.split('/').map(Number),beats=numerator*4/denominator;
 return doc.parts.flatMap(part=>part.voices.flatMap(voice=>voice.measures.flatMap((bar,i)=>
  bar.events.map(e=>({...e,partId:part.id,instrument:part.instrument||'unknown',voiceId:voice.id,measureIndex:i,absoluteOnset:i*beats+e.onset})))));
}
export function planScoreSystems(doc,{pageWidth=720,maxBars=4}={}){
 validateScoreDocument(doc);
 if(!Number.isFinite(pageWidth)||pageWidth<300)throw Error('Invalid page width');
 const systems=[],max=doc.measures;
 let start=0;
 while(start<max){
  let end=start,width=0;
  for(;end<max&&end-start<maxBars;end++){
   const eventCount=doc.parts.reduce((n,part)=>n+part.voices.reduce((m,voice)=>m+voice.measures[end].events.length,0),0);
   const estimate=100+Math.min(180,eventCount*9);
   if(end>start&&width+estimate>pageWidth)break;
   width+=estimate;
  }
  systems.push({startBar:start+1,endBar:end,width,partCount:doc.parts.length});
  start=end;
 }
 return systems;
}
