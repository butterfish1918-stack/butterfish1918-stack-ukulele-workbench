import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
const doc={schema:2,title:'Two voices',tempo:92,meter:'4/4',measures:1,parts:[{id:'P1',name:'Uke',instrument:'ukulele',voices:[
 {id:'1',measures:[{events:[{type:'note',onset:0,duration:1,midi:60,dynamics:'p',finger:2,articulation:'staccato',tuplet:{actual:3,normal:2}}]}]},
 {id:'2',measures:[{events:[{type:'note',onset:0,duration:2,midi:67}]}]}]}]};
test('engraving shows concurrent voices with distinct marks and instruments',()=>{
 const html=renderPolyphonicDocument(doc);
 assert.match(html,/data-voice="1"/);assert.match(html,/data-voice="2"/);
 assert.match(html,/3:2/);assert.match(html,/>p<\/text>/);assert.match(html,/>2<\/text>/);
 assert.match(html,/measure="1"/);
});

test('written ledger lines, opposing voices, open half notes and solo flags are engraved',()=>{
 const variant=structuredClone(doc);
 variant.parts[0].voices[0].measures[0].events=[
  {type:'note',midi:60,spelling:'C',onset:0,duration:.5},
  {type:'note',midi:61,spelling:'Db',onset:.5,duration:2}
 ];
 const html=renderPolyphonicDocument(variant);
 assert.match(html,/class="poly-ledger"/);
 assert.match(html,/class="poly-voice-flag"/);
 assert.match(html,/fill="none" stroke="#36473b" stroke-width="1.5"/);
 assert.match(html,/data-voice="2"/);
});

test('imported staff includes clef, time signature, spelled accidentals and stemless whole notes',()=>{
 const variant=structuredClone(doc);
 variant.parts[0].voices[0].measures[0].events=[{type:'note',midi:61,spelling:'Db',onset:0,duration:4}];
 const html=renderPolyphonicDocument(variant);
 assert.match(html,/poly-clef/);
 assert.match(html,/poly-meter/);
 assert.match(html,/poly-accidental/);
 assert.match(html,/♭/);
 assert.doesNotMatch(html,/class="poly-voice-flag"/);
});


test('tied notes are drawn with a connecting curve instead of a second attack glyph',()=>{
 const sample=structuredClone(doc);
 sample.measures=2;
 sample.parts[0].voices=sample.parts[0].voices.slice(0,1);
 sample.parts[0].voices[0].measures=[
  {events:[{type:'note',midi:61,spelling:'Db',onset:3,duration:1,tieStart:true}]},
  {events:[{type:'note',midi:61,spelling:'Db',onset:0,duration:1,tieStop:true}]}
 ];
 const html=renderPolyphonicDocument(sample);
 assert.match(html,/class="poly-tie"/);
 assert.match(html,/data-voice="1"/);
 assert.match(html,/poly-accidental/);
});
