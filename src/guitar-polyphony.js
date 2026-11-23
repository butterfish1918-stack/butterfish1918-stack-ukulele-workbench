/** Retain every available simultaneous guitar pitch when adapting to high-G GCEA.
 * No voice is silently discarded: chords with >4 notes or impossible unique
 * string assignments fail rather than masquerading as complete arrangements.
 */
import {optionsForMidi,midiName} from './music.js';
const spelling=midi=>midiName(midi).replace(/-?\d+$/,'');
export function adaptSimultaneousGuitarNotes(notes,{maxFret=12}={}){
 if(!Array.isArray(notes)||notes.length<2||notes.length>4)throw Error('A chord must contain two to four distinct source notes');
 const choices=notes.map((source,i)=>{
  if(!Number.isInteger(source.midi)||source.midi<28||source.midi>110)throw Error('Invalid source guitar pitch');
  const list=[];
  for(let shift=-48;shift<=48;shift+=12){
   const midi=source.midi+shift;
   for(const p of optionsForMidi(midi,'highG',maxFret)){
    list.push({index:i,midi,spelling:source.spelling||spelling(midi),position:{string:p.string,fret:p.fret},sourceMidi:source.midi,shift,cost:Math.abs(shift)*.22+p.fret*.08});
   }
  }
  if(!list.length)throw Error('No reachable ukulele pitch for source note '+source.midi);
  return list.sort((a,b)=>a.cost-b.cost).slice(0,16);
 });
 let best=null;
 function choose(index,selected,strings,score){
  if(index===choices.length){
   const pitches=selected.map(x=>x.midi).sort((a,b)=>a-b);
   const original=notes.map(x=>x.midi).sort((a,b)=>a-b);
   let contourPenalty=0;
   for(let i=1;i<pitches.length;i++)contourPenalty+=Math.abs((pitches[i]-pitches[i-1])-(original[i]-original[i-1]))*.14;
   const total=score+contourPenalty;
   if(!best||total<best.cost)best={notes:selected.map(x=>({...x})),cost:total};
   return;
  }
  for(const candidate of choices[index]){
   if(strings.has(candidate.position.string))continue;
   if(best&&score+candidate.cost>best.cost)continue;
   strings.add(candidate.position.string);
   choose(index+1,[...selected,candidate],strings,score+candidate.cost);
   strings.delete(candidate.position.string);
  }
 }
 choose(0,[],new Set(),0);
 if(!best)throw Error('Cannot preserve all simultaneous source notes on four distinct GCEA strings');
 const result=best.notes.sort((a,b)=>a.position.string-b.position.string);
 return {notes:result.map(({midi,spelling,position})=>({midi,spelling,position})),
  mapping:result.map(({sourceMidi,midi,shift,position})=>({sourceMidi,ukeMidi:midi,octaveShift:shift,ukeString:position.string,ukeFret:position.fret})),
  octaveShiftedNotes:result.filter(x=>x.shift!==0).length};
}
