/** Deterministic SVG geometry for independently voiced imported scores.
 * Keeps common attack onsets aligned across instrumental parts, prevents dense
 * passages from collapsing into tiny spacing, and reserves vertical room for
 * ledger lines and annotations. It is NOT a publication engraver.
 */
import {validateScoreDocument} from './polyphonic-score.js';
import {staffYForSpelling,midiName} from './music.js';
const EPS=1e-8;
export function noteStaffOffset(e){
 if(e.type!=='note')return 22;
 const spelling=e.spelling||midiName(e.midi).replace(/-?\d+$/,'');
 return 44+(staffYForSpelling(e.midi,spelling,102)-102)*11/12;
}
export function voiceOffset(voiceIndex){
 if(!Number.isInteger(voiceIndex)||voiceIndex<0||voiceIndex>7)throw Error('Invalid voice placement');
 return (voiceIndex%2?1:-1)*(9+Math.floor(voiceIndex/2)*8);
}
/** Collision offset for consecutive seconds in written chords.
 * A chord has identical onset AND rhythmic duration in one voice.
 */
export function chordHeadShift(events,event){
 if(event.type!=='note')return 0;
 const chord=events.filter(e=>e.type==='note'&&
  Math.abs(e.onset-event.onset)<EPS&&Math.abs(e.duration-event.duration)<EPS)
  .sort((a,b)=>noteStaffOffset(a)-noteStaffOffset(b)||a.midi-b.midi);
 const index=chord.indexOf(event);
 if(index<1)return 0;
 let shifted=0;
 for(let i=1;i<=index;i++)
  if(Math.abs(noteStaffOffset(chord[i])-noteStaffOffset(chord[i-1]))<=6.1)
   shifted=shifted?0:12;
  else shifted=0;
 return shifted;
}
export function planPolyphonicLayout(doc,{pageWidth=760,maxBars=4,minSpacing=32}={}){
 validateScoreDocument(doc);
 if(!Number.isFinite(pageWidth)||pageWidth<300||
    !Number.isInteger(maxBars)||maxBars<1||maxBars>8||
    !Number.isFinite(minSpacing)||minSpacing<25||minSpacing>70)
  throw Error('Invalid staff layout parameters');
 const measureData=Array.from({length:doc.measures},(_,mi)=>{
  const attacks=doc.parts.flatMap(part=>part.voices.flatMap(voice=>
   voice.measures[mi].events.map(e=>e.onset)));
  const unique=[...new Set(attacks.map(x=>Math.round(x*1e8)/1e8))].sort((a,b)=>a-b);
  return {index:mi+1,onsets:unique.length?unique:[0]};
 });
 const systems=[],edge=75;
 let begin=0;
 while(begin<measureData.length){
  let end=begin,width=edge+8;
  while(end<measureData.length&&end-begin<maxBars){
   const item=measureData[end],prefix=end===begin?65:24;
   const requested=prefix+item.onsets.length*minSpacing+20;
   if(end>begin&&width+requested>pageWidth)break;
   width+=requested;end++;
  }
  const current=measureData.slice(begin,end),bars=[];
  let x=edge;
  for(const [i,item] of current.entries()){
   const preface=i===0?65:24;
   const widthBar=preface+item.onsets.length*minSpacing+20;
   const coords=new Map(item.onsets.map((onset,index)=>[onset,x+preface+index*minSpacing]));
   bars.push({index:item.index,x,width:widthBar,onsets:item.onsets,preface,spacing:minSpacing,
    xFor(onset){
     const key=Math.round(onset*1e8)/1e8;
     if(!coords.has(key))throw Error('Unplaced rhythmic onset');
     return coords.get(key);
    }});
   x+=widthBar;
  }
  const staffTops=[];
  let cursor=42;
  doc.parts.forEach(part=>{
   const events=part.voices.flatMap(voice=>voice.measures.slice(begin,end).flatMap(m=>m.events));
   const notes=events.filter(e=>e.type==='note');
   const min=Math.min(0,...notes.map(e=>noteStaffOffset(e)-36));
   const max=Math.max(44,...notes.map(e=>noteStaffOffset(e)+28));
   const top=cursor+Math.max(0,18-min);
   staffTops.push(top);
   cursor=top+Math.max(108,max+40);
  });
  systems.push({startBar:begin+1,endBar:end,bars,
   width:Math.max(edge+90,Math.ceil(x+8)),height:Math.ceil(cursor+10),staffTops});
  begin=end;
 }
 return systems;
}
