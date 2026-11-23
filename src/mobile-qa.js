/** Device acceptance matrix, not an automated claim of physical validation. */
export const MOBILE_QA_CASES=Object.freeze([
 {id:'audio',name:'Sampled multi-instrument sound',guide:'Play a song with 3+ credited parts; listen for all enabled tracks and absence of clipping.'},
 {id:'sync',name:'Playback/score synchronization',guide:'Compare highlighted note and audible attacks at 60%, 100% and 125% speed.'},
 {id:'gestures',name:'Touch pause and scroll',guide:'Double-tap during playback; confirm pause preserves position and single-tap resumes.'},
 {id:'portrait',name:'Portrait readability',guide:'Read whole-score notation and tablature without overlap or unreadable note labels.'},
 {id:'landscape',name:'Landscape readability',guide:'Rotate during song display; check controls and visible upcoming measures.'},
 {id:'tuner',name:'Physical tuning accuracy',guide:'Compare the microphone tuner against a separate calibrated tuner for each string.'},
 {id:'microphone',name:'Note-feedback accuracy',guide:'Play isolated open/fretted notes in a quiet room and compare detected cents with known pitches.'},
 {id:'offline',name:'Real offline installation and reload',guide:'Install PWA, cache one song, enable airplane mode, reload and test saved score/audio.'},
 {id:'persistence',name:'Song data persistence',guide:'Save a personal note, close/reopen app and verify it, then export and restore JSON backup.'},
 {id:'battery',name:'Mobile sustained playback',guide:'Play a complete song with screen awake and check for audio glitches or overheating.'}
]);
export function qaSummary(result={}){
 const output={pass:0,fail:0,untested:0};
 for(const entry of MOBILE_QA_CASES){
  const state=result[entry.id]?.status;
  if(state==='pass')output.pass++;
  else if(state==='fail')output.fail++;
  else output.untested++;
 }
 return output;
}
export function recordMobileQa(result,id,status,note=''){
 if(!MOBILE_QA_CASES.some(item=>item.id===id))throw Error('Unknown test');
 if(!['pass','fail','untested'].includes(status)||typeof note!=='string'||note.length>500)throw Error('Invalid QA result');
 return {...result,[id]:{status,note,date:new Date().toISOString()}};
}
