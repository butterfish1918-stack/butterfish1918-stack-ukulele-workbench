import test from 'node:test';
import assert from 'node:assert/strict';
import {exportMultiPartMusicXML} from '../src/musicxml-multipart.js';
const doc={schema:2,title:'Two parts',meter:'4/4',tempo:96,measures:1,
 parts:[{id:'P1',name:'Ukulele',instrument:'ukulele',voices:[{id:'1',measures:[{events:[{type:'note',midi:60,onset:0,duration:1}]}]}]},
 {id:'P2',name:'Flute',instrument:'flute',voices:[{id:'1',measures:[{events:[{type:'note',midi:72,onset:0,duration:4}]}]}]}]};
test('multi-instrument MusicXML export preserves all parts and measured durations',()=>{
 const xml=exportMultiPartMusicXML(doc);
 assert.match(xml,/<part id="P1">/);
 assert.match(xml,/<part id="P2">/);
 assert.match(xml,/<duration>1920<\/duration>/);
 assert.match(xml,/<step>C<\/step>/);
});
test('export fails cleanly on unsupported overlapping notes within a single voice',()=>{
 const invalid=structuredClone(doc);
 invalid.parts[0].voices[0].measures[0].events.push({type:'note',midi:64,onset:0,duration:2});
 assert.throws(()=>exportMultiPartMusicXML(invalid),/Overlapping (notes|events)/);
});


test('simultaneous notes export as MusicXML chords and voice backup uses actual cursor',()=>{
 const chordDoc=structuredClone(doc);
 chordDoc.parts[0].voices[0].measures[0].events.push({type:'note',midi:64,onset:0,duration:1});
 chordDoc.parts[0].voices.push({id:'2',measures:[{events:[{type:'note',midi:67,onset:0,duration:1}]}]});
 const xml=exportMultiPartMusicXML(chordDoc);
 assert.match(xml,/<note><chord\/><pitch><step>E<\/step>/);
 assert.match(xml,/<backup><duration>480<\/duration><\/backup><note>/);
 assert.doesNotMatch(xml,/<backup><duration>1920<\/duration>/);
});
test('tuplets, fingerings, articulations and voice-scoped dynamics survive export',()=>{
 const annotated=structuredClone(doc);
 annotated.parts[0].voices[0].measures[0].events=[{type:'note',midi:62,onset:0,duration:1,
  dynamics:'p',articulation:'staccato',finger:2,tuplet:{actual:3,normal:2}},
  {type:'note',midi:65,onset:1,duration:1,dynamics:'mf',articulation:'tenuto'}];
 const xml=exportMultiPartMusicXML(annotated);
 assert.match(xml,/<dynamics><p\/><\/dynamics>.*<voice>1<\/voice>/);
 assert.match(xml,/<actual-notes>3<\/actual-notes><normal-notes>2<\/normal-notes>/);
 assert.match(xml,/<articulations><staccato\/><\/articulations>/);
 assert.match(xml,/<technical><fingering>2<\/fingering><\/technical>/);
 assert.match(xml,/<articulations><tenuto\/><\/articulations>/);
 assert.match(xml,/<dynamics><mf\/><\/dynamics>/);
});
