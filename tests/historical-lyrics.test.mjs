import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateArrangement} from '../src/song-library.js';
import {validateScore} from '../src/score.js';
import {renderScoreView} from '../src/score-view.js';
import {mergeReadingCues,parseBarLyricCues} from '../src/song-lyrics.js';
const catalog=JSON.parse(readFileSync(new URL('../library/catalog.json',import.meta.url),'utf8'));
const song=JSON.parse(readFileSync(new URL('../library/songs/scarborough-fair-traditional-1882.json',import.meta.url),'utf8'));
const metadata=catalog.entries.find(x=>x.id===song.id);
test('public-domain historical lyric edition is valid and source-specific',()=>{
 assert.equal(song.revision,2);
 assert.equal(metadata.revision,2);
 assert.equal(validateArrangement(song,metadata,validateScore),true);
 assert.equal(song.lyricCues.length,12);
 assert.ok(song.lyricCues.every(c=>c.kind==='lyric'&&c.bar>=5&&c.endBar<=28));
 assert.ok(song.lyricCues.every(c=>Number.isInteger(c.bar)&&typeof c.text==='string'&&c.text.length>10));
 assert.match(song.lyricSource.sourceTitle,/Whittingham Fair/);
 assert.equal(song.lyricSource.published,1882);
 assert.match(song.lyricSource.alignment,/Editorial/);
 assert.match(song.lyricSource.rights,/public.domain/i);
});
test('traditional song lyrics appear at the corresponding bars across notation and tablature',()=>{
 const part={...song.score,measures:song.score.measures.slice(4,12)};
 const cues=mergeReadingCues(song.lyricCues,[],song.score.measures.length);
 for(const mode of ['notation','tab','dual']){
  const html=renderScoreView(part,{mode,layout:'systems',measureOffset:4,readingCues:cues});
  assert.ok(html.includes('class="score-reading-cue cue-lyric"'));
  assert.match(html,/data-lyric-bar="5"/);
  assert.match(html,/data-lyric-bar="11"/);
  assert.ok(html.indexOf('</svg>')<html.indexOf('data-lyric-bar="5"'),'lyric text should remain beneath staff, not collide with notes');
 }
});
test('modern copyrighted song files are not populated with unlicensed lyric transcriptions',()=>{
 for(const entry of catalog.entries){
  if(entry.id===song.id)continue;
  const entrySong=JSON.parse(readFileSync(new URL('../library/'+entry.file,import.meta.url),'utf8'));
  assert.equal(entrySong.lyricCues,undefined,'Unexpected published lyric text for '+entry.id);
 }
});
test('Songbook refresh retrieves new historical lyrics while retaining personal-song copies',()=>{
 const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(code,/REQUIRED_LYRIC_EDITIONS/);
 assert.match(code,/requiresFreshLyricEdition\(item\)/);
 assert.match(code,/recent\.songs\[id\]\.revision>cached\.songs\[id\]\.revision/);
 assert.match(code,/state\.songShowLyrics=read\('songShowLyrics',true\)/);
});
