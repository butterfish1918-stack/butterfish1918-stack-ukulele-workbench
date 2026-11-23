import test from 'node:test';
import assert from 'node:assert/strict';
import {importMultiPartMusicXML,exportMultiPartMusicXML} from '../src/musicxml-multipart.js';
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

test('MusicXML import retains chords, parallel voices and scored expression',()=>{
 const node=(tagName,attrs={},...contents)=>{
  const children=contents.filter(x=>typeof x==='object');
  return {tagName,children,
   getAttribute:key=>attrs[key]??null,
   hasAttribute:key=>Object.hasOwn(attrs,key),
   get firstElementChild(){return children[0]??null},
   get textContent(){return contents.map(x=>typeof x==='string'?x:x.textContent).join('')},
   getElementsByTagName(name){return children.flatMap(x=>[...(x.tagName===name?[x]:[]),...x.getElementsByTagName(name)])}
  };
 };
 const N=node;
 const pitch=(step,octave)=>N('pitch',{},N('step',{},step),N('octave',{},String(octave)));
 const makeNote=(step,octave,extra=[])=>N('note',{},...extra,pitch(step,octave),
  N('duration',{},'480'),N('voice',{},'1'));
 const first=makeNote('C',4,[
  N('time-modification',{},N('actual-notes',{},'3'),N('normal-notes',{},'2')),
  N('notations',{},N('articulations',{},N('staccato')),N('technical',{},N('fingering',{},'2')))
 ]);
 const chord=makeNote('E',4,[N('chord')]);
 const second=N('note',{},pitch('G',4),N('duration',{},'480'),N('voice',{},'2'));
 const root=N('score-partwise',{},
  N('movement-title',{},'Expressive duet'),
  N('part-list',{},N('score-part',{id:'P1'},N('part-name',{},'Ukulele'))),
  N('part',{id:'P1'},N('measure',{},
   N('attributes',{},N('divisions',{},'480'),N('time',{},N('beats',{},'4'),N('beat-type',{},'4'))),
   N('direction',{},N('direction-type',{},N('dynamics',{},N('p'))),N('voice',{},'1')),
   first,chord,N('backup',{},N('duration',{},'480')),second))
 );
 class FakeParser {parseFromString(){return {documentElement:root,querySelector:()=>null}}}
 const imported=importMultiPartMusicXML('<score-partwise/>',{DOMParserClass:FakeParser});
 assert.equal(imported.parts[0].voices.length,2);
 const firstEvents=imported.parts[0].voices[0].measures[0].events;
 assert.deepEqual(firstEvents.map(x=>[x.midi,x.onset,x.duration]),[[60,0,1],[64,0,1]]);
 assert.equal(firstEvents[0].dynamics,'p');
 assert.equal(firstEvents[0].articulation,'staccato');
 assert.equal(firstEvents[0].finger,2);
 assert.deepEqual(firstEvents[0].tuplet,{actual:3,normal:2});
 assert.equal(imported.parts[0].voices[1].measures[0].events[0].midi,67);
 assert.match(exportMultiPartMusicXML(imported),/<chord\/>/);
});
test('each exported measure declares initial dynamic, preventing stale dynamics on reimport',()=>{
 const document=structuredClone(doc);
 document.measures=2;
 document.parts=document.parts.slice(0,1);
 document.parts[0].voices[0].measures=[
  {events:[{type:'note',midi:60,onset:0,duration:1,dynamics:'p'}]},
  {events:[{type:'note',midi:62,onset:0,duration:1,dynamics:'mf'}]}
 ];
 const xml=exportMultiPartMusicXML(document);
 assert.equal((xml.match(/<dynamics><p\/><\/dynamics>/g)||[]).length,1);
 assert.equal((xml.match(/<dynamics><mf\/><\/dynamics>/g)||[]).length,1);
});
