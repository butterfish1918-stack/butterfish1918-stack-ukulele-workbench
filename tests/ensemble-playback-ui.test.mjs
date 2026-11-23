import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
const doc={schema:2,title:'Independent voices',tempo:96,meter:'4/4',measures:2,
 parts:[{id:'U1',name:'Ukulele',instrument:'ukulele',voices:[
 {id:'melody',measures:[{events:[
  {type:'note',midi:64,onset:0,duration:.5,articulation:'staccato',finger:1},
  {type:'note',midi:65,onset:.5,duration:.5,articulation:'accent',finger:2},
  {type:'rest',onset:1,duration:1},
  {type:'note',midi:67,onset:2,duration:.5},
  {type:'note',midi:69,onset:2.5,duration:.5}
 ]},{events:[{type:'note',midi:71,onset:0,duration:1}]}]},
 {id:'counterpoint',measures:[{events:[
  {type:'note',midi:60,onset:0,duration:.25,tuplet:{actual:3,normal:2}},
  {type:'note',midi:62,onset:.25,duration:.25},
  {type:'note',midi:64,onset:.5,duration:.25}
 ]},{events:[]}]}
 ]}]};
test('voice-specific beaming does not bridge rests and remains grouped within measures',()=>{
 const html=renderPolyphonicDocument(doc);
 assert.equal((html.match(/class="poly-voice-beam"/g)||[]).length,3);
 assert.match(html,/class="poly-voice-beam-16th"/);
 assert.match(html,/data-voice="counterpoint"/);
 assert.match(html,/1:.*2:/);
 assert.match(html,/data-measure="2"/);
 assert.match(html,/staccato|•/);
});
test('multi-part playback UI supports independently muting imported source voices',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/import \{ensemblePlaybackPlan\} from '\.\/ensemble-playback\.js'/);
 assert.match(app,/data-action="score-play-multipart"/);
 assert.match(app,/data-imported-track/);
 assert.match(app,/function toggleImportedEnsemble\(/);
 assert.match(app,/function stopImportedEnsemble\(/);
 assert.match(app,/state\.importedEnsembleMuted\[ev\.partId\]/);
 assert.match(app,/playModelledInstrument\(ctx,ev\.instrument/);
 assert.match(app,/prepareUkuleleSamples\(ctx/);
 assert.match(app,/if\(state\.page==='score' && page!=='score'\)\{stopScorePlayback\(\);stopImportedEnsemble\(\);\}/);
});
