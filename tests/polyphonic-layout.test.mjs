import test from 'node:test';
import assert from 'node:assert/strict';
import {planPolyphonicLayout,noteStaffOffset,chordHeadShift,voiceOffset} from '../src/polyphonic-layout.js';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';

const makeVoice=(id,measures)=>({id,measures:measures.map(events=>({events}))});
const makeDoc=(parts,measures=1)=>({schema:2,title:'Adaptive polyphonic layout',tempo:100,meter:'4/4',measures,parts});

test('dense sixteenth-note passage has distinct onset slots and never compresses to 156px',()=>{
 const notes=Array.from({length:16},(_,i)=>({
  type:'note',midi:60+i%4,onset:i*.25,duration:.25
 }));
 const doc=makeDoc([{id:'P1',name:'Ukulele',voices:[makeVoice('1',[notes])]}]);
 const layout=planPolyphonicLayout(doc,{pageWidth:350})[0];
 const geometry=layout.bars[0];
 assert.ok(geometry.width>=16*32);
 assert.ok(layout.width>350);
 for(let i=1;i<notes.length;i++)assert.ok(geometry.xFor(notes[i].onset)-geometry.xFor(notes[i-1].onset)>=32);
 const svg=renderPolyphonicDocument(doc,{pageWidth:350});
 assert.match(svg,/width="\d+" height="\d+"/);
 assert.equal((svg.match(/class="poly-voice-event"/g)||[]).length,16);
});
test('shared rhythmic onsets align exactly across different instrumental staves',()=>{
 const doc=makeDoc([
  {id:'P1',name:'Ukulele',voices:[makeVoice('1',[[{type:'note',midi:64,onset:1,duration:1}]])]},
  {id:'P2',name:'Flute',voices:[makeVoice('1',[[{type:'note',midi:79,onset:1,duration:1}]])]}
 ]);
 const s=planPolyphonicLayout(doc)[0];
 assert.equal(s.bars[0].onsets.length,1);
 assert.equal(s.bars[0].xFor(1),s.bars[0].xFor(1));
 assert.ok(s.staffTops[1]>s.staffTops[0]+90);
});
test('adjacent-second chord noteheads are offset, while wider intervals remain aligned',()=>{
 const notes=[
  {type:'note',midi:60,onset:0,duration:1,spelling:'C'},
  {type:'note',midi:62,onset:0,duration:1,spelling:'D'},
  {type:'note',midi:67,onset:0,duration:1,spelling:'G'}
 ];
 const doc=makeDoc([{id:'P1',name:'Ukulele',voices:[makeVoice('1',[notes])]}]);
 assert.equal(chordHeadShift(notes,notes[0]),0);
 assert.equal(chordHeadShift(notes,notes[1]),12);
 assert.equal(chordHeadShift(notes,notes[2]),0);
 assert.equal(voiceOffset(0),-9);
 assert.equal(voiceOffset(1),9);
 assert.match(renderPolyphonicDocument(doc),/poly-chord-offset/);
 assert.match(renderPolyphonicDocument(doc),/data-chord-shift="12"/);
});
test('high and low ledger excursions reserve clearance between two staves',()=>{
 const notes=[{type:'note',midi:100,onset:0,duration:1},{type:'note',midi:36,onset:1,duration:1}];
 const doc=makeDoc([
  {id:'P1',name:'Uke',voices:[makeVoice('1',[notes])]},
  {id:'P2',name:'Bass',voices:[makeVoice('1',[[{type:'note',midi:36,onset:0,duration:4}]])]}
 ]);
 const layout=planPolyphonicLayout(doc)[0];
 assert.ok(layout.staffTops[0]+noteStaffOffset(notes[0])>=0);
 assert.ok(layout.staffTops[1]>layout.staffTops[0]+170);
 assert.ok(layout.height>layout.staffTops[1]+60);
 assert.match(renderPolyphonicDocument(doc),/class="poly-ledger"/);
});
test('layout creates additional systems rather than compressing overlapping bars',()=>{
 const all=Array.from({length:6},(_,b)=>[{type:'note',midi:60+b,onset:0,duration:1}]);
 const doc=makeDoc([{id:'P1',name:'Ukulele',voices:[makeVoice('1',all)]}],6);
 const systems=planPolyphonicLayout(doc,{pageWidth:300,maxBars:2});
 assert.equal(systems.length,3);
 assert.deepEqual(systems.map(s=>[s.startBar,s.endBar]),[[1,2],[3,4],[5,6]]);
 assert.ok(systems.every(s=>s.width<=300));
});
