/** Exact-pitch four-string tablature for independent rhythmic voices.
 * Bounded beam search considers sustained notes and cross-bar ties. Never
 * transpose, truncate chords, or pretend that a missing fingering is playable.
 */
import {validateScoreDocument} from './polyphonic-score.js';
import {TUNINGS} from './music.js';
import {ensembleInstrument} from './ensemble-playback.js';
const EPS=1e-7;
const round=n=>Math.round(n*1e8)/1e8;
export const tabEventKey=(voice,bar,index)=>JSON.stringify([voice,bar,index]);
export function planUkuleleTablature(doc,partId,{tuning='highG',maxFret=12,beamWidth=16}={}){
 validateScoreDocument(doc);
 if(!['highG','lowG','baritone','custom'].includes(tuning)||!TUNINGS[tuning]||!Number.isInteger(maxFret)||maxFret<0||maxFret>24||!Number.isInteger(beamWidth)||beamWidth<1||beamWidth>32)throw Error('Invalid tablature options');
 const part=doc.parts.find(p=>p.id===partId);
 if(!part||ensembleInstrument(part)!=='ukulele')throw Error('Choose a ukulele part');
 const opens=TUNINGS[tuning].midi,beats=doc.meter.split('/').map(Number).reduce((a,b)=>a*4/b);
 const attacks=[];
 for(const voice of part.voices){
  const ties=new Map();
  for(const [mi,bar] of voice.measures.entries()){
   const notes=bar.events.map((e,index)=>({e,index})).filter(x=>x.e.type==='note').sort((a,b)=>a.e.onset-b.e.onset);
   for(const {e,index} of notes){
    const start=round(mi*beats+e.onset),end=round(start+e.duration),key=tabEventKey(voice.id,mi+1,index);
    if(e.tieStop){
     const chain=ties.get(e.midi);if(!chain)throw Error('Missing tied tablature attack');
     chain.end=end;chain.keys.push(key);if(!e.tieStart)ties.delete(e.midi);continue;
    }
    const attack={midi:e.midi,start,end,keys:[key],choices:opens.flatMap((open,string)=>e.midi>=open&&e.midi-open<=maxFret?[{string,fret:e.midi-open}]:[])};
    attacks.push(attack);if(e.tieStart)ties.set(e.midi,attack);
   }
  }
 }
 attacks.sort((a,b)=>a.start-b.start||a.midi-b.midi);
 if(attacks.length>20000)throw Error('Tablature exceeds the 20,000-attack preview limit');
 let states=[{held:[],anchor:0,cost:0,missing:0,history:null}];
 for(let i=0;i<attacks.length;){
  let j=i+1;while(j<attacks.length&&Math.abs(attacks[j].start-attacks[i].start)<EPS)j++;
  const group=attacks.slice(i,j),candidates=[];
  for(const state of states){
   const held=state.held.filter(a=>a.end>group[0].start+EPS),used=new Set(held.map(a=>a.string));
   function add(assigned){
    const frets=[...held,...assigned].map(x=>x.fret).filter(n=>n>0);
    const anchor=frets.length?Math.min(...frets):state.anchor;
    const span=frets.length?Math.max(...frets)-anchor:0;
    const cost=state.cost+assigned.reduce((n,x)=>n+x.fret*.12,0)+Math.abs(anchor-state.anchor)*.6+span*.45+Math.max(0,span-4)*3;
    candidates.push({held:[...held,...assigned],anchor,cost,missing:state.missing,history:{previous:state.history,group,assigned}});
   }
   function visit(k,assigned){
    if(k===group.length){add(assigned);return}
    const a=group[k];
    for(const p of a.choices){if(used.has(p.string))continue;used.add(p.string);visit(k+1,[...assigned,{...p,end:a.end}]);used.delete(p.string)}
   }
   if(group.length+held.length<=4)visit(0,[]);
   // Allow an explicit unresolved attack group, never a silently reduced chord.
   candidates.push({held,anchor:state.anchor,cost:state.cost,missing:state.missing+group.length,history:{previous:state.history,group,assigned:null}});
  }
  candidates.sort((a,b)=>a.missing-b.missing||a.cost-b.cost);
  const seen=new Set();states=[];
  for(const s of candidates){
   const key=JSON.stringify([s.anchor,s.held.map(p=>[p.string,p.fret,p.end]).sort((a,b)=>a[0]-b[0])]);
   if(seen.has(key))continue;seen.add(key);states.push(s);if(states.length>=beamWidth)break;
  }
  i=j;
 }
 const positions=new Map(),warnings=[];
 for(let h=states[0].history;h;h=h.previous){
  h.group.forEach((attack,index)=>{
   const p=h.assigned?.[index];
   for(const key of attack.keys)positions.set(key,p?{string:p.string,fret:p.fret}:null);
  });
  if(!h.assigned)warnings.push({beat:h.group[0].start,bar:Math.floor(h.group[0].start/beats+EPS)+1,pitches:h.group.map(a=>a.midi),reason:h.group.some(a=>!a.choices.length)?'Pitch outside selected fret range':'No compatible simultaneous fingering found'});
 }
 warnings.reverse();
 return {positions,warnings,tuning,maxFret,names:[...TUNINGS[tuning].names],unresolvedAttacks:states[0].missing};
}
