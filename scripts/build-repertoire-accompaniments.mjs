/** Regenerate fourteen song-specific high-G accompaniment arrangements.
 * Usage: node scripts/build-repertoire-accompaniments.mjs [--check]
 * --check verifies all files without modifying the repository.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {notePc} from '../src/music.js';
import {generatedChordNotes,validateScore} from '../src/score.js';
import {validateArrangement} from '../src/song-library.js';
import {buildAccompaniment} from '../src/repertoire-arranger.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=async rel=>JSON.parse(await readFile(resolve(root,rel),'utf8'));
const plans=await load('library/arrangement-blueprints.json');
const catalog=await load('library/catalog.json');
const check=process.argv.includes('--check');
let built=0;
for(const track of plans.tracks){
 const meta=catalog.repertoire.find(x=>x.id===track.id);
 if(!meta)throw Error('Approved song not found: '+track.id);
 const {arrangement,entry}=buildAccompaniment({...track,title:meta.title,artist:meta.artist},
  {notePc,generatedChordNotes,validateScore,validateArrangement});
 const path='library/'+entry.file;
 if(check){
  const existing=await load(path);
  if(JSON.stringify(existing)!==JSON.stringify(arrangement))throw Error('Out of date: '+path);
  const listing=catalog.entries.find(x=>x.id===track.id);
  if(!listing||JSON.stringify(listing)!==JSON.stringify(entry))
   throw Error('Catalog mismatch: '+track.id);
 }else await writeFile(resolve(root,path),JSON.stringify(arrangement)+'\n','utf8');
 console.log((check?'CHECK ':'BUILT ')+track.id+' ('+arrangement.score.measures.length+' bars)');
 built++;
}
console.log((check?'Verified ':'Generated ')+built+' song-specific high-G accompaniments.');
