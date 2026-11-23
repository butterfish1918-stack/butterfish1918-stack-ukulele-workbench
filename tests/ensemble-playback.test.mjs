import test from 'node:test';
import assert from 'node:assert/strict';
import {ensemblePlaybackPlan,ensembleInstrument} from '../src/ensemble-playback.js';
const doc={schema:2,title:'Original duet',tempo:90,meter:'4/4',measures:2,parts:[
 {id:'P1',name:'Ukulele',instrument:'ukulele',voices:[
  {id:'1',measures:[{events:[{type:'note',midi:64,onset:0,duration:1,dynamics:'mf'},{type:'note',midi:67,onset:2,duration:1}]},{events:[{type:'note',midi:69,onset:0,duration:2}]}]},
  {id:'2',measures:[{events:[{type:'note',midi:60,onset:0,duration:2,articulation:'staccato'}]},{events:[]}]}
 ]},
 {id:'P2',name:'Flute',instrument:'flute',voices:[{id:'1',measures:[{events:[{type:'note',midi:72,onset:0,duration:3,dynamics:'p'}]},{events:[{type:'note',midi:74,onset:0,duration:2}]}]}]}
]};
test('original simultaneous instrumental and polyphonic voice onsets are retained',()=>{
 const plan=ensemblePlaybackPlan(doc);
 assert.equal(plan.events.length,6);
 assert.deepEqual(plan.events.slice(0,3).map(x=>x.onset),[0,0,0]);
 assert.equal(plan.events.find(x=>x.voiceId==='2').duration,.96);
 assert.equal(plan.events.find(x=>x.instrument==='flute').velocity,.40);
 assert.deepEqual(plan.trackIds.map(x=>x.instrument),['ukulele','flute']);
});
test('measure excerpt changes only the absolute timeline origin, not pitch or duration',()=>{
 const plan=ensemblePlaybackPlan(doc,{startBar:2,endBar:2});
 assert.equal(plan.totalBeats,4);
 assert.equal(plan.events.length,2);
 assert.ok(plan.events.every(e=>e.onset===0&&e.measure===2));
});
test('unsupported parts are visible as unsupported, never silently treated as piano',()=>{
 const variant=structuredClone(doc);
 variant.parts[1].name='Uncatalogued instrument';
 variant.parts[1].instrument='unknown';
 assert.deepEqual(ensemblePlaybackPlan(variant).unsupported,['P2']);
 assert.equal(ensembleInstrument({name:'Cello'}),'strings');
});
