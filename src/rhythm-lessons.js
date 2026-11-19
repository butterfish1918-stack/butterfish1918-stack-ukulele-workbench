/** Notation-first rhythm reading: deterministic two-bar études, no microphone inference.
 * Quarters are the canonical beat unit, even in 6/8 (two dotted-quarter pulses per bar).
 */
import {appendEvent,createScore,measureBeats,timeline,validateScore} from './score.js';

export const RHYTHM_STUDIES=Object.freeze([
 {id:'RT-01',title:'Four steady beats',meter:'4/4',tempo:76,level:'1 · Pulse',goal:'Keep a steady quarter-note pulse.',bars:[[1,1,1,1],[1,1,1,1]]},
 {id:'RT-02',title:'Respect the silence',meter:'4/4',tempo:78,level:'1 · Rests',goal:'Leave beat three silent; do not tap for a written rest.',bars:[[1,1,'R1',1],[1,'R1',1,1]]},
 {id:'RT-03',title:'Eighth-note pairs',meter:'4/4',tempo:74,level:'2 · Subdivision',goal:'Read two equal attacks within each quarter beat.',bars:[[.5,.5,1,.5,.5,1],[1,.5,.5,.5,.5,1]]},
 {id:'RT-04',title:'Offbeat entrance',meter:'4/4',tempo:72,level:'2 · Offbeats',goal:'Tap the offbeat after the first rest; do not add an attack on the downbeat.',bars:[['R.5',.5,1,.5,.5,1],[1,'R.5',.5,1,1]]},
 {id:'RT-05',title:'A dotted-quarter phrase',meter:'4/4',tempo:72,level:'3 · Dots',goal:'Hold the dotted quarter for one and a half quarter-note beats.',bars:[[1.5,.5,1,1],[1,.5,.5,1.5,.5]]},
 {id:'RT-06',title:'Dotted eighth and sixteenth',meter:'4/4',tempo:64,level:'3 · Precision',goal:'Place the sixteenth immediately after a dotted eighth.',bars:[[.75,.25,1,1,1],[1,1,.75,.25,1]]},
 {id:'RT-07',title:'Waltz in three',meter:'3/4',tempo:80,level:'2 · 3/4 meter',goal:'Feel three quarter-note pulses per measure.',bars:[[1,.5,.5,1],[1,1,1]]},
 {id:'RT-08',title:'Compound 6/8',meter:'6/8',tempo:84,level:'3 · Compound time',goal:'Hear two dotted-quarter pulses, with three eighth-note subdivisions each.',bars:[[1.5,.5,.5,.5],[.5,.5,.5,1.5]]}
]);
const near=(a,b)=>Math.abs(a-b)<1e-6;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function rhythmStudy(id){const found=RHYTHM_STUDIES.find(x=>x.id===id);if(!found)throw new Error('Unknown rhythm étude');return found;}
export function rhythmStudyScore(id,tuning='highG'){
 const lesson=rhythmStudy(id);
 const score=createScore({title:lesson.title,tuning,meter:lesson.meter,tempo:lesson.tempo,key:'C',sample:false});
 const cap=measureBeats(lesson.meter);
 for(const bar of lesson.bars){
  const durations=bar.map(v=>typeof v==='string'?Number(v.slice(1)):v);
  if(!near(durations.reduce((a,b)=>a+b,0),cap))throw new Error('Invalid lesson bar');
  for(const value of bar){const rest=typeof value==='string';appendEvent(score,rest?{type:'rest',duration:Number(value.slice(1))}:{type:'note',midi:60,duration:value});}
 }
 validateScore(score);
 if(score.measures.length!==lesson.bars.length)throw new Error('Lesson measure count disagrees');
 return score;
}
export function rhythmOnsets(score){return timeline(score).filter(x=>x.type==='note').map(x=>x.onset);}
export function countIn(score){const cap=measureBeats(score.meter);const pulse=score.meter==='6/8'?1.5:1;return {quarterBeats:cap,pulseBeats:pulse,pulses:Math.round(cap/pulse)};}
export function gradeRhythmTaps(score,tapMs,tempo=score.tempo){
 validateScore(score);
 if(!Number.isInteger(tempo)||tempo<30||tempo>240)throw new Error('Invalid tempo');
 if(!Array.isArray(tapMs)||tapMs.length>500||tapMs.some(x=>!finite(x)))throw new Error('Invalid tap data');
 const interval=60000/tempo,tolerance=Math.max(85,Math.min(220,interval*.25));
 const expected=rhythmOnsets(score).map(x=>x*interval);
 const taps=[...tapMs].sort((a,b)=>a-b);
 const used=new Set();let matched=0,totalError=0,extras=0;
 for(const t of taps){let closest=-1,difference=Infinity;
  for(let i=0;i<expected.length;i++)if(!used.has(i)){
   const delta=Math.abs(expected[i]-t);
   if(delta<difference){difference=delta;closest=i;}
  }
  if(closest>=0&&difference<=tolerance){used.add(closest);matched++;totalError+=difference;}
  else extras++;
 }
 const missed=expected.length-matched;
 return {matched,expected:expected.length,missed,extra:extras,accuracy:expected.length?Math.round(100*matched/expected.length):0,meanErrorMs:matched?Math.round(totalError/matched):null,toleranceMs:Math.round(tolerance)};
}
export function recordRhythmResult(previous,id,result){rhythmStudy(id);
 if(!previous||typeof previous!=='object'||Array.isArray(previous))throw new Error('Invalid record');
 if(!Number.isInteger(result.accuracy)||result.accuracy<0||result.accuracy>100)throw new Error('Invalid accuracy');
 const old=previous[id]??{sessions:0,best:0};
 return {...previous,[id]:{sessions:Math.min(100000,(old.sessions??0)+1),best:Math.max(old.best??0,result.accuracy),last:result.accuracy}};
}
export function validRhythmProgress(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 return Object.entries(value).every(([id,v])=>RHYTHM_STUDIES.some(x=>x.id===id)&&v&&Number.isInteger(v.sessions)&&v.sessions>=0&&v.sessions<=100000&&Number.isInteger(v.best)&&v.best>=0&&v.best<=100&&Number.isInteger(v.last)&&v.last>=0&&v.last<=100);
}
