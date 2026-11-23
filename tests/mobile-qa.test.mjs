import test from 'node:test';
import assert from 'node:assert/strict';
import {MOBILE_QA_CASES,qaSummary,recordMobileQa} from '../src/mobile-qa.js';
test('every device check is untested until a person records physical results',()=>{
 assert.equal(qaSummary({}).untested,MOBILE_QA_CASES.length);
 const result=recordMobileQa({},'offline','fail','Airplane-mode cache issue');
 assert.equal(qaSummary(result).fail,1);
 assert.throws(()=>recordMobileQa({},'invented','pass'));
});
