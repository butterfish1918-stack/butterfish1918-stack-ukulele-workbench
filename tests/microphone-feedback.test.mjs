import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchPracticeFeedback,onsetPracticeFeedback} from '../src/microphone-feedback.js';
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
