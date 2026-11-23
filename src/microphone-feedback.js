/** Local only, monophonic accuracy. It compares a measured fundamental
 * with the notated sounding MIDI pitch; onset is approximate until the
 * physical phone's input/output latency has been calibrated.
 */
export function pitchPracticeFeedback(expectedMidi,measuredHz,{a4=440,acceptableCents=35}={}){
 if(!Number.isInteger(expectedMidi)||expectedMidi<20||expectedMidi>110)throw Error('Invalid written target pitch');
 if(!Number.isFinite(measuredHz)||measuredHz<=0||!Number.isFinite(a4)||a4<400||a4>480)return {detected:false,correct:false};
 const target=440*Math.pow(2,(expectedMidi-69)/12)*a4/440;
 const cents=1200*Math.log2(measuredHz/target);
 return {detected:true,correct:Math.abs(cents)<=acceptableCents,expectedMidi,measuredHz,targetHz:target,
  cents:Math.round(cents),direction:cents>acceptableCents?'sharp':cents< -acceptableCents?'flat':'in tune'};
}
export function onsetPracticeFeedback(expectedMs,detectedMs,{toleranceMs=110}={}){
 if(!Number.isFinite(expectedMs)||!Number.isFinite(detectedMs))return {detected:false};
 const difference=detectedMs-expectedMs;
 return {detected:true,differenceMs:Math.round(difference),withinTolerance:Math.abs(difference)<=toleranceMs,
  direction:difference>toleranceMs?'late':difference< -toleranceMs?'early':'on time',
  calibrated:false};
}

/** Gate monophonic feedback on consecutive, consistent YIN estimates.
 * Samples contain only transient Hz/confidence values; none are persisted.
 */
export function stablePitchFeedback(expectedMidi,readings,{minReadings=4,minConfidence=.76,
 maxSpreadCents=35,a4=440,acceptableCents=35}={}){
 if(!Number.isInteger(expectedMidi)||expectedMidi<20||expectedMidi>110)throw Error('Invalid written target pitch');
 if(!Array.isArray(readings)||readings.length>32||!Number.isInteger(minReadings)||minReadings<2||minReadings>16)throw Error('Invalid microphone history');
 const recent=readings.slice(-8).filter(item=>item&&Number.isFinite(item.hz)&&item.hz>0&&
  Number.isFinite(item.confidence)&&item.confidence>=minConfidence);
 if(recent.length<minReadings)return {status:'listening',detected:false,stable:false,readings:recent.length};
 const hz=recent.map(item=>item.hz).sort((a,b)=>a-b);
 const median=hz.length%2?(hz[(hz.length-1)/2]):(hz[hz.length/2-1]+hz[hz.length/2])/2;
 const spread=1200*Math.log2(hz.at(-1)/hz[0]);
 if(!Number.isFinite(spread)||spread>maxSpreadCents)
  return {status:'unstable',detected:true,stable:false,spreadCents:Math.round(spread),readings:recent.length};
 return {...pitchPracticeFeedback(expectedMidi,median,{a4,acceptableCents}),
  status:'stable',stable:true,readings:recent.length,spreadCents:Math.round(spread)};
}
