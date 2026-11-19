import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNINGS,notePc} from '../src/music.js';
import {createScore,appendEvent,replaceEvent,findEvent,changeTuning,validateScore,CHORD_SHAPES,chordNotes,setSlurToNext,setArticulation,setStroke,setTieToNext,timeline,remainingBeats} from '../src/score.js';
import {renderScoreView,accidentalMarks,beamGroups} from '../src/score-view.js';
import {techniqueScore,TECHNIQUE_LESSONS} from '../src/technique-lessons.js';

const target={C:[0,4,7],F:[5,9,0],G7:[7,11,2,5],Am:[9,0,4]};
const fresh=(tuning='highG')=>createScore({title:'Chord test',tuning,meter:'4/4',sample:false});
for(const tuning of Object.keys(TUNINGS)){
 test(`chord templates in ${tuning} match all chord tones and string frets`,()=>{
  for(const [symbol,shapes] of Object.entries(CHORD_SHAPES)){
   const notes=chordNotes(symbol,tuning);
   assert.deepEqual(notes.map(n=>n.position.fret),shapes[tuning]);
   assert.ok(target[symbol].every(pc=>notes.some(n=>notePc(n.spelling)===pc)));
   assert.equal(new Set(notes.map(n=>n.position.string)).size,4);
   const score=fresh(tuning);
   appendEvent(score,{type:'chord',symbol,stroke:'down',duration:1});
   assert.ok(validateScore(score));
   assert.equal(timeline(score).length,1);
  }
 });
}
test('chord stack appears simultaneously in notation and on all four tab lines',()=>{
 const score=fresh(); const chord=appendEvent(score,{type:'chord',symbol:'G7',stroke:'up',duration:2});
 const html=renderScoreView(score,{mode:'dual',selectedEventId:chord.id});
 assert.match(html,/score-chord-name/);assert.match(html,/score-strum/);
 assert.match(html,/OPTIONAL TAB/);assert.match(html,/aria-label="G7 chord on four ukulele strings"/);
 assert.match(html,/>V<\/text>/);assert.equal((html.match(/score-event selected/g)||[]).length,2);
 assert.doesNotMatch(renderScoreView(score,{mode:'notation'}),/OPTIONAL TAB/);
});
test('chord changes can fill two measures while preserving correct onsets',()=>{
 const score=fresh();for(const symbol of ['C','F','G7','C'])appendEvent(score,{type:'chord',symbol,stroke:'down',duration:2});
 assert.deepEqual(timeline(score).map(e=>e.onset),[0,2,4,6]);
 assert.equal(remainingBeats(score),0);
 assert.ok(validateScore(score));
});
test('changing tuning rebuilds chord pitch/frets atomically, does not alter label or beat duration',()=>{
 const score=fresh('highG');const e=appendEvent(score,{type:'chord',symbol:'C',stroke:'up',duration:2});
 const old=structuredClone(findEvent(score,e.id).event);
 changeTuning(score,'baritone');let now=findEvent(score,e.id).event;
 assert.deepEqual(now.notes.map(n=>n.position.fret),[2,0,1,0]);
 assert.notDeepEqual(now.notes.map(n=>n.midi),old.notes.map(n=>n.midi));
 assert.equal(now.stroke,'up');assert.equal(now.duration,2);
 assert.ok(validateScore(score));
});
test('chord input and unsafe edits are rejected without rewriting score',()=>{
 const score=fresh();const ev=appendEvent(score,{type:'chord',symbol:'Am',duration:1,stroke:'down'});
 const snapshot=structuredClone(score);
 assert.throws(()=>appendEvent(score,{type:'chord',symbol:'H7',duration:1}),/Unsupported chord/);
 assert.deepEqual(score,snapshot);
 assert.throws(()=>replaceEvent(score,ev.id,{type:'chord',symbol:'C',stroke:'other',duration:1}),/Unsupported stroke/);
 assert.deepEqual(score,snapshot);
 assert.throws(()=>setTieToNext(score,ev.id,true),/Select a note/);
 assert.deepEqual(score,snapshot);
});
test('score edits can replace a melody note with a chord and back, undo snapshots stay valid',()=>{
 const score=fresh();const ev=appendEvent(score,{type:'note',midi:60,duration:1});
 const before=structuredClone(score);
 replaceEvent(score,ev.id,{type:'chord',symbol:'F',stroke:'down',duration:1,articulation:'accent'});
 assert.equal(findEvent(score,ev.id).event.type,'chord');assert.equal(findEvent(before,ev.id).event.type,'note');
 replaceEvent(score,ev.id,{type:'note',midi:64,duration:1});
 assert.equal(findEvent(score,ev.id).event.midi,64);assert.ok(validateScore(score));
});
test('slur connects distinct adjacent notes without converting them into a sustained tie',()=>{
 const score=fresh();const a=appendEvent(score,{midi:60,duration:1}),b=appendEvent(score,{midi:62,duration:1});
 assert.throws(()=>setTieToNext(score,a.id,true),/identical adjacent/);
 setSlurToNext(score,a.id,true);
 assert.equal(findEvent(score,a.id).event.slurToNext,true);
 assert.match(renderScoreView(score),/class="score-slur"/);
 assert.equal(timeline(score).filter(ev=>ev.type==='note').length,2);
 setSlurToNext(score,a.id,false);
 assert.doesNotMatch(renderScoreView(score),/class="score-slur"/);
 assert.ok(validateScore(score));
});
test('articulation and stroke are validated and appear in score glyphs',()=>{
 const score=fresh();const a=appendEvent(score,{midi:60,duration:1}),c=appendEvent(score,{type:'chord',symbol:'C',duration:1});
 setArticulation(score,a.id,'staccato');setArticulation(score,c.id,'accent');setStroke(score,c.id,'up');
 assert.equal(findEvent(score,a.id).event.articulation,'staccato');
 assert.equal(findEvent(score,c.id).event.stroke,'up');
 assert.match(renderScoreView(score),/score-articulation/);
 assert.throws(()=>setArticulation(score,a.id,'legatissimo'),/Unsupported articulation/);
 assert.throws(()=>setStroke(score,a.id,'down'),/Select a chord/);
 assert.ok(validateScore(score));
});
test('new technique studies render without corrupting time, including chord and slur events',()=>{
 assert.equal(TECHNIQUE_LESSONS.length,10);
 for(const tuning of Object.keys(TUNINGS))for(const id of ['LH-03','RH-04','MU-02']){
  const {score,steps}=techniqueScore(id,tuning);
  assert.ok(validateScore(score));assert.ok(steps.length>=4);
  const html=renderScoreView(score,{mode:'dual'});
  assert.match(html,/OPTIONAL TAB/);
  if(id==='MU-02')assert.match(html,/score-slur/);
  else assert.match(html,/score-chord-name/);
 }
});
