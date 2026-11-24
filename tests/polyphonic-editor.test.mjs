import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnsembleDraft,editEnsembleDraft} from '../src/polyphonic-editor.js';
import {ensembleSelection,renderEnsembleEditor} from '../src/polyphonic-editor-view.js';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
import {ensemblePlaybackPlan} from '../src/ensemble-playback.js';
import {exportMultiPartMusicXML} from '../src/musicxml-multipart.js';
const loc={partId:'P1',voiceId:'1',barIndex:0};
const note=(midi=60,onset=0,duration=1)=>({type:'note',midi,onset,duration});
const insert=(d,event,where=loc)=>editEnsembleDraft(d,{type:'insert',...where,event});
test('empty ensemble draft and immutable chord insertion',()=>{
 const original=createEnsembleDraft(),one=insert(original,note()),two=insert(one,note(64));
 assert.equal(original.parts[0].voices[0].measures[0].events.length,0);
 assert.deepEqual(two.parts[0].voices[0].measures[0].events.map(e=>e.midi),[60,64]);
 assert.equal(ensemblePlaybackPlan(two).events.length,2);
 assert.match(exportMultiPartMusicXML(two),/<chord\/>/);
});
test('independent counterpoint in additional voice and instrument',()=>{
 let d=createEnsembleDraft();d=insert(d,note(60,0,2));
 d=editEnsembleDraft(d,{type:'add-voice',partId:'P1'});
 d=insert(d,note(67,1),{...loc,voiceId:'2'});
 d=editEnsembleDraft(d,{type:'add-part',instrument:'piano'});
 d=insert(d,note(72,0,2),{...loc,partId:'P2'});
 assert.equal(ensemblePlaybackPlan(d).events.length,3);
 assert.equal(d.parts[1].instrument,'piano');
});
test('reject conflicting rests, overlapping notes, duplicate pitches and overflow without mutation',()=>{
 const d=insert(createEnsembleDraft(),note(60,0,2)),before=JSON.stringify(d);
 for(const e of [note(64,1,2),note(60,0,2),{type:'rest',onset:0,duration:2},note(64,3,2)])assert.throws(()=>insert(d,e));
 assert.equal(JSON.stringify(d),before);
});
test('replace and delete a selected event and retain other chord notes',()=>{
 let d=insert(insert(createEnsembleDraft(),note()),note(64));
 d=editEnsembleDraft(d,{type:'replace',...loc,eventIndex:1,event:{...note(67),dynamics:'f',articulation:'accent'}});
 assert.deepEqual(d.parts[0].voices[0].measures[0].events.map(e=>e.midi),[60,67]);
 d=editEnsembleDraft(d,{type:'delete',...loc,eventIndex:0});
 assert.equal(d.parts[0].voices[0].measures[0].events[0].midi,67);
});
test('preserve existing tied annotations and refuse destructive changes',()=>{
 const d=createEnsembleDraft();d.parts[0].voices[0].measures[0].events=[{...note(60,0,2),tieStart:true,spelling:'C'},{...note(60,2,2),tieStop:true,spelling:'C'}];
 const next=editEnsembleDraft(d,{type:'replace',...loc,eventIndex:0,event:{...note(60,0,2),dynamics:'p'}});
 assert.equal(next.parts[0].voices[0].measures[0].events[0].tieStart,true);
 assert.equal(next.parts[0].voices[0].measures[0].events[0].spelling,'C');
 assert.throws(()=>editEnsembleDraft(d,{type:'delete',...loc,eventIndex:0}),/Tied/);
 assert.throws(()=>editEnsembleDraft(d,{type:'replace',...loc,eventIndex:0,event:note(62,0,2)}),/tied/);
});
test('append bars to every part and voice and remove obsolete source mapping',()=>{
 let d=createEnsembleDraft({measures:1});d.sourceMeasureNumbers=[1];
 d=editEnsembleDraft(d,{type:'add-voice',partId:'P1'});
 d=editEnsembleDraft(d,{type:'add-part',instrument:'bass'});
 d=editEnsembleDraft(d,{type:'append-bar'});
 assert.equal(d.measures,2);assert.equal(d.sourceMeasureNumbers,undefined);
 for(const p of d.parts)for(const v of p.voices)assert.equal(v.measures.length,2);
});
test('editor validates metadata and bounds',()=>{
 assert.throws(()=>createEnsembleDraft({measures:1e9}));
 const d=createEnsembleDraft();
 assert.throws(()=>editEnsembleDraft(d,{type:'metadata',tempo:999}));
 assert.throws(()=>editEnsembleDraft(d,{type:'metadata',title:' '}));
 assert.throws(()=>editEnsembleDraft(d,{type:'add-part',instrument:'unknown'}));
});
test('editor selection and escaped labels; staff targets identify part, voice and event',()=>{
 let d=insert(createEnsembleDraft({title:'<unsafe>'}),note());
 const s=ensembleSelection(d,{partId:'missing',voiceId:'missing',barIndex:999,eventIndex:999});
 assert.equal(s.barIndex,3);assert.equal(s.eventIndex,-1);
 const html=renderEnsembleEditor(d,{...loc,eventIndex:0});
 assert.match(html,/&lt;unsafe&gt;/);assert.match(html,/data-action="ensemble-replace"/);
 const staff=renderPolyphonicDocument(d,{editable:true});
 assert.match(staff,/data-poly-edit data-event-index="0"[^>]*data-part="P1"/);
 assert.doesNotMatch(renderPolyphonicDocument(d),/data-poly-edit/);
});
