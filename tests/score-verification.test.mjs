import test from 'node:test';
import assert from 'node:assert/strict';
import {SCORE_VERIFICATION_RULE,auditVerifiedInstrument,partVerificationStatus,validatePublishedVerification} from '../src/score-verification.js';
const checked={instrument:'ukulele',status:'confirmed',checkedAt:'2026-11-23',checkedBy:'Music editor',measuresChecked:64,
 edition:'1980 studio recording, take 1',checks:Object.fromEntries(SCORE_VERIFICATION_RULE.checkList.map(k=>[k,true])),
 comparisonNotes:'Pitch intervals and rhythmic values checked bar by bar; playable voicing',
 reuseBasis:'licensed',
 sources:[{url:'https://musescore.com/user/100/scores/200',edition:'Score by editor A',part:'ukulele'},
 {url:'https://tabs.ultimate-guitar.com/tab/artist/song-chords-123',edition:'Score by editor B',part:'ukulele'}]};
test('hard verification rule requires independent instrument editions, exact notation and rights review',()=>{
 assert.equal(auditVerifiedInstrument('ukulele',checked).confirmed,true);
 assert.equal(auditVerifiedInstrument('ukulele',{...checked,sources:checked.sources.slice(0,1)}).confirmed,false);
 assert.equal(auditVerifiedInstrument('ukulele',{...checked,sources:[checked.sources[0],{...checked.sources[0],url:'https://musescore.com/user/101/scores/201'}]}).confirmed,false);
 assert.equal(auditVerifiedInstrument('piano',checked).confirmed,false);
 assert.equal(auditVerifiedInstrument('ukulele',{...checked,checks:{...checked.checks,rhythmAndMeter:false}}).confirmed,false);
 assert.equal(auditVerifiedInstrument('ukulele',{...checked,reuseBasis:'unspecified'}).confirmed,false);
});
test('generated parts are never portrayed as original instrumental transcriptions',()=>{
 assert.equal(partVerificationStatus({}, {id:'bass',instrument:'bass',source:'generated harmonic accompaniment'}).status,'reconstructed');
 assert.equal(partVerificationStatus({}, {id:'ukulele',instrument:'ukulele',source:'published practice score'}).status,'pending');
 assert.equal(partVerificationStatus({scoreVerification:{ukulele:checked}},{id:'ukulele',instrument:'ukulele',source:'published practice score'}).status,'confirmed');
});
test('an unverified published score is allowed but no false confirmed claim may enter the library',()=>{
 assert.equal(validatePublishedVerification({title:'Unverified score'}),true);
 assert.throws(()=>validatePublishedVerification({scoreVerification:{ukulele:{instrument:'ukulele',status:'confirmed'}}}),/Unsubstantiated/);
 assert.equal(validatePublishedVerification({scoreVerification:{ukulele:checked}}),true);
});
