/** Versioned, notation-first monophonic score model (quarter-note units with standard dotted values).
 * This module is pure and can be reused in React or other UI frameworks.
 */
import {TUNINGS,optionsForMidi,midiName,notePc,mod,chordVoicings} from './music.js';

// Four-string chord templates: frets follow the low-to-high instrument string order.
// They have been checked against the actual pitches of both GCEA variants and DGBE.
export const CHORD_SHAPES=Object.freeze({
 C:{highG:[0,0,0,3],lowG:[0,0,0,3],baritone:[2,0,1,0]},
 F:{highG:[2,0,1,0],lowG:[2,0,1,0],baritone:[3,2,1,1]},
 G7:{highG:[0,2,1,2],lowG:[0,2,1,2],baritone:[0,0,0,1]},
 Am:{highG:[2,0,0,0],lowG:[2,0,0,0],baritone:[2,2,1,0]}
});
/** Generated diatonic voicing: every pitch is tied to an actual ukulele string/fret. */
export function generatedChordNotes(pcs,spellings,tuning){
 if(!Array.isArray(pcs)||![3,4].includes(pcs.length)||!pcs.every(n=>Number.isInteger(n)&&n>=0&&n<12)||new Set(pcs).size!==pcs.length)throw new Error('Invalid chord tones');
 if(!Array.isArray(spellings)||spellings.length!==pcs.length||spellings.some((s,i)=>notePc(s)!==pcs[i]))throw new Error('Chord spelling does not match its pitches');
 const voicing=chordVoicings(pcs,tuning)[0];
 if(!voicing)throw new Error('No playable voicing for this chord and tuning');
 return voicing.frets.flatMap((fret,string)=>fret<0?[]:[{midi:TUNINGS[tuning].midi[string]+fret,spelling:spellings[pcs.indexOf(mod(TUNINGS[tuning].midi[string]+fret,12))],position:{string,fret}}]);
}
export const ARTICULATIONS=Object.freeze(['none','staccato','tenuto','accent']);
export const STROKES=Object.freeze(['none','down','up']);
export function chordNotes(symbol,tuning){
 const frets=CHORD_SHAPES[symbol]?.[tuning];
 if(!frets)throw new Error('Unsupported chord or tuning');
 return frets.map((fret,string)=>{
  const midi=TUNINGS[tuning].midi[string]+fret;
  return {midi,spelling:midiName(midi).replace(/-?\d+$/,''),position:{string,fret}};
 });
}
export const SCORE_SCHEMA = 1;
export const DURATIONS = [0.25,0.375,0.5,0.75,1,1.5,2,3,4];
// Major-key signatures; accidentals are a display convention, not a pitch transposition.
export const KEY_SIGNATURES = Object.freeze({C:0,G:1,D:2,A:3,E:4,B:5,'F#':6,'C#':7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7});
export const KEY_SHARP_ORDER=['F','C','G','D','A','E','B'];
export const KEY_FLAT_ORDER=['B','E','A','D','G','C','F'];
export function keyAccidental(key,letter){
 const count=KEY_SIGNATURES[key];
 if(!Number.isInteger(count))throw new Error('Unsupported key signature');
 return count>0 && KEY_SHARP_ORDER.slice(0,count).includes(letter)?'#':count<0 && KEY_FLAT_ORDER.slice(0,-count).includes(letter)?'b':'';
}
export const BASE_DURATION = Object.freeze({'0.375':0.25,'0.75':0.5,'1.5':1,'3':2});
export const baseDuration=d=>BASE_DURATION[String(d)]??d;
export const isDotted=d=>Object.hasOwn(BASE_DURATION,String(d));
export const METERS = {'4/4':[4,4],'3/4':[3,4],'6/8':[6,8]};
export const PC_SPELLINGS = [['C','B#'],['C#','Db'],['D'],['D#','Eb'],['E','Fb'],['F','E#'],['F#','Gb'],['G'],['G#','Ab'],['A'],['A#','Bb'],['B','Cb']];
export const spellingsForMidi = midi => PC_SPELLINGS[((midi%12)+12)%12];
export const QUARTER_LABELS = {'0.25':'Sixteenth','0.375':'Dotted sixteenth','0.5':'Eighth','0.75':'Dotted eighth','1':'Quarter','1.5':'Dotted quarter','2':'Half','3':'Dotted half','4':'Whole'};
const close = (a,b)=>Math.abs(a-b)<0.0000001;
const generateId = ()=>globalThis.crypto?.randomUUID?.() ?? `n${Date.now()}-${Math.floor(Math.random()*1e8)}`;

