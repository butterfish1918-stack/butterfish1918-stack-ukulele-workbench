import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {notePc} from '../src/music.js';
import {generatedChordNotes,validateScore} from '../src/score.js';
import {validateArrangement,MAX_FILE_CHARS,MAX_TOTAL_CHARS} from '../src/song-library.js';
import {buildAccompaniment} from '../src/repertoire-arranger.js';
const load=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalog=load('library/catalog.json');
const {tracks}=load('library/arrangement-blueprints.json');
const api={notePc,generatedChordNotes,validateScore,validateArrangement};

test('all fourteen arrangement revisions are reproducible and within sync limits',()=>{
 assert.equal(tracks.length,14);
 assert.equal(new Set(tracks.map(t=>t.id)).size,14);
 let totalChars=0;
 for(const track of tracks){
  const matching=catalog.repertoire.find(s=>s.id===track.id);
  assert.ok(matching,'Approved title for '+track.id);
  const {arrangement,entry}=buildAccompaniment({...track,title:matching.title,artist:matching.artist},api);
  const published=load('library/'+entry.file);
  const listing=catalog.entries.find(e=>e.id===track.id);
  assert.deepEqual(published,arrangement,track.id+' must be reproducible');
  assert.deepEqual(listing,entry,track.id+' must match catalog');
  assert.equal(validateArrangement(published,listing,validateScore),true);
  assert.equal(published.revision,2);
  assert.ok(published.sections.length>=4);
  assert.equal(published.sections.at(-1).endBar,published.score.measures.length);
  assert.ok(published.score.measures.length>=48 && published.score.measures.length<=200);
  const raw=readFileSync(new URL('../library/'+entry.file,import.meta.url),'utf8');
  assert.ok(raw.length<MAX_FILE_CHARS,track.id+' exceeds individual sync budget');
  assert.equal(published.score.tuning,'highG');
  assert.match(published.sourceUrl,/^https:\/\//);
  assert.doesNotMatch(published.body,/\b(lyrics|verse words|copyrighted recording)\b/i);
  totalChars+=JSON.stringify(published).length;
 }
 for(const entry of catalog.entries.filter(e=>!tracks.some(t=>t.id===e.id)))
  totalChars+=JSON.stringify(load('library/'+entry.file)).length;
 assert.ok(totalChars<MAX_TOTAL_CHARS,'Entire synchronized catalog exceeds local cache budget');
});

test('compound-time and chromatic source details remain distinct',()=>{
 const get=id=>load('library/songs/'+id+'.json');
 const te=get('everybody-wants-to-rule-the-world');
 assert.equal(te.score.meter,'6/8');
 assert.equal(te.bpm,168);
 assert.ok(te.sections.some(s=>s.feel==='compound-drive'));
 assert.match(te.notes,/half an original 12\/8 bar/i);
 const cal=get('california-dreamin');
 assert.equal(cal.tonalCenter,'C# minor (sounding pitch, no capo)');
 assert.ok(cal.score.measures.some(bar=>bar.events.some(e=>e.type==='chord'&&e.symbol==='G#sus4')));
 const forest=get('a-forest');
 assert.ok(forest.score.measures.some(bar=>bar.events.some(e=>e.type==='chord'&&e.symbol==='F#m')));
 const passover=get('passover');
 assert.ok(passover.score.measures.some(bar=>bar.events.some(e=>e.type==='chord'&&e.symbol==='Esus2')));
});

test('long scores use section navigation and updates do not hide newer catalog revisions',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/data-repo-section/);
 assert.match(app,/data-song-section/);
 assert.match(app,/repertoireCopyStatus/,'Approved Songs must check whether a newer arrangement is available');
 assert.match(app,/song\.repositoryOrigin\?\.revision===source\.revision/,'the import must distinguish existing score revisions');
 assert.match(app,/songScoreSections/);
});

test('recorded guitar-part fidelity is not claimed by harmony-only studies',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/score-import-guitar/);
 assert.match(app,/loadGuitarPartFile/);
 assert.match(app,/guitarPartFile/);
 assert.match(app,/guitar-source adapter|guitar-source|guitar notes/i);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/src\/guitar-adaptation\.js/);
 const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
 assert.match(readme,/not accurate transcriptions/i);
});
