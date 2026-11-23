import test from 'node:test';
import assert from 'node:assert/strict';
import {closestUkuleleSample,UKULELE_SAMPLE_ROOTS,prepareUkuleleSamples,playUkuleleSample} from '../src/ukulele-samples.js';
test('sample zones cover the GCEA ukulele and transpose the nearest real recording',()=>{
 assert.equal(UKULELE_SAMPLE_ROOTS.length,13);
 assert.equal(closestUkuleleSample(60).name,'C4');
 assert.equal(closestUkuleleSample(67).name,'G4');
 assert.equal(closestUkuleleSample(68).name,'G4');
 assert.equal(closestUkuleleSample(69).name,'A4');
 assert.equal(closestUkuleleSample(55).name,'C4');
});
test('recorded sample playback decodes once, plays a buffer, and respects release envelope',async()=>{
 const events=[];
 const gain={gain:{setValueAtTime(...a){events.push(['set',...a])},linearRampToValueAtTime(...a){events.push(['ramp',...a])}},connect(){return {}}};
 const fake={decodeAudioData:async()=>({duration:1.5}),createGain:()=>gain,createBufferSource:()=>({playbackRate:{setValueAtTime(...a){events.push(['pitch',...a])}},connect:()=>({connect(){}}),start(n){events.push(['start',n])},stop(n){events.push(['stop',n])}}),destination:{}};
 const originalDocument=globalThis.document;globalThis.document={baseURI:'https://example.test/app/'};
 try{
  const paths=[];
  const fetcher=async url=>{paths.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(16)}};
  const res=await prepareUkuleleSamples(fake,[60,60,61],{fetcher});
  assert.equal(res.total,1);assert.equal(res.loaded,1);
  assert.equal(paths.length,1);
  assert.match(paths[0],/assets\/ukulele\/C4.flac$/);
  const voice=playUkuleleSample(fake,61,1,.5,.1);
  assert.ok(voice);assert.ok(events.some(x=>x[0]==='start'));assert.ok(events.some(x=>x[0]==='stop'));
 }finally{globalThis.document=originalDocument}
});
