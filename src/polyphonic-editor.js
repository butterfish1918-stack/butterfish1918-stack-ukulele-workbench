/** Transactional editing of schema-2 documents. Never mutate the live draft. */
import {validateScoreDocument,SUPPORTED_DYNAMICS,SUPPORTED_ARTICULATIONS} from './polyphonic-score.js';
export const ENSEMBLE_INSTRUMENTS=Object.freeze(['ukulele','piano','bass','guitar','strings','flute','synthesizer','vocals','drums']);
const emptyBars=n=>Array.from({length:n},()=>({events:[]}));
const clone=x=>JSON.parse(JSON.stringify(x));
const epsilon=1e-8;
function nextId(used,prefix){let i=1;while(used.includes(prefix+i))i++;return prefix+i}
function requireInstrument(value){if(!ENSEMBLE_INSTRUMENTS.includes(value))throw Error('Choose a supported instrument');return value}
export function createEnsembleDraft({title='New ensemble',tempo=96,meter='4/4',measures=4}={}){
 if(!Number.isInteger(measures)||measures<1||measures>200)throw Error('Invalid bar count');
 const doc={schema:2,title,tempo,meter,measures,parts:[{id:'P1',name:'Ukulele',instrument:'ukulele',voices:[{id:'1',measures:emptyBars(measures)}]}]};
 validateScoreDocument(doc);return doc;
}
function checkBar(events){
 for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
  const a=events[i],b=events[j];
  if(Math.max(a.onset,b.onset)>=Math.min(a.onset+a.duration,b.onset+b.duration)-epsilon)continue;
  if(a.type==='rest'||b.type==='rest'||Math.abs(a.onset-b.onset)>epsilon||Math.abs(a.duration-b.duration)>epsilon)
   throw Error('Overlapping events in this voice; use a separate voice for counterpoint');
  if(a.midi===b.midi)throw Error('This chord already contains that pitch');
 }
}
export function editEnsembleDraft(source,operation){
 validateScoreDocument(source);
 const doc=clone(source),{type}=operation;
 const part=doc.parts.find(p=>p.id===operation.partId);
 const voice=part?.voices.find(v=>v.id===operation.voiceId);
 if(type==='metadata'){
  if(operation.title!==undefined){if(typeof operation.title!=='string'||!operation.title.trim())throw Error('Enter a title');doc.title=operation.title.trim()}
  if(operation.tempo!==undefined)doc.tempo=operation.tempo;
 }else if(type==='add-part'){
  const instrument=requireInstrument(operation.instrument);
  const name=typeof operation.name==='string'&&operation.name.trim()?operation.name.trim():instrument[0].toUpperCase()+instrument.slice(1);
  doc.parts.push({id:nextId(doc.parts.map(p=>p.id),'P'),name,instrument,voices:[{id:'1',measures:emptyBars(doc.measures)}]});
 }else if(type==='add-voice'){
  if(!part)throw Error('Select an instrument');
  part.voices.push({id:nextId(part.voices.map(v=>v.id),''),measures:emptyBars(doc.measures)});
 }else if(type==='append-bar'){
  if(doc.measures>=200)throw Error('Maximum 200 bars');
  doc.measures++;
  for(const p of doc.parts)for(const v of p.voices)v.measures.push({events:[]});
  // An appended bar has no original source measure reference.
  delete doc.sourceMeasureNumbers;
 }else if(['insert','replace','delete'].includes(type)){
  const bar=voice?.measures[operation.barIndex];
  if(!bar||!Number.isInteger(operation.barIndex))throw Error('Select a valid voice and bar');
  const index=operation.eventIndex,old=bar.events[index];
  if(type!=='insert'&&(!Number.isInteger(index)||!old))throw Error('Select a note or rest');
  if(type==='delete'){
   if(old.tieStart||old.tieStop||old.tuplet)throw Error('Tied or tuplet notes cannot be removed individually in this editor');
   bar.events.splice(index,1);
  }else{
   const input=operation.event;
   if(!input||!['note','rest'].includes(input.type))throw Error('Choose a note or rest');
   const event={type:input.type,onset:input.onset,duration:input.duration};
   if(input.type==='note'){event.midi=input.midi;if(input.spelling)event.spelling=input.spelling}
   if(input.dynamics!==undefined){if(!SUPPORTED_DYNAMICS.includes(input.dynamics))throw Error('Invalid dynamics');event.dynamics=input.dynamics}
   if(input.articulation!==undefined){if(!SUPPORTED_ARTICULATIONS.includes(input.articulation))throw Error('Invalid articulation');event.articulation=input.articulation}
   if(type==='replace'){
    const unchanged=event.type===old.type&&event.midi===old.midi&&event.onset===old.onset&&event.duration===old.duration;
    if((old.tieStart||old.tieStop||old.tuplet)&&!unchanged)throw Error('Timing or pitch of a tied/tuplet note cannot be changed individually');
    if(unchanged){for(const key of ['tieStart','tieStop','tuplet','finger','spelling'])if(old[key]!==undefined&&event[key]===undefined)event[key]=old[key]}
    bar.events[index]=event;
   }else bar.events.push(event);
  }
  checkBar(bar.events);
  bar.events.sort((a,b)=>a.onset-b.onset||b.duration-a.duration||(a.midi??0)-(b.midi??0));
 }else throw Error('Unknown ensemble edit');
 validateScoreDocument(doc);
 return doc;
}
