import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateScore} from '../src/score.js';
import {BUNDLED_LIBRARY} from '../src/library-seed.js';
import {CATALOG_FORMAT,ARRANGEMENT_FORMAT,catalogUrl,validateCatalog,validateArrangement,validateSnapshot,downloadRepository,copyToSongbook,DEFAULT_CATALOG_URL} from '../src/song-library.js';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalog=read('library/catalog.json');
const song0=read('library/songs/first-melody-study.json');
const song1=read('library/songs/primary-chord-changes.json');
const base='https://example.org/music/library/catalog.json';
const mockFetch=async (url) => {
 let content=null;
 if(url===base)content=catalog;
 else if(url.startsWith('https://example.org/music/library/songs/')){
  try{content=read('library/songs/'+url.split('/songs/')[1])}catch{}
 }
 return {ok:!!content,status:content?200:404,headers:{get:()=>String(JSON.stringify(content).length)},text:async()=>JSON.stringify(content)};
};

test('bundled starter collection is original, correctly referenced and score-valid',()=>{
 assert.equal(catalog.format,CATALOG_FORMAT);
 assert.equal(song0.format,ARRANGEMENT_FORMAT);
 assert.equal(catalog.entries.length,18);
 assert.equal(validateCatalog(catalog),true);
 assert.equal(validateArrangement(song0,catalog.entries[0],validateScore),true);
 assert.equal(validateArrangement(song1,catalog.entries[1],validateScore),true);
 assert.equal(validateSnapshot(BUNDLED_LIBRARY,validateScore),true);
 assert.equal(BUNDLED_LIBRARY.catalog.entries.length,2);
});
test('catalog URLs accept served same-app catalogs and GitHub raw HTTPS but reject unsafe schemes',()=>{
 assert.equal(catalogUrl(DEFAULT_CATALOG_URL,'https://my-uke.example/app/'),'https://my-uke.example/app/library/catalog.json');
 assert.equal(catalogUrl('https://raw.githubusercontent.com/owner/repo/main/library/catalog.json','https://my-uke.example/'), 'https://raw.githubusercontent.com/owner/repo/main/library/catalog.json');
 assert.throws(()=>catalogUrl('javascript:alert(1)','https://example.org/'));
 assert.throws(()=>catalogUrl('http://example.org/library/catalog.json','https://example.org/'));
 assert.throws(()=>catalogUrl('https://name:secret@example.org/library/catalog.json','https://example.org/'));
 assert.throws(()=>catalogUrl('https://example.org/library/catalog.json?token=x','https://example.org/'));
 assert.throws(()=>catalogUrl('https://example.org/library/catalog.json#foo','https://example.org/'));
});
test('catalog rejects duplicate ids, files, traversal and excessive size',()=>{
 for(const variation of [
  c=>{c.entries.push({...c.entries[0]})},
  c=>{c.entries[0].file='../my-secret.json'},
  c=>{c.entries[0].file='songs/%2e%2e.json'},
  c=>{c.entries[0].id='../../foo'},
  c=>{c.entries[0].tags='string'},
  c=>{c.entries[0].difficulty='master of the universe'},
  c=>{c.schemaVersion=99}
 ]) {const draft=structuredClone(catalog);variation(draft);assert.throws(()=>validateCatalog(draft))}
});
test('a song must match its manifest and have a valid notation score',()=>{
 for(const variation of [
  a=>{a.revision=2},a=>{a.artist='Someone else'},a=>{a.score.measures[0].events[0].midi=5},
  a=>{a.tuning='baritone'},a=>{a.bpm=3},a=>{a.score.key='F'}
 ]){const draft=structuredClone(song0);variation(draft);assert.throws(()=>validateArrangement(draft,catalog.entries[0],validateScore))}
});
test('all-or-nothing sync downloads a complete validated repository',async()=>{
 const snapshot=await downloadRepository({source:base,base:'https://example.org/',fetcher:mockFetch,validateScore});
 assert.equal(snapshot.catalogUrl,base);
 assert.equal(Object.keys(snapshot.songs).length,18);
 assert.equal(validateSnapshot(snapshot,validateScore),true);
});
test('network failure or a tampered file rejects the entire sync',async()=>{
 const fail=async url=>url.includes('primary-')?{ok:false,status:503}:mockFetch(url);
 await assert.rejects(downloadRepository({source:base,base:'https://example.org/',fetcher:fail,validateScore}));
 const tampered=async url=>url.includes('primary-')?{ok:true,status:200,headers:{get:()=>0},text:async()=>JSON.stringify({...song1,score:null})}:mockFetch(url);
 await assert.rejects(downloadRepository({source:base,base:'https://example.org/',fetcher:tampered,validateScore}));
});
test('independent local copies preserve complete notated scores and never change with repository revisions',async()=>{
 const snapshot=await downloadRepository({source:base,base:'https://example.org/',fetcher:mockFetch,validateScore});
 const prior=[{id:'personal-song',title:'Own composition',notes:'unchanged'}];
 const copied=copyToSongbook(snapshot,song0.id,prior,{id:'my-copy-1',now:'2026-11-19T22:00:00Z',validateScore});
 assert.equal(prior.length,1);
 assert.equal(copied.length,2);
 assert.equal(copied[0],prior[0]);
 assert.equal(copied[1].score.measures[0].events[0].midi,song0.score.measures[0].events[0].midi);
 assert.equal(copied[1].repositoryOrigin.revision,1);
 snapshot.songs[song0.id].score.measures[0].events[0].duration=.5;
 assert.notDeepEqual(copied[1].score,snapshot.songs[song0.id].score);
 assert.throws(()=>copyToSongbook(BUNDLED_LIBRARY,song0.id,copied,{id:'my-copy-1',validateScore}));
});
test('repository is separate from backup restore keys, and both tabs are reachable',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/data-action="repo-view-repository"/);
 assert.match(app,/data-action="repo-sync"/);
 assert.match(app,/data-action="repo-import"/);
 assert.match(app,/repo-score-preview/);
 assert.match(app,/copyToSongbook\(/);
 assert.match(app,/repositorySnapshot/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.repo-library-grid/);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/src\/song-library\.js/);
 assert.match(sw,/library\/catalog\.json/);
});
