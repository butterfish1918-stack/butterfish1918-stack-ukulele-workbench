import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent} from '../src/score.js';
import {renderScoreView,writtenNoteName,scoreSystems} from '../src/score-view.js';
import {readFileSync} from 'node:fs';
const score=createScore({title:'C major reading',sample:false});
appendEvent(score,{type:'note',midi:60,duration:1});
appendEvent(score,{type:'note',midi:64,duration:1});
test('note names are only visible when explicitly enabled in notation and tab',()=>{
 assert.equal(writtenNoteName(60,'C'),'C4');
 assert.equal(writtenNoteName(70,'Bb'),'Bb4');
 const normal=renderScoreView(score,{mode:'dual',layout:'systems',showNames:false});
 assert.equal((normal.match(/class="score-note-label"/g)||[]).length,0);
 assert.equal((normal.match(/class="score-tab-note-label"/g)||[]).length,0);
 const dual=renderScoreView(score,{mode:'dual',layout:'systems',showNames:true});
 assert.equal((dual.match(/class="score-note-label"/g)||[]).length,2);
 assert.equal((dual.match(/class="score-tab-note-label"/g)||[]).length,2);
 assert.ok(dual.includes('C4'));
 const tab=renderScoreView(score,{mode:'tab',layout:'systems',showNames:true});
 assert.equal((tab.match(/class="score-tab-note-label"/g)||[]).length,2);
 assert.equal((tab.match(/class="score-note-label"/g)||[]).length,0);
});
test('chord names have an independent toggle, including tab-only score',()=>{
 const label=['C',null];
 assert.match(renderScoreView(score,{mode:'tab',layout:'systems',chordSymbols:label}),/class="score-chord-symbol"/);
 assert.doesNotMatch(renderScoreView(score,{mode:'tab',layout:'systems',chordSymbols:null}),/class="score-chord-symbol"/);
 assert.equal(scoreSystems(score,{showNames:true}).length,1);
});
test('every Songbook view passes note names and optional chord names into score renderer',()=>{
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(src,/songShowChordNames=read\('songShowChordNames'/);
 assert.match(src,/songShowNoteNames=!!read\('songShowNoteNames'/);
 assert.match(src,/data-song-toggle-chords/);
 assert.match(src,/data-song-toggle-notes/);
 assert.match(src,/showNames:state.songShowNoteNames/);
 assert.match(src,/songShowChordNames\?/);
});
