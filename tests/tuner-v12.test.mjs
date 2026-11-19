import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateFundamental} from '../src/tuner-dsp.js';
const sr=44100;
function sample(f,{harmonic=0,noise=0,phase=0,gain=.4}={}){
 const samples=new Float32Array(4096);
 for(let i=0;i<samples.length;i++){
  const t=i/sr;
  samples[i]=gain*(Math.sin(2*Math.PI*f*t+phase)+harmonic*Math.sin(2*Math.PI*f*2*t+phase)) + noise*Math.sin(2*Math.PI*7271*t);
 }
 return samples;
}
test('tuner estimates high-G standard string G4 392 Hz',()=>{const p=estimateFundamental(sample(392),sr);assert.ok(p);assert.ok(Math.abs(p.hz-392)<1.5,p?.hz)});
test('tuner estimates standard C4 string even with strong harmonic',()=>{const p=estimateFundamental(sample(261.6256,{harmonic:0.8}),sr);assert.ok(p);assert.ok(Math.abs(p.hz-261.6256)<2,p?.hz)});
test('tuner estimates low G3 ~196 Hz and A4 440 Hz',()=>{for(const hz of [196,440]){const p=estimateFundamental(sample(hz,{noise:.018}),sr);assert.ok(p);assert.ok(Math.abs(p.hz-hz)<2.5,`expected ${hz}, got ${p?.hz}`)}});
test('tuner returns null for silence and sub-threshold audio',()=>{assert.equal(estimateFundamental(new Float32Array(4096),sr),null);assert.equal(estimateFundamental(sample(440,{gain:.001}),sr),null)});
test('tuner rejects invalid inputs and no false positives for deterministic noisy signal',()=>{assert.equal(estimateFundamental(new Float32Array(100),sr),null);assert.equal(estimateFundamental(sample(440),0),null);const noise=new Float32Array(4096);let seed=4;for(let i=0;i<noise.length;i++){seed=(1664525*seed+1013904223)>>>0;noise[i]=(seed/4294967296-.5)*0.3};assert.equal(estimateFundamental(noise,sr),null)});
test('tuner handles all standard low-G and baritone open strings at 48 kHz',()=>{
 const rate=48000,frequencies=[146.8324,196.0,246.9417,261.6256,329.6276,392.0,440];
 for(const hz of frequencies){const samples=new Float32Array(4096);for(let i=0;i<samples.length;i++)samples[i]=.3*Math.sin(2*Math.PI*hz*i/rate)+.13*Math.sin(4*Math.PI*hz*i/rate);const p=estimateFundamental(samples,rate);assert.ok(p,`missed ${hz}`);assert.ok(Math.abs(1200*Math.log2(p.hz/hz))<12,`${hz}: ${p.hz} Hz`)}
});
