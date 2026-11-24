/** Browser-only smoke: tests real DOMParser and SVG layout at target viewport.
 * This does not grant microphone permission, simulate physical taps, or certify
 * an Android device.
 */
import {importMultiPartMusicXML,exportMultiPartMusicXML} from '../src/musicxml-multipart.js';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
function assert(condition,message){if(!condition)throw Error(message)}
const status=document.getElementById('browserQaStatus');
try{
 const response=await fetch('./fixtures/external/45b-RepeatWithAlternatives.musicxml');
 assert(response.ok,'Cannot fetch external XML fixture on local origin');
 const score=importMultiPartMusicXML(await response.text());
 assert(JSON.stringify(score.sourceMeasureNumbers)===JSON.stringify([1,2,1,3,4]),'First/second endings incorrect');
 const html=renderPolyphonicDocument(score,{pageWidth:390});
 document.getElementById('imported').innerHTML=html;
 assert(document.querySelectorAll('#imported .polyphonic-svg').length>0,'No imported score preview');
 assert(document.querySelectorAll('#imported .poly-voice-event').length===5,'Incorrect imported note count');
 const round=importMultiPartMusicXML(exportMultiPartMusicXML(score));
 const incoming=score.parts[0].voices[0].measures.map(m=>m.events.map(e=>e.midi));
 const outgoing=round.parts[0].voices[0].measures.map(m=>m.events.map(e=>e.midi));
 assert(JSON.stringify(incoming)===JSON.stringify(outgoing),'Browser MusicXML reimport changed notes');
 const dense={schema:2,title:'Dense mobile layout check',tempo:96,meter:'4/4',measures:1,parts:[
  {id:'P1',name:'Ukulele',voices:[{id:'1',measures:[{events:Array.from({length:16},(_,i)=>({
   type:'note',onset:i*.25,duration:.25,midi:60+i%4}))}]}]}
 ]};
 document.getElementById('dense').innerHTML=renderPolyphonicDocument(dense,{pageWidth:390});
 const doc=document.querySelector('#dense .polyphonic-doc');
 assert(doc&&doc.scrollWidth>doc.clientWidth,'Dense notation should scroll instead of shrinking');
 assert(document.documentElement.scrollWidth<=window.innerWidth+6,'Layout introduces page-wide overflow');
 const result='PASS: native DOMParser; external repeats; linear round-trip; '+window.innerWidth+'px viewport; scrollable dense score';
 status.dataset.status='pass';
 status.textContent=result;
}catch(error){
 status.dataset.status='fail';
 status.textContent='FAIL: '+error.message;
}
