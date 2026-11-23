import test from 'node:test';
import assert from 'node:assert/strict';
import {BACKING_SAMPLES,closestBackingSample,prepareBackingSamples,playBackingSample,playDrumSample,DRUM_HITS} from '../src/instrument-samples.js';
test('bass and piano playback use distinct CC0 sample mappings',()=>{
 assert.equal(BACKING_SAMPLES.bass.length,12);
 assert.equal(BACKING_SAMPLES.piano.length,6);
 assert.deepEqual(closestBackingSample('bass',36),{midi:36,name:'C'});
 assert.deepEqual(closestBackingSample('piano',61),{midi:60,name:'C4'});
 assert.throws(()=>closestBackingSample('violin',60),/Unknown/);
});
test('recorded instrument sample load is deduplicated and generates a pitched buffer voice',async()=>{
 const actions=[];
 const ctx={destination:{},decodeAudioData:async()=>({duration:2}),createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}}),createBufferSource:()=>({playbackRate:{setValueAtTime(rate){actions.push(['rate',rate])}},connect:()=>({connect(){}}),start(at){actions.push(['start',at])},stop(at){actions.push(['stop',at])}})};
 const doc=globalThis.document;globalThis.document={baseURI:'https://example.test/ukulele/'};
 try{
  const paths=[];
  const fetcher=async url=>{paths.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(16)}};
  const result=await prepareBackingSamples(ctx,[{instrument:'bass',midis:[36,36,37]},{instrument:'piano',midis:[60,61]}],{fetcher});
  assert.equal(result.loaded,3);assert.equal(paths.length,3);
  assert.ok(paths.includes('https://example.test/ukulele/assets/ensemble/bass/C.flac'));
  assert.ok(paths.includes('https://example.test/ukulele/assets/ensemble/piano/C4.flac'));
  assert.ok(playBackingSample(ctx,'bass',36,1,.5));
  assert.ok(playBackingSample(ctx,'piano',61,1,.5));
  assert.ok(actions.some(x=>x[0]==='start'));
 }finally{globalThis.document=doc}
});

test('acoustic and electronic drum recordings are decoded once and played without pitch shifting',async()=>{
 const actions=[];
 const ctx={destination:{},decodeAudioData:async()=>({duration:.75}),createGain:()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}}),createBufferSource:()=>({connect:()=>({connect(){}}),start(t){actions.push(['start',t])},stop(t){actions.push(['stop',t])}})};
 const prior=globalThis.document;globalThis.document={baseURI:'https://example.test/app/'};
 try{
  const requests=[];
  const fetcher=async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(16)}};
  const result=await prepareBackingSamples(ctx,[{instrument:'drums',hits:['acoustic-kick','acoustic-snare','acoustic-hat','electronic-kick','acoustic-kick']}],{fetcher});
  assert.equal(result.loaded,4);
  assert.equal(requests.length,4);
  assert.ok(requests.includes('https://example.test/app/assets/ensemble/drums/acoustic-kick.m4a'));
  assert.ok(requests.includes('https://example.test/app/assets/ensemble/drums/electronic-kick.mp3'));
  assert.ok(playDrumSample(ctx,'kick',1,.12,'acoustic'));
  assert.ok(playDrumSample(ctx,'kick',1,.12,'electronic'));
  assert.equal(DRUM_HITS.length,3);
  assert.throws(()=>playDrumSample(ctx,'bass',0),/Unsupported/);
  assert.equal(actions.filter(x=>x[0]==='start').length,2);
 }finally{globalThis.document=prior}
});
