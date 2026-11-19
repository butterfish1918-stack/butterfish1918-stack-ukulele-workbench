import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBackupRestore,commitBackupRestore} from '../src/storage-safety.js';
import {inspectDevice} from '../src/device-qa.js';
const validators={validateScore:x=>{if(x?.valid!==true)throw new Error('bad score')},validateProgression:x=>{if(x?.valid!==true)throw new Error('bad progression')},validTechniqueProgress:x=>!!x&&!Array.isArray(x),validRhythmProgress:x=>!!x&&!Array.isArray(x),validReadingProgress:x=>!!x&&!Array.isArray(x)};
const backup=()=>({format:'ukulele-workbench-backup',schemaVersion:2,songs:[{id:'s',title:'Study',score:{valid:true}}],progress:[{date:'2026-11-19',minutes:20}],scoreDraft:{valid:true},techniqueProgress:{a:1},rhythmLabProgress:{},notationReadingProgress:{}});
function fakeStorage({failOnKey=null}={}){
 const map=new Map([['uw-songs','["original"]'],['uw-progress','["old"]']]);let fail=true;
 return {map,getItem:k=>map.has(k)?map.get(k):null,setItem(k,v){if(fail&&k===failOnKey){fail=false;throw new Error('quota error')}map.set(k,String(v))},removeItem:k=>map.delete(k)};
}
test('preflights valid schema 2 backup and optional fields before writing',()=>{const x=prepareBackupRestore(backup(),validators);assert.equal(x.songs[0].title,'Study');assert.equal(x.scoreDraft.valid,true)});
test('schema 1 backup without new progress fields is accepted',()=>{const b={...backup(),schemaVersion:1};delete b.notationReadingProgress;delete b.rhythmLabProgress;assert.deepEqual(prepareBackupRestore(b,validators).notationReadingProgress,{})});
test('rejects corrupt song score and practice entries without writing',()=>{const a=backup();a.songs[0].score.valid=false;assert.throws(()=>prepareBackupRestore(a,validators),/bad score/);const b=backup();b.progress[0].minutes=Infinity;assert.throws(()=>prepareBackupRestore(b,validators),/Invalid practice/)});
test('validates optional score, progression and rhythm data before commit',()=>{let b=backup();b.progressionDraft={valid:false};assert.throws(()=>prepareBackupRestore(b,validators),/bad progression/);b=backup();b.rhythm=['D'];assert.throws(()=>prepareBackupRestore(b,validators),/Invalid strumming/)});
test('restores the original dual notation/tab display and instrument tuning',()=>{const b=backup();b.display='dual';b.tuning='lowG';const plan=prepareBackupRestore(b,validators);assert.equal(plan.display,'dual');assert.equal(plan.tuning,'lowG')});
test('commits all keys as JSON with read-after-write verification',()=>{const s=fakeStorage();const n=commitBackupRestore(s,{songs:[{id:'s'}],progress:[]});assert.equal(n,2);assert.deepEqual(JSON.parse(s.getItem('uw-songs')),[{id:'s'}]);assert.equal(s.getItem('uw-progress'),'[]')});
test('rolls back earlier writes on a simulated storage quota failure',()=>{const s=fakeStorage({failOnKey:'uw-progress'});const before=new Map(s.map);assert.throws(()=>commitBackupRestore(s,{songs:[],progress:[]}),/previous local data recovered/);assert.deepEqual(s.map,before)});
test('does not attempt any mutations when initial snapshot fails',()=>{let writes=0;const s={getItem(){throw Error('permission denied')},setItem(){writes++},removeItem(){writes++}};assert.throws(()=>commitBackupRestore(s,{songs:[]}),/permission denied/);assert.equal(writes,0)});
test('rejects unknown unsafe restoration keys',()=>{const s=fakeStorage();assert.throws(()=>commitBackupRestore(s,{'../secret':[]}),/Unsafe storage key/)});
test('device check reports limitations honestly on file/preview',async()=>{const s=fakeStorage();const r=await inspectDevice({browserLocation:{protocol:'file:'},environment:{},storage:s,secureContext:false});assert.equal(r.find(x=>x.id==='storage').status,'pass');assert.equal(r.find(x=>x.id==='worker').status,'action');assert.equal(r.find(x=>x.id==='microphone').status,'action')});
test('device check identifies an active worker on a served origin without requesting microphone access',async()=>{const r=await inspectDevice({browserLocation:{protocol:'https:'},environment:{serviceWorker:{getRegistration:async()=>({active:{}})},mediaDevices:{getUserMedia:()=>{throw Error('should not call')}},storage:{persisted:async()=>true}},storage:fakeStorage(),secureContext:true});assert.equal(r.find(x=>x.id==='worker').status,'pass');assert.equal(r.find(x=>x.id==='microphone').status,'available');assert.equal(r.find(x=>x.id==='persistence').status,'pass')});

test('cache readiness checks only known same-origin app assets and never calls fetch',async()=>{
 const queried=[];
 const c={async match(url){queried.push(url);return {text:async()=>'<cached>'}}};
 const env={serviceWorker:{getRegistration:async()=>({active:{}})}};
 const r=await inspectDevice({browserLocation:{protocol:'https:',href:'https://example.org/ukulele/'},environment:env,storage:fakeStorage(),cacheStorage:c,secureContext:true});
 assert.equal(r.find(x=>x.id==='offline-shell').status,'pass');
 assert.equal(queried.length,5);
 assert.ok(queried.every(u=>u.startsWith('https://example.org/ukulele/')));
 assert.match(r.find(x=>x.id==='offline-shell').detail,/offline reload is still required/);
});
test('missing offline cached assets are reported as action not falsely marked offline ready',async()=>{
 const r=await inspectDevice({browserLocation:{protocol:'https:',href:'https://example.org/ukulele/'},environment:{},storage:fakeStorage(),cacheStorage:{match:async()=>undefined},secureContext:true});
 assert.equal(r.find(x=>x.id==='offline-shell').status,'action');
 assert.match(r.find(x=>x.id==='offline-shell').detail,/0\/5/);
});
