import {TUNINGS,optionsForMidi,mod} from './music.js';
/** Concrete, pitch-aware theory helpers; no invented recording transcriptions. */
export function arpeggioDegrees(scaleMidis,{pattern=[0,1,2,1],octaves=1}={}){
 if(!Array.isArray(scaleMidis)||scaleMidis.length<3||scaleMidis.some(n=>!Number.isInteger(n)))throw Error('Three or more pitch values required');
 if(!Array.isArray(pattern)||pattern.some(i=>!Number.isInteger(i)||i<0||i>=scaleMidis.length))throw Error('Invalid arpeggio indices');
 return Array.from({length:octaves},(_,oct)=>pattern.map(i=>scaleMidis[i]+oct*12)).flat();
}
export function chordInversions(midis,{maxInversions=4}={}){
 if(!Array.isArray(midis)||midis.length<3||midis.length>4||midis.some(n=>!Number.isInteger(n)))throw Error('Three or four chord tones required');
 const sorted=[...midis].sort((a,b)=>a-b),result=[sorted];
 for(let i=1;i<Math.min(maxInversions,midis.length);i++){
  const prev=[...result[i-1]],lowest=prev.shift();
  prev.push(lowest+12);result.push(prev);
 }
 return result;
}
export function ukuleleVoiceLeading(chords,tuning='highG'){
 if(!TUNINGS[tuning])throw Error('Unknown ukulele tuning');
 if(!Array.isArray(chords)||!chords.length||chords.length>32)throw Error('Invalid harmony progression');
 const options=chords.map(chord=>{
  if(!Array.isArray(chord)||chord.length<3||chord.length>4)throw Error('Invalid chord tones');
  const candidates=chord.flatMap(midi=>optionsForMidi(midi,tuning,12).map(pos=>({midi,...pos})));
  return candidates;
 });
 return options.map((positions,i)=>{
  if(!i)return {chord:i,positionCount:positions.length,meanFret:positions.reduce((n,p)=>n+p.fret,0)/Math.max(1,positions.length)};
  const prev=options[i-1],dist=positions.map(p=>Math.min(...prev.map(q=>Math.abs(p.fret-q.fret)+Math.abs(p.string-q.string)*2)));
  return {chord:i,positionCount:positions.length,meanFret:positions.reduce((n,p)=>n+p.fret,0)/Math.max(1,positions.length),
   meanTransitionCost:dist.reduce((a,b)=>a+b,0)/Math.max(1,dist.length)};
 });
}
export function harmonicFunctions(degree,mode='major'){
 if(!Number.isInteger(degree)||degree<1||degree>7)throw Error('Degree must be 1–7');
 const major=['tonic','supertonic predominant','tonic prolongation','predominant','dominant','tonic substitute','leading-tone dominant'];
 const minor=['tonic','predominant','tonic prolongation','predominant','dominant','tonic substitute','dominant preparation'];
 return (mode==='minor'?minor:major)[degree-1];
}
export function basicChordSubstitutions(degree){
 const alternatives={1:[3,6],2:[4],3:[1,6],4:[2,6],5:[7],6:[1,4],7:[5]};
 if(!Number.isInteger(degree)||degree<1||degree>7)throw Error('Unknown scale degree');
 return alternatives[degree];
}
export function nextEarTrainingQuestion(seed=0){
 const offset=Math.abs(Math.floor(seed))%12;
 const interval=[0,2,4,5,7,9,12][Math.abs(Math.floor(seed/12))%7];
 return {firstMidi:60+offset,secondMidi:60+offset+interval,intervalSemitones:interval,
  answerChoices:[0,2,4,5,7,9,12]};
}
