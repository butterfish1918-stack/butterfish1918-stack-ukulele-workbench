import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnsembleDraft,editEnsembleDraft} from '../src/polyphonic-editor.js';
import {ensemblePreferences,ensemblePreferenceLibrary,createEnsembleCycle,nextEnsembleCycle,ensemblePlayPosition,ensembleSessionSummary} from '../src/ensemble-practice.js';
import {prepareBackupRestore} from '../src/storage-safety.js';
const doc=()=>editEnsembleDraft(createEnsembleDraft(),{type:'add-part',instrument:'piano'});
test('per-song mixer normalizes bounds and discards obsolete tracks',()=>{
 const d=doc(),p=ensemblePreferences(d,{startBar:4,endBar:1,speed:999,loop:true,ramp:true,mix:{P1:{muted:true,volume:153},P2:{volume:43},missing:{muted:true}}});
 assert.equal(p.startBar,4);assert.equal(p.endBar,4);assert.equal(p.speed,100);
 assert.deepEqual(p.mix,{P1:{muted:true,volume:150},P2:{muted:false,volume:45}});
 assert.equal(p.loop,true);assert.equal(p.ramp,true);
 assert.equal(ensemblePreferences(d).mix.P1.muted,false);
});
test('loop boundaries are contiguous and tempo increases to cap',()=>{
 const config={tempo:100,totalBeats:8,loop:true,ramp:true,step:5,max:100};
 let c=createEnsembleCycle({...config,start:10,speed:90});
 assert.equal(c.end,10+8*(60/90));const next=nextEnsembleCycle(c,config);
 assert.equal(next.start,c.end);assert.equal(next.speed,95);assert.equal(next.index,1);
 c=nextEnsembleCycle(next,config);assert.equal(c.speed,100);
 assert.equal(nextEnsembleCycle(c,config).speed,100);
 assert.equal(nextEnsembleCycle(c,{...config,loop:false}),null);
});
test('bar positions restart at chosen bar each loop',()=>{
 const config={tempo:120,totalBeats:8,loop:true,ramp:false};
 const c=createEnsembleCycle({...config,start:2,speed:100}),next=nextEnsembleCycle(c,config);
 const plan={startBar:3,endBar:4,beatsPerBar:4};
 assert.equal(ensemblePlayPosition(c,4.01,plan).bar,4);
 assert.deepEqual(ensemblePlayPosition(next,next.start,plan),{bar:3,beat:0,cycle:1,speed:100});
});
test('session summary excludes preparation and post-finish time',()=>{
 assert.deepEqual(ensembleSessionSummary({firstStart:10,initialSpeed:75,completedCycles:2,finishedAt:24},30),{seconds:14,loops:2,speed:75});
 assert.equal(ensembleSessionSummary({firstStart:10},5).seconds,0);
});
test('backup preserves preferences by arrangement and ignores stale song IDs',()=>{
 const d=doc(),songs=[{id:'ensemble-one',title:'Study',scoreDocument:d},{id:'ensemble-two',title:'Other',scoreDocument:d}];
 const input={'ensemble-one':{loop:true,mix:{P1:{muted:true,volume:65}}},'old':{loop:true}};
 const prefs=ensemblePreferenceLibrary(songs,input);
 assert.deepEqual(Object.keys(prefs),['ensemble-one']);
 const backup={format:'ukulele-workbench-backup',schemaVersion:2,songs,progress:[],ensembleSongPractice:input};
 const validators={validateScore:()=>true,validateProgression:()=>true,validTechniqueProgress:()=>true,validRhythmProgress:()=>true,validReadingProgress:()=>true};
 assert.deepEqual(prepareBackupRestore(backup,validators).ensembleSongPractice,prefs);
 assert.throws(()=>ensemblePreferenceLibrary(songs,[]));
});
