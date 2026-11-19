/** Built-in, notation-first ukulele technique études.
 * The score and the string/fret hints share actual sounding pitches for every supported tuning.
 * Ratings are SELF-REPORTED practice, never machine-graded performance.
 */
import {TUNINGS,midiName} from './music.js';
import {createScore,appendEvent,assignPosition,validateScore,timeline,setSlurToNext} from './score.js';

const q=(string,fret,left,right,duration=1,options={})=>({string,fret,left,right,duration,...options});
const chord=(symbol,stroke='down',duration=1,options={})=>({chord:true,symbol,stroke,duration,...options});
const rest=duration=>({rest:true,duration});
export const TECHNIQUE_CATALOG=Object.freeze({
 left:[
  {id:'LH-01',name:'Clear fretting on one string',description:'Move between open and fretted notes without squeezing the neck.',goal:'Four clean attacks at a slow tempo.',instruction:'Read each pitch first. Place each finger close behind the fret, then release excess pressure. Stop if you feel pain.',listen:'Every attack should be clear, with no buzz or muted tone.',tempo:64,pattern:[q(1,0,'0','p'),q(1,2,'2','p'),q(1,4,'4','p'),q(1,2,'2','p')]},
  {id:'LH-02',name:'Finger independence 1–2–3',description:'A short chromatic exercise that keeps the hand in one position.',goal:'Control three adjacent frets while maintaining even timing.',instruction:'Work on the C string. Keep each fingertip near the fret. Use the first, second and third fingers in order and reverse the motion.',listen:'Each chromatic pitch should sound distinctly; do not rush the return.',tempo:60,pattern:[q(1,1,'1','p'),q(1,2,'2','p'),q(1,3,'3','p'),q(1,2,'2','p')]},
  {id:'LH-03',name:'Chord transitions C–F–G7–C',description:'Read four successive chord stacks and plan the move before each attack.',goal:'Play each two-beat chord without losing the pulse.',instruction:'First fret C and F silently. Keep the ring finger near the C string and move only the fingers needed. Play each chord for two quarter-note beats; prepare the next shape during the sustain.',listen:'All four strings should sound, with a clear coordinated change at each chord.',tempo:56,pattern:[chord('C','down',2),chord('F','down',2),chord('G7','down',2),chord('C','down',2)]},
  {id:'LH-04',name:'Barre & position shifts',description:'Learn economical pressure and position changes.'},
  {id:'LH-05',name:'Hammer-ons & pull-offs',description:'Study slur signs and controlled fretting-hand articulation.'}
 ],
 right:[
  {id:'RH-01',name:'Even thumb strokes (p)',description:'Single-note thumb attacks against a steady written pulse.',goal:'Keep a consistent attack on every quarter note.',instruction:'Read the rhythm, then pluck each written note with the thumb (p). Keep the wrist relaxed and avoid lifting far away from the string.',listen:'Equal spacing and similar loudness in every note.',tempo:66,pattern:[q(1,0,'0','p'),q(1,2,'2','p'),q(1,4,'4','p'),q(1,2,'2','p')]},
  {id:'RH-02',name:'Index–middle alternation (i–m)',description:'Alternate the index and middle finger on the same string.',goal:'Eight eighth notes with strict i–m alternation.',instruction:'Start on the E string. Read the beamed eighth notes before using the i–m annotations. Keep both fingers close to the string.',listen:'The second half of the bar should feel as even as the first.',tempo:58,pattern:[q(2,0,'0','i',.5),q(2,2,'2','m',.5),q(2,4,'4','i',.5),q(2,2,'2','m',.5),q(2,0,'0','i',.5),q(2,2,'2','m',.5),q(2,4,'4','i',.5),q(2,2,'2','m',.5)]},
  {id:'RH-03',name:'p–i–m–a across four strings',description:'Coordinate thumb, index, middle and ring finger on different strings.',goal:'Repeat a four-note arpeggio without losing the pulse.',instruction:'Play one open string with each finger in G, C, E, A string order. The staff follows actual sounding pitches in the selected tuning; the written melody may not rise steadily.',listen:'Allow each open string to ring naturally, but avoid harsh attacks.',tempo:62,pattern:[q(0,0,'0','p'),q(1,0,'0','i'),q(2,0,'0','m'),q(3,0,'0','a')]},
  {id:'RH-04',name:'Down- and upstrokes',description:'Read quarter and eighth-note chord stacks with strum directions.',goal:'Keep the downstrokes on the pulse and upstrokes between beats.',instruction:'Read the Π (downstroke) and V (upstroke) symbols above the chord stacks. On the eighth-note pair, let your hand travel down and up without pausing. The arrows indicate physical movement, not extra notes.',listen:'A steady pulse; the upstroke should be lighter without losing volume entirely.',tempo:66,pattern:[chord('C','down',1),chord('C','up',.5),chord('C','down',.5),chord('F','down',1),chord('F','up',1)]},
  {id:'RH-05',name:'Campanella introduction',description:'Distribute a melody across strings to allow the notes to overlap.',goal:'Let separate open strings ring between attacks.',instruction:'Follow the score and open-string suggestions. Pluck each of the four strings once, avoiding unwanted muting; this exercise demonstrates the first string-independence concept, not a complete campanella arrangement.',listen:'Hear successive notes resonating together on the instrument.',tempo:54,pattern:[q(1,0,'0','p'),q(2,0,'0','i'),q(0,0,'0','m'),q(3,0,'0','a')]}
 ],
 musical:[
  {id:'MU-01',name:'Phrasing with written rests',description:'Separate short phrases with a deliberately notated silence.',goal:'Two short phrases with a silent beat between them.',instruction:'Read the quarter-note rest as part of the phrase. Play two notes, leave the rest completely silent, then continue; do not fill the gap with an extra attack.',listen:'The silence has a clear duration rather than an arbitrary pause.',tempo:70,pattern:[q(1,0,'0','p'),q(1,2,'2','i'),rest(1),q(1,4,'4','m')]},
  {id:'MU-02',name:'Slurs and staccato',description:'Read a slur joining different notes and staccato markings.',goal:'Contrast connected phrasing and deliberately detached attacks.',instruction:'The arc is a slur, not a tie: both different pitches are sounded. Follow the arc as one phrase, then play the marked staccato notes short and clear.',listen:'The first two notes connect; the final two notes have short distinct releases.',tempo:64,pattern:[q(1,0,'0','p',1,{slurToNext:true}),q(1,2,'2','i'),q(1,4,'4','m',1,{articulation:'staccato'}),q(1,2,'2','i',1,{articulation:'staccato'})]},
  {id:'MU-03',name:'Dynamic expression',description:'Read and shape piano, forte and crescendo markings.'},
  {id:'MU-04',name:'Chord melody',description:'Carry a melody clearly above a chord accompaniment.'},
  {id:'MU-05',name:'Arrange for ukulele',description:'Coordinate musical voices, voicing and fingering choices.'}
 ]
});
export const TECHNIQUE_LESSONS=Object.freeze(Object.values(TECHNIQUE_CATALOG).flat().filter(t=>t.pattern));
export function techniqueById(id){return TECHNIQUE_LESSONS.find(x=>x.id===id)||null;}
export function techniqueScore(id,tuning='highG'){
 const unit=techniqueById(id);
 if(!unit)throw new Error('This technique is not yet a playable lesson');
 if(!TUNINGS[tuning])throw new Error('Unsupported tuning');
 const score=createScore({title:unit.name,tuning,meter:'4/4',tempo:unit.tempo,key:'C',sample:false});
 const annotations={};const steps=[];
 unit.pattern.forEach((step,i)=>{
  let ev;
  if(step.rest)ev=appendEvent(score,{type:'rest',duration:step.duration});
  else if(step.chord)ev=appendEvent(score,{type:'chord',symbol:step.symbol,stroke:step.stroke,duration:step.duration,articulation:step.articulation});
  else {
   const midi=TUNINGS[tuning].midi[step.string]+step.fret;
   const spelling=midiName(midi).replace(/-?\d+$/,'');
   ev=appendEvent(score,{type:'note',midi,spelling,duration:step.duration,articulation:step.articulation});
   assignPosition(score,ev.id,step.string,step.fret);
  }
  ev.id=`${id}-${i}`;
  if(step.chord)annotations[ev.id]=step.stroke==='down'?'Π':step.stroke==='up'?'V':'simultaneous';
  else if(!step.rest)annotations[ev.id]=`${step.right} / ${step.left}`;
  steps.push({id:ev.id,type:step.rest?'rest':step.chord?'chord':'note',string:step.string,fret:step.fret,left:step.left,right:step.right,symbol:step.symbol,stroke:step.stroke,duration:step.duration,articulation:step.articulation});
 });
 // Slurs are added only when the following sounding event exists.
 for(let i=0;i<unit.pattern.length;i++)if(unit.pattern[i].slurToNext)setSlurToNext(score,`${id}-${i}`,true);
 validateScore(score);
 return {unit,score,steps,annotations};
}
export function recordTechniquePractice(current,id,confidence,at=new Date().toISOString()){
 if(!techniqueById(id))throw new Error('Unknown technique lesson');
 if(!['learning','comfortable','confident'].includes(confidence))throw new Error('Invalid confidence level');
 if(typeof at!=='string'||!Number.isFinite(Date.parse(at)))throw new Error('Invalid date');
 const safe=current&&typeof current==='object'&&!Array.isArray(current)?structuredClone(current):{};
 const previous=safe[id]||{sessions:0};
 safe[id]={sessions:Math.min(9999,(Number(previous.sessions)||0)+1),confidence,lastPracticed:at};
 return safe;
}
export function validTechniqueProgress(progress){
 if(!progress||typeof progress!=='object'||Array.isArray(progress))return false;
 return Object.entries(progress).every(([id,entry])=>techniqueById(id)&&entry&&typeof entry==='object'&&Number.isInteger(entry.sessions)&&entry.sessions>=0&&entry.sessions<=9999&&['learning','comfortable','confident'].includes(entry.confidence)&&typeof entry.lastPracticed==='string'&&Number.isFinite(Date.parse(entry.lastPracticed)));
}
