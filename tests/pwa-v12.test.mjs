import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.webmanifest'),'utf8'));
test('the PWA has an installable scope and no accidental remote navigation in manifest',()=>{
 assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 assert.ok(manifest.icons?.some(x=>x.src.startsWith('./assets/')));
});
test('service worker pre-cache lists existing code and offline dependencies, including new renderer adapter and pitch detector',()=>{
 const listed=[...sw.matchAll(/'\.\/([^']+)'/g)].map(x=>x[1]).filter(x=>x);
 assert.ok(listed.includes('src/storage-safety.js'));assert.ok(listed.includes('src/device-qa.js'));assert.ok(listed.includes('src/engraving.js'));assert.ok(listed.includes('src/tuner-dsp.js'));
 for(const file of listed)assert.ok(existsSync(resolve(root,file)),`missing pre-cache asset: ${file}`);
 assert.ok(!sw.includes('cdn.jsdelivr.net'),'external engraving library must be on-demand, not block offline install');
 assert.ok(listed.includes('assets/icon-192.png')&&listed.includes('assets/icon-512.png'));
 assert.match(sw,/k\.startsWith\(CACHE_PREFIX\)/,'cache cleanup must be scoped to this app');
});
test('service worker cache version follows the current application release',()=>{
 assert.match(sw,/const CACHE_PREFIX = 'uke-workbench-'/);
 const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version.split('-')[0];
 assert.ok(sw.includes('v'+version+'-'),'new worker cache must use the app release version');
});
