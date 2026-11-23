import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLoopRange,practiceExcerpt,nextPracticeSpeed,saveSongBookmark,practiceLog,songPracticeStats,reviewDue,validatedPracticePreferences} from '../src/practice-engine.js';
test('A-B boundaries stay inside score and use stable 1-based bar indexes',()=>{
 assert.deepEqual(validateLoopRange(32,9,12),{start:9,end:12,bars:4});
 assert.deepEqual(practiceExcerpt({measures:Array.from({length:32},(_,i)=>({bar:i+1}))},{start:9,end:12}).measures.map(x=>x.bar),[9,10,11,12]);
 assert.throws(()=>validateLoopRange(32,17,16));
 assert.throws(()=>validateLoopRange(32,0,2));
});
test('tempo ramp is bounded and does not accelerate every loop when cadence is >1',()=>{
 assert.equal(nextPracticeSpeed(80,{step:5,max:95,every:2,cycle:1}),80);
 assert.equal(nextPracticeSpeed(80,{step:5,max:95,every:2,cycle:2}),85);
 assert.equal(nextPracticeSpeed(94,{step:5,max:95,cycle:1}),95);
});
test('bookmarks and session logs aggregate weak bars without storing sound',()=>{
 const bookmarks=saveSongBookmark({},'study',17,40);
 assert.equal(bookmarks.study.bar,17);
 assert.throws(()=>saveSongBookmark({},'study',41,40));
 let logs=[];
 logs=practiceLog(logs,{songId:'study',title:'Study',bars:{start:9,end:10},seconds:62,confidence:2,loops:3});
 logs=practiceLog(logs,{songId:'study',title:'Study',bars:{start:9,end:10},seconds:58,confidence:4,loops:2});
 const stats=songPracticeStats(logs,'study');
 assert.deepEqual([stats.sessions,stats.minutes,stats.loops],[2,2,5]);
 assert.equal(stats.weakBars[0].bar,9);
 assert.equal(stats.weakBars[0].meanConfidence,3);
});
test('practice planning and spaced review use transparent controls',()=>{
 assert.equal(reviewDue('2020-01-01T00:00:00Z',{now:new Date('2020-01-04T00:00:00Z')}),true);
 assert.equal(reviewDue('2020-01-03T00:00:00Z',{now:new Date('2020-01-04T00:00:00Z')}),false);
 assert.equal(validatedPracticePreferences({minutes:30}).minutes,30);
});
