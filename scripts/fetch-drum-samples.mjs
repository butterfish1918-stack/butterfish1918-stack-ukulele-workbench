/** Bundle a tiny, source-pinned, CC0 real drum kit at deploy time.
 * Adapted first-party delivery of Virtuosity Drums (acoustic) and TR-808 (electronic)
 * recordings distributed by adewale/keyboardia. Source file LICENSE.md identifies
 * both as CC0 1.0 Universal; preserve provenance with the release.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const ref='aa67598560f8eaf2509a3ad4bc73edee2f8bea8a';
const root='https://raw.githubusercontent.com/adewale/keyboardia/'+ref+'/app/public/instruments/';
const files={
 'acoustic-kick':'acoustic-kick/source-0001.m4a',
 'acoustic-snare':'acoustic-snare/source-0004.m4a',
 'acoustic-hat':'acoustic-hihat-closed/source-0001.m4a',
 'electronic-kick':'808-kick/kick.mp3',
 'electronic-snare':'808-snare/snare.mp3',
 'electronic-hat':'808-hihat-closed/hihat.mp3'
};
const dir=resolve('_site/assets/ensemble/drums');
await mkdir(dir,{recursive:true});
for(const [key,path] of Object.entries(files)){
 const url=root+path;
 const response=await fetch(url,{signal:AbortSignal.timeout(22000)});
 if(!response.ok)throw Error('Cannot load CC0 drum '+url+': '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<500||(path.endsWith('.m4a')&&bytes.toString('ascii',4,8)!=='ftyp'))throw Error('Not a valid drum recording: '+url);
 await writeFile(resolve(dir,key+(path.endsWith('.mp3')?'.mp3':'.m4a')),bytes);
 process.stdout.write('Bundled drums/'+key+(path.endsWith('.mp3')?'.mp3':'.m4a')+' ('+bytes.length+' bytes)\n');
}
await writeFile(resolve(dir,'SOURCE.txt'),'Recorded drum one-shots from Virtuosity Drums / TR-808 CC0 source distributed by https://github.com/adewale/keyboardia\nSource revision: '+ref+'\nLicense: CC0 1.0 Universal (public-domain dedication), see https://github.com/adewale/keyboardia/blob/'+ref+'/app/public/instruments/LICENSE.md\nThese are recordings, not commercially copyrighted drum parts or original song transcriptions.\n');
