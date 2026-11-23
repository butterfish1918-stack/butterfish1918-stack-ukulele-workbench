import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent} from '../src/score.js';
import {renderScoreView,scoreSystems} from '../src/score-view.js';
test('dense notation prints on successive staff systems without a giant horizontal SVG',()=>{
 const score=createScore({title:'Wrapping test',sample:false});
 for(let i=0;i<64;i++)appendEvent(score,{type:'note',midi:[60,64,67,69][i%4],duration:.5});
 assert.equal(score.measures.length,8);
 const groups=scoreSystems(score);
 assert.equal(groups.length,8,'eight eighth notes per bar must remain readable, one bar per system');
 const html=renderScoreView(score,{mode:'dual',layout:'systems'});
 assert.equal((html.match(/class="score-system"/g)||[]).length,8);
 assert.match(html,/aria-label="Measures 1 to 1"/);
 assert.match(html,/aria-label="Measures 8 to 8"/);
 assert.match(html,/measure 8/);
 assert.doesNotMatch(html,/min-width:450px/);
 assert.match(html,/min-width:0/);
 assert.equal(score.measures.length,8,'rendering must not mutate the score');
});
test('light chord bars share a system while preserving original note event IDs and measure offsets',()=>{
 const score=createScore({title:'Sparse',sample:false});
 for(let i=0;i<8;i++)appendEvent(score,{type:'note',midi:60,duration:4});
 const firstId=score.measures[0].events[0].id;
 const groups=scoreSystems(score);
 assert.ok(groups.length<8,'light measures should fit multiple bars per line');
 const html=renderScoreView(score,{mode:'notation',layout:'systems',measureOffset:40});
 assert.match(html,/aria-label="Measures 41 to /);
 assert.ok(html.includes(firstId));
 assert.match(html,/measure 41/);
});
test('standard strip rendering remains available to other learning modes',()=>{
 const score=createScore({title:'Short study'});
 const html=renderScoreView(score);
 assert.match(html,/class="composed-score"/);
 assert.doesNotMatch(html,/class="score-systems"/);
});
