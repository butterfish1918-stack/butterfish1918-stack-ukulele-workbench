/** Reproducibly bundle the public-domain FreePats real ukulele recordings into the
 * GitHub Pages release. No npm dependency. The source is pinned to its initial commit.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const REF='86d345f6f7b79a106ace98eca0da19b087786dba';
const ROOT='https://raw.githubusercontent.com/freepats/ukulele1/'+REF+'/samples/';
const NAMES=['C4','D4','E4','F#4','G4','A4','B4','C#5','D#5','F5','G5','A5','C6'];
const dest=resolve('_site/assets/ukulele');
await mkdir(dest,{recursive:true});
await Promise.all(NAMES.map(async name=>{
 const response=await fetch(ROOT+encodeURIComponent(name)+'.flac',{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Missing FreePats ukulele sample '+name+': '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<512 || bytes.toString('ascii',0,4)!=='fLaC')throw Error('Invalid FLAC audio source: '+name);
 await writeFile(resolve(dest,name+'.flac'),bytes);
 process.stdout.write('Bundled '+name+'.flac ('+bytes.length+' bytes)\n');
}));
await writeFile(resolve(dest,'SOURCE.txt'),
 'Ukulele audio samples: FreePats Ukulele (2026-08-11), recorded by Mateusz Dąbrowski.\nLicense: Creative Commons CC0 1.0 Universal (public-domain dedication).\nSource: https://github.com/freepats/ukulele1\nPinned source commit: '+REF+'\n');
