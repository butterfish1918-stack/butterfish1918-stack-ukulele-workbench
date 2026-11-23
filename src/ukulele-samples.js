/** Recorded tenor-ukulele samples (CC0): FreePats Ukulele, Mateusz Dąbrowski.
 * Loaded from same-origin assets generated during GitHub Pages deployment.
 * Each sample is one plucked note; pitch is adjusted by playback rate.
 * https://github.com/freepats/ukulele1 (2026-08-11)
 */
export const UKULELE_SAMPLE_ROOTS=Object.freeze([
 {midi:60,name:'C4'}, {midi:62,name:'D4'}, {midi:64,name:'E4'},
 {midi:66,name:'F#4'}, {midi:67,name:'G4'}, {midi:69,name:'A4'},
 {midi:71,name:'B4'}, {midi:73,name:'C#5'}, {midi:75,name:'D#5'},
 {midi:77,name:'F5'}, {midi:79,name:'G5'}, {midi:81,name:'A5'}, {midi:84,name:'C6'}
]);
const buffers=new WeakMap();
const loading=new WeakMap();

export function closestUkuleleSample(midi){
 if(!Number.isFinite(midi))throw Error('Invalid MIDI pitch for ukulele');
 return UKULELE_SAMPLE_ROOTS.reduce((best,sample)=>
  Math.abs(midi-sample.midi)<Math.abs(midi-best.midi)?sample:best,UKULELE_SAMPLE_ROOTS[0]);
}
/** Download/decode only pitches needed by the current song section.
 * Promise de-duplication avoids repeated requests when chords overlap.
 * The service worker caches successful FLAC responses for later offline use.
 */
export async function prepareUkuleleSamples(ctx,midis,{base='./assets/ukulele/',fetcher=fetch}={}){
 if(!ctx?.decodeAudioData)throw Error('Web Audio decoding is not available');
 if(!Array.isArray(midis))throw Error('Expected an array of pitches');
 let bank=buffers.get(ctx);if(!bank){bank=new Map();buffers.set(ctx,bank)}
 let pending=loading.get(ctx);if(!pending){pending=new Map();loading.set(ctx,pending)}
 const names=new Map(midis.map(midi=>{const root=closestUkuleleSample(midi);return [root.name,root]}));
 const errors=[];
 await Promise.all([...names.values()].map(async root=>{
  if(bank.has(root.name))return;
  if(!pending.has(root.name)){
   const download=(async()=>{
    const url=new URL(encodeURIComponent(root.name)+'.flac',new URL(base,document.baseURI)).href;
    const response=await fetcher(url,{credentials:'same-origin'});
    if(!response.ok)throw Error('Recorded ukulele note '+root.name+' unavailable ('+response.status+')');
    const bytes=await response.arrayBuffer();
    const decoded=await ctx.decodeAudioData(bytes);
    if(!decoded?.duration||decoded.duration<.05)throw Error('Recorded ukulele sample invalid');
    bank.set(root.name,decoded);
   })();
   pending.set(root.name,download);
   download.finally(()=>{if(pending.get(root.name)===download)pending.delete(root.name)}).catch(()=>{});
  }
  try{await pending.get(root.name)}catch(error){errors.push(error.message)}
 }));
 return {loaded:[...names.keys()].filter(name=>bank.has(name)).length,total:names.size,errors};
}
export function playUkuleleSample(ctx,midi,at,duration=.35,volume=.1){
 const root=closestUkuleleSample(midi);
 const buffer=buffers.get(ctx)?.get(root.name);
 if(!buffer)return null;
 const rate=Math.pow(2,(midi-root.midi)/12);
 const voice=ctx.createBufferSource();voice.buffer=buffer;voice.playbackRate.setValueAtTime(rate,at);
 const gain=ctx.createGain();
 const end=at+Math.max(.10,Math.min(buffer.duration/rate,Math.max(.22,duration*1.12)));
 const release=Math.min(.09,(end-at)*.24);
 gain.gain.setValueAtTime(0,at);
 gain.gain.linearRampToValueAtTime(Math.max(.001,volume)*.82,at+.008);
 gain.gain.setValueAtTime(Math.max(.001,volume)*.82,Math.max(at+.009,end-release));
 gain.gain.linearRampToValueAtTime(0,end);
 voice.connect(gain).connect(ctx.destination);
 voice.start(at);voice.stop(end+.008);
 return voice;
}
