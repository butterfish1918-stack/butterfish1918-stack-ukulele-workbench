/** Explicit, non-gated reading + technique pathway with honest self-reports.
 * Difficulty and practice frequency are advisory; no microphone score is inferred.
 */
export const LEARNING_UNITS=Object.freeze([
 {id:'staff',name:'Read the five-line staff',level:1,category:'notation',target:'Identify treble-clef pitches without labels'},
 {id:'rhythm',name:'Count note durations',level:1,category:'rhythm',target:'Read rests, dotted notes and syncopation'},
 {id:'positions',name:'Fretboard position shifts',level:2,category:'technique',target:'Play identical pitches at different positions'},
 {id:'fingerstyle',name:'Independent p-i-m-a fingers',level:2,category:'technique',target:'Maintain alternate-bass and arpeggiated textures'},
 {id:'campanella',name:'Campanella fingering',level:3,category:'technique',target:'Allow adjacent notes to ring across different strings'},
 {id:'chord-melody',name:'Chord melody arranging',level:3,category:'technique',target:'Preserve melody on top while supplying harmony'},
 {id:'voices',name:'Two independent musical voices',level:4,category:'notation',target:'Read and practise overlapping rhythmic voices'},
 {id:'phrasing',name:'Expressive phrasing and dynamics',level:4,category:'technique',target:'Apply timing, accents and note lengths intentionally'}
]);
export function learningReview(units,progress={}){
 return units.map(unit=>{
  const item=progress?.[unit.id]||{};
  return {...unit,sessions:Number(item.sessions)||0,confidence:Number(item.confidence)||0,
   needsReview:!item.reviewedAt||Date.now()-new Date(item.reviewedAt).getTime()>Math.max(1,Number(item.confidence)||1)*86400000};
 });
}
export function recordLearningReview(progress,id,confidence){
 if(!LEARNING_UNITS.some(unit=>unit.id===id))throw Error('Unknown learning unit');
 if(!Number.isInteger(confidence)||confidence<1||confidence>5)throw Error('Confidence 1–5 required');
 const old=progress?.[id]||{};
 return {...progress,[id]:{sessions:(old.sessions||0)+1,confidence,reviewedAt:new Date().toISOString()}};
}
