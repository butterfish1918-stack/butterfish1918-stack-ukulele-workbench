import test from 'node:test';
import assert from 'node:assert/strict';
import {KEY_SEQUENCE,READING_STUDIES,keyQuestion,relativeMinor,sightStudyScore,sightEvent,sightChoices,gradeSightNote,recordReadingProgress,validReadingProgress,writtenName,writtenOctave} from '../src/reading-lessons.js';
import {KEY_SIGNATURES,validateScore,timeline} from '../src/score.js';
import {TUNINGS,mod,notePc,spelledScale} from '../src/music.js';

const tunings=Object.keys(TUNINGS);
test('all 15 conventional signatures are practiced without duplicate keys',()=>{
 assert.equal(KEY_SEQUENCE.length,15);
 assert.equal(new Set(KEY_SEQUENCE).size,15);
 assert.deepEqual(new Set(KEY_SEQUENCE),new Set(Object.keys(KEY_SIGNATURES)));
 for(let i=0;i<15;i++){
  const q=keyQuestion(i);
  assert.equal(q.key,KEY_SEQUENCE[i]);assert.equal(q.accidentals,KEY_SIGNATURES[q.key]);
  assert.equal(q.correct,q.key);assert.equal(q.choices.length,4);
  assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.correct));
 }
});
test('relative-minor mode uses correct key signature and proper spelling',()=>{
 assert.equal(relativeMinor('C'),'A');assert.equal(relativeMinor('G'),'E');
 assert.equal(relativeMinor('Bb'),'G');assert.equal(relativeMinor('C#'),'A#');
 assert.equal(relativeMinor('Cb'),'Ab');
 for(let i=0;i<15;i++){const q=keyQuestion(i,'relativeMinor');
  assert.equal(q.correct,relativeMinor(q.key));assert.equal(q.choices.length,4);
  assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.correct));
 }
});
test('bad lesson indices, signatures and mode are rejected',()=>{
 for(const fn of [()=>keyQuestion(-1),()=>keyQuestion(1.5),()=>keyQuestion(0,'banana'),()=>relativeMinor('Z'),()=>sightStudyScore('NOPE')])assert.throws(fn);
});
test('all 8 notation-first études are complete, playable, and use accurate written pitches in three tunings',()=>{
 assert.equal(READING_STUDIES.length,8);
 for(const lesson of READING_STUDIES){for(const tuning of tunings){
  const score=sightStudyScore(lesson.id,tuning);
  assert.equal(score.key,lesson.key);assert.equal(score.meter,'4/4');assert.equal(score.tuning,tuning);
  assert.equal(score.measures.length,2);assert.ok(validateScore(score));
  const events=timeline(score);assert.equal(events.length,8);
  const scale=spelledScale(lesson.key,'major');
  events.forEach((e,i)=>{
   assert.equal(e.type,'note');assert.equal(e.duration,1);assert.equal(e.spelling,scale[lesson.degrees[i]].name);
   assert.equal(notePc(e.spelling),mod(e.midi,12));
   assert.equal(e.midi,TUNINGS[tuning].midi[e.position.string]+e.position.fret);
   assert.ok(e.position.fret>=0&&e.position.fret<=12);
   assert.ok(writtenName(e.midi,e.spelling).endsWith(String(writtenOctave(e.midi,e.spelling))));
  });
 } }
});
test('writing octave respects enharmonic boundary: B#3 sounds C4, Cb4 sounds B3',()=>{
 assert.equal(writtenName(60,'B#'),'B#3');assert.equal(writtenName(59,'Cb'),'Cb4');
 assert.equal(writtenName(68,'G#'),'G#4');
 assert.throws(()=>writtenName(60,'D'));
});
test('sight-reading choices are unique and graded by written name and octave, not mere pitch class',()=>{
 for(const lesson of READING_STUDIES){const score=sightStudyScore(lesson.id);
  for(let i=0;i<8;i++){
   const {choices,correct}=sightChoices(score,i);
   assert.equal(choices.length,4);assert.equal(new Set(choices).size,4);assert.ok(choices.includes(correct));
   assert.deepEqual(gradeSightNote(score,i,correct),{correct,passed:true});
   const wrong=choices.find(x=>x!==correct);
   assert.equal(gradeSightNote(score,i,wrong).passed,false);
   assert.throws(()=>gradeSightNote(score,i,'NOT A PITCH'));
  }
 }
 assert.equal(sightEvent(sightStudyScore('SR-01'),9),null);
});
test('reading progress is immutable, counted, capped, validated and backup-compatible',()=>{
 const old={};const newer=recordReadingProgress(old,'keys-major',true);
 assert.deepEqual(old,{});assert.deepEqual(newer['keys-major'],{attempts:1,correct:1});
 const next=recordReadingProgress(newer,'SR-01',false);
 assert.deepEqual(next['SR-01'],{attempts:1,correct:0});assert.equal('SR-01' in newer,false);
 assert.ok(validReadingProgress({}));assert.ok(validReadingProgress(next));
 assert.ok(!validReadingProgress({'NO-LESSON':{attempts:1,correct:1}}));
 assert.ok(!validReadingProgress({'SR-01':{attempts:1,correct:2}}));
 assert.ok(!validReadingProgress({'SR-01':{attempts:-1,correct:0}}));
 assert.ok(!validReadingProgress([]));
 assert.throws(()=>recordReadingProgress({},'NO-LESSON',true));
});
test('two different tuning editions retain the same named scale degrees',()=>{
 for(const lesson of READING_STUDIES){
  const a=timeline(sightStudyScore(lesson.id,'highG'));
  const b=timeline(sightStudyScore(lesson.id,'lowG'));
  const c=timeline(sightStudyScore(lesson.id,'baritone'));
  assert.deepEqual(a.map(x=>x.spelling),b.map(x=>x.spelling));
  assert.deepEqual(a.map(x=>x.spelling),c.map(x=>x.spelling));
 }
});