export function measureBeats(meter='4/4') {
  const [num,den] = METERS[meter] || [];
  if(!num) throw new Error('Unsupported meter');
  return num*4/den;
}
export function usedBeats(measure) {return measure.events.reduce((s,e)=>s+e.duration,0);}
export function remainingBeats(score,measureIndex=score.measures.length-1) {
  return Math.round((measureBeats(score.meter)-usedBeats(score.measures[measureIndex]))*1000)/1000;
}
export function createScore({title='First melody',tuning='highG',meter='4/4',key='C',tempo=84,sample=true}={}){
  if(!TUNINGS[tuning]) throw new Error('Invalid tuning');
  measureBeats(meter);
  if(!Object.hasOwn(KEY_SIGNATURES,key))throw new Error('Unsupported key signature');
  const score={schema:SCORE_SCHEMA,id:generateId(),title,tuning,meter,key,tempo,measures:[{events:[]}]};
  if(sample){
    // Two complete 4/4 measures, with a rest, a half-note and paired eighths.
    // For other meters, start blank to avoid implying an invalid transcription.
    if(meter==='4/4') {
      for(const [midi,duration] of [[60,1],[64,.5],[67,.5],[69,1],[null,1],[67,2],[64,1],[60,1]]) {
        appendEvent(score, midi===null?{type:'rest',duration}:{type:'note',midi,duration});
      }
    }
  }
  return score;
}
export function validateScore(score) {
  if(!score||typeof score!=='object'||score.schema!==SCORE_SCHEMA)throw new Error('Unsupported score schema');
  if(typeof score.title!=='string'||score.title.length>120)throw new Error('Invalid title');
  if(!TUNINGS[score.tuning])throw new Error('Invalid tuning');
  const cap=measureBeats(score.meter);
  if(!Object.hasOwn(KEY_SIGNATURES,score.key??'C'))throw new Error('Unsupported key signature');
  if(!Number.isInteger(score.tempo)||score.tempo<30||score.tempo>240)throw new Error('Tempo must be 30–240 BPM');
  if(!Array.isArray(score.measures)||!score.measures.length||score.measures.length>200)throw new Error('Invalid measures');
  let count=0;const ids=new Set();
  for(const measure of score.measures){
    if(!Array.isArray(measure.events)||measure.events.length>128)throw new Error('Invalid measure events');
    let units=0;
    for(const ev of measure.events){
      count++;if(count>5000)throw new Error('Score too long');
      if(!ev||typeof ev.id!=='string'||!ev.id||ids.has(ev.id))throw new Error('Invalid or duplicate event ID');ids.add(ev.id);
      if(!DURATIONS.includes(ev.duration))throw new Error('Invalid duration');units+=ev.duration;
      if(ev.tieToNext!==undefined && typeof ev.tieToNext!=='boolean')throw new Error('Invalid tie flag');
      if(ev.slurToNext!==undefined && typeof ev.slurToNext!=='boolean')throw new Error('Invalid slur flag');
      if(ev.slurToNext&&ev.tieToNext)throw new Error('A note cannot have both a tie and a slur to the same following event');
      if(ev.articulation!==undefined&&!ARTICULATIONS.includes(ev.articulation))throw new Error('Invalid articulation');
      if(ev.type==='note'){
        if(!Number.isInteger(ev.midi)||ev.midi<(score.clef==='bass8vb'?24:36)||ev.midi>96)throw new Error('Invalid MIDI pitch');
        if(typeof ev.spelling!=='string'||!/^([A-G])([#b]{0,2})$/.test(ev.spelling)||notePc(ev.spelling)!==mod(ev.midi,12))throw new Error('Invalid spelling for the sounding pitch');
        if(ev.position!==null&&ev.position!==undefined){
          const p=ev.position;
          if(!Number.isInteger(p.string)||!Number.isInteger(p.fret)||p.fret<0||p.fret>12||p.string<0||p.string>3 || TUNINGS[score.tuning].midi[p.string]+p.fret!==ev.midi) throw new Error('Invalid fingering for this tuning');
        }
      }else if(ev.type==='chord'){
        if(ev.tieToNext||ev.slurToNext)throw new Error('Chord ties and slurs are not supported in this monophonic study model');
        if(!STROKES.includes(ev.stroke))throw new Error('Unknown strum direction');
        if(!Array.isArray(ev.notes)||ev.notes.length<(ev.voicing==='custom'?2:3)||ev.notes.length>4)throw new Error('Chord requires two to four sounding ukulele strings');
        if(!STROKES.includes(ev.stroke))throw new Error('Unknown strum direction');
        if(ev.voicing==='custom'){
          if(typeof ev.symbol!=='string'||ev.symbol.length>40)throw new Error('Invalid custom voicing label');
          const strings=new Set();
          for(const note of ev.notes){
            if(!note||!Number.isInteger(note.midi)||note.midi<36||note.midi>96||typeof note.spelling!=='string'||!/^([A-G])([#b]{0,2})$/.test(note.spelling)||notePc(note.spelling)!==mod(note.midi,12))throw Error('Invalid note in custom chord');
            const p=note.position;
            if(!p||!Number.isInteger(p.string)||p.string<0||p.string>3||strings.has(p.string)||!Number.isInteger(p.fret)||p.fret<0||p.fret>12||TUNINGS[score.tuning].midi[p.string]+p.fret!==note.midi)throw Error('Custom chord must use unique playable strings');
            strings.add(p.string);
          }
        }else{
          if(ev.voicing==='generated' && (typeof ev.symbol!=='string'||!ev.symbol||ev.symbol.length>30))throw new Error('Invalid generated chord name');
          if(ev.voicing!==undefined&&ev.voicing!=='generated')throw new Error('Invalid chord voicing mode');
          if(!ev.voicing&&!Object.hasOwn(CHORD_SHAPES,ev.symbol))throw new Error('Unsupported chord shape');
          const expected=ev.voicing==='generated'?generatedChordNotes(ev.pcs,ev.spellings,score.tuning):chordNotes(ev.symbol,score.tuning);
          if(ev.notes.length!==expected.length||ev.notes.some((note,i)=>!note||note.midi!==expected[i].midi||note.spelling!==expected[i].spelling||note.position?.string!==expected[i].position.string||note.position?.fret!==expected[i].position.fret))
            throw new Error('Chord pitches and fingerings do not match the selected tuning');
        }
      }else if(ev.type==='rest'){
        if(ev.tieToNext||ev.slurToNext||ev.articulation)throw new Error('Rest cannot have ties, slurs or articulation');
        if('midi' in ev||'position' in ev)throw new Error('Rests cannot have pitches or fingerings');
      }else throw new Error('Invalid event type');
    }
    if(units>cap+0.000001)throw new Error('Measure overflow');
  }
  // Ties join adjacent notes with the same written and sounding pitch. Bar-crossing
  // ties require a complete preceding bar, otherwise a silent gap would be implied.
  for(let bi=0;bi<score.measures.length;bi++){
    const bar=score.measures[bi];
    for(let ei=0;ei<bar.events.length;ei++){
      const ev=bar.events[ei];if(!ev.tieToNext)continue;
      const next=bar.events[ei+1]??score.measures[bi+1]?.events[0];
      if(ev.type!=='note'||!next||next.type!=='note'||ev.midi!==next.midi||ev.spelling!==next.spelling)
        throw new Error('Tie requires the next adjacent note to have the same written and sounding pitch');
      if(ei===bar.events.length-1 && Math.abs(usedBeats(bar)-cap)>.000001)
        throw new Error('A tie across a barline must start at the end of a complete measure');
    }
  }
  for(let bi=0;bi<score.measures.length;bi++){
    const bar=score.measures[bi];
    for(let ei=0;ei<bar.events.length;ei++){
      const ev=bar.events[ei];if(!ev.slurToNext)continue;
      const next=bar.events[ei+1]??score.measures[bi+1]?.events[0];
      if(ev.type!=='note'||next?.type!=='note')throw new Error('A slur must connect adjacent sounding notes');
      if(ei===bar.events.length-1 && Math.abs(usedBeats(bar)-cap)>.000001)
        throw new Error('A slur across a barline requires a complete previous measure');
    }
  }
  return true;
}
export function canTieNext(score,id){
  const found=findEvent(score,id);if(!found||found.event.type!=='note')return false;
  const bar=score.measures[found.measureIndex],next=bar.events[found.eventIndex+1]??score.measures[found.measureIndex+1]?.events[0];
  const boundary=found.eventIndex===bar.events.length-1;
  return !!(next?.type==='note'&&next.midi===found.event.midi&&next.spelling===found.event.spelling&&(!boundary||Math.abs(usedBeats(bar)-measureBeats(score.meter))<.000001));
}
export function setTieToNext(score,id,enabled){
  validateScore(score);
  const found=findEvent(score,id);
  if(!found||found.event.type!=='note')throw new Error('Select a note first');
  if(enabled && !canTieNext(score,id))throw new Error('Place an identical adjacent note first, with no intervening rest or gap');
  const draft=structuredClone(score),ev=findEvent(draft,id).event;
  if(enabled)ev.tieToNext=true;else delete ev.tieToNext;
  validateScore(draft);score.measures=draft.measures;
  return ev;
}
export function setSlurToNext(score,id,enabled){
 validateScore(score);
 const found=findEvent(score,id);
 if(!found||found.event.type!=='note')throw new Error('Select a note first');
 const draft=structuredClone(score),ev=findEvent(draft,id).event;
 if(enabled)ev.slurToNext=true;else delete ev.slurToNext;
 validateScore(draft);score.measures=draft.measures;return ev;
}
export function setArticulation(score,id,articulation){
 if(!ARTICULATIONS.includes(articulation))throw new Error('Unsupported articulation');
 validateScore(score);
 const found=findEvent(score,id);if(!found||!['note','chord'].includes(found.event.type))throw new Error('Select a note or chord');
 const draft=structuredClone(score),ev=findEvent(draft,id).event;
 if(articulation==='none')delete ev.articulation;else ev.articulation=articulation;
 validateScore(draft);score.measures=draft.measures;return ev;
}
export function setStroke(score,id,stroke){
 if(!STROKES.includes(stroke))throw new Error('Unsupported stroke');
 validateScore(score);const found=findEvent(score,id);
 if(found?.event.type!=='chord')throw new Error('Select a chord first');
 const draft=structuredClone(score),ev=findEvent(draft,id).event;ev.stroke=stroke;
 validateScore(draft);score.measures=draft.measures;return ev;
}
export function setKeySignature(score,key){
  if(!Object.hasOwn(KEY_SIGNATURES,key))throw new Error('Unsupported key signature');
  validateScore(score);score.key=key;validateScore(score);
}
function makeEvent({type='note',midi=60,spelling,duration=1,position=null,symbol='C',stroke='down',articulation='none',voicing,pcs,spellings},tuning){
  if(!DURATIONS.includes(duration))throw new Error('Unsupported duration');
  if(!['note','rest','chord'].includes(type))throw new Error('Invalid event type');
  if(type==='rest')return {id:generateId(),type,duration};
  if(!ARTICULATIONS.includes(articulation))throw new Error('Unsupported articulation');
  if(type==='chord'){if(!STROKES.includes(stroke))throw new Error('Unsupported stroke');return {id:generateId(),type,duration,symbol,stroke,notes:voicing==='generated'?generatedChordNotes(pcs,spellings,tuning):chordNotes(symbol,tuning),...(voicing==='generated'?{voicing,pcs:[...pcs],spellings:[...spellings]}:{}),...(articulation!=='none'?{articulation}:{})};}
  if(!Number.isInteger(midi)||midi<36||midi>96)throw new Error('Invalid pitch');
  const possibilities=optionsForMidi(midi,tuning,12);
  if(!possibilities.length)throw new Error('Pitch cannot be played in the first 12 frets with this tuning');
  if(position&&!possibilities.some(p=>p.string===position.string&&p.fret===position.fret))throw new Error('Invalid position');
  return {id:generateId(),type,midi,spelling:spelling||midiName(midi).replace(/-?\d+$/,''),duration,position,...(articulation!=='none'?{articulation}:{})};
}
/** Append to the final measure, starting a new measure if necessary. Invalid edits are atomic. */
export function appendEvent(score,input){
  validateScore(score);
  const cap=measureBeats(score.meter);
  const event=makeEvent(input,score.tuning);
  if(event.duration>cap)throw new Error('Duration exceeds this meter');
  const draft=structuredClone(score);
  const last=draft.measures.at(-1);
  if(usedBeats(last)+event.duration>cap+1e-7){
    if(draft.measures.length>=200)throw new Error('Maximum score length reached');
    draft.measures.push({events:[]});
  }
  draft.measures.at(-1).events.push(event);
  validateScore(draft);
  score.measures=draft.measures;
  return event;
}
/** Insert within an existing measure; refuse overflow instead of silently shifting later bars. */
export function insertEvent(score,relativeId,input,where='before'){
  validateScore(score);
  if(!['before','after'].includes(where))throw new Error('Invalid insertion direction');
  const found=findEvent(score,relativeId);
  if(!found)throw new Error('Select an existing event first');
  const event=makeEvent(input,score.tuning);
  if(usedBeats(score.measures[found.measureIndex])+event.duration>measureBeats(score.meter)+1e-7){
    throw new Error('This measure has no room for that note; shorten an event, add a rest in a new bar, or append at the end.');
  }
  const draft=structuredClone(score);
  draft.measures[found.measureIndex].events.splice(found.eventIndex+(where==='after'?1:0),0,event);
  validateScore(draft);
  score.measures=draft.measures;
  return event;
}
/** Explicit blank measure; does not alter existing rhythmic positions. */
export function appendMeasure(score){
  validateScore(score);
  if(score.measures.length>=200)throw new Error('Maximum score length reached');
  if(score.measures.at(-1).events.length===0)throw new Error('The final measure is already blank');
  score.measures.push({events:[]});
  validateScore(score);
  return score.measures.length;
}
export function findEvent(score,id){
  for(const [measureIndex,bar] of score.measures.entries()){
    const eventIndex=bar.events.findIndex(ev=>ev.id===id);
    if(eventIndex>=0)return {event:bar.events[eventIndex],measureIndex,eventIndex};
  }
  return null;
}
export function removeEvent(score,id){
  validateScore(score);
  const found=findEvent(score,id);if(!found)return false;
  const draft=structuredClone(score);
  const preceding=timeline(draft).filter(e=>e.onset<timeline(draft).find(x=>x.id===id)?.onset).at(-1);
  // Removing an endpoint also removes the attachment from the preceding note.
  if(preceding){const before=findEvent(draft,preceding.id)?.event;if(before){delete before.tieToNext;delete before.slurToNext}}
  draft.measures[found.measureIndex].events.splice(found.eventIndex,1);
  // Preserve later measure locations; an incomplete measure is allowed.
  if(draft.measures.length>1 && draft.measures.at(-1).events.length===0)draft.measures.pop();
  validateScore(draft);
  score.measures=draft.measures;
  return true;
}
export function replaceEvent(score,id,input){
  const found=findEvent(score,id);if(!found)throw new Error('Event not found');
  const cap=measureBeats(score.meter),used=usedBeats(score.measures[found.measureIndex])-found.event.duration;
  if(!DURATIONS.includes(input.duration)||used+input.duration>cap+1e-7)throw new Error('This duration would overfill the measure');
  const draft=structuredClone(score);
  const event=draft.measures[found.measureIndex].events[found.eventIndex];
  const next=makeEvent(input,score.tuning);next.id=id;
  if(next.type==='note'&&event.type==='note'&&next.midi===event.midi){
    next.position=event.position;
    if(event.tieToNext)next.tieToNext=true;
    if(event.slurToNext)next.slurToNext=true;
  }
  if(['note','chord'].includes(next.type)&&input.articulation===undefined&&event.articulation)next.articulation=event.articulation;
  draft.measures[found.measureIndex].events[found.eventIndex]=next;
  validateScore(draft);
  if(input.type==='note' && !optionsForMidi(input.midi,draft.tuning,12).length)throw new Error('Pitch is outside playable range');
  score.measures=draft.measures;
  return next;
}
export function assignPosition(score,id,string,fret){
  const found=findEvent(score,id);if(!found||found.event.type!=='note')throw new Error('Select a note first');
  const p=optionsForMidi(found.event.midi,score.tuning,12).find(x=>x.string===string&&x.fret===fret);
  if(!p)throw new Error('This fingering does not play the selected pitch');
  found.event.position={string,fret};validateScore(score);return found.event;
}
export function changeTuning(score,newTuning){
  if(!TUNINGS[newTuning])throw new Error('Invalid tuning');
  score.tuning=newTuning;
  for(const bar of score.measures) for(const ev of bar.events){
    if(ev.type==='note')ev.position=null;
    if(ev.type==='chord')ev.notes=ev.voicing==='generated'?generatedChordNotes(ev.pcs,ev.spellings,newTuning):chordNotes(ev.symbol,newTuning);
  }
  validateScore(score);
}
export function timeline(score){
  validateScore(score);const cap=measureBeats(score.meter);
  return score.measures.flatMap((bar,measureIndex)=>{
    let onset=measureIndex*cap;
    return bar.events.map(ev=>{const result={...ev,measureIndex,onset};onset+=ev.duration;return result;});
  });
}
export function scoreDurationBeats(score){
  const events=timeline(score);
  return events.length?Math.max(...events.map(ev=>ev.onset+ev.duration)):0;
}
export function preferredPosition(ev,tuning){
  if(ev.type==='rest'||ev.type==='chord')return null;
  const possible=optionsForMidi(ev.midi,tuning,12);
  return possible.find(p=>ev.position&&p.string===ev.position.string&&p.fret===ev.position.fret)??
    possible.sort((a,b)=>a.fret-b.fret||b.string-a.string)[0]??null;
}
