import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScore,appendEvent} from '../src/score.js';
import {renderScoreView} from '../src/score-view.js';

test('mobile double-staff music has short systems without redundant long title headers',()=>{
 const score=createScore({title:'Life on Mars? — Ukulele Accompaniment',sample:false});
 appendEvent(score,{type:'note',midi:65,duration:1});
 appendEvent(score,{type:'note',midi:67,duration:1});
 const html=renderScoreView(score,{mode:'dual',layout:'compact',chordSymbols:['F7'],showNames:false});
 assert.match(html,/viewBox="0 0 \d+ 241"/);
 assert.doesNotMatch(html,/Life on Mars\? — Ukulele Accompaniment<\/text>/);
 assert.doesNotMatch(html,/104 BPM<\/text>/);
 assert.match(html,/class="score-chord-symbol"/);
 assert.match(html,/OPTIONAL TAB/);
 assert.match(html,/y1="146"/);
});
test('chord names remain optional and are not duplicated over the staff',()=>{
 const score=createScore({title:'Chord study',sample:false});
 appendEvent(score,{type:'chord',symbol:'C',duration:4});
 const html=renderScoreView(score,{layout:'compact',mode:'notation',showChordLabels:false,chordSymbols:['C']});
 assert.equal((html.match(/class="score-chord-symbol"/g)||[]).length,1);
 assert.doesNotMatch(html,/class="score-chord-name"/);
 assert.doesNotMatch(renderScoreView(score,{layout:'compact',mode:'notation',showChordLabels:false}),/class="score-chord-name"/);
});
test('new songs open full score with only ukulele staff, while audio tracks are independently selectable',()=>{
 const s=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(s,/state\.songPracticeScope='full'/);
 assert.match(s,/state\.songVisibleParts=\{ukulele:true\}/);
 assert.match(s,/track\.id==='ukulele'\|\|\(state\.songArrangementMode==='ensemble'/);
 assert.match(s,/data-song-visible-part/);
 assert.match(s,/state\.songPartEnabled\[part\.id\]!==false/);
 assert.match(s,/state\.songPracticeScope='full';state\.songOpen=/);
 assert.match(s,/state\.songPracticeScope='full';state\.repoSelectedId=/);
 assert.match(s,/state\.songPracticeScope='full';const item=/);
});
test('score-follow primes first staff during count-in and scrolls in the upper third before next group starts',()=>{
 const s=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(s,/followSongPracticeScore\(\(state\.songPracticeScope==='section'/);
 assert.match(s,/bounds\.top>viewport\*\.36/);
 assert.match(s,/next\.top>viewport\*\.72/);
 assert.match(s,/block:'start'/);
});
