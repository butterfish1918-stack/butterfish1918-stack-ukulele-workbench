import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createServer} from 'node:net';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){return await new Promise((resolvePort,reject)=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolvePort(n))});s.on('error',reject)})}
async function startServer(){
 const port=await freePort();const process=spawn(globalThis.process.execPath,['scripts/dev-server.mjs'],{cwd:root,env:{...globalThis.process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 const origin=`http://127.0.0.1:${port}`;
 for(let i=0;i<35;i++){
  if(process.exitCode!==null)throw Error('Dev server exited unexpectedly');
  try{const r=await fetch(origin+'/index.html');if(r.status===200)return {origin,process}}catch{}
  await new Promise(resolve=>setTimeout(resolve,60));
 }
 process.kill();throw Error('Dev server did not start');
}
test('dependency-free Node server serves PWA shell, scripts and install icons with correct headers',async()=>{
 const {origin,process}=await startServer();
 try{
  for(const [path,mime] of [['/','text/html'],['/src/app.js','text/javascript'],['/sw.js','text/javascript'],['/manifest.webmanifest','application/manifest+json'],['/assets/icon-192.png','image/png'],['/assets/icon-512.png','image/png']]){
   const r=await fetch(origin+path);assert.equal(r.status,200,path);assert.ok(r.headers.get('content-type')?.includes(mime),`bad MIME: ${path}`);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.ok((await r.arrayBuffer()).byteLength>100)
  }
  assert.equal((await fetch(origin+'/never-exists.js')).status,404);
  assert.equal((await fetch(origin+'/src/app.js',{method:'POST'})).status,405);
  assert.equal((await fetch(origin+'/src/app.js',{method:'HEAD'})).status,200);
 }finally{process.kill()}
});
