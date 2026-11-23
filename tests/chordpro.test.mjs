import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChordPro,exportChordPro} from '../src/chordpro.js';
test('ChordPro directives and lyric/chord lines import safely',()=>{
 const src='{title: Original study}\n{artist: Composer}\n{tempo: 92}\n[C]First [Am]line\n{start_of_chorus}\n[F]Chorus';
 const data=parseChordPro(src);
 assert.deepEqual([data.title,data.artist,data.tempo],['Original study','Composer',92]);
 assert.deepEqual(data.lines[0].chords,['C','Am']);
 assert.equal(data.lines[1].section,'Chorus');
 const copy=parseChordPro(exportChordPro({...data,chordProLines:data.lines}));
 assert.equal(copy.lines[0].lyrics,'First line');
});
test('Invalid source cannot impersonate a notated score',()=>{
 assert.throws(()=>parseChordPro(''));
 assert.equal(parseChordPro('[G]Text').score,undefined);
});
