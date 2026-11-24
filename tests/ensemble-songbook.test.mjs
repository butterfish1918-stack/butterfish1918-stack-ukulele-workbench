import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnsembleDraft,editEnsembleDraft} from '../src/polyphonic-editor.js';
import {saveEnsembleSnapshot,ensembleDraftFromSong,ensemblePracticeRange} from '../src/ensemble-songbook.js';
import {ensemblePlaybackPlan} from '../src/ensemble-playback.js';
import {prepareBackupRestore} from '../src/storage-safety.js';
const make=()=>createEnsembleDraft({title:'Study',measures:4});
const id='ensemble-test';
const validators={validateScore:()=>true,validateProgression:()=>true,validTechniqueProgress:()=>true,validRhythmProgress:()=>true,validReadingProgress:()=>true};
test('separate named ensemble snapshots preserve legacy songs and draft independence',()=>{
 const d=make(),legacy={id:'legacy',title:'Legacy',score:{schema:1}};
 const first=saveEnsembleSnapshot([legacy],d,{id});
 const second=saveEnsembleSnapshot(first.entries,d,{id:'ensemble-second'});
 assert.equal(second.entries.length,3);assert.deepEqual(second.entries[0],legacy);
 d.title='New draft';assert.equal(first.snapshot.scoreDocument.title,'Study');
 const draft=ensembleDraftFromSong(first.snapshot);draft.title='Changed';
 assert.equal(first.snapshot.scoreDocument.title,'Study');
});
test('explicit replacement preserves saved sketch metadata and rejects conflicting IDs',()=>{
 const d=make(),first=saveEnsembleSnapshot([],d,{id});
 first.snapshot.artist='Composer';first.snapshot.notes='Practice';
 const changed={...d,title:'Revised',tempo:120};
 const next=saveEnsembleSnapshot(first.entries,changed,{id,replace:true});
 assert.equal(next.entries.length,1);assert.equal(next.snapshot.artist,'Composer');
 assert.equal(next.snapshot.notes,'Practice');assert.equal(next.snapshot.bpm,120);
 assert.equal(next.snapshot.scoreDocument.title,'Revised');
 assert.throws(()=>saveEnsembleSnapshot(first.entries,d,{id}),/already/);
 assert.throws(()=>saveEnsembleSnapshot([],d,{id,replace:true}),/no longer/);
 assert.throws(()=>ensembleDraftFromSong({score:{schema:1}}));
});
test('practice range and speed do not mutate saved notes or tempo',()=>{
 const doc=editEnsembleDraft(make(),{type:'insert',partId:'P1',voiceId:'1',barIndex:1,event:{type:'note',midi:60,onset:0,duration:1}});
 const opts=ensemblePracticeRange(doc,{startBar:2,endBar:3,speed:75});
 assert.equal(opts.tempo,72);assert.equal(doc.tempo,96);
 const plan=ensemblePlaybackPlan(doc,opts);assert.equal(plan.events[0].onset,0);assert.equal(plan.totalBeats,8);
 assert.throws(()=>ensemblePracticeRange(doc,{startBar:3,endBar:2}));
 assert.throws(()=>ensemblePracticeRange(doc,{speed:10}));
});
test('backup validates saved ensembles and active draft before producing restore plan',()=>{
 const d=make(),{entries}=saveEnsembleSnapshot([],d,{id});
 const backup={format:'ukulele-workbench-backup',schemaVersion:2,songs:entries,progress:[],scoreDocument:d};
 const plan=prepareBackupRestore(backup,validators);
 assert.deepEqual(plan.songs,entries);assert.deepEqual(plan.scoreDocument,d);
 assert.equal(prepareBackupRestore({...backup,scoreDocument:null},validators).scoreDocument,null);
 assert.throws(()=>prepareBackupRestore({...backup,scoreDocument:{...d,tempo:999}},validators));
 assert.throws(()=>prepareBackupRestore({...backup,songs:[{...entries[0],scoreDocument:{...d,tempo:999}}]},validators));
 assert.throws(()=>prepareBackupRestore({...backup,songs:[{...entries[0],score:{schema:1}}]},validators),/both/);
});
