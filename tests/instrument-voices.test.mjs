import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELLED_INSTRUMENTS,playbackInstrumentFamily,playableNoteRange,playModelledInstrument} from '../src/instrument-voices.js';
test('source credits map to the correct modeled instrument family',()=>{
 assert.equal(playbackInstrumentFamily('Synthesizers'),'synthesizer');
 assert.equal(playbackInstrumentFamily('acoustic guitar'),'guitar');
 assert.equal(playbackInstrumentFamily('Flute'),'flute');
 assert.equal(playbackInstrumentFamily('Vocals'),'vocals');
 assert.equal(playbackInstrumentFamily('strings'),'strings');
 assert.equal(playbackInstrumentFamily('sitar'),null);
});
test('sampled voices never invent notes beyond the supported sounding pitch range',()=>{
 assert.ok(MODELLED_INSTRUMENTS.includes('vocals'));
 assert.deepEqual(playableNoteRange('flute'),[60,96]);
 assert.equal(playModelledInstrument({},'flute',71,1),null);
});
