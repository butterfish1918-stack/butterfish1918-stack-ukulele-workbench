import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNINGS} from '../src/music.js';
import {createScore,validateScore,appendEvent,findEvent,removeEvent,replaceEvent,assignPosition,changeTuning,timeline,usedBeats,measureBeats,remainingBeats,preferredPosition} from '../src/score.js';
import {renderScoreView} from '../src/score-view.js';

const blank=(params={})=>createScore({...params,sample:false});
test('measured score defaults, rests, and melody sample',()=>{
 const a=createScore();assert.equal(validateScore(a),true);assert.equal(a.measures.length,2);
 assert.deepEqual(a.measures.map(usedBeats),[4,4]);
 assert.equal(a.measures[0].events[4].type,'rest');
 assert.equal(a.measures[0].events[1].duration,.5);
 assert.equal(timeline(a).at(-1).onset,7);
 assert.equal(remainingBeats(a),0);
});
test('meter capacity and next-measure onset',()=>{
 const a=blank({meter:'6/8'});
 assert.equal(measureBeats('6/8'),3);
 appendEvent(a,{midi:60,duration:2});
 appendEvent(a,{type:'rest',duration:1});
 const n=appendEvent(a,{midi:64,duration:2});
 assert.equal(a.measures.length,2);
 assert.equal(remainingBeats(a),1);
 assert.equal(timeline(a).at(-1).onset,3);
 assert.equal(findEvent(a,n.id).measureIndex,1);
 assert.throws(()=>appendEvent(a,{midi:64,duration:4}),/Duration exceeds/);
});
test('note position assignments use exact tuning and octaves',()=>{
 const a=blank();const ev=appendEvent(a,{midi:67,duration:1});
 assignPosition(a,ev.id,0,0);
 assert.deepEqual(findEvent(a,ev.id).event.position,{string:0,fret:0});
 assert.deepEqual(preferredPosition(findEvent(a,ev.id).event,'highG'),{string:0,fret:0,midi:67,pc:7});
 assert.throws(()=>assignPosition(a,ev.id,2,0),/does not play/);
 changeTuning(a,'lowG');
 assert.equal(findEvent(a,ev.id).event.position,null);
 assert.equal(TUNINGS.lowG.midi[0],55);
});
test('editing and removal do not silently slide later notes or exceed bar',()=>{
 const a=blank({meter:'3/4'});const first=appendEvent(a,{midi:60,duration:2});
 appendEvent(a,{midi:62,duration:1});
 const third=appendEvent(a,{midi:64,duration:1});
 assert.throws(()=>replaceEvent(a,first.id,{type:'note',midi:60,duration:4}),/overfill/);
 assert.equal(findEvent(a,first.id).event.duration,2);
 replaceEvent(a,first.id,{type:'rest',duration:2});
 assert.equal(findEvent(a,first.id).event.type,'rest');
 assert.equal(removeEvent(a,first.id),true);
 assert.equal(findEvent(a,third.id).measureIndex,1);
 assert.equal(timeline(a).at(-1).onset,3);
});
test('invalid score data is rejected before render and import',()=>{
 let a=blank();appendEvent(a,{midi:60,duration:1});
 const c=structuredClone(a);c.measures[0].events[0].midi=62;c.measures[0].events[0].spelling='D';
 c.measures[0].events[0].position={string:1,fret:0};
 assert.throws(()=>validateScore(c),/Invalid fingering/);
 const d=structuredClone(a);d.measures[0].events[0].duration=100;
 assert.throws(()=>validateScore(d),/Invalid duration/);
 const e=structuredClone(a);e.measures[0].events[0].spelling='Zb';
 assert.throws(()=>validateScore(e),/Invalid spelling/);
 const f=structuredClone(a);f.measures[0].events[0].spelling='D';
 assert.throws(()=>validateScore(f),/Invalid spelling for the sounding pitch/);
});
test('renderer synchronizes IDs in notation and optional tabs; no TAB when notation mode',()=>{
 const score=createScore();const id=score.measures[0].events[0].id;
 const staff=renderScoreView(score,{mode:'notation',selectedEventId:id});
 assert.match(staff,/Treble clef|𝄞/);
 assert.match(staff,/data-event-id=/);
 assert.doesNotMatch(staff,/OPTIONAL TAB/);
 assert.match(staff,/>4<\/text>/);
 const dual=renderScoreView(score,{mode:'dual',showNames:true});
 assert.match(dual,/OPTIONAL TAB/);
 assert.ok(dual.match(new RegExp(`data-event-id="${id}"`,'g')).length>=2);
 const tab=renderScoreView(score,{mode:'tab'});
 assert.match(tab,/OPTIONAL TAB/);
 assert.doesNotMatch(tab,/𝄞/);
});
