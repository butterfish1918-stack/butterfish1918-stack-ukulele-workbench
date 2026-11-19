import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProgression,validateProgression,editProgression,applyRhythmPreset,progressionKeys,progressionChords,progressionPlacement,progressionKeySignature,buildProgressionScore,RHYTHM_PRESETS,PROGRESSION_LIMIT} from '../src/progression.js';
import {KEY_SIGNATURES,validateScore,timeline,measureBeats} from '../src/score.js';
import {TUNINGS,harmonizedChords} from '../src/music.js';

test('v0.7 legacy progressions and their exact four-bar rhythm remain readable',()=>{
 const legacy={schema:1,title:'Legacy',root:'C',tuning:'highG',tempo:80,steps:[0,3,4,0].map(degree=>({degree,extension:3,stroke:'down'}))};
 assert.equal(validateProgression(legacy),true);
 const score=buildProgressionScore(legacy);
 assert.deepEqual(score.measures.map(m=>m.events.length),[1,1,1,1]);
 assert.deepEqual(timeline(score).map(e=>e.onset),[0,4,8,12]);
 assert.equal(legacy.mode,undefined);assert.equal(legacy.meter,undefined);
});

test('Four attacks can fit one measure and retain distinct onsets and strum strokes',()=>{
 let p=createProgression({preset:false});
 for(const [degree,stroke] of [[0,'down'],[3,'up'],[4,'down'],[0,'up']])p=editProgression(p,'add',{degree,duration:1,stroke});
 const score=buildProgressionScore(p),seq=timeline(score);
 assert.equal(score.measures.length,1);assert.equal(seq.length,4);
 assert.deepEqual(seq.map(e=>e.onset),[0,1,2,3]);
 assert.deepEqual(seq.map(e=>e.stroke),['down','up','down','up']);
 assert.deepEqual(progressionChords(p).map(s=>[s.measureIndex,s.beat]),[[0,0],[0,1],[0,2],[0,3]]);
});

test('When a chord cannot fit, the remaining beat becomes an explicit rest',()=>{
 let p=createProgression({preset:false});p=editProgression(p,'add',{degree:0,duration:3});p=editProgression(p,'add',{degree:4,duration:2});
 const score=buildProgressionScore(p),seq=timeline(score);
 assert.equal(score.measures.length,2);
 assert.deepEqual(seq.map(e=>[e.type,e.duration,e.onset]),[['chord',3,0],['rest',1,3],['chord',2,4]]);
 assert.equal(score.measures[0].events.map(e=>e.duration).reduce((a,b)=>a+b),4);
});

test('Rhythm preset expands one chord to multiple notated onsets with identical harmony',()=>{
 const original=createProgression();const p=applyRhythmPreset(original,'island',1);
 assert.equal(original.steps.length,4);assert.equal(p.steps.length,8);
 const events=timeline(buildProgressionScore(p)).filter(e=>e.type==='chord');
 const segment=events.slice(1,6);
 assert.deepEqual(segment.map(e=>[e.duration,e.onset,e.stroke]),[[1,4,'down'],[.5,5,'down'],[.5,5.5,'up'],[1,6,'up'],[1,7,'down']]);
 assert.ok(segment.every(e=>e.symbol==='F'));
 assert.equal(validateScore(buildProgressionScore(p)),true);
});

test('Meter-aware presets support 3/4 waltz and 6/8 compound grouping',()=>{
 for(const [meter,preset,expected] of [['3/4','waltz',[1,1,1]],['6/8','compound',[1.5,.75,.75]]]){
  let p=createProgression({meter,preset:true});assert.equal(buildProgressionScore(p).meter,meter);
  p=applyRhythmPreset(p,preset,0);
  const score=buildProgressionScore(p);assert.deepEqual(score.measures[0].events.map(e=>e.duration),expected);
  assert.equal(score.measures[0].events.reduce((sum,e)=>sum+e.duration,0),measureBeats(meter));
 }
});

