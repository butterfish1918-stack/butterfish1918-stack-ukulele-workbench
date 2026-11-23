/** CC0 sound banks for original, generated practice backings.
 * Electric bass: FreePats Electric Bass YR (Andrea Biasior, 2019).
 * FM electric piano: FreePats FM Piano 2. Both sounds are samples, not oscillators.
 */
const bassNames=['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];
export const BACKING_SAMPLES=Object.freeze({
 bass:bassNames.map((name,i)=>({midi:28+i,name})),
 piano:[{midi:48,name:'C3'},{midi:54,name:'F#3'},{midi:60,name:'C4'},{midi:66,name:'F#4'},{midi:72,name:'C5'},{midi:78,name:'F#5'}]
});
export const DRUM_HITS=Object.freeze(['kick','snare','hat']);
const banks=new WeakMap(),pendingByContext=new WeakMap();
export function closestBackingSample(instrument,midi){
 const bank=BACKING_SAMPLES[instrument];
 if(!bank||!Number.isFinite(midi))throw Error('Unknown backing instrument or pitch');
 return bank.reduce((best,item)=>Math.abs(item.midi-midi)<Math.abs(best.midi-midi)?item:best,bank[0]);
}
export async function prepareBackingSamples(ctx,requests,{fetcher=fetch,base='./assets/ensemble/'}={}){
 if(!ctx?.decodeAudioData)throw Error('Audio decoding unavailable');
 let bank=banks.get(ctx);if(!bank){bank=new Map();banks.set(ctx,bank)}
 let pending=pendingByContext.get(ctx);if(!pending){pending=new Map();pendingByContext.set(ctx,pending)}
 const needs=new Map();
 for(const request of requests){
  if(!request||!['bass','piano','drums'].includes(request.instrument))continue;
  if(request.instrument==='drums'){
   for(const name of request.hits||[]){
    if(!/^(acoustic|electronic)-(kick|snare|hat)$/.test(name))throw Error('Unsupported percussion sample '+name);
    needs.set('drums/'+name,{instrument:'drums',name});
   }
   continue;
  }
  for(const midi of request.midis||[]){
   const closest=closestBackingSample(request.instrument,midi);
   needs.set(request.instrument+'/'+closest.name,{instrument:request.instrument,...closest});
  }
 }
 const errors=[];
 await Promise.all([...needs.entries()].map(async([key,sample])=>{
  if(bank.has(key))return;
  if(!pending.has(key)){
   const promise=(async()=>{
    const path=sample.instrument+'/'+encodeURIComponent(sample.name)+(sample.instrument==='drums'?'.m4a':'.flac');
    const response=await fetcher(new URL(path,new URL(base,document.baseURI)).href,{credentials:'same-origin'});
    if(!response.ok)throw Error('Missing '+path+': '+response.status);
    const decoded=await ctx.decodeAudioData(await response.arrayBuffer());
    if(!(decoded?.duration>.05))throw Error('Invalid sample '+path);
    bank.set(key,decoded);
   })();
   pending.set(key,promise);
   promise.finally(()=>{if(pending.get(key)===promise)pending.delete(key)}).catch(()=>{});
  }
  try{await pending.get(key)}catch(error){errors.push(error.message)}
 }));
 return {total:needs.size,loaded:[...needs.keys()].filter(key=>bank.has(key)).length,errors};
}
export function playBackingSample(ctx,instrument,midi,at,duration=.5,volume=.09){
 const root=closestBackingSample(instrument,midi),buffer=banks.get(ctx)?.get(instrument+'/'+root.name);
 if(!buffer)return null;
 const rate=Math.pow(2,(midi-root.midi)/12);
 const source=ctx.createBufferSource();source.buffer=buffer;source.playbackRate.setValueAtTime(rate,at);
 const env=ctx.createGain();
 const end=at+Math.max(.12,Math.min(buffer.duration/rate,Math.max(.26,duration*1.12)));
 const rel=Math.min(.10,(end-at)*.25);
 env.gain.setValueAtTime(0,at);
 env.gain.linearRampToValueAtTime(volume,at+.01);
 env.gain.setValueAtTime(volume,Math.max(at+.012,end-rel));
 env.gain.linearRampToValueAtTime(0,end);
 source.connect(env).connect(ctx.destination);
 source.start(at);source.stop(end+.008);
 return source;
}

/** Play one licensed recorded drum hit without melodic pitch shifting.
 * Drums are key-specific one-shots, not sine-wave approximations.
 */
export function playDrumSample(ctx,hit,at,volume=.12,style='acoustic'){
 if(!DRUM_HITS.includes(hit))throw Error('Unsupported drum hit');
 const name=(style==='electronic'?'electronic':'acoustic')+'-'+hit;
 const buffer=banks.get(ctx)?.get('drums/'+name);
 if(!buffer)return null;
 const source=ctx.createBufferSource();source.buffer=buffer;
 const gain=ctx.createGain();gain.gain.value=Math.max(0,Math.min(.5,volume));
 source.connect(gain).connect(ctx.destination);
 source.start(at);source.stop(at+Math.max(.05,buffer.duration));
 return source;
}
