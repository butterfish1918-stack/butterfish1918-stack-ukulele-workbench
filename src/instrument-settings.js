/** Playable four-string setup. Capo shifts sounding pitches on the visual
 * fretboard, but never secretly transposes an existing saved score.
 */
export function validateCustomTuning(values){
 if(!Array.isArray(values)||values.length!==4||values.some(n=>!Number.isInteger(n)||n<40||n>83))throw Error('Enter exactly four open-string MIDI pitches (40–83)');
 return [...values];
}
export function capoAdjustedMidi(openMidi,capo){
 if(!Number.isInteger(openMidi)||!Number.isInteger(capo)||capo<0||capo>12)throw Error('Invalid pitch or capo position');
 return openMidi+capo;
}
export function leftHandedX(x,{min=70,max=682,leftHanded=false}={}){
 return leftHanded?min+max-x:x;
}
export function parseCustomTuning(text){
 if(typeof text!=='string')throw Error('Custom tuning must be four numbers');
 return validateCustomTuning(text.split(/[\s,;]+/).filter(Boolean).map(Number));
}
