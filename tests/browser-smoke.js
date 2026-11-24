/** Browser-only smoke: tests real DOMParser and SVG layout at target viewport.
 * This does not grant microphone permission, simulate physical taps, or certify
 * an Android device.
 */
import {importMultiPartMusicXML,exportMultiPartMusicXML} from '../src/musicxml-multipart.js';
import {readCompressedMusicXML} from '../src/musicxml-container.js';
import {zipFixture,containerXML} from './mxl-fixture.js';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
function assert(condition,message){if(!condition)throw Error(message)}
const status=document.getElementById('browserQaStatus');
try{
 const response=await fetch('./fixtures/external/45b-RepeatWithAlternatives.musicxml');
 assert(response.ok,'Cannot fetch external XML fixture on local origin');
 const raw=await response.text();
 const score=importMultiPartMusicXML(raw);
 const zipped=await zipFixture([['META-INF/container.xml',containerXML('scores/example.musicxml')],['scores/example.musicxml',raw]],async bytes=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()));
 const compressedScore=importMultiPartMusicXML(await readCompressedMusicXML(zipped));
 assert(JSON.stringify(compressedScore)===JSON.stringify(score),'Compressed MusicXML changed score content');
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
 // Real app controls, not merely model or HTML snippets.
 const frame=document.createElement('iframe');
 frame.style.cssText='position:absolute;left:-10000px;width:390px;height:844px';
 const loaded=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=reject});
 frame.src='../index.html';document.body.append(frame);await loaded;
 const app=frame.contentDocument,win=frame.contentWindow;
 win.confirm=()=>true;
 const click=action=>{const node=app.querySelector('[data-action="'+action+'"]');assert(node&&!node.disabled,'Missing enabled editor action '+action);node.click()};
 const field=(id,value)=>{const node=app.getElementById(id);assert(node,'Missing editor field '+id);node.value=String(value)};
 const saved=()=>JSON.parse(win.localStorage.getItem('uw-scoreDocument'));
 click('ensemble-new');click('ensemble-insert');field('ensembleMidi',64);click('ensemble-insert');
 assert(saved().parts[0].voices[0].measures[0].events.length===2,'Chord insertion not persisted');
 click('ensemble-add-voice');field('ensembleMidi',67);click('ensemble-insert');
 assert(saved().parts[0].voices.length===2,'Independent voice not persisted');
 click('ensemble-undo');assert(saved().parts[0].voices[1].measures[0].events.length===0,'Undo did not persist');
 click('ensemble-redo');assert(saved().parts[0].voices[1].measures[0].events.length===1,'Redo did not persist');
 const noteTarget=app.querySelector('[data-poly-edit][data-part="P1"][data-voice="1"][data-event-index="1"]');
 assert(noteTarget,'No interactive notation target');noteTarget.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
 assert(app.getElementById('ensembleMidi').value==='64','Selecting notation did not select the right note');
 click('ensemble-save-new');
 const storedSongs=()=>JSON.parse(win.localStorage.getItem('uw-songs'));
 const first=storedSongs().find(s=>s.scoreDocument);assert(first,'Missing saved ensemble');
 field('ensembleTitle','Second arrangement');click('ensemble-metadata');click('ensemble-save-new');
 assert(storedSongs().filter(s=>s.scoreDocument).length===2,'Second named snapshot missing');
 assert(storedSongs().find(s=>s.id===first.id).scoreDocument.title===first.title,'First snapshot overwritten');
 app.querySelector('[data-page="songbook"]').click();
 app.querySelector('[data-song="'+first.id+'"]').click();
 assert(app.getElementById('ensemblePracticeStart'),'Saved ensemble practice controls missing');
 assert(saved().title==='Second arrangement','Songbook preview replaced draft');
 const change=(id,value)=>{const input=app.getElementById(id);assert(input,'Missing '+id);if(input.type==='checkbox')input.checked=value;else input.value=String(value);input.dispatchEvent(new win.Event('change',{bubbles:true}))};
 change('ensembleLoop',true);change('ensembleRamp',true);change('ensemblePracticeSpeed',75);
 app.querySelector('[data-ensemble-mute="P1"]').click();
 const practicePrefs=()=>JSON.parse(win.localStorage.getItem('uw-ensembleSongPractice'));
 assert(practicePrefs()[first.id].loop&&practicePrefs()[first.id].ramp&&practicePrefs()[first.id].speed===75,'Practice preferences not persisted');
 assert(practicePrefs()[first.id].mix.P1.muted,'Ensemble mute not persisted');
 change('ensemblePracticeStart',2);click('ensemble-bookmark');
 assert(JSON.parse(win.localStorage.getItem('uw-songBookmarks'))[first.id].bar===2,'Bookmark not persisted');
 change('ensemblePracticeStart',1);click('ensemble-resume');
 assert(app.getElementById('ensemblePracticeStart').value==='2','Resume did not restore bookmark');
 const other=storedSongs().find(s=>s.id!==first.id&&s.scoreDocument);
 app.querySelector('[data-song="'+other.id+'"]').click();
 assert(!app.getElementById('ensembleLoop').checked&&app.querySelector('[data-ensemble-mute="P1"]').getAttribute('aria-pressed')==='true','Practice settings leaked between songs');
 app.querySelector('[data-song="'+first.id+'"]').click();
 assert(app.getElementById('ensembleLoop').checked,'Practice preferences lost when reopening song');
 click('ensemble-song-open');
 assert(saved().title===first.title,'Wrong saved arrangement reopened');
 field('ensembleTitle','Revised first');click('ensemble-metadata');click('ensemble-save-update');
 assert(storedSongs().find(s=>s.id===first.id).title==='Revised first','Linked update did not persist');
 win.localStorage.removeItem('uw-ensembleSongPractice');win.localStorage.removeItem('uw-songBookmarks');win.localStorage.removeItem('uw-songs');win.localStorage.removeItem('uw-scoreDocument');frame.remove();
 const result='PASS: native DOMParser; compressed MXL; ensemble editor local save/undo; named Songbook snapshots; isolated practice controls and bookmarks; external repeats; linear round-trip; '+window.innerWidth+'px viewport; scrollable dense score';
 status.dataset.status='pass';
 status.textContent=result;
}catch(error){
 status.dataset.status='fail';
 status.textContent='FAIL: '+error.message;
}
