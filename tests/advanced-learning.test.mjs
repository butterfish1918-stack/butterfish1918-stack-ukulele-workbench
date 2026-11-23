import test from 'node:test';
import assert from 'node:assert/strict';
import {arpeggioDegrees,chordInversions,harmonicFunctions,basicChordSubstitutions,nextEarTrainingQuestion} from '../src/advanced-theory.js';
import {LEARNING_UNITS,learningReview,recordLearningReview} from '../src/learning-path.js';
test('chord inversions and arpeggio notes preserve harmony',()=>{
 assert.deepEqual(chordInversions([60,64,67]),[[60,64,67],[64,67,72],[67,72,76]]);
 assert.deepEqual(arpeggioDegrees([60,64,67]),[60,64,67,64]);
 assert.equal(harmonicFunctions(5),'dominant');
 assert.deepEqual(basicChordSubstitutions(5),[7]);
 assert.equal(nextEarTrainingQuestion(0).intervalSemitones,0);
});
test('advanced guided studies remain accessible without artificial gates',()=>{
 const record=recordLearningReview({},'campanella',4);
 assert.equal(learningReview(LEARNING_UNITS,record).find(x=>x.id==='campanella').sessions,1);
 assert.ok(LEARNING_UNITS.find(x=>x.id==='voices'));
 assert.throws(()=>recordLearningReview({},'unlisted',2));
});
