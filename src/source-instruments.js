/** Optional per-instrument notation supplied by the song owner.
 * A supplied part is not independently verified or licensed by importing it.
 */
import {validateScore} from './score.js';
export const SOURCE_INSTRUMENT_IDS=Object.freeze(['guitar','bass','piano','drums','flute','strings','synthesizer','vocals']);
export function checkedInstrumentPart(song,instrument,partScore){
 if(!song?.score)throw Error('Attach an original/authorized song score first');
 if(!SOURCE_INSTRUMENT_IDS.includes(instrument))throw Error('Unsupported source instrument');
 validateScore(song.score);validateScore(partScore);
 for(const prop of ['meter','tempo'])if(partScore[prop]!==song.score[prop])
  throw Error('Imported instrument '+prop+' does not match the song');
 if(partScore.measures.length!==song.score.measures.length)
  throw Error('Imported instrument must have the same number of measures as the song');
 // Preserve user-provided pitches, rests, rhythms and source metadata untouched.
 return {score:structuredClone(partScore),source:'user-supplied',verified:false};
}
export function attachInstrumentPart(song,instrument,partScore){
 const part=checkedInstrumentPart(song,instrument,partScore);
 return {...song,instrumentParts:{...(song.instrumentParts||{}),[instrument]:part}};
}
