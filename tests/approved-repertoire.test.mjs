import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalog,validateRepertoire,validateArrangement,importApprovedRepertoire} from '../src/song-library.js';
import {validateScore} from '../src/score.js';
import {BUNDLED_LIBRARY} from '../src/library-seed.js';

const catalog=JSON.parse(readFileSync(new URL('../library/catalog.json',import.meta.url),'utf8'));

test('approved repertoire has exactly the fifteen explicitly selected titles',()=>{
 const wanted=['Isolation','Love Will Tear Us Apart','The Passenger','Passover','Spellbound',
  'A Forest','Life on Mars?','Blackbird','Space Oddity','While My Guitar Gently Weeps',
  'Wish You Were Here','Scarborough Fair',"Babe I'm Gonna Leave You",
  'Everybody Wants to Rule the World',"California Dreamin'"];
 assert.deepEqual(catalog.repertoire.map(s=>s.title),wanted);
 assert.equal(validateCatalog(catalog),true);
 assert.equal(catalog.entries.length,18);
 for(const meta of catalog.entries){
  const file=JSON.parse(readFileSync(new URL('../library/'+meta.file,import.meta.url),'utf8'));
  assert.equal(validateArrangement(file,meta,validateScore),true);
  if(catalog.repertoire.some(x=>x.id===meta.id)){
   assert.equal(file.score.measures.length,16);
   assert.match(file.description,/Not a transcription/);
  }
 }
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
  a=>{a[0].practiceFocus=''},
  a=>{a[0].preferredArrangementId='../invalid'}
 ]){
  const draft=structuredClone(catalog.repertoire);
  mutate(draft);
  assert.throws(()=>validateRepertoire(draft));
 }
});

test('1882 Northumbrian traditional tune is complete, exact and independently fingered',()=>{
 const item=catalog.entries.find(x=>x.id==='scarborough-fair-traditional-1882');
 const score=JSON.parse(readFileSync(new URL('../library/'+item.file,import.meta.url),'utf8'));
 assert.equal(validateArrangement(score,item,validateScore),true);
 assert.equal(score.score.measures.length,32);
 assert.equal(score.score.meter,'6/8');
 assert.equal(score.tonalCenter,'E minor');
 assert.equal(catalog.repertoire.find(x=>x.id==='scarborough-fair').preferredArrangementId,item.id);
 const melody=[
  [64,64,67,69,71],[69,71,69,66],[64,66,64,67,69,71],
  [71,72,69,71,76],[76,71,71,69,67],[69,71,74,66,64,62],
  [64,64,67,69,71],[69,66,67,64]
 ];
 const durations=[
  [1,.5,.5,.5,.5],[.5,.5,.5,1.5],[.5,.5,.5,.5,.5,.5],
  [.5,.5,.5,1,.5],[1,.5,.5,.5,.5],[.5,.5,.5,.5,.5,.5],
  [1,.5,.5,.5,.5],[.5,.5,.5,1.5]
 ];
 for(let verse=0;verse<3;verse++) for(let bar=0;bar<8;bar++){
  const events=score.score.measures[4+verse*8+bar].events;
  assert.deepEqual(events.map(e=>e.midi),melody[bar]);
  assert.deepEqual(events.map(e=>e.duration),durations[bar]);
  assert.ok(events.every(e=>e.position&&Number.isInteger(e.position.fret)));
 }
 assert.match(score.notes,/Bruce & Stokoe/);
 assert.match(score.description,/NOT the Simon & Garfunkel/);
});
