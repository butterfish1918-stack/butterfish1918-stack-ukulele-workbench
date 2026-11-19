import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNINGS,notePc,spelledScale,midiFreq,freqMidi,fretboard,optionsForMidi,scalePositions,harmonizedChords,chordVoicings,staffY,staffYForSpelling,scaleMelody} from '../src/music.js';
test('tuning pitch and high/low G distinction',()=>{
 assert.deepEqual(TUNINGS.highG.midi,[67,60,64,69]);assert.deepEqual(TUNINGS.lowG.midi,[55,60,64,69]);
 assert.equal(fretboard('highG')[0][0].midi,67);assert.equal(fretboard('lowG')[0][0].midi,55);
 assert.equal(optionsForMidi(55,'highG').length,0);assert.equal(optionsForMidi(55,'lowG').length,1);
});
test('key-aware spelling',()=>{
 assert.deepEqual(spelledScale('C','major').map(n=>n.name),['C','D','E','F','G','A','B']);
 assert.deepEqual(spelledScale('F','major').map(n=>n.name),['F','G','A','Bb','C','D','E']);
 assert.deepEqual(spelledScale('F#','major').map(n=>n.name),['F#','G#','A#','B','C#','D#','E#']);
 assert.deepEqual(spelledScale('Eb','major').map(n=>n.name),['Eb','F','G','Ab','Bb','C','D']);
 assert.deepEqual(spelledScale('A','harmonicMinor').map(n=>n.name),['A','B','C','D','E','F','G#']);
});
test('scales, chords, and physical chord shapes',()=>{
 assert.equal(scalePositions('C','major','highG',12).some(p=>p.string===1&&p.fret===0),true);
 assert.deepEqual(harmonizedChords('C','major').map(x=>x.name),['C','Dm','Em','F','G','Am','Bdim']);
 assert.deepEqual(harmonizedChords('C','major',4).map(x=>x.name),['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5']);
 const c=harmonizedChords('C','major')[0];const v=chordVoicings(c.pcs);assert.ok(v.length);assert.ok(v.some(x=>x.frets[0]===0 && x.frets[1]===0 && x.frets[2]===0 && x.frets[3]===3));
});
test('frequency and staff',()=>{assert.equal(midiFreq(69),440);assert.ok(Math.abs(freqMidi(440)-69)<1e-9);assert.equal(staffY(64),88);assert.equal(staffY(60),100);});
test('bad data rejected',()=>{assert.throws(()=>notePc('H'));assert.throws(()=>spelledScale('C','invalid'));});

test('ascending single-octave melody and enharmonic octave notations',()=>{
 const f=scaleMelody('F#','major','highG');assert.deepEqual(f.map(x=>x.midi),[66,68,70,71,73,75,77]);
 assert.deepEqual(spelledScale('C','blues').map(n=>n.name),['C','Eb','F','Gb','G','Bb']);
 assert.equal(staffYForSpelling(59,'Cb',96),108); // Cb4 is written on the C4 ledger line.
 assert.equal(staffYForSpelling(65,'E#',96),96); // E#4 is written on E4 line.
});
