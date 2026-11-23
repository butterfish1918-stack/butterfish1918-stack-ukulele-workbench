import test from 'node:test';
import assert from 'node:assert/strict';
import {sectionScore,chordGuide,practiceTempo} from '../src/song-practice.js';
const score={meter:'4/4',tempo:100,measures:[
 {events:[{id:'a',type:'chord',symbol:'C',notes:[{position:{string:0,fret:0}},{position:{string:1,fret:0}},{position:{string:2,fret:0}},{position:{string:3,fret:3}}]}]},
 {events:[{id:'b',type:'chord',symbol:'G',notes:[{position:{string:0,fret:0}},{position:{string:1,fret:2}},{position:{string:3,fret:2}}]}]},
 {events:[{id:'c',type:'chord',symbol:'C',notes:[{position:{string:0,fret:0}},{position:{string:1,fret:0}},{position:{string:2,fret:0}},{position:{string:3,fret:3}}]}]}
]};
test('section score isolates measure range without altering original',()=>{
 const got=sectionScore(score,[{label:'intro',startBar:2,endBar:3}],0);
 assert.deepEqual(got.measures.map(m=>m.events[0].id),['b','c']);
 assert.equal(score.measures.length,3);
 assert.equal(got.tempo,100);
 assert.equal(sectionScore(score,[],0),score);
 assert.equal(sectionScore(score,[{startBar:4,endBar:10}],0),score);
});
test('chord guide lists distinct real string positions, not guessed shapes',()=>{
 assert.deepEqual(chordGuide(score),[{symbol:'C',frets:'0 · 0 · 0 · 3'},{symbol:'G',frets:'0 · 2 · – · 2'}]);
 assert.deepEqual(chordGuide(score,1),[{symbol:'C',frets:'0 · 0 · 0 · 3'}]);
});
test('practice tempo scales playback without changing written score',()=>{
 assert.equal(practiceTempo(120,50),60);assert.equal(practiceTempo(120,125),150);
 assert.throws(()=>practiceTempo(120,30),/Invalid/);
 assert.equal(score.tempo,100);
});
