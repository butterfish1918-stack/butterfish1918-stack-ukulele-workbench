import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptGuitarPart,exampleGuitarSource,GUITAR_SOURCE_FORMAT} from '../src/guitar-adaptation.js';
import {validateScore} from '../src/score.js';
import {TUNINGS} from '../src/music.js';

test('original six-string phrase converts to pitched playable ukulele notes with exact rhythms',()=>{
 const source=exampleGuitarSource(),adapted=adaptGuitarPart(source);
 assert.equal(source.format,GUITAR_SOURCE_FORMAT);
 assert.equal(adapted.score.tuning,'highG');
 assert.equal(adapted.score.measures.length,2);
 assert.equal(adapted.sourceNotes,8);
 assert.equal(validateScore(adapted.score),true);
 assert.deepEqual(adapted.score.measures.map(x=>x.section),['Original riff','Original riff']);
 const durations=adapted.score.measures.flatMap(x=>x.events).map(e=>e.duration);
 assert.deepEqual(durations,source.measures.flatMap(x=>x.events).map(e=>e.duration));
 for(const row of adapted.mapping){
  assert.equal(row.sourceMidi%12,row.ukeMidi%12);
  assert.ok([0,12,24,36,48,-12,-24,-36,-48].includes(row.octaveShift));
  assert.equal(TUNINGS.highG.midi[row.ukeString]+row.ukeFret,row.ukeMidi);
  assert.ok(row.ukeFret<=12);
 }
 assert.ok(adapted.octaveShiftedNotes>0);
 assert.match(adapted.warnings.join(' '),/octave/);
});
test('high e-string notes keep concert pitch whenever playable',()=>{
 const part=exampleGuitarSource();part.measures=[{events:[
  {type:'note',string:5,fret:0,duration:1},
  {type:'note',string:5,fret:2,duration:1},
  {type:'note',string:5,fret:3,duration:1},
  {type:'rest',duration:1}
 ]}];
 const mapped=adaptGuitarPart(part);
 assert.deepEqual(mapped.mapping.map(e=>e.octaveShift),[0,0,0]);
 assert.deepEqual(mapped.mapping.map(e=>e.ukeMidi),[64,66,67]);
 assert.equal(mapped.octaveShiftedNotes,0);
});
test('adaptations reject unsupported polyphonic guitar chords rather than dropping parts',()=>{
 const a=exampleGuitarSource();
 a.measures=[{events:[{type:'note',notes:[{string:4,fret:1},{string:5,fret:1}],duration:1}]}];
 assert.throws(()=>adaptGuitarPart(a),/Expected a single guitar note or explicit simultaneous chord/);
});
test('malformed guitar data cannot corrupt an existing score',()=>{
 const a=exampleGuitarSource(),original=structuredClone(a);
 for(const mutate of [
  x=>{x.measures[0].events[0].string=9},
  x=>{x.measures[0].events[0].fret=300},
  x=>{x.measures[0].events[0].duration=99},
  x=>{x.measures[0].events[0].spelling='G#'},
  x=>{x.measures[0].events[0].notes=[]},
  x=>{x.measures[0].events[0].duration=4},
  x=>{x.guitarTuning=[40,45,50]},
  x=>{x.format='arbitrary-file'}
 ]){const copy=structuredClone(a);mutate(copy);assert.throws(()=>adaptGuitarPart(copy));}
 assert.deepEqual(a,original);
});
test('source with incomplete bars reports a warning without inserting sound',()=>{
 const a=exampleGuitarSource();
 a.measures=[{events:[{type:'note',string:5,fret:0,duration:2}]}];
 const out=adaptGuitarPart(a);
 assert.match(out.warnings.join(' '),/incomplete/);
 assert.equal(out.score.measures[0].events.length,1);
});
