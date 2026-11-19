import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent} from '../src/score.js';
import {engravingPlan,VEXFLOW_CDN} from '../src/engraving.js';
test('engraving adapter maps score events to proper written pitches without mutating the score',()=>{
 const score=createScore({sample:false,tuning:'lowG',key:'F'});
 appendEvent(score,{type:'note',midi:60,spelling:'B#',duration:.75});
 appendEvent(score,{type:'rest',duration:.25});
 appendEvent(score,{type:'chord',symbol:'C',duration:1});
 const before=JSON.stringify(score),plan=engravingPlan(score);
 assert.equal(JSON.stringify(score),before);assert.equal(plan.length,1);
 assert.equal(plan[0].events[0].pitches[0].key,'b#/3');
 assert.equal(plan[0].events[0].dotted,true);
 assert.equal(plan[0].events[1].code,'16r');
 assert.equal(plan[0].events[2].pitches.length,4);
});
test('engraving adapter preserves accidental cancellation within measures',()=>{
 const score=createScore({sample:false,key:'G'});
 appendEvent(score,{midi:65,spelling:'F',duration:1});
 appendEvent(score,{midi:66,spelling:'F#',duration:1});
 const p=engravingPlan(score);assert.equal(p[0].events[0].pitches[0].accidental,'n');assert.equal(p[0].events[1].pitches[0].accidental,'#');
});
test('engraver is opt-in and pinned to a specific HTTPS VexFlow version',()=>{assert.match(VEXFLOW_CDN,/^https:\/\/cdn\.jsdelivr\.net\/npm\/vexflow@5\.1\.0\//)});
