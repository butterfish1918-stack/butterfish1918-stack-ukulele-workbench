import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptSimultaneousGuitarNotes} from '../src/guitar-polyphony.js';
import {validateScore} from '../src/score.js';
test('Two and three guitar notes become unique playable ukulele strings',()=>{
 const out=adaptSimultaneousGuitarNotes([{midi:48},{midi:52},{midi:55}]);
 assert.equal(out.notes.length,3);
 assert.equal(new Set(out.notes.map(x=>x.position.string)).size,3);
 assert.ok(out.notes.every(x=>x.position.fret<=12));
 const score={schema:1,id:'custom',title:'Guitar chord adaptation',tuning:'highG',meter:'4/4',key:'C',tempo:86,measures:[{events:[{id:'one',type:'chord',voicing:'custom',symbol:'adapted',stroke:'none',notes:out.notes,duration:4}]}]};
 assert.equal(validateScore(score),true);
});
test('Source complexity is not silently truncated',()=>{
 assert.throws(()=>adaptSimultaneousGuitarNotes(Array.from({length:5},(_,i)=>({midi:60+i}))),/two to four/);
});
