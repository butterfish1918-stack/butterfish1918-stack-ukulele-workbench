/** Validate the on-disk public read-only song catalog before publishing. */
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCatalog,validateArrangement} from '../src/song-library.js';
import {validateScore} from '../src/score.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../library');
const load=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const catalog=await load('catalog.json');validateCatalog(catalog);
for(const e of catalog.entries){
 const arrangement=await load(e.file);
 validateArrangement(arrangement,e,validateScore);
 console.log(`PASS ${e.id} revision ${e.revision}: ${arrangement.title} (${arrangement.score.measures.length} measures)`);
}
const all=(await readdir(resolve(root,'songs'))).filter(x=>x.endsWith('.json'));
const listed=new Set(catalog.entries.map(x=>x.file.slice('songs/'.length)));
if(all.some(x=>!listed.has(x)))throw Error('Unlisted arrangement JSON exists in songs/');
console.log(`Repository validation passed: ${catalog.entries.length} arrangement(s)`);
