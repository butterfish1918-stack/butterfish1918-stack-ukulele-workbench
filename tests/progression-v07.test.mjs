import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProgression,validateProgression,editProgression,buildProgressionScore,progressionChords,PROGRESSION_LIMIT} from '../src/progression.js';
import {changeTuning,validateScore,timeline,KEY_SIGNATURES} from '../src/score.js';
import {TUNINGS,harmonizedChords,mod} from '../src/music.js';

test('Default progression is C I-IV-V-I in four complete measures',()=>{
 const p=createProgression(),score=buildProgressionScore(p);
 assert.equal(p.steps.map(x=>x.degree).join(','),'0,3,4,0');
 assert.deepEqual(score.measures.map(x=>x.events.length),[1,1,1,1]);
 assert.equal(score.meter,'4/4');assert.equal(timeline(score).at(-1).onset,12);
 assert.deepEqual(score.measures.map(m=>m.events[0].symbol),['C','F','G','C']);
});
test('Progression add/remove/move and stroke preserve original immutably',()=>{
 const a=createProgression({preset:false}),b=editProgression(a,'add',{degree:6,extension:4});
 assert.equal(a.steps.length,0);assert.equal(b.steps[0].degree,6);
 const c=editProgression(b,'add',{degree:0});const d=editProgression(c,'move',-1,1);
 assert.deepEqual(d.steps.map(x=>x.degree),[0,6]);
 const e=editProgression(d,'stroke','up',0);
 assert.equal(buildProgressionScore(e).measures[0].events[0].stroke,'up');
 assert.equal(editProgression(e,'remove',null,1).steps.length,1);
 assert.equal(c.steps[0].stroke,'down');
});
test('All major-key diatonic triads and sevenths have valid tuned chord events',()=>{
 for(const root of Object.keys(KEY_SIGNATURES))for(const tuning of Object.keys(TUNINGS))for(const extension of [3,4])for(let degree=0;degree<7;degree++){
  const a=createProgression({root,tuning,preset:false});const p=editProgression(a,'add',{degree,extension});
  const score=buildProgressionScore(p),ev=score.measures[0].events[0];
  assert.equal(validateScore(score),true);
  assert.equal(ev.symbol,harmonizedChords(root,'major',extension)[degree].name);
  assert.ok([3,4].includes(ev.notes.length));
  for(const n of ev.notes){assert.equal(n.midi,TUNINGS[tuning].midi[n.position.string]+n.position.fret);assert.ok(n.position.fret<=9);}
 }
});
test('Written chord spellings are independent of sounding pitch, including flat keys',()=>{
 const score=buildProgressionScore(createProgression({root:'Bb',preset:true}));
 assert.equal(score.measures[0].events[0].symbol,'Bb');
 assert.ok(score.measures[0].events[0].notes.some(n=>n.spelling==='Bb'));
 assert.equal(score.key,'Bb');
});
test('Changing a generated score tuning recalculates physical voicings',()=>{
 const p=createProgression();const s=buildProgressionScore(p),g=s.measures[0].events[0].notes.map(n=>n.position.fret);
 changeTuning(s,'baritone');assert.equal(validateScore(s),true);
 const b=s.measures[0].events[0].notes.map(n=>n.position.fret);
 assert.notDeepEqual(g,b);assert.equal(s.tuning,'baritone');
});
test('Progression fields are validated, with no partial mutation',()=>{
 const p=createProgression({preset:false});
 for(const change of [{degree:10},{degree:-1},{degree:1,extension:5}])assert.throws(()=>editProgression(p,'add',change));
 assert.throws(()=>editProgression(p,'property',20,'tempo'));
 assert.throws(()=>editProgression(p,'property','Bb','badField'));
 assert.throws(()=>editProgression(p,'move',1,0));
 assert.equal(p.steps.length,0);
});
test('Progressions cap length, reject malformed saves and preserve original',()=>{
 let p=createProgression({preset:false});for(let i=0;i<PROGRESSION_LIMIT;i++)p=editProgression(p,'add',{degree:i%7});
 assert.equal(p.steps.length,16);assert.throws(()=>editProgression(p,'add',{degree:1}));
 assert.throws(()=>validateProgression({...p,steps:[{degree:99,extension:3,stroke:'down'}]}));
 assert.throws(()=>validateProgression({...p,steps:[{degree:0,extension:3,stroke:'up',notes:[{midi:999}]}],root:'H'}));
});
test('Generated chord sound and staff/tab event use identical underlying pitches',()=>{
 const p=createProgression({root:'F#',tuning:'lowG'});const notes=progressionChords(p);const score=buildProgressionScore(p);
 notes.forEach((step,i)=>{const ev=score.measures[i].events[0];assert.deepEqual(ev.notes.map(n=>n.midi),step.midis.filter(x=>x!==null));assert.deepEqual(ev.notes.map(n=>n.position.fret),step.frets.filter(x=>x>=0));});
});
test('Missing or malformed custom voicings cannot be loaded into saved scores',()=>{
 const score=buildProgressionScore(createProgression());score.measures[0].events[0].notes[0].midi=99;
 assert.throws(()=>validateScore(score));
});
