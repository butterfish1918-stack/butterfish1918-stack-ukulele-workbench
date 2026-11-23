import test from 'node:test';
import assert from 'node:assert/strict';
import {attachApprovedRepertoireScores} from '../src/repertoire-migration.js';

const missing='No notation or tablature has been imported. Add your own transcription or an appropriately licensed score in Score Studio.';
function fixture(){
 const score={schema:1,measures:[{events:[{type:'note',midi:60,duration:1}]}],tempo:140};
 return {catalogUrl:'./library/catalog.json',catalog:{repertoire:[{id:'blackbird',title:'Blackbird'},{id:'scarborough-fair',preferredArrangementId:'scarborough-fair-traditional-1882'}]},songs:{
  blackbird:{id:'blackbird',revision:2,key:'G',bpm:140,body:'[G] [C]',notes:'Fingerstyle.',score},
  'scarborough-fair-traditional-1882':{id:'scarborough-fair-traditional-1882',revision:1,key:'Em',bpm:88,body:'[Em]',notes:'Historical tune.',score}
 }};
}
test('upgrades exact legacy metadata entry while retaining edits, local ID and practice notes',()=>{
 const snapshot=fixture(),original=[{id:'repertoire-blackbird',title:'Blackbird',artist:'The Beatles',repertoireOrigin:{id:'blackbird'},key:'C',bpm:86,body:'',notes:'Practice focus: fingerstyle\n'+missing+'\nMy annotation'}];
 const {songs,upgraded}=attachApprovedRepertoireScores(snapshot,original,{ids:['blackbird'],now:'2026-11-23'});
 assert.equal(upgraded,1);
 assert.equal(songs[0].id,original[0].id);
 assert.equal(songs[0].key,'C');
 assert.equal(songs[0].bpm,86);
 assert.equal(songs[0].body,'[G] [C]');
 assert.ok(songs[0].notes.includes('My annotation'));
 assert.ok(songs[0].notes.includes('Fingerstyle.'));
 assert.ok(!songs[0].notes.includes(missing));
 assert.equal(songs[0].repositoryOrigin.id,'blackbird');
 assert.deepEqual(songs[0].score,snapshot.songs.blackbird.score);
 assert.notEqual(songs[0].score,snapshot.songs.blackbird.score);
 assert.equal(original[0].score,undefined);
 const repeated=attachApprovedRepertoireScores(snapshot,songs,{ids:['blackbird']});
 assert.equal(repeated.upgraded,0);
 assert.equal(repeated.songs,songs);
});
test('does not touch personal compositions, existing scores, or unretrieved repertoire',()=>{
 const snapshot=fixture();
 const original=[{id:'my-blackbird',title:'Blackbird',notes:'My song'}, {id:'repertoire-blackbird',repertoireOrigin:{id:'blackbird'},score:{my:'score'},notes:'edit'}, {id:'repertoire-other',repertoireOrigin:{id:'other'}}];
 const out=attachApprovedRepertoireScores(snapshot,original);
 assert.equal(out.upgraded,0);
 assert.equal(out.songs,original);
});
test('keeps user-written chord sketches and follows preferred historical arrangement',()=>{
 const snapshot=fixture();
 const original=[{id:'repertoire-scarborough-fair',repertoireOrigin:{id:'scarborough-fair'},body:'[Am] My own chords',notes:'Custom',key:'',bpm:null}];
 const out=attachApprovedRepertoireScores(snapshot,original,{ids:['scarborough-fair']});
 assert.equal(out.upgraded,1);
 assert.equal(out.songs[0].body,'[Am] My own chords');
 assert.equal(out.songs[0].repositoryOrigin.id,'scarborough-fair-traditional-1882');
 assert.equal(out.songs[0].bpm,88);
});

import {downloadSingleApprovedArrangement,validateSnapshot} from '../src/song-library.js';

test('loads only one approved score and validates its complete miniature snapshot',async()=>{
 const base='https://example.test/ukulele/';
 const meta={id:'blackbird',revision:2,title:'Blackbird — Ukulele Accompaniment',artist:'The Beatles',difficulty:'advanced',tags:['notation'],file:'songs/blackbird.json'};
 const catalog={format:'ukulele-workbench-catalog',schemaVersion:1,name:'Test Repertoire',entries:[meta],repertoire:[{id:'blackbird',title:'Blackbird',artist:'The Beatles',practiceFocus:'Two-voice fingerstyle'}]};
 const arrangement={format:'ukulele-workbench-arrangement',schemaVersion:1,id:'blackbird',revision:2,title:meta.title,artist:meta.artist,difficulty:'advanced',tags:meta.tags,key:'C',bpm:86,tuning:'highG',description:'Practice adaptation',body:'[C] [F]',notes:'Fingerstyle.',score:{schema:1,key:'C',tempo:86,tuning:'highG',measures:[{events:[{type:'note'}]}]}};
 const requests=[];
 const fetcher=async url=>{
  requests.push(url);
  const payload=url===base+'library/catalog.json'?catalog:url===base+'library/songs/blackbird.json'?arrangement:null;
  return {ok:!!payload,status:payload?200:404,headers:{get:()=>null},text:async()=>JSON.stringify(payload)};
 };
 const result=await downloadSingleApprovedArrangement({source:'./library/catalog.json',base,repertoireId:'blackbird',fetcher,validateScore:()=>true});
 assert.deepEqual(requests,[base+'library/catalog.json',base+'library/songs/blackbird.json']);
 assert.equal(result.catalog.entries.length,1);
 assert.deepEqual(Object.keys(result.songs),['blackbird']);
 assert.equal(validateSnapshot(result,()=>true),true);
});
test('never downloads unpublished songs from the catalog',async()=>{
 const base='https://example.test/ukulele/';
 const catalog={format:'ukulele-workbench-catalog',schemaVersion:1,name:'Test Repertoire',entries:[],repertoire:[{id:'blackbird',title:'Blackbird',artist:'The Beatles',practiceFocus:'Fingerstyle'}]};
 const requests=[];
 const fetcher=async url=>{requests.push(url);return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(catalog)}};
 await assert.rejects(()=>downloadSingleApprovedArrangement({source:'./library/catalog.json',base,repertoireId:'blackbird',fetcher,validateScore:()=>true}),/does not have a published practice arrangement/);
 assert.equal(requests.length,1);
});
