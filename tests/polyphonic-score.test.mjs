import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScoreDocument,flattenDocumentEvents,planScoreSystems} from '../src/polyphonic-score.js';
const doc={schema:2,title:'Two voice score',tempo:96,meter:'4/4',measures:2,
parts:[{id:'P1',name:'Ukulele',instrument:'ukulele',voices:[
{id:'1',measures:[{events:[{type:'note',onset:0,duration:2,midi:60},{type:'note',onset:2,duration:2,midi:64}]},{events:[]}]},
{id:'2',measures:[{events:[{type:'note',onset:0,duration:4,midi:48}]},{events:[{type:'rest',onset:0,duration:4}]}]}]}]};
test('independent voices can overlap without losing rhythmic positions',()=>{
 assert.equal(validateScoreDocument(doc),true);
 const events=flattenDocumentEvents(doc);
 assert.equal(events.filter(e=>e.absoluteOnset===0).length,2);
 assert.equal(planScoreSystems(doc).length,1);
});
test('invalid score metadata and pitch are rejected',()=>{
 assert.throws(()=>validateScoreDocument({...doc,parts:[]}));
 assert.throws(()=>validateScoreDocument({...doc,meter:'99/4'}));
});

test('a voice rejects measure overflow and implicit second voices',()=>{
 const sample=structuredClone(doc);
 sample.parts[0].voices[0].measures[0].events[0].duration=5;
 assert.throws(()=>validateScoreDocument(sample),/overflow/);
 const overlap=structuredClone(doc);
 overlap.parts[0].voices[0].measures[0].events.push({type:'note',midi:67,onset:.5,duration:1});
 assert.throws(()=>validateScoreDocument(overlap),/Overlapping events/);
});
test('simultaneous chord tones are valid in one voice while separate voices overlap freely',()=>{
 const sample=structuredClone(doc);
 const original=sample.parts[0].voices[0].measures[0].events[0];
 sample.parts[0].voices[0].measures[0].events.push({...original,midi:67});
 assert.equal(validateScoreDocument(sample),true);
});

test('enharmonic labels must agree with sounding MIDI',()=>{
 const clone=structuredClone(doc);
 clone.parts[0].voices[0].measures[0].events[0].spelling='Db';
 assert.throws(()=>validateScoreDocument(clone),/Written spelling/);
});


test('ties require successive notes at identical pitch and onset, including across a barline',()=>{
 const sample=structuredClone(doc);
 sample.parts[0].voices[0].measures[0].events=[
  {type:'rest',onset:0,duration:3},
  {type:'note',midi:61,spelling:'Db',onset:3,duration:1,tieStart:true}
 ];
 sample.parts[0].voices[0].measures[1].events=[
  {type:'note',midi:61,spelling:'Db',onset:0,duration:1,tieStop:true,tieStart:true},
  {type:'note',midi:61,spelling:'Db',onset:1,duration:1,tieStop:true}
 ];
 assert.equal(validateScoreDocument(sample),true);
 const orphan=structuredClone(sample);
 delete orphan.parts[0].voices[0].measures[0].events[1].tieStart;
 assert.throws(()=>validateScoreDocument(orphan),/Orphaned/);
 const gap=structuredClone(sample);
 gap.parts[0].voices[0].measures[1].events[0].onset=.5;
 assert.throws(()=>validateScoreDocument(gap),/nonconsecutive/);
 const wrongNote=structuredClone(sample);
 wrongNote.parts[0].voices[0].measures[1].events[0].midi=60;
 wrongNote.parts[0].voices[0].measures[1].events[0].spelling='C';
 assert.throws(()=>validateScoreDocument(wrongNote),/Orphaned/);
 const respelled=structuredClone(sample);
 respelled.parts[0].voices[0].measures[1].events[0].spelling='C#';
 assert.throws(()=>validateScoreDocument(respelled),/Orphaned/);
 const dangling=structuredClone(sample);
 delete dangling.parts[0].voices[0].measures[1].events[1].tieStop;
 assert.throws(()=>validateScoreDocument(dangling),/Unresolved tie|Missing tie stop/);
 const invalidRest=structuredClone(sample);
 invalidRest.parts[0].voices[0].measures[0].events[0].tieStart=true;
 assert.throws(()=>validateScoreDocument(invalidRest),/Ties require pitched notes/);
});
