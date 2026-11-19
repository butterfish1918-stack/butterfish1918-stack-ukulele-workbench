import test from 'node:test';
import assert from 'node:assert/strict';
import {createScore,appendEvent,validateScore,setTieToNext,setSlurToNext} from '../src/score.js';
import {exportMusicXML,MUSICXML_DIVISIONS} from '../src/musicxml.js';
import {createProgression,buildProgressionScore,editProgression} from '../src/progression.js';
const score=(opts)=>createScore({sample:false,...opts});
test('single-part MusicXML document includes proper measure, clef, time, key, tempo and ukulele tuning',()=>{
 const s=score({title:'An & B < C',tuning:'baritone',key:'Gb',meter:'6/8',tempo:97});
 appendEvent(s,{type:'note',midi:59,spelling:'B',duration:.75});
 appendEvent(s,{type:'rest',duration:2});
 const xml=exportMusicXML(s);
 assert.equal(MUSICXML_DIVISIONS,8);
 assert.match(xml,/score-partwise version="4.0"/);
 assert.match(xml,/<work-title>An &amp; B &lt; C<\/work-title>/);
 assert.match(xml,/<fifths>-6<\/fifths>/);
 assert.match(xml,/<beats>6<\/beats><beat-type>8<\/beat-type>/);
 assert.match(xml,/<miscellaneous-field name="ukulele-workbench-tuning">baritone<\/miscellaneous-field>/);
 assert.match(xml,/<duration>6<\/duration>/);
 assert.match(xml,/<dot\/>/);
 assert.match(xml,/<type>half<\/type>/);
 assert.match(xml,/<sound tempo="97"\/>/);
 assert.match(xml,/<rest\/>/);
});
test('written octave is not blindly derived from sounding MIDI (B#3 / Cb4)',()=>{
 const s=score({tuning:'lowG'});
 appendEvent(s,{midi:60,spelling:'B#',duration:1});
 appendEvent(s,{midi:59,spelling:'Cb',duration:1});
 const xml=exportMusicXML(s);
 assert.match(xml,/<pitch><step>B<\/step><alter>1<\/alter><octave>3<\/octave><\/pitch>/);
 assert.match(xml,/<pitch><step>C<\/step><alter>-1<\/alter><octave>4<\/octave><\/pitch>/);
});
test('ties export both graphical and sounding notation; slurs are distinct',()=>{
 const s=score({tuning:'lowG'});
 const a=appendEvent(s,{midi:60,duration:2});
 const b=appendEvent(s,{midi:60,duration:2});
 const c=appendEvent(s,{midi:62,duration:1});
 const d=appendEvent(s,{midi:64,duration:1});
 setTieToNext(s,a.id,true);setSlurToNext(s,c.id,true);
 const xml=exportMusicXML(s);
 assert.equal((xml.match(/<tie type="start"\/>/g)||[]).length,1);
 assert.equal((xml.match(/<tie type="stop"\/>/g)||[]).length,1);
 assert.match(xml,/<tied type="start"\/>/);
 assert.match(xml,/<slur number="1" type="start"\/>/);
 assert.match(xml,/<slur number="1" type="stop"\/>/);
 assert.equal(validateScore(s),true);
});
test('both a fixed four-string chord and generated three/four-string chord export as simultaneous notation',()=>{
 const a=score({key:'C'});appendEvent(a,{type:'chord',symbol:'C',duration:1,stroke:'down'});
 const xml=exportMusicXML(a);
 assert.equal((xml.match(/<chord\/>/g)||[]).length,3);
 assert.match(xml,/<kind text="">major<\/kind>/);
 assert.match(xml,/<string>4<\/string><fret>0<\/fret>/);
 assert.match(xml,/<string>1<\/string><fret>3<\/fret>/);
 const p=createProgression({root:'A',mode:'naturalMinor',tuning:'baritone',preset:false});
 const edit=editProgression(p,'add',{degree:4,extension:4,stroke:'up',duration:1});
 const b=buildProgressionScore(edit);assert.ok(validateScore(b));
 assert.match(exportMusicXML(b),/<harmony>/);
 assert.match(exportMusicXML(b),/Upstroke/);
});
test('a generated score exports valid durations for every meter and all three supported tunings',()=>{
 for(const tuning of ['highG','lowG','baritone'])for(const meter of ['3/4','4/4','6/8']){
  const s=score({tuning,meter});appendEvent(s,{type:'note',midi:64,duration:0.375});appendEvent(s,{type:'rest',duration:.75});
  const x=exportMusicXML(s);assert.match(x,/<duration>3<\/duration>/);assert.match(x,/<duration>6<\/duration>/);
  assert.match(x,/<score-part id="P1">/);
 }
});
