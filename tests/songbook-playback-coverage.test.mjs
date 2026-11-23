import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScore,appendEvent,validateScore} from '../src/score.js';
import {renderScoreView} from '../src/score-view.js';

test('full 76-bar score remains visible, correctly numbered and fully annotated',()=>{
 const score=createScore({title:'Long study',sample:false});
 for(let i=0;i<76;i++)appendEvent(score,{type:'note',midi:[60,64,67][i%3],duration:4});
 const chords=Array.from({length:76},(_,i)=>i%2?'G':'C');
 const html=renderScoreView(score,{mode:'notation',layout:'systems',chordSymbols:chords});
 assert.equal((html.match(/class="score-chord-symbol"/g)||[]).length,76);
 assert.ok(html.includes('data-last-measure="76"'),'last measure must remain in DOM');
 assert.match(html,/measure 76/,'last note must be available for auto-follow');
 assert.equal(score.measures.length,76);
});
test('bass notes use permitted low register and displayed bass clef',()=>{
 const score=createScore({title:'Bass demonstration',sample:false});
 score.clef='bass8vb';score.measures[0].events=[{id:'bass-G1',type:'note',midi:31,spelling:'G',duration:4}];
 assert.equal(validateScore(score),true);
 const svg=renderScoreView(score,{mode:'notation',layout:'systems'});
 assert.match(svg,/𝄢/);
 assert.match(svg,/measure 1/);
});
test('Songbook playback and displayed score use the same full-or-section selection',()=>{
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(src,/const songPreviewScore=state\.songPracticeScope==='full'\?current\?\.score/);
 assert.match(src,/const previewScore=state\.songPracticeScope==='full'\?arrangement\?\.score/);
 assert.match(src,/followSongPracticeScore\(atBar,run\)/);
 assert.match(src,/data-first-measure/);
 assert.match(src,/songArrangementSwitch\(\)/);
 assert.match(src,/prepareBackingSamples\(ctx,working/);
 assert.match(src,/data-song-part-toggle/);
 assert.match(src,/sort\(\(x,y\)=>x\.onset-y\.onset/);
});
