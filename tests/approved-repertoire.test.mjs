import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog,validateRepertoire,importApprovedRepertoire} from '../src/song-library.js';
import {BUNDLED_LIBRARY} from '../src/library-seed.js';

const catalog=JSON.parse(readFileSync(new URL('../library/catalog.json',import.meta.url),'utf8'));

test('approved repertoire has exactly the fifteen explicitly selected titles',()=>{
 const wanted=['Isolation','Love Will Tear Us Apart','The Passenger','Passover','Spellbound',
  'A Forest','Life on Mars?','Blackbird','Space Oddity','While My Guitar Gently Weeps',
  'Wish You Were Here','Scarborough Fair',"Babe I'm Gonna Leave You",
  'Everybody Wants to Rule the World',"California Dreamin'"];
 assert.deepEqual(catalog.repertoire.map(s=>s.title),wanted);
 assert.equal(validateCatalog(catalog),true);
 assert.equal(validateRepertoire(BUNDLED_LIBRARY.catalog.repertoire),true);
 assert.deepEqual(BUNDLED_LIBRARY.catalog.repertoire,catalog.repertoire);
 assert.ok(!wanted.includes('Golden Brown'));
});

test('import copies metadata only, preserves prior songs and avoids duplicate inserts',()=>{
 const old=[{id:'own-1',title:'My composition',score:{original:true}}];
 const first=importApprovedRepertoire(catalog,old,{now:'2026-11-20T12:00:00Z'});
 assert.equal(old.length,1);
 assert.equal(first.length,16);
 assert.equal(first[0],old[0]);
 assert.equal(first[1].title,'Isolation');
 assert.equal(first[1].score,undefined);
 assert.equal(first[1].bpm,null);
 assert.match(first[1].notes,/No notation or tablature has been imported/);
 assert.equal(importApprovedRepertoire(catalog,first).length,16);
 const singles=importApprovedRepertoire(catalog,old,{ids:['blackbird']});
 assert.equal(singles.length,2);
 assert.equal(singles[1].title,'Blackbird');
});

test('repertoire rejects duplicate or malformed entries',()=>{
 for(const mutate of [
  a=>a.push({...a[0]}),
  a=>{a[0].id='../unsafe'},
  a=>{a[0].practiceFocus=''}
 ]){
  const draft=structuredClone(catalog.repertoire);
  mutate(draft);
  assert.throws(()=>validateRepertoire(draft));
 }
});
