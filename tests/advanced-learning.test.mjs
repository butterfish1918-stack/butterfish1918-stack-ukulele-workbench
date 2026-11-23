import test from 'node:test';
import assert from 'node:assert/strict';
import {arpeggioDegrees,chordInversions,harmonicFunctions,basicChordSubstitutions,nextEarTrainingQuestion} from '../src/advanced-theory.js';
import {LEARNING_UNITS,learningReview,suggestedLearningUnits,recordLearningReview} from '../src/learning-path.js';
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

test('suggested practice follows self-reported review intervals without locking advanced units',()=>{
 const now=Date.parse('2026-11-23T12:00:00Z');
 const progress={staff:{sessions:3,confidence:5,reviewedAt:'2026-11-22T12:00:00Z'},
 rhythm:{sessions:1,confidence:1,reviewedAt:'2026-11-20T12:00:00Z'}};
 const reviewed=learningReview(LEARNING_UNITS,progress,{now});
 assert.equal(reviewed.find(u=>u.id==='staff').needsReview,false);
 assert.equal(reviewed.find(u=>u.id==='rhythm').needsReview,true);
 assert.ok(LEARNING_UNITS.every(u=>u.steps.length>=3&&u.success&&u.minutes>0));
 const plan=suggestedLearningUnits(LEARNING_UNITS,progress,{now,limit:2});
 assert.equal(plan[0].id,'rhythm');
 assert.equal(plan.length,2);
 assert.ok(reviewed.some(u=>u.id==='voices'));
});
