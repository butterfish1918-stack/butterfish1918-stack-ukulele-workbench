/** Optional high-quality VexFlow 5 preview, independent of the canonical score model.
 * The classic in-app SVG notation remains available when offline.
 * No third-party script is contacted until the user explicitly requests this preview.
 */
import {writtenOctave} from './reading-lessons.js';
import {accidentalMarks} from './score-view.js';
import {baseDuration,isDotted,KEY_SIGNATURES} from './score.js';

export const VEXFLOW_CDN='https://cdn.jsdelivr.net/npm/vexflow@5.1.0/build/cjs/vexflow.js';
const TYPES=Object.freeze({0.25:'16',0.5:'8',1:'q',2:'h',4:'w'});
let pending=null;
/** Check/edit data without requiring the third-party library or a DOM. */
export function engravingPlan(score){
 if(!score?.measures?.length)throw new Error('Missing score');
 return score.measures.map((measure,mi)=>{
  const prev=score.measures[mi-1]?.events?.at(-1);
  const marks=accidentalMarks(measure.events,score.key??'C',!!prev?.tieToNext);
  const events=measure.events.map((event,ei)=>{
   if(!Object.hasOwn(TYPES,baseDuration(event.duration)))throw new Error('Unsupported engraving duration');
   const notes=event.type==='chord'?event.notes:event.type==='note'?[event]:[];
   const accidentals=event.type==='chord'?marks[ei]:notes.length?[marks[ei]]:[];
   const pitches=notes.map((n,i)=>({
     key:`${n.spelling.toLowerCase()}/${writtenOctave(n.midi,n.spelling)}`,
     accidental:({natural:'n','##':'##','bb':'bb'})[accidentals[i]]??accidentals[i]??null,
     midi:n.midi, index:i
   })).sort((a,b)=>a.midi-b.midi);
   return {id:event.id,kind:event.type,duration:event.duration,code:TYPES[baseDuration(event.duration)]+(event.type==='rest'?'r':''),dotted:isDotted(event.duration),pitches,symbol:event.symbol??null,stroke:event.stroke??'none',tieToNext:!!event.tieToNext,slurToNext:!!event.slurToNext,articulation:event.articulation??'none'};
  });
  return {index:mi,events};
 });
}
export function loadVexFlow(){
 if(globalThis.VexFlow?.Renderer)return Promise.resolve(globalThis.VexFlow);
 if(pending)return pending;
 if(typeof document==='undefined')return Promise.reject(new Error('Browser required'));
 pending=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=VEXFLOW_CDN;script.async=true;
  const timer=setTimeout(()=>reject(new Error('VexFlow download timed out; classic notation remains available')),10000);
  script.onload=()=>{clearTimeout(timer);globalThis.VexFlow?.Renderer?resolve(globalThis.VexFlow):reject(new Error('VexFlow did not load correctly'))};
  script.onerror=()=>{clearTimeout(timer);reject(new Error('VexFlow could not load (offline or network restrictions)'))};
  document.head.append(script);
 }).catch(error=>{pending=null;throw error});
 return pending;
}
/** Render a formatted staff per measure. Preview does not replace the editable SVG/fretboard. */
export function renderEngravedScore(host,score,{onSelect=null}={}){
 const VF=globalThis.VexFlow;
 if(!VF?.Renderer)throw new Error('VexFlow is not available');
 const measures=engravingPlan(score);
 const meter=score.meter.split('/').map(Number);
 const key=score.key??'C';if(!Object.hasOwn(KEY_SIGNATURES,key))throw new Error('Unsupported key');
 const widths=measures.map((m,i)=>Math.max(i===0?385:240,125+m.events.length*64+(i===0?160:0)));
 const total=widths.reduce((a,b)=>a+b,0)+20;
 host.replaceChildren();
 const renderer=new VF.Renderer(host,VF.Renderer.Backends.SVG);
 renderer.resize(total,210);
 const ctx=renderer.getContext();
 const all=[];let x=12;
 for(let mi=0;mi<measures.length;mi++){
  const bar=measures[mi];const width=widths[mi];const stave=new VF.Stave(x,60,width);
  if(mi===0){stave.addClef('treble');stave.addKeySignature(key);stave.addTimeSignature(score.meter);}
  stave.setContext(ctx).draw();
  const tickables=[];
  for(const spec of bar.events){
   const keys=spec.pitches.length?spec.pitches.map(p=>p.key):['b/4'];
   const note=new VF.StaveNote({keys,duration:spec.code});
   if(spec.dotted)VF.Dot.buildAndAttach([note],{all:true});
   if(spec.kind!=='rest')for(let i=0;i<spec.pitches.length;i++){
     if(spec.pitches[i].accidental)note.addModifier(new VF.Accidental(spec.pitches[i].accidental),i);
   }
   if(spec.symbol&&VF.Annotation)note.addModifier(new VF.Annotation(spec.symbol));
   tickables.push(note);all.push({id:spec.id,note,kind:spec.kind,tieToNext:spec.tieToNext});
  }
  if(tickables.length){
   const voice=new VF.Voice({num_beats:meter[0],beat_value:meter[1]});
   voice.setStrict(false);voice.addTickables(tickables);
   const reserved=mi===0?190:35;
   new VF.Formatter().joinVoices([voice]).format([voice],Math.max(85,width-reserved));
   voice.draw(ctx,stave);
  }
  x+=width;
 }
 for(const entry of all){
  const svg=entry.note.getSVGElement?.();if(!svg)continue;
  svg.setAttribute('data-event-id',entry.id);
  svg.setAttribute('role','button');svg.setAttribute('tabindex','0');
  svg.setAttribute('aria-label',entry.kind==='rest'?'Select rest':'Select score event');
  if(onSelect){svg.addEventListener('click',()=>onSelect(entry.id));svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(entry.id)}})}
 }
 return {width:total,events:all.length,measures:measures.length};
}
