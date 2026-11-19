import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const worker=readFileSync(resolve(root,'sw.js'),'utf8');
const ORIGIN='https://example.test/apps/ukulele-workbench/';

function environment({networkOnline=true, failInstall=false}={}){
 const listeners=new Map();const buckets=new Map();
 let activeFetches=0;let claimed=false;let skipped=false;
 const keyOf=request=>typeof request==='string'?request:request.url;
 function mockCache(name){
  const map=buckets.get(name);
  return {
   async addAll(paths){
    if(failInstall)throw Error('failed to fetch offline shell');
    for(const path of paths){
     const abs=new URL(path,ORIGIN);
     const local=resolve(root,path.replace(/^\.\//,''));
     assert.ok(existsSync(local),`missing pre-cache target ${path}`);
     map.set(abs.href,`precache:${path}`);
    }
   },
   async match(req,{ignoreSearch=false}={}){
    const input=keyOf(req);const parsed=new URL(input);
    if(ignoreSearch)parsed.search='';
    const value=map.get(parsed.href);
    return value===undefined?undefined:{text:async()=>value,clone(){return this}};
   },
   async put(req,response){map.set(keyOf(req),await response.text())}
  };
 }
 const caches={
  async open(key){if(!buckets.has(key))buckets.set(key,new Map());return mockCache(key)},
  async keys(){return [...buckets.keys()]},
  async delete(key){return buckets.delete(key)},
  async match(req,opts){for(const key of buckets.keys()){const item=await mockCache(key).match(req,opts);if(item)return item}return undefined}
 };
 const self={registration:{scope:ORIGIN},location:{origin:new URL(ORIGIN).origin},
  addEventListener(type,callback){listeners.set(type,callback)},
  async skipWaiting(){skipped=true},clients:{async claim(){claimed=true}}};
 const fetch=async request=>{
  activeFetches++;
  if(!networkOnline)throw Error('offline');
  const body=`online:${keyOf(request)}`;
  return {ok:true,type:'basic',async text(){return body},clone(){return {async text(){return body}}}};
 };
 runInNewContext(worker,{self,caches,fetch,URL,console});
 async function dispatch(type,request){
  const wait=[];let response;
  const event={request,waitUntil(promise){wait.push(Promise.resolve(promise))},respondWith(promise){response=Promise.resolve(promise)}};
  listeners.get(type)?.(event);
  const reply=response?await response:undefined;
  await Promise.all(wait);
  return reply;
 }
 return {buckets,caches,dispatch,setOffline(){networkOnline=false},get claimed(){return claimed},get skipped(){return skipped},get fetches(){return activeFetches}};
}
const request=(path,{mode='same-origin',method='GET'}={})=>({url:new URL(path,ORIGIN).href,method,mode});

test('offline shell includes all entry modules, PNG icons and manifest',async()=>{
 const env=environment();await env.dispatch('install');
 assert.equal(env.skipped,true);
 const own=[...env.buckets.keys()].find(k=>k.startsWith('uke-workbench-'));
 assert.ok(own,'app cache created');const entries=[...env.buckets.get(own).keys()];
 for(const path of ['index.html','styles.css','src/app.js','src/engraving.js','assets/icon-192.png','assets/icon-512.png','manifest.webmanifest'])
  assert.ok(entries.some(e=>e.endsWith('/'+path)),`${path} not pre-cached`);
});
test('activation deletes only older Ukulele Workbench caches, NEVER other apps',async()=>{
 const env=environment();await env.caches.open('other-guitar-app-v4');await env.caches.open('uke-workbench-v1.3.0-preview');
 await env.dispatch('install');await env.dispatch('activate');
 assert.equal(env.claimed,true);
 const keys=await env.caches.keys();
 assert.ok(keys.includes('other-guitar-app-v4'));
 assert.ok(!keys.includes('uke-workbench-v1.3.0-preview'));
 assert.ok(keys.includes('uke-workbench-v1.6.0-preview'));
});
test('offline navigation, query-string assets and modules are satisfied from pre-cache',async()=>{
 const env=environment();await env.dispatch('install');await env.dispatch('activate');env.setOffline();
 for(const [path,expected] of [['./','precache:./'],['./src/app.js?version=14','precache:./src/app.js'],['./index.html','precache:./index.html']]){
  const response=await env.dispatch('fetch',request(path,{mode:path==='./'?'navigate':'same-origin'}));
  assert.equal(await response.text(),expected);
 }
 const unknown=await env.dispatch('fetch',request('./composition/nonexistent',{mode:'navigate'}));
 assert.equal(await unknown.text(),'precache:./index.html');
});
test('service worker ignores unrelated origin/subpath and non-GET methods',async()=>{
 const env=environment();await env.dispatch('install');
 for(const req of [{url:'https://example.test/other-app/index.html',method:'GET'},{url:'https://unrelated.test/apps/ukulele-workbench/index.html',method:'GET'},request('./src/app.js',{method:'POST'})]){
  assert.equal(await env.dispatch('fetch',req),undefined);
 }
 assert.equal(env.fetches,0);
});
test('successful remote static fetch is cached; arbitrary dynamic URLs are not',async()=>{
 const env=environment();await env.dispatch('install');
 const first=await env.dispatch('fetch',request('./new-widget.js'));
 assert.match(await first.text(),/^online:/);
 const count=env.fetches;env.setOffline();
 const second=await env.dispatch('fetch',request('./new-widget.js'));
 assert.ok(await second.text());assert.equal(env.fetches,count);
 const env2=environment();await env2.dispatch('install');
 await env2.dispatch('fetch',request('./api/user-data'));env2.setOffline();
 await assert.rejects(()=>env2.dispatch('fetch',request('./api/user-data')),/offline/);
});
test('song catalog and song JSON refresh online even if pre-cached, then remain usable offline',async()=>{
 const env=environment();await env.dispatch('install');await env.dispatch('activate');
 for(const file of ['./library/catalog.json','./library/songs/first-melody-study.json']){
  const url=new URL(file,ORIGIN).href;
  const earlier=await env.caches.match(url);
  assert.equal(await earlier.text(),`precache:${file}`);
  const response=await env.dispatch('fetch',request(file));
  assert.equal(await response.text(),`online:${url}`,'online sync bypasses old pre-cache');
  const newer=await env.caches.match(url);
  assert.equal(await newer.text(),`online:${url}`,'latest online JSON saved as offline copy');
 }
 const fetches=env.fetches;
 env.setOffline();
 const offline=await env.dispatch('fetch',request('./library/catalog.json'));
 assert.equal(await offline.text(),`online:${new URL('./library/catalog.json',ORIGIN).href}`);
 assert.equal(env.fetches,fetches+1,'attempts network before cache fallback');
});

test('failed installation does not activate worker with incomplete offline assets',async()=>{
 const env=environment({failInstall:true});
 await assert.rejects(()=>env.dispatch('install'),/failed to fetch offline shell/);
 assert.equal(env.skipped,false);
});
