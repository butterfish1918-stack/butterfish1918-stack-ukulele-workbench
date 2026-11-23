import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScore,appendEvent} from '../src/score.js';
import {renderScoreView} from '../src/score-view.js';
import {mergeReadingCues,parseBarLyricCues} from '../src/song-lyrics.js';

test('lyrics can appear beneath compact notation, tab, or both, without covering staff notes',()=>{
 const score=createScore({title:'Practice excerpt',sample:false});
 appendEvent(score,{type:'note',midi:60,duration:4});
 const cues=mergeReadingCues(parseBarLyricCues('[1] My own first line',{measureCount:1}),[{startBar:1,label:'Verse 1'}],1);
 for(const mode of ['notation','dual','tab']){
  const html=renderScoreView(score,{mode,layout:'systems',readingCues:cues});
  assert.match(html,/class="score-reading-cues"/);
  assert.match(html,/data-lyric-bar="1"/);
  assert.match(html,/My own first line/);
  assert.ok(html.indexOf('</svg>')<html.indexOf('My own first line'),'lyrics belong below the actual score');
  assert.match(html,/Verse 1/);
 }
 const hidden=renderScoreView(score,{mode:'dual',layout:'systems',readingCues:null});
 assert.doesNotMatch(hidden,/score-reading-cue/);
});
test('rendering escapes HTML pasted into lyric cues instead of running it',()=>{
 const score=createScore({title:'Markup study',sample:false});
 appendEvent(score,{type:'note',midi:64,duration:4});
 const html=renderScoreView(score,{layout:'systems',readingCues:parseBarLyricCues('[1] <img src=x onerror=alert(1)>',{measureCount:1})});
 assert.ok(html.includes('&lt;img'));
 assert.ok(!html.includes('<img src=x'));
});
test('Songbook has a persistent independent lyric toggle, editable locally and backed up',()=>{
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(src,/state\.songShowLyrics=read\('songShowLyrics',true\)!==false/);
 assert.match(src,/data-song-toggle-lyrics/);
 assert.match(src,/data-action="song-lyrics-save"/);
 assert.match(src,/data-action="song-lyrics-clear"/);
 assert.match(src,/readingCues:part\.id==='ukulele'\?readingCues:null/);
 assert.match(src,/lyricCues:state\.songLyricsById/);
 assert.match(src,/const lyricBackup=data\.lyricCues/);
 assert.match(src,/highlightSongReadingCues\(atBar\)/);
});
test('all original instrument claims expose independently auditable verification status',()=>{
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(src,/partVerificationStatus\(source\.arrangement,part\)/);
 assert.match(src,/Instrument score verification/);
 assert.match(src,/two independent, instrument-specific sources/);
});
