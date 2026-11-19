import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNINGS,midiName} from '../src/music.js';
import {validateScore,timeline,measureBeats} from '../src/score.js';
import {TECHNIQUE_CATALOG,TECHNIQUE_LESSONS,techniqueScore,techniqueById,recordTechniquePractice,validTechniqueProgress} from '../src/technique-lessons.js';

test('ten lessons have score-based exercises; remaining outlines stay distinct',()=>{
 assert.equal(TECHNIQUE_LESSONS.length,10);
 assert.equal(Object.values(TECHNIQUE_CATALOG).flat().length,15);
 assert.equal(techniqueById('LH-04'),null);
 assert.throws(()=>techniqueScore('LH-04'),/not yet/);
});
for(const tuning of Object.keys(TUNINGS)){
 test(`all guided scores are musically valid and physically playable in ${tuning}`,()=>{
  for(const l of TECHNIQUE_LESSONS){
   const {score,steps,annotations}=techniqueScore(l.id,tuning);
   assert.doesNotThrow(()=>validateScore(score));
   const events=timeline(score);
   assert.equal(events.length,steps.length);
   assert.equal(score.tuning,tuning);
   for(let i=0;i<events.length;i++){
    const ev=events[i],step=steps[i];
    assert.equal(ev.id,`${l.id}-${i}`);
    if(step.type==='rest'){assert.equal(ev.type,'rest');assert.equal(annotations[ev.id],undefined);continue}
    if(step.type==='chord'){
      assert.equal(ev.type,'chord');
      assert.equal(ev.symbol,step.symbol);
      assert.equal(ev.stroke,step.stroke);
      assert.equal(ev.notes.length,4);
      for(let string=0;string<4;string++)assert.equal(ev.notes[string].midi,TUNINGS[tuning].midi[string]+ev.notes[string].position.fret);
      assert.equal(annotations[ev.id],step.stroke==='down'?'Π':step.stroke==='up'?'V':'simultaneous');
      continue;
    }
    assert.equal(ev.position.string,step.string);
    assert.equal(ev.position.fret,step.fret);
    assert.equal(ev.midi,TUNINGS[tuning].midi[step.string]+step.fret);
    assert.equal(ev.spelling,midiName(ev.midi).replace(/-?\d+$/,''));
    assert.equal(annotations[ev.id],`${step.right} / ${step.left}`);
   }
   for(let bar of score.measures)assert.ok(bar.events.reduce((n,e)=>n+e.duration,0)<=measureBeats(score.meter));
  }
 });
}
test('high and low G campanella studies differ by one octave on G only',()=>{
 const high=timeline(techniqueScore('RH-05','highG').score),low=timeline(techniqueScore('RH-05','lowG').score);
 assert.deepEqual(high.map(e=>e.midi),[60,64,67,69]);
 assert.deepEqual(low.map(e=>e.midi),[60,64,55,69]);
});
test('fingering annotations and event IDs are deterministic across renders',()=>{
 const a=techniqueScore('RH-03'),b=techniqueScore('RH-03');
 assert.deepEqual(a.steps,b.steps);
 assert.deepEqual(a.annotations,b.annotations);
});
test('recordTechniquePractice is immutable and stores an explicit self-reported rating',()=>{
 const original={};const first=recordTechniquePractice(original,'RH-02','learning','2026-11-19T12:00:00Z');
 assert.deepEqual(original,{});
 assert.equal(first['RH-02'].sessions,1);
 const second=recordTechniquePractice(first,'RH-02','comfortable','2026-11-19T13:00:00Z');
 assert.equal(first['RH-02'].sessions,1);
 assert.equal(second['RH-02'].sessions,2);
 assert.equal(second['RH-02'].confidence,'comfortable');
 assert.ok(validTechniqueProgress(second));
});
test('invalid rating, unknown unit, or invalid restore entries are rejected',()=>{
 assert.throws(()=>recordTechniquePractice({},'LH-04','learning'),/Unknown/);
 assert.throws(()=>recordTechniquePractice({},'RH-01','excellent'),/Invalid confidence/);
 assert.equal(validTechniqueProgress({'RH-01':{sessions:1,confidence:'learning',lastPracticed:'2026-11-19'}}),true);
 assert.equal(validTechniqueProgress({'RH-01':{sessions:-5,confidence:'learning',lastPracticed:'2026-11-19'}}),false);
 assert.equal(validTechniqueProgress({'LH-04':{sessions:1,confidence:'learning',lastPracticed:'2026-11-19'}}),false);
 assert.equal(validTechniqueProgress([]),false);
});
