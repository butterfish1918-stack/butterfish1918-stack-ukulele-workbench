import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCustomTuning,capoAdjustedMidi,leftHandedX,parseCustomTuning} from '../src/instrument-settings.js';
test('custom tunings are four real sounding pitches',()=>{
 assert.deepEqual(parseCustomTuning('67,60,64,69'),[67,60,64,69]);
 assert.throws(()=>parseCustomTuning('70 60 50'));
 assert.equal(capoAdjustedMidi(60,2),62);
 assert.throws(()=>capoAdjustedMidi(60,15));
});
test('left-handed mirror changes coordinates, not sounding pitch',()=>{
 assert.equal(leftHandedX(70,{leftHanded:true}),682);
 assert.equal(leftHandedX(180,{leftHanded:false}),180);
});