test('Rhythm transformations are immutable and fail atomically on wrong meter or partial bar',()=>{
 const p=createProgression();
 assert.throws(()=>applyRhythmPreset(p,'waltz',0));
 let q=editProgression(p,'duration',2,0);
 assert.throws(()=>applyRhythmPreset(q,'island',0));
 assert.equal(p.steps[0].duration,4);assert.equal(q.steps[0].duration,2);
 assert.throws(()=>editProgression(q,'property','6/8','meter'));
 assert.deepEqual(q.steps[0],{degree:0,extension:3,stroke:'down',duration:2});
});

test('Changing mode chooses the relative minor and maps back to its correct signature',()=>{
 let p=createProgression({root:'Bb'});
 p=editProgression(p,'property','naturalMinor','mode');
 assert.equal(p.root,'G');assert.equal(progressionKeySignature(p),'Bb');
 p=editProgression(p,'property','harmonicMinor','mode');assert.equal(p.root,'G');
 p=editProgression(p,'property','major','mode');assert.equal(p.root,'Bb');
 assert.equal(buildProgressionScore(p).key,'Bb');
});

test('A minor natural vs harmonic minor uses different diatonic dominant, same key signature',()=>{
 const natural=createProgression({root:'A',mode:'naturalMinor'});
 const raised=createProgression({root:'A',mode:'harmonicMinor'});
 assert.equal(buildProgressionScore(natural).key,'C');assert.equal(buildProgressionScore(raised).key,'C');
 const n=progressionChords(editProgression(createProgression({root:'A',mode:'naturalMinor',preset:false}),'add',{degree:4}))[0];
 const h=progressionChords(editProgression(createProgression({root:'A',mode:'harmonicMinor',preset:false}),'add',{degree:4}))[0];
 assert.equal(n.name,'Em');assert.equal(h.name,'E');assert.notDeepEqual(n.notes,h.notes);
});

test('Every conventional minor key and both minor scale forms yield playable triads and sevenths in all tunings',()=>{
 let cases=0;
 for(const mode of ['naturalMinor','harmonicMinor'])for(const root of progressionKeys(mode))for(const tuning of Object.keys(TUNINGS))for(const extension of [3,4])for(let degree=0;degree<7;degree++){
  const p=editProgression(createProgression({mode,root,tuning,preset:false}),'add',{degree,extension});
  const score=buildProgressionScore(p),event=score.measures[0].events[0];
  assert.equal(score.key,progressionKeySignature(p));assert.equal(validateScore(score),true);
  assert.equal(event.symbol,harmonizedChords(root,mode,extension)[degree].name);
  for(const n of event.notes)assert.equal(n.midi,TUNINGS[tuning].midi[n.position.string]+n.position.fret);
  cases++;
 }
 assert.equal(cases,1260);
});

test('Changing meter keeps whole-bar harmony but does not rewrite a custom rhythm',()=>{
 const p=createProgression(),q=editProgression(p,'property','6/8','meter');
 assert.equal(q.meter,'6/8');assert.deepEqual(q.steps.map(x=>x.duration),[3,3,3,3]);
 assert.equal(buildProgressionScore(q).measures.length,4);
 assert.deepEqual(p.steps.map(x=>x.duration),[4,4,4,4]);
 const patterned=applyRhythmPreset(p,'island',0);
 assert.throws(()=>editProgression(patterned,'property','3/4','meter'));
});

test('Invalid duration, invalid mode and too many chord attacks are rejected without mutating inputs',()=>{
 const p=createProgression({preset:false});
 for(const duration of [0,.1,7,8,'1'])assert.throws(()=>editProgression(p,'add',{degree:1,duration}));
 assert.throws(()=>editProgression(p,'property','jazz','mode'));
 assert.throws(()=>createProgression({root:'H',mode:'naturalMinor'}));
 assert.equal(p.steps.length,0);
 let q=p;for(let i=0;i<PROGRESSION_LIMIT;i++)q=editProgression(q,'add',{degree:i%7,duration:1});
 assert.throws(()=>editProgression(q,'add',{degree:0,duration:1}));
});
