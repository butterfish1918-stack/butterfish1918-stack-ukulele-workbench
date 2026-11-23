import test from 'node:test';
import assert from 'node:assert/strict';
import {attachInstrumentPart,checkedInstrumentPart} from '../src/source-instruments.js';
import {createScore,appendEvent} from '../src/score.js';
import {arrangementModeTracks} from '../src/arrangement-modes.js';
const uke=createScore({title:'Private composition',sample:false,tempo:96});
appendEvent(uke,{type:'note',midi:60,duration:4});
const bass=createScore({title:'Bass line',sample:false,tempo:96});
bass.clef='bass8vb';
bass.measures[0].events=[{id:'bass-G1',type:'note',midi:31,spelling:'G',duration:4}];
test('supplied instrument notes survive intact and replace generic practice staves',()=>{
 const song=attachInstrumentPart({id:'private-tune',score:uke},'bass',bass);
 const parts=arrangementModeTracks(song,'ensemble');
 assert.deepEqual(parts.map(x=>x.id),['ukulele','bass']);
 assert.equal(parts[1].score.measures[0].events[0].midi,31);
 assert.match(parts[1].source,/user-provided/);
 assert.equal(parts[0].score,uke);
});
test('instrument import refuses mismatched tempos, lengths or unknown categories',()=>{
 const wrong=createScore({title:'Wrong',tempo:90,sample:false});
 assert.throws(()=>checkedInstrumentPart({score:uke},'bass',wrong),/tempo/);
 assert.throws(()=>checkedInstrumentPart({score:uke},'tuba',bass),/Unsupported/);
});
test('a supplied source remains explicitly unverified and does not alter original',()=>{
 const original={id:'mine',score:uke,notes:'Keep this'};
 const result=attachInstrumentPart(original,'bass',bass);
 assert.equal(result.notes,'Keep this');
 assert.equal(result.instrumentParts.bass.verified,false);
 assert.equal(original.instrumentParts,undefined);
});
