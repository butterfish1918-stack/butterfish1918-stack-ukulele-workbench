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
