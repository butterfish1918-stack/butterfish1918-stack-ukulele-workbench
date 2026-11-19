import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {createScore,validateScore} from '../src/score.js';
import {createProgression,buildProgressionScore} from '../src/progression.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const library=join(root,'library');await mkdir(join(library,'songs'),{recursive:true});
const tune='highG';
const melody=createScore({title:'First Melody — Notation Study',tuning:tune,key:'C',tempo:84});
const chords=buildProgressionScore(createProgression({title:'I–IV–V–I Chord Changes',tuning:tune,root:'C',mode:'major',tempo:80}));
for(const s of [melody,chords])validateScore(s);
const arrangements=[
 {id:'first-melody-study',revision:1,title:'First Melody — Notation Study',artist:'Ukulele Workbench',difficulty:'beginner',tags:['notation','melody','original'],key:'C',bpm:84,tuning:tune,description:'An original two-measure score to practise reading pitches, rests, quarter and half notes.',body:'',notes:'Read the staff before revealing tablature. Begin at 60–84 BPM and practise accurate note lengths.',score:melody},
 {id:'primary-chord-changes',revision:1,title:'I–IV–V–I Chord Changes',artist:'Ukulele Workbench',difficulty:'beginner',tags:['chords','strumming','original'],key:'C',bpm:80,tuning:tune,description:'Original four-bar C–F–G–C progression with playable tuning-aware chord voicings.',body:'',notes:'Count four quarter beats per measure. Practise slow and even changes before increasing tempo.',score:chords}
 ];
const catalog={format:'ukulele-workbench-catalog',schemaVersion:1,name:'Ukulele Workbench — Starter Library',entries:arrangements.map(a=>({id:a.id,revision:a.revision,title:a.title,artist:a.artist,difficulty:a.difficulty,tags:a.tags,file:`songs/${a.id}.json`}))};
const songs={};for(const a of arrangements){const value={format:'ukulele-workbench-arrangement',schemaVersion:1,...a};songs[a.id]=value;await writeFile(join(library,'songs',`${a.id}.json`),JSON.stringify(value,null,2)+'\n')}
await writeFile(join(library,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
await writeFile(join(root,'src','library-seed.js'),`/** Built-in, original sample études available even in the standalone demo. */\nexport const BUNDLED_LIBRARY = ${JSON.stringify({catalogUrl:'./library/catalog.json',syncedAt:'Bundled starter content',catalog,songs})};\n`);
console.log('Created starter arrangements:',arrangements.map(a=>a.id).join(', '));
