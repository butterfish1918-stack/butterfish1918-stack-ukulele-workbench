import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent,insertEvent,appendMeasure,findEvent,replaceEvent,assignPosition,validateScore,timeline} from '../src/score.js';
import {beamGroups,accidentalMarks,renderScoreView} from '../src/score-view.js';
import {createHistory,commitHistory,undoHistory,redoHistory,canUndo,canRedo} from '../src/history.js';

const fresh=(opts={})=>createScore({...opts,sample:false});
test('bounded Undo/Redo snapshots are independent and divergent edits clear future',()=>{
 let h=createHistory(fresh(),2);
 assert.equal(canUndo(h),false);
 let score=structuredClone(h.current);
 appendEvent(score,{midi:60,duration:1});h=commitHistory(h,score);
 assert.equal(canUndo(h),true);assert.equal(canRedo(h),false);
 score=structuredClone(h.current);appendEvent(score,{midi:62,duration:1});h=commitHistory(h,score);
 h=undoHistory(h);assert.equal(h.current.measures[0].events.length,1);
 assert.equal(canRedo(h),true);
 h=redoHistory(h);assert.equal(h.current.measures[0].events.length,2);
 h=undoHistory(h);
 score=structuredClone(h.current);appendEvent(score,{midi:64,duration:.5});h=commitHistory(h,score);
 assert.equal(canRedo(h),false);
 assert.equal(h.current.measures[0].events[1].midi,64);
 assert.equal(undoHistory(undoHistory(h)).past.length,0);
});
test('invalid score edits are atomic and full measure insertions refuse to shift later bars',()=>{
 const a=fresh({meter:'3/4'});
 const first=appendEvent(a,{midi:60,duration:1});
 appendEvent(a,{midi:64,duration:1});
 appendEvent(a,{midi:67,duration:1});
 const last=appendEvent(a,{midi:69,duration:1});
 const before=structuredClone(a);
 assert.throws(()=>insertEvent(a,first.id,{midi:62,duration:1},'after'),/no room/);
 assert.deepEqual(a,before);
 assert.throws(()=>appendEvent(a,{midi:65,spelling:'Fb',duration:1}),/spelling/);
 assert.deepEqual(a,before);
 assert.equal(findEvent(a,last.id).measureIndex,1);
 assert.equal(timeline(a).at(-1).onset,3);
});
test('insert before/after inside a partly filled bar and add explicit empty bar',()=>{
 const a=fresh({meter:'4/4'});
 const first=appendEvent(a,{midi:60,duration:1});
 const second=appendEvent(a,{midi:64,duration:1});
 const inserted=insertEvent(a,second.id,{type:'rest',duration:.5},'before');
 assert.deepEqual(a.measures[0].events.map(x=>x.id),[first.id,inserted.id,second.id]);
 assert.equal(timeline(a).find(e=>e.id===second.id).onset,1.5);
 const next=insertEvent(a,first.id,{midi:62,duration:.5},'after');
 assert.equal(findEvent(a,next.id).event.midi,62);
 appendMeasure(a);assert.equal(a.measures.length,2);
 assert.throws(()=>appendMeasure(a),/already blank/);
 assert.equal(validateScore(a),true);
});
test('duration or enharmonic edit preserves the intended physical fingering',()=>{
 const a=fresh();const e=appendEvent(a,{midi:61,spelling:'C#',duration:1});
 assignPosition(a,e.id,1,1);
 replaceEvent(a,e.id,{type:'note',midi:61,spelling:'Db',duration:2});
 assert.deepEqual(findEvent(a,e.id).event.position,{string:1,fret:1});
 replaceEvent(a,e.id,{type:'note',midi:62,spelling:'D',duration:1});
 assert.equal(findEvent(a,e.id).event.position,null);
});
test('accidental display resets by bar and distinguishes spellings and natural cancellations',()=>{
 const evs=[
  {type:'note',midi:61,spelling:'C#',duration:.5},
  {type:'note',midi:61,spelling:'C#',duration:.5},
  {type:'note',midi:60,spelling:'C',duration:.5},
  {type:'note',midi:61,spelling:'Db',duration:.5},
  {type:'note',midi:62,spelling:'D',duration:.5},
 ];
 assert.deepEqual(accidentalMarks(evs),['#','','natural','b','natural']);
 const a=fresh();evs.forEach(({midi,spelling,duration})=>appendEvent(a,{midi,spelling,duration}));
 const staff=renderScoreView(a);
 assert.match(staff,/♮/);assert.match(staff,/♭/);assert.match(staff,/♯/);
});
test('beam grouping follows simple beat boundaries and dotted-quarter groups in 6/8',()=>{
 const one={type:'note',duration:.5};const six={type:'note',duration:.25};const rest={type:'rest',duration:.5};
 assert.deepEqual(beamGroups([one,one,one,one,rest,one],'4/4'),[[0,1],[2,3]]);
 assert.deepEqual(beamGroups([one,one,one,one,one,one],'6/8'),[[0,1,2],[3,4,5]]);
 assert.deepEqual(beamGroups([six,six,one,one,one],'4/4'),[[0,1,2],[3,4]]);
 const a=fresh();[.5,.5,.25,.25,.5,1,1].forEach((duration,i)=>appendEvent(a,{midi:i%2?64:60,duration}));
 assert.match(renderScoreView(a),/class="score-beam"/);
 assert.doesNotMatch(renderScoreView(a,{mode:'tab'}),/class="score-beam"/);
});
