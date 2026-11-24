import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnsembleDraft,editEnsembleDraft} from '../src/polyphonic-editor.js';
import {planUkuleleTablature,tabEventKey} from '../src/polyphonic-tablature.js';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
import {planPolyphonicLayout} from '../src/polyphonic-layout.js';
import {TUNINGS} from '../src/music.js';
const note=(midi,onset=0,duration=1,extra={})=>({type:'note',midi,onset,duration,...extra});
function draft(voices,measures=1){
 const doc=createEnsembleDraft({measures});
 doc.parts[0].voices=voices.map((bars,i)=>({id:String(i+1),measures:bars.map(events=>({events}))}));return doc;
}
const get=(p,v='1',b=1,i=0)=>p.positions.get(tabEventKey(v,b,i));
test('four-note chord uses distinct strings without octave changes',()=>{
 const pitches=[60,64,67,69],doc=draft([[pitches.map(m=>note(m))]]);
 const plan=planUkuleleTablature(doc,'P1');
 const assigned=pitches.map((m,i)=>get(plan,'1',1,i));
 assert.equal(new Set(assigned.map(p=>p.string)).size,4);
 assert.deepEqual(assigned.map(p=>p.fret),[0,0,0,0]);
 assigned.forEach((p,i)=>assert.equal(TUNINGS.highG.midi[p.string]+p.fret,pitches[i]));
 assert.equal(plan.unresolvedAttacks,0);
});
test('sustained independent voices reserve distinct strings',()=>{
 const doc=draft([[[note(64,0,3)]],[[note(60,1,1)]]]);
 const plan=planUkuleleTablature(doc,'P1');
 assert.equal(plan.unresolvedAttacks,0);
 assert.notEqual(get(plan,'1').string,get(plan,'2').string);
});
test('overlapping pitches restricted to same physical string are flagged',()=>{
 const doc=draft([[[note(60,0,3)]],[[note(61,1,1)]]]);
 const plan=planUkuleleTablature(doc,'P1');
 assert.equal(plan.unresolvedAttacks,1);
 assert.ok(get(plan,'1')===null||get(plan,'2')===null);
});
test('cross-bar tied notes retain one string and are not re-assigned',()=>{
 const doc=draft([[[note(64,0,4,{tieStart:true})],[note(64,0,2,{tieStop:true})]],[[],[note(60,0,1)]]],2);
 const plan=planUkuleleTablature(doc,'P1');
 assert.deepEqual(get(plan,'1',1),get(plan,'1',2));
 assert.notEqual(get(plan,'1',2).string,get(plan,'2',2).string);
 assert.equal(plan.unresolvedAttacks,0);
 assert.match(renderPolyphonicDocument(doc,{tablatureTuning:'highG'}),/>\(\d+\)<\/text>/);
});
test('unsupported chords and range limits do not silently drop or transpose source notes',()=>{
 const pitches=[60,64,67,69,72],doc=draft([[pitches.map(m=>note(m))]]);
 const snapshot=JSON.stringify(doc),plan=planUkuleleTablature(doc,'P1');
 assert.equal(plan.unresolvedAttacks,5);assert.ok([...plan.positions.values()].every(p=>p===null));
 assert.equal(JSON.stringify(doc),snapshot);
 assert.match(renderPolyphonicDocument(doc,{tablatureTuning:'highG'}),/5 unresolved note attack/);
 const low=draft([[[note(55)]]]);
 assert.equal(get(planUkuleleTablature(low,'P1')),null);
 assert.deepEqual(get(planUkuleleTablature(low,'P1',{tuning:'lowG'})),{string:0,fret:0});
 const high=draft([[[note(85)]]]);
 assert.equal(get(planUkuleleTablature(high,'P1',{maxFret:12})),null);
 assert.ok(get(planUkuleleTablature(high,'P1',{maxFret:18})));
});
test('shared bar geometry aligns tablature and reserves space above following instruments',()=>{
 const doc=editEnsembleDraft(draft([[[note(60),note(64,1)]]]),{type:'add-part',instrument:'piano'});
 const base=planPolyphonicLayout(doc)[0],withTab=planPolyphonicLayout(doc,{tablaturePartIds:['P1']})[0];
 assert.equal(withTab.bars[0].xFor(1),base.bars[0].xFor(1));
 assert.ok(withTab.staffTops[1]>base.staffTops[1]);
 assert.equal(withTab.tabTops[1],null);
 const html=renderPolyphonicDocument(doc,{editable:true,tablatureTuning:'highG'});
 assert.equal((html.match(/class="poly-tab-row"/g)||[]).length,1);
 assert.match(html,/class="poly-tab-event poly-voice-event" data-poly-edit/);
 assert.match(html,/data-string="3" data-fret="0" data-x="/);
 assert.doesNotMatch(renderPolyphonicDocument(doc),/class="poly-tab-row"/);
});
