import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePracticeTimeline,activeTrackEvents,sampleRequestsForWindow,shouldSkipLateEvent} from '../src/song-playback.js';
const dummy=[{id:'ukulele',instrument:'ukulele',score:{measures:[{events:[
{id:'u1',type:'note',midi:60,onset:0,duration:1},{id:'u2',type:'note',midi:62,onset:1,duration:1}]}]}},
{id:'bass',instrument:'bass',score:{measures:[{events:[{id:'b1',type:'note',midi:36,onset:0,duration:2}]}]}},
{id:'drums',instrument:'drums',score:{measures:[{events:[{id:'d1',type:'note',midi:36,onset:0,duration:.5,drumHits:['kick','hat'],drumStyle:'acoustic'}]}]}}];
const timeline=s=>s.measures.flatMap(m=>m.events);
test('multiple instrument tracks retain original simultaneous beat offsets',()=>{
 const out=compilePracticeTimeline(dummy,timeline);
 assert.deepEqual(out.events.map(e=>e.onset),[0,0,0,1]);
 assert.deepEqual([...activeTrackEvents(out.byTrack,.25).keys()].sort(),['bass','drums','ukulele']);
 assert.deepEqual([...activeTrackEvents(out.byTrack,1.5).keys()].sort(),['bass','ukulele']);
 assert.equal(activeTrackEvents(out.byTrack,3).size,0);
});
test('sample preloading uses only the requested initial score window',()=>{
 const out=compilePracticeTimeline(dummy,timeline);
 const working=dummy.map(x=>({...x,events:out.byTrack.get(x.id)}));
 const requests=sampleRequestsForWindow(working,0,.8);
 assert.deepEqual(requests.ukulele,[60]);
 assert.deepEqual(requests.backing,[{instrument:'bass',midis:[36]},{instrument:'drums',hits:['acoustic-kick','acoustic-hat']}]);
});
test('late arrivals are dropped rather than emitted as a burst',()=>{
 assert.equal(shouldSkipLateEvent(1,1.5),true);
 assert.equal(shouldSkipLateEvent(1.35,1.5),false);
});
