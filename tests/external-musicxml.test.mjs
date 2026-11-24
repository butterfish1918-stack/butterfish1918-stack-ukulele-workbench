import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RealXmlFixtureParser} from './helpers/real-xml-parser.mjs';
import {importMultiPartMusicXML,exportMultiPartMusicXML,normalizeMusicXMLPrologue} from '../src/musicxml-multipart.js';
import {ensemblePlaybackPlan} from '../src/ensemble-playback.js';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';

const fixture=name=>readFileSync(fileURLToPath(
 new URL('./fixtures/external/'+name+'.musicxml',import.meta.url)),'utf8');
const imported=name=>importMultiPartMusicXML(fixture(name),{DOMParserClass:RealXmlFixtureParser});

test('MIT-licensed MusicXML test-suite standard DTD is stripped without fetching entities',()=>{
 const raw=fixture('01c-Pitches-NoVoiceElement');
 assert.match(raw,/<!DOCTYPE score-partwise PUBLIC/);
 const normalized=normalizeMusicXMLPrologue(raw);
 assert.doesNotMatch(normalized,/<!DOCTYPE/);
 assert.match(normalized,/<score-partwise/);
 assert.throws(()=>normalizeMusicXMLPrologue('<!DOCTYPE score-partwise SYSTEM "https://evil.example/partwise.dtd"><score-partwise/>'),/unsafe MusicXML DOCTYPE/);
 assert.throws(()=>normalizeMusicXMLPrologue('<!DOCTYPE score-partwise [<!ENTITY x "X">]><score-partwise/>'),/unsafe MusicXML input/);
 assert.throws(()=>normalizeMusicXMLPrologue(raw.replace('</score-partwise>','<x>&illegal;</x></score-partwise>')),/Unsupported MusicXML entity/);
});

test('W3C corpus 01c: no-voice-element whole note remains a playable voice',()=>{
 const score=imported('01c-Pitches-NoVoiceElement');
 assert.equal(score.parts.length,1);
 assert.equal(score.measures,1);
 const event=score.parts[0].voices[0].measures[0].events[0];
 assert.equal(score.parts[0].voices[0].id,'1');
 assert.deepEqual([event.type,event.midi,event.duration],['note',67,4]);
 assert.equal(ensemblePlaybackPlan(score).events.length,1);
 assert.match(exportMultiPartMusicXML(score),/<duration>1920<\/duration>/);
});
test('W3C corpus 03b: true backup offsets preserve counterpoint',()=>{
 const score=imported('03b-Rhythm-Backup');
 assert.equal(score.parts[0].voices.length,2);
 assert.deepEqual(score.parts[0].voices.map(v=>v.measures[0].events.map(e=>e.onset)),
  [[0,1],[1,2]]);
 assert.equal(ensemblePlaybackPlan(score).events.length,4);
});
test('W3C corpus 21a: chord groups do not become separate rhythmic attacks',()=>{
 const score=imported('21a-Chord-Basic');
 const events=score.parts[0].voices[0].measures[0].events;
 assert.deepEqual(events.map(e=>[e.type,e.onset,e.duration]),[
  ['note',0,1],['note',0,1],['rest',1,1]]);
 const exported=exportMultiPartMusicXML(score);
 assert.match(exported,/<chord\/>/);
 assert.equal(ensemblePlaybackPlan(score).events.length,2);
});
test('W3C corpus 33b: tie across measures sustains rather than reattacks',()=>{
 const score=imported('33b-Spanners-Tie');
 assert.equal(score.measures,2);
 const plan=ensemblePlaybackPlan(score);
 assert.equal(plan.events.length,1);
 assert.equal(plan.events[0].originalDuration,8);
 assert.match(exportMultiPartMusicXML(score),/<tied type="stop"\/>/);
 assert.match(renderPolyphonicDocument(score),/class="poly-tie"/);
});
test('W3C corpus 45a: a five-pass implicit repeat plays and exports linearly',()=>{
 const score=imported('45a-SimpleRepeat');
 assert.deepEqual(score.sourceMeasureNumbers,[1,1,1,1,1,2]);
 assert.equal(score.measures,6);
 assert.match(exportMultiPartMusicXML(score),/<measure number="6">/);
});
test('W3C corpus 45b: first and second ending playback follows the written score',()=>{
 const score=imported('45b-RepeatWithAlternatives');
 assert.deepEqual(score.sourceMeasureNumbers,[1,2,1,3,4]);
 assert.equal(score.measures,5);
 assert.equal(ensemblePlaybackPlan(score).events.length,5);
});
test('W3C corpus 45c and 45f: nested and invalid repeat structures are rejected',()=>{
 assert.throws(()=>imported('45c-RepeatMultipleTimes'),/Nested repeats/);
 assert.throws(()=>imported('45f-Repeats-InvalidEndings'),/Only first and second endings/);
});
