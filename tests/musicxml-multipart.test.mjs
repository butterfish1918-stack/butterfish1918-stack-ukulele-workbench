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
 assert.throws(()=>exportMultiPartMusicXML(invalid),/Overlapping notes/);
});
