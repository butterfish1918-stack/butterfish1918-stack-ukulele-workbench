/** GitHub Pages deployment: make each release activate a fresh offline shell. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const revision=(process.argv[2] || process.env.GITHUB_SHA || '').slice(0,12);
if (!/^[0-9a-f]{12}$/i.test(revision)) throw Error('Expected a 12-character commit SHA');
const file=resolve(process.argv[3] || '_site/sw.js');
const source=readFileSync(file,'utf8');
const pattern=/^const CACHE = `\$\{CACHE_PREFIX\}[^`]+`;$/m;
if (!pattern.test(source)) throw Error('Expected Ukulele Workbench cache declaration not found');
const updated=source.replace(pattern,`const CACHE = \`\${CACHE_PREFIX}pages-${revision}\`;`);
writeFileSync(file,updated);
console.log('Stamped deployed service-worker cache:',`uke-workbench-pages-${revision}`);
