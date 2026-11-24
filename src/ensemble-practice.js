/** Pure scheduling and per-arrangement practice preferences. */
import {validateScoreDocument} from './polyphonic-score.js';
import {nextPracticeSpeed} from './practice-engine.js';
export const ENSEMBLE_SPEEDS=[50,60,75,90,100,110,125];
export function ensemblePreferences(doc,input={}){
 validateScoreDocument(doc);
 const startBar=Number.isInteger(input?.startBar)?Math.max(1,Math.min(doc.measures,input.startBar)):1;
 const endBar=Number.isInteger(input?.endBar)?Math.max(startBar,Math.min(doc.measures,input.endBar)):doc.measures;
 const speed=ENSEMBLE_SPEEDS.includes(input?.speed)?input.speed:100;
 const mix=Object.fromEntries(doc.parts.map(p=>{
  const item=Object.hasOwn(input?.mix||{},p.id)?input.mix[p.id]:null;
  return [p.id,{muted:item?.muted===true,volume:Number.isFinite(item?.volume)?Math.max(0,Math.min(150,Math.round(item.volume/5)*5)):100}];
 }));
 return {startBar,endBar,speed,loop:input?.loop===true,ramp:input?.ramp===true,step:[2,5,10].includes(input?.step)?input.step:5,max:[80,90,100,110,120,125].includes(input?.max)?input.max:125,mix};
}
export function ensemblePreferenceLibrary(songs,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid ensemble practice preferences');
 return Object.fromEntries(songs.filter(s=>s.scoreDocument&&Object.hasOwn(input,s.id)).map(s=>[s.id,ensemblePreferences(s.scoreDocument,input[s.id])]));
}
export function createEnsembleCycle({start,tempo,speed,totalBeats,index=0}){
 if(!Number.isFinite(start)||!Number.isFinite(tempo)||tempo<=0||!Number.isFinite(speed)||speed<50||speed>125||!Number.isFinite(totalBeats)||totalBeats<=0)throw Error('Invalid ensemble cycle');
 const seconds=60/(tempo*speed/100);
 return {start,seconds,speed,end:start+totalBeats*seconds,index,next:0};
}
export function nextEnsembleCycle(cycle,{tempo,totalBeats,loop,ramp,step,max}){
 if(!loop)return null;
 const speed=ramp?nextPracticeSpeed(cycle.speed,{step,max:Math.max(cycle.speed,max),cycle:cycle.index+1}):cycle.speed;
 return createEnsembleCycle({start:cycle.end,tempo,speed,totalBeats,index:cycle.index+1});
}
export function ensemblePlayPosition(cycle,now,{startBar,endBar,beatsPerBar}){
 const beat=Math.max(0,(now-cycle.start)/cycle.seconds);
 return {bar:Math.min(endBar,startBar+Math.floor(beat/beatsPerBar)),beat,cycle:cycle.index,speed:cycle.speed};
}
export function ensembleSessionSummary(run,now){
 const elapsed=Math.max(0,Math.min(43200,now-run.firstStart));
 const seconds=run.finishedAt===undefined?elapsed:Math.min(elapsed,Math.max(0,run.finishedAt-run.firstStart));
 return {seconds,loops:Math.max(0,Math.min(10000,run.completedCycles??0)),speed:run.initialSpeed};
}
