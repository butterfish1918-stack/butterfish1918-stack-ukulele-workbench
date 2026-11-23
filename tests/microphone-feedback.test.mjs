import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchPracticeFeedback,onsetPracticeFeedback,stablePitchFeedback} from '../src/microphone-feedback.js';
test('monophonic microphone feedback uses cents rather than exact floating frequency',()=>{
 assert.equal(pitchPracticeFeedback(69,440).correct,true);
 assert.equal(pitchPracticeFeedback(69,466).direction,'sharp');
 assert.equal(pitchPracticeFeedback(69,415).direction,'flat');
 assert.equal(pitchPracticeFeedback(69,0).detected,false);
});
test('uncalibrated onset feedback is labelled approximate',()=>{
 const r=onsetPracticeFeedback(1000,1100);
 assert.equal(r.withinTolerance,true);
 assert.equal(r.calibrated,false);
 assert.equal(onsetPracticeFeedback(1000,1300).direction,'late');
});

test('unstable, quiet and stable microphone data cannot be confused with correct notes',()=>{
 assert.equal(stablePitchFeedback(69,[]).status,'listening');
 assert.equal(stablePitchFeedback(69,[{hz:440,confidence:.45},{hz:440,confidence:.4}]).stable,false);
 const stable=[439.7,440.2,440.4,439.9].map(hz=>({hz,confidence:.94}));
 const result=stablePitchFeedback(69,stable);
 assert.equal(result.status,'stable');assert.equal(result.correct,true);
 assert.equal(result.readings,4);
 const wandering=[440,460,441,463].map(hz=>({hz,confidence:.91}));
 assert.equal(stablePitchFeedback(69,wandering).status,'unstable');
 const wrong=[466,466.2,466.1,466.4].map(hz=>({hz,confidence:.91}));
 assert.equal(stablePitchFeedback(69,wrong).status,'stable');
 assert.equal(stablePitchFeedback(69,wrong).correct,false);
});
