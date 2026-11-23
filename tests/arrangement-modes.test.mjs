import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent,validateScore} from '../src/score.js';
import {chartChordsPerBar,buildPracticeParts,arrangementModeTracks,SONG_ARRANGEMENT_MODES} from '../src/arrangement-modes.js';
import {ORIGINAL_INSTRUMENT_PROFILES,originalInstrumentProfile} from '../src/song-instrumentation.js';
const score=createScore({title:'Traditional arrangement',sample:false,tempo:88});
for(let b=0;b<8;b++)appendEvent(score,{type:'note',midi:64,duration:4});
const item={id:'california-dreamin',score,body:'Verse: Em | C | D | Em (repeat 2×)',sections:[{label:'Verse',startBar:1,endBar:8}]};
test('song-specific ensemble includes only the credited recording instruments',()=>{
 const solo=arrangementModeTracks(item,'solo'),guitar=arrangementModeTracks(item,'guitar-uke'),ensemble=arrangementModeTracks(item,'ensemble');
 assert.equal(SONG_ARRANGEMENT_MODES.length,3);
 assert.deepEqual(solo.map(x=>x.id),['ukulele']);
 assert.deepEqual(guitar.map(x=>x.id),['ukulele','bass','piano','drums']);
 assert.deepEqual(ensemble.map(x=>x.id),['ukulele','bass','piano','drums']);
 assert.equal(solo[0].score,score);
 assert.match(guitar[1].source,/generated/);
 assert.equal(ensemble[3].score.clef,'percussion');
 assert.equal(Object.keys(ORIGINAL_INSTRUMENT_PROFILES).length,16); // 15 songs plus traditional-air arrangement alias
});
test('Blackbird never generates a phantom bass piano or drum kit, and traditional air has no band',()=>{
 const blackbird={...item,id:'blackbird',repertoireOrigin:undefined};
 const folk={...item,id:'scarborough-fair-traditional-1882'};
 assert.deepEqual(arrangementModeTracks(blackbird,'ensemble').map(x=>x.id),['ukulele']);
 assert.deepEqual(arrangementModeTracks(folk,'ensemble').map(x=>x.id),['ukulele']);
 assert.deepEqual(arrangementModeTracks({...item,id:'my-own-song'},'ensemble').map(x=>x.id),['ukulele']);
 assert.equal(originalInstrumentProfile(blackbird).percussion,'none');
});
test('bass piano and drum scores contain playable, different registers and sample hit labels',()=>{
 assert.deepEqual(chartChordsPerBar(item),['Em','C','D','Em','Em','C','D','Em']);
 const tracks=buildPracticeParts(item);
 tracks.forEach(part=>{assert.equal(validateScore(part.score),true);assert.equal(part.score.measures.length,8)});
 assert.equal(tracks[1].score.clef,'bass8vb');
 assert.ok(tracks[1].score.measures.every(bar=>bar.events[0].midi>=28&&bar.events[0].midi<=39));
 assert.ok(tracks[2].score.measures.every(bar=>bar.events.length===4));
 assert.ok(tracks[3].score.measures.every(bar=>bar.events.length===8));
 assert.deepEqual(tracks[3].score.measures[0].events[0].drumHits,['kick','hat']);
 assert.deepEqual(tracks[3].score.measures[0].events[2].drumHits,['snare','hat']);
 assert.equal(item.score.measures[0].events[0].midi,64);
});
test('unknown harmony is silent for pitched backing, but supported drum kit keeps independent rhythm',()=>{
 const blank={...item,body:'',sections:[]},parts=buildPracticeParts(blank);
 assert.ok(parts[1].score.measures.every(bar=>bar.events[0].type==='rest'));
 assert.ok(parts[2].score.measures.every(bar=>bar.events[0].type==='rest'));
 assert.ok(parts[3].score.measures.every(bar=>bar.events[0].drumHits.includes('kick')));
});
test('electronic drum recordings receive an electronic sample style, not acoustic piano backing',()=>{
 const isolation=buildPracticeParts({...item,id:'isolation'});
 assert.deepEqual(isolation.map(x=>x.id),['ukulele','bass','drums']);
 assert.equal(isolation[2].score.measures[0].events[0].drumStyle,'electronic');
});
