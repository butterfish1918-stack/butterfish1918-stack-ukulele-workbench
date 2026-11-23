import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBarLyricCues,lyricCuesToText,sectionMarkers,mergeReadingCues,readingCuesForBars} from '../src/song-lyrics.js';
test('user-provided lyric fragments are anchored to exact bars and preserve optional ranges',()=>{
 const cues=parseBarLyricCues('[17] The next verse begins\n[5-8] A phrase for these measures\n9: Short cue',{measureCount:20});
 assert.deepEqual(cues.map(c=>[c.bar,c.endBar,c.kind]),[[5,8,'lyric'],[9,9,'lyric'],[17,17,'lyric']]);
 assert.match(lyricCuesToText(cues),/\[5-8\] A phrase/);
 assert.deepEqual(readingCuesForBars(cues,9,16).map(c=>c.bar),[9]);
});
test('section names help navigation without claiming to be original lyrics',()=>{
 const sections=[{label:'Verse A',startBar:1},{label:'Chorus',startBar:17}];
 const marker=sectionMarkers(sections,30);
 assert.equal(marker[0].kind,'section');
 const both=mergeReadingCues(parseBarLyricCues('[17] Personal cue',{measureCount:30}),sections,30);
 assert.deepEqual(both.map(c=>c.kind),['section','section','lyric']);
 assert.deepEqual(readingCuesForBars(both,17,24).map(c=>c.text),['Chorus','Personal cue']);
});
test('invalid, oversized, ambiguous and out-of-range cues never silently drift out of time',()=>{
 for(const bad of ['Lyrics without a bar','[0] Invalid','[99] Outside','[4-3] Reverse','[4] One\n[4] Two'])
  assert.throws(()=>parseBarLyricCues(bad,{measureCount:32}));
 assert.throws(()=>parseBarLyricCues('[1] '+('x'.repeat(161)),{measureCount:4}),/too long/);
});
