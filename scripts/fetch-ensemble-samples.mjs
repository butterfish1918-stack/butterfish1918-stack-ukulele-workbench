/** Reproducible CC0 FreePats backing-sample build, separate from app source. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const packs=[
 {name:'bass',repo:'electric-bass-YR',ref:'8dcb7ea9116f417273ef8c030d15e7b3aa654301',subdir:'samples/finger',samples:['E','F','F#','G','G#','A','A#','B','C','C#','D','D#']},
 {name:'piano',repo:'fm-piano2',ref:'2e1241f5db3ff6b938b1645a2f2f82f7e510c708',subdir:'samples',samples:['C3v80','F#3v80','C4v80','F#4v80','C5v80','F#5v80']}
];
for(const pack of packs){
 const dest=resolve('_site/assets/ensemble',pack.name);
 await mkdir(dest,{recursive:true});
 for(const pitch of pack.samples){
  const url='https://raw.githubusercontent.com/freepats/'+pack.repo+'/'+pack.ref+'/'+pack.subdir+'/'+encodeURIComponent(pitch)+'.flac';
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Unable to fetch '+url+': '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<512||bytes.toString('ascii',0,4)!=='fLaC')throw Error('Not a valid FLAC recording: '+pitch);
  const name=pack.name==='piano'?pitch.replace('v80',''):pitch;
  await writeFile(resolve(dest,name+'.flac'),bytes);
  process.stdout.write('Bundled '+pack.name+'/'+name+'.flac ('+bytes.length+' bytes)\n');
 }
 await writeFile(resolve(dest,'SOURCE.txt'),
  'CC0 1.0 public-domain recorded samples; FreePats project.\n'+
  'Repository: https://github.com/freepats/'+pack.repo+'\nPinned commit: '+pack.ref+'\n'+
  (pack.name==='bass'?'Electric bass recordings by Andrea Biasior.\n':'FM electric piano recordings from FreePats.\n'));
}
