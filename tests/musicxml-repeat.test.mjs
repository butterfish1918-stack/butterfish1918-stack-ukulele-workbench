import test from 'node:test';
import assert from 'node:assert/strict';
import {expandRepeatOrder} from '../src/musicxml-repeat.js';
import {importMultiPartMusicXML,exportMultiPartMusicXML} from '../src/musicxml-multipart.js';
import {ensemblePlaybackPlan} from '../src/ensemble-playback.js';

test('simple repeat defaults to two passes and can request up to four',()=>{
 const twice=expandRepeatOrder([{repeatForward:true},{},{repeatBackward:true},{}]);
 assert.deepEqual(twice.order,[0,1,2,0,1,2,3]);
 assert.equal(twice.expanded,true);
 assert.deepEqual(expandRepeatOrder([{},{}]).order,[0,1]);
 assert.equal(expandRepeatOrder([{},{}]).expanded,false);
 assert.deepEqual(expandRepeatOrder([{repeatForward:true},{repeatBackward:true,times:3}]).order,[0,1,0,1,0,1]);
});
test('first and second endings are played in the correct order',()=>{
 const plan=expandRepeatOrder([
 {repeatForward:true},{},
 {endingStart:1,endingStop:1,repeatBackward:true},
 {endingStart:2,endingStop:2},{},
 ]);
 assert.deepEqual(plan.order,[0,1,2,0,1,3,4]);
 assert.equal(plan.writtenMeasures,5);
 assert.equal(plan.expandedMeasures,7);
});
test('adjacent, non-nested repeats do not consume each other',()=>{
 const plan=expandRepeatOrder([
 {repeatForward:true},{repeatBackward:true},
 {repeatForward:true},{repeatBackward:true}
 ]);
 assert.deepEqual(plan.order,[0,1,0,1,2,3,2,3]);
});
test('repeat expansion rejects nested, incomplete and ambiguous structures',()=>{
 assert.throws(()=>expandRepeatOrder([{repeatForward:true},{repeatForward:true},{repeatBackward:true}]),/Nested repeats/);
 assert.throws(()=>expandRepeatOrder([{repeatForward:true},{}]),/missing its backward/);
 assert.throws(()=>expandRepeatOrder([{endingStart:2}]),/Orphaned/);
 assert.throws(()=>expandRepeatOrder([{repeatBackward:true,endingStart:1,endingStop:1},{}]),/Missing second ending/);
 assert.deepEqual(expandRepeatOrder([{repeatForward:true},{repeatBackward:true,times:5}]).order,[0,1,0,1,0,1,0,1,0,1]);
 assert.throws(()=>expandRepeatOrder([{repeatForward:true},{repeatBackward:true,times:9}]),/Supported repeat passes/);
 assert.throws(()=>expandRepeatOrder([{repeatBackward:true}],{maxMeasures:1}),/exceeds 200 measures/);
 assert.throws(()=>expandRepeatOrder([
  {repeatForward:true},{endingStart:1,endingStop:1,repeatBackward:true,times:3},
  {endingStart:2,endingStop:2}
 ]),/exactly two passes/);
});

const node=(tagName,attrs={},...parts)=>{
 const children=parts.filter(x=>typeof x==='object');
 return {tagName,children,getAttribute:k=>attrs[k]??null,
  hasAttribute:k=>Object.hasOwn(attrs,k),
  get firstElementChild(){return children[0]??null},
  get textContent(){return parts.map(x=>typeof x==='string'?x:x.textContent).join('')},
  getElementsByTagName:name=>children.flatMap(x=>[...(x.tagName===name?[x]:[]),...x.getElementsByTagName(name)])
 };
};
const n=node;
const note=(step,octave=4)=>n('note',{},n('pitch',{},n('step',{},step),n('octave',{},String(octave))),
 n('duration',{},'480'),n('voice',{},'1'));
const repeats=[
 [n('barline',{location:'left'},n('repeat',{direction:'forward'}))],
 [],
 [n('barline',{location:'left'},n('ending',{number:'1',type:'start'})),
  n('barline',{location:'right'},n('ending',{number:'1',type:'stop'}),n('repeat',{direction:'backward'}))],
 [n('barline',{location:'left'},n('ending',{number:'2',type:'start'})),
  n('barline',{location:'right'},n('ending',{number:'2',type:'stop'}))]
];
function xmlDocument({conflictingPart=false,invalidDirection=false}={}){
 const measures=(steps,decorated)=>steps.map((step,i)=>
  n('measure',{number:String(i+1)},
   ...(i===0?[n('attributes',{},n('divisions',{},'480'),
    n('time',{},n('beats',{},'4'),n('beat-type',{},'4')))]:[]),
   ...(decorated?repeats[i]:[]),note(step)));
 const ukulele=measures(['C','D','E','F'],true);
 const flute=measures(['G','A','B','C'],conflictingPart);
 if(conflictingPart){
  if(invalidDirection)flute[0].children.find(x=>x.tagName==='barline').children[0].getAttribute=()=> 'sideways';
  else flute[0].children.splice(flute[0].children.findIndex(x=>x.tagName==='barline'),1);
 }
 return n('score-partwise',{},n('movement-title',{},'Original repeat study'),
  n('part-list',{},n('score-part',{id:'P1'},n('part-name',{},'Ukulele')),
   n('score-part',{id:'P2'},n('part-name',{},'Flute'))),
  n('part',{id:'P1'},...ukulele),
  n('part',{id:'P2'},...flute));
}
test('import expands shared first/second endings across both instruments without losing voices',()=>{
 const root=xmlDocument();
 class Parser{parseFromString(){return {documentElement:root,querySelector:()=>null}}}
 const imported=importMultiPartMusicXML('<score-partwise/>',{DOMParserClass:Parser});
 assert.equal(imported.parts.length,2);
 assert.equal(imported.measures,6);
 assert.deepEqual(imported.sourceMeasureNumbers,[1,2,3,1,2,4]);
 assert.deepEqual(imported.parts[0].voices[0].measures.map(bar=>bar.events[0].midi),[60,62,64,60,62,65]);
 assert.deepEqual(imported.parts[1].voices[0].measures.map(bar=>bar.events[0].midi),[67,69,71,67,69,60]);
 const planned=ensemblePlaybackPlan(imported);
 assert.equal(planned.events.length,12);
 assert.equal(planned.totalBeats,24);
 const out=exportMultiPartMusicXML(imported);
 assert.match(out,/<measure number="6">/);
 assert.doesNotMatch(out,/<repeat|<ending/);
});
test('conflicting repeats between parts are not silently applied to all instruments',()=>{
 const root=xmlDocument({conflictingPart:true});
 class Parser{parseFromString(){return {documentElement:root,querySelector:()=>null}}}
 assert.throws(()=>importMultiPartMusicXML('<score-partwise/>',{DOMParserClass:Parser}),/conflicting repeat instructions/);
});
test('unsupported MusicXML repeat directions are rejected before note import',()=>{
 const root=xmlDocument({conflictingPart:true,invalidDirection:true});
 class Parser{parseFromString(){return {documentElement:root,querySelector:()=>null}}}
 assert.throws(()=>importMultiPartMusicXML('<score-partwise/>',{DOMParserClass:Parser}),/Unsupported MusicXML repeat direction/);
});
