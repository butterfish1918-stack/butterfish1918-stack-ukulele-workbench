import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent,findEvent,validateScore,canTieNext,setTieToNext,KEY_SIGNATURES,keyAccidental,setKeySignature,remainingBeats,replaceEvent,timeline,baseDuration,isDotted} from '../src/score.js';
import {renderScoreView,accidentalMarks,beamGroups} from '../src/score-view.js';
const fresh=(opts={})=>createScore({...opts,sample:false});
test('dotted note and rest values fill measures precisely',()=>{
 const score=fresh({meter:'6/8'});
 appendEvent(score,{midi:60,duration:1.5});
 appendEvent(score,{type:'rest',duration:0.75});
 appendEvent(score,{midi:62,duration:.375});
 appendEvent(score,{type:'rest',duration:.375});
 assert.equal(remainingBeats(score),0);
 assert.deepEqual(timeline(score).map(x=>x.onset),[0,1.5,2.25,2.625]);
 assert.equal(baseDuration(1.5),1);assert.equal(baseDuration(.375),.25);
 assert.ok(isDotted(.75));
 assert.equal((renderScoreView(score).match(/score-dot/g)||[]).length,2);
 assert.match(renderScoreView(score),/r="3.3"/);
});
test('simple and compound beaming correctly handles dotted eighth + sixteenth',()=>{
 const d={type:'note',duration:.75},s={type:'note',duration:.25};
 assert.deepEqual(beamGroups([d,s,d,s],'4/4'),[[0,1],[2,3]]);
 assert.deepEqual(beamGroups([{type:'note',duration:1.5},{type:'note',duration:.5},{type:'note',duration:.5},{type:'note',duration:.5}],'6/8'),[[1,2,3]]);
});
test('major key signatures carry default alterations but never change sounding pitch',()=>{
 assert.equal(Object.keys(KEY_SIGNATURES).length,15);
 assert.equal(keyAccidental('G','F'),'#');assert.equal(keyAccidental('F','B'),'b');assert.equal(keyAccidental('C','F'),'');
 assert.deepEqual(accidentalMarks([
  {type:'note',midi:66,spelling:'F#'},
  {type:'note',midi:65,spelling:'F'},
  {type:'note',midi:66,spelling:'F#'}
 ],'G'),['','natural','#']);
 assert.deepEqual(accidentalMarks([{type:'note',midi:70,spelling:'Bb'},{type:'note',midi:71,spelling:'B'}],'F'),['','natural']);
 const score=fresh();appendEvent(score,{midi:66,spelling:'F#',duration:1});setKeySignature(score,'G');
 assert.equal(timeline(score)[0].midi,66);
 assert.match(renderScoreView(score),/key-signature/);
 assert.doesNotMatch(renderScoreView(score),/♮/);
 assert.throws(()=>setKeySignature(score,'H'),/Unsupported key/);
});
test('ties combine identical adjacent written notes, not rests or enharmonic notes',()=>{
 const score=fresh();const a=appendEvent(score,{midi:60,spelling:'C',duration:1});
 const b=appendEvent(score,{midi:60,spelling:'C',duration:.5});
 assert.equal(canTieNext(score,a.id),true);
 setTieToNext(score,a.id,true);
 assert.equal(validateScore(score),true);
 assert.equal(findEvent(score,a.id).event.tieToNext,true);
 assert.match(renderScoreView(score),/score-tie/);
 assert.throws(()=>replaceEvent(score,b.id,{type:'rest',duration:.5}),/Tie requires/);
 assert.equal(findEvent(score,b.id).event.type,'note');
 setTieToNext(score,a.id,false);
 assert.equal(renderScoreView(score).includes('score-tie'),false);
 const c=appendEvent(score,{midi:61,spelling:'Db',duration:1});
 assert.equal(canTieNext(score,b.id),false);
 assert.throws(()=>setTieToNext(score,b.id,true),/identical adjacent/);
 assert.equal(findEvent(score,c.id).event.spelling,'Db');
});
test('ties across barlines require complete measure and matching first event',()=>{
 const score=fresh({meter:'3/4'});
 const a=appendEvent(score,{midi:64,duration:3});const b=appendEvent(score,{midi:64,duration:1});
 assert.equal(canTieNext(score,a.id),true);
 setTieToNext(score,a.id,true);assert.equal(validateScore(score),true);
 assert.match(renderScoreView(score),/score-tie/);
 const copy=structuredClone(score);copy.measures[0].events[0].duration=2;
 assert.throws(()=>validateScore(copy),/complete measure/);
 const p=fresh();const e=appendEvent(p,{midi:64,duration:1});p.measures.push({events:[]});appendEvent(p,{midi:64,duration:1});
 assert.equal(canTieNext(p,e.id),false);
});
test('legacy scores without key signature remain valid and default to C',()=>{
 const legacy=fresh();appendEvent(legacy,{midi:60,duration:1});delete legacy.key;
 assert.equal(validateScore(legacy),true);
 assert.doesNotMatch(renderScoreView(legacy),/key-signature/);
});

test('bar-crossing tie suppresses accidental only for held note, not a later new attack',()=>{
 const s=fresh({key:'C',meter:'3/4'});
 const a=appendEvent(s,{midi:66,spelling:'F#',duration:3});
 appendEvent(s,{midi:66,spelling:'F#',duration:1});
 appendEvent(s,{midi:66,spelling:'F#',duration:1});
 setTieToNext(s,a.id,true);
 const svg=renderScoreView(s);
 assert.equal((svg.match(/♯/g)||[]).length,2,'One sharp in first bar, one for later new attack');
});
