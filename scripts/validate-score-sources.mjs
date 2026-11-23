/** CI gate: no published instrument part can claim independently verified
 * without actual documented edition comparisons and assessed reuse rights.
 */
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validatePublishedVerification,partVerificationStatus} from '../src/score-verification.js';
import {buildPracticeParts} from '../src/arrangement-modes.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(root,'library/catalog.json'),'utf8'));
let pending=0,reconstructed=0,confirmed=0;
for(const entry of catalog.entries){
 const song=JSON.parse(await readFile(resolve(root,'library',entry.file),'utf8'));
 validatePublishedVerification(song);
 if(!song.score)throw Error(entry.id+' has no score');
 for(const part of buildPracticeParts(song)){
  const check=partVerificationStatus(song,part);
  if(check.status==='pending')pending++;
  if(check.status==='reconstructed')reconstructed++;
  if(check.status==='confirmed')confirmed++;
  if(part.source?.includes('generated')&&check.status==='confirmed')throw Error('Generated practice score falsely claimed confirmed');
 }
}
console.log('Score verification gate: '+confirmed+' confirmed, '+pending+' pending, '+reconstructed+' reconstructed parts.');
console.log('Unverified or reconstructed scores are not certified original transcriptions.');
