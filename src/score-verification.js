/** Hard rule: instrument-specific scores are UNCONFIRMED until two genuinely
 * independent checked editions and an explicit note/rhythm audit are recorded.
 * Search results, general song credits and chord charts alone do not qualify.
 * Verified references are NOT permission to copy protected notes or lyrics.
 */
export const SCORE_VERIFICATION_RULE=Object.freeze({
 minimumIndependentSources:2,
 checkList:['correctRecording','instrumentIdentity','pitchAndHarmony','rhythmAndMeter','rangeAndFingering','measureAlignment'],
 sourceSuggestions:['musescore.com','ultimate-guitar.com','songsterr.com','guitartabs.cc','publisher-approved scores'],
 reuseRule:'Use original, public-domain, or properly authorized content only; source discovery does not confer redistribution rights.',
});
const choices=new Set(['ukulele','guitar','bass','piano','drums','vocals','strings','flute','synthesizer']);
function validUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!!u.pathname&&u.hostname.includes('.')}
 catch{return false}
}
function domain(value){return new URL(value).hostname.toLowerCase().replace(/^www\./,'')}
function checkedDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\d$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&date.getTime()<=Date.now();
}
/** This is an audit data validation gate, NOT an automated claim that a site was inspected. */
export function auditVerifiedInstrument(partId,record){
 const errors=[];
 if(!choices.has(partId))errors.push('Unknown instrument');
 if(!record||typeof record!=='object'||Array.isArray(record))return {confirmed:false,errors:['No independently checked source record']};
 if(record.instrument!==partId)errors.push('Instrument identity mismatch');
 if(record.status!=='confirmed')errors.push('Verification status is not confirmed');
 if(!checkedDate(record.checkedAt))errors.push('Missing valid checking date');
 if(typeof record.checkedBy!=='string'||record.checkedBy.trim().length<3)errors.push('Reviewer not identified');
 if(!Number.isInteger(record.measuresChecked)||record.measuresChecked<1)errors.push('No checked measures');
 if(typeof record.edition!=='string'||record.edition.trim().length<4)errors.push('Version or recording edition not identified');
 if(!record.checks||SCORE_VERIFICATION_RULE.checkList.some(key=>record.checks[key]!==true))errors.push('Independent notation and range checks incomplete');
 if(typeof record.comparisonNotes!=='string'||record.comparisonNotes.trim().length<15)errors.push('Comparison findings not documented');
 if(typeof record.reuseBasis!=='string'||!['own-authored','public-domain','licensed'].includes(record.reuseBasis))errors.push('Score reuse rights have not been assessed');
 if(!Array.isArray(record.sources)||record.sources.length<SCORE_VERIFICATION_RULE.minimumIndependentSources)errors.push('Two independent score references required');
 else{
  const valid=record.sources.filter(s=>s&&validUrl(s.url)&&typeof s.edition==='string'&&s.edition.trim().length>=3&&typeof s.part==='string'&&s.part===partId);
  if(valid.length<2||new Set(valid.map(s=>domain(s.url))).size<2)errors.push('Two distinct instrument-specific source editions required');
 }
 return {confirmed:errors.length===0,errors};
}
export function partVerificationStatus(arrangement,part){
 if(part.source?.includes('generated')||part.source?.includes('reconstructed'))return {status:'reconstructed',label:'Reconstructed practice part — original notes not confirmed'};
 const record=arrangement?.scoreVerification?.[part.id]||null;
 const audit=auditVerifiedInstrument(part.instrument,record);
 return audit.confirmed?{status:'confirmed',label:'Independently checked against two named score editions',sources:record.sources}:
  {status:'pending',label:'Instrument-specific score check pending',errors:audit.errors};
}
export function validatePublishedVerification(arrangement){
 if(!arrangement||typeof arrangement!=='object')throw Error('Invalid arrangement');
 const records=arrangement.scoreVerification;
 if(records===undefined)return true; // Pending / unverified by default.
 if(!records||typeof records!=='object'||Array.isArray(records))throw Error('Invalid score verification metadata');
 for(const [instrument,record] of Object.entries(records)){
  const result=auditVerifiedInstrument(instrument,record);
  if(!result.confirmed)throw Error('Unsubstantiated '+instrument+' score verification: '+result.errors.join('; '));
 }
 return true;
}
