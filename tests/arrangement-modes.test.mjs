import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent,validateScore} from '../src/score.js';
import {chartChordsPerBar,buildPracticeParts,arrangementModeTracks,SONG_ARRANGEMENT_MODES} from '../src/arrangement-modes.js';
const score=createScore({title:'Traditional arrangement',sample:false,tempo:88});
for(let b=0;b<8;b++)appendEvent(score,{type:'note',midi:64,duration:4});
const item={score,body:'Verse: Em | C | D | Em (repeat 2×)',sections:[{label:'Verse',startBar:1,endBar:8}]};
test('all three arrangements have usable and distinct track collections',()=>{
 const solo=arrangementModeTracks(item,'solo'),guitar=arrangementModeTracks(item,'guitar-uke'),ensemble=arrangementModeTracks(item,'ensemble');
 assert.equal(SONG_ARRANGEMENT_MODES.length,3);
 assert.deepEqual(solo.map(x=>x.id),['ukulele']);
 assert.deepEqual(guitar.map(x=>x.id),['ukulele','bass','piano']);
 assert.deepEqual(ensemble.map(x=>x.id),['ukulele','bass','piano']);
 assert.equal(solo[0].score,score);
 assert.equal(guitar[1].source,'generated harmonic accompaniment');
 assert.equal(ensemble[2].instrument,'piano');
});
test('derived bass and piano contain actual playable staff notes in their own registers',()=>{
 assert.deepEqual(chartChordsPerBar(item),['Em','C','D','Em','Em','C','D','Em']);
 const tracks=buildPracticeParts(item);
 tracks.forEach(part=>{assert.equal(validateScore(part.score),true);assert.equal(part.score.measures.length,8)});
 assert.equal(tracks[1].score.clef,'bass8vb');
 assert.ok(tracks[1].score.measures.every(bar=>bar.events[0].midi>=28&&bar.events[0].midi<=39));
 assert.ok(tracks[2].score.measures.every(bar=>bar.events.length===4));
 assert.equal(item.score.measures[0].events[0].midi,64);
});
test('no harmony source means actual silence rather than fake missing instrumental content',()=>{
 const blank={score,body:'',sections:[]};const tracks=buildPracticeParts(blank);
 assert.ok(tracks[1].score.measures.every(bar=>bar.events[0].type==='rest'));
 assert.ok(tracks[2].score.measures.every(bar=>bar.events[0].type==='rest'));
});
