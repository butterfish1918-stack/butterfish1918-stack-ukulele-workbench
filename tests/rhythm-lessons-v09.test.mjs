import test from 'node:test';
import assert from 'node:assert/strict';
import {RHYTHM_STUDIES,rhythmStudyScore,rhythmOnsets,countIn,gradeRhythmTaps,recordRhythmResult,validRhythmProgress,rhythmStudy} from '../src/rhythm-lessons.js';
import {measureBeats,timeline,usedBeats,validateScore} from '../src/score.js';

test('eight readable études are unique and have precisely two full measures in every tuning',()=>{
 assert.equal(RHYTHM_STUDIES.length,8);
 assert.equal(new Set(RHYTHM_STUDIES.map(x=>x.id)).size,8);
 for(const unit of RHYTHM_STUDIES)for(const tuning of ['highG','lowG','baritone']){
  const score=rhythmStudyScore(unit.id,tuning);
  assert.equal(validateScore(score),true);
  assert.equal(score.measures.length,2);
  assert.equal(score.meter,unit.meter);
  assert.equal(score.tempo,unit.tempo);
  for(const measure of score.measures)assert.equal(usedBeats(measure),measureBeats(unit.meter));
  assert(timeline(score).some(e=>e.type==='note'));
 }
});

test('all rhythmic attacks in each study agree with the written event timeline',()=>{
 for(const unit of RHYTHM_STUDIES){
  const score=rhythmStudyScore(unit.id);
  const expected=timeline(score).filter(ev=>ev.type==='note').map(ev=>ev.onset);
  assert.deepEqual(rhythmOnsets(score),expected);
  assert(expected.every(v=>v>=0&&v<2*measureBeats(unit.meter)));
 }
});

test('rests represent silence, including a half-beat upbeat in RT-04',()=>{
 const score=rhythmStudyScore('RT-04');
 assert.equal(score.measures[0].events[0].type,'rest');
 assert.equal(score.measures[0].events[0].duration,.5);
 assert.equal(rhythmOnsets(score)[0],.5);
});

test('simple and compound meters produce the correct count-in pulse grouping',()=>{
 assert.deepEqual(countIn(rhythmStudyScore('RT-01')),{quarterBeats:4,pulseBeats:1,pulses:4});
 assert.deepEqual(countIn(rhythmStudyScore('RT-07')),{quarterBeats:3,pulseBeats:1,pulses:3});
 assert.deepEqual(countIn(rhythmStudyScore('RT-08')),{quarterBeats:3,pulseBeats:1.5,pulses:2});
});

test('perfect in-time taps match every attack without inventing acoustic precision',()=>{
 for(const unit of RHYTHM_STUDIES){
  const score=rhythmStudyScore(unit.id);
  const taps=rhythmOnsets(score).map(beat=>beat*60000/score.tempo);
  const result=gradeRhythmTaps(score,taps);
  assert.equal(result.accuracy,100);
  assert.equal(result.extra,0);
  assert.equal(result.missed,0);
  assert.equal(result.meanErrorMs,0);
 }
});

test('late/extra taps and omissions are distinguished',()=>{
 const score=rhythmStudyScore('RT-01'),pulse=60000/score.tempo;
 const values=rhythmOnsets(score).slice(0,-1).map(beat=>beat*pulse+25);
 values.push(99999);
 const result=gradeRhythmTaps(score,values);
 assert.equal(result.matched,result.expected-1);
 assert.equal(result.missed,1);
 assert.equal(result.extra,1);
 assert(result.meanErrorMs<=26);
});

test('tap input is not mutated and bad tap/tempo data are refused',()=>{
 const score=rhythmStudyScore('RT-01'),taps=[600,0,1200];
 gradeRhythmTaps(score,taps);
 assert.deepEqual(taps,[600,0,1200]);
 assert.throws(()=>gradeRhythmTaps(score,[NaN]),/Invalid tap data/);
 assert.throws(()=>gradeRhythmTaps(score,[Infinity]),/Invalid tap data/);
 assert.throws(()=>gradeRhythmTaps(score,[],10),/Invalid tempo/);
});

test('practice record keeps best accuracy, sessions and last rating independently',()=>{
 const first=recordRhythmResult({},'RT-01',{accuracy:88});
 const second=recordRhythmResult(first,'RT-01',{accuracy:62});
 assert.deepEqual(second['RT-01'],{sessions:2,best:88,last:62});
 assert.equal(first['RT-01'].sessions,1);
 assert.equal(validRhythmProgress(second),true);
});

test('malformed practice progress is not accepted on import',()=>{
 assert.equal(validRhythmProgress(null),false);
 assert.equal(validRhythmProgress({'strange':{sessions:1,best:70,last:70}}),false);
 assert.equal(validRhythmProgress({'RT-01':{sessions:-1,best:80,last:80}}),false);
 assert.equal(validRhythmProgress({'RT-01':{sessions:1,best:110,last:80}}),false);
 assert.throws(()=>recordRhythmResult({},'RT-404',{accuracy:50}),/Unknown rhythm/);
 assert.throws(()=>rhythmStudyScore('RT-404'),/Unknown rhythm/);
});
