/** Local WebAudio timbres for instrument roles not covered by recorded sample banks.
 * These are synthesised reference sounds, never original stems or singer recordings.
 */
export const MODELLED_INSTRUMENTS=Object.freeze(['flute','strings','synthesizer','guitar','vocals']);
const profiles={
 flute:{types:['sine','sine'],partials:[1,2],amps:[.95,.08],attack:.055,release:.10,cutoff:5400},
 strings:{types:['sawtooth','triangle'],partials:[1,1],amps:[.25,.26],attack:.20,release:.32,cutoff:1900},
 synthesizer:{types:['sawtooth','sine'],partials:[1,2],amps:[.26,.16],attack:.14,release:.28,cutoff:1550},
 guitar:{types:['triangle','sine'],partials:[1,2],amps:[.72,.12],attack:.004,release:.25,cutoff:3300},
 vocals:{types:['sawtooth','sine'],partials:[1,2],amps:[.20,.06],attack:.12,release:.23,cutoff:1000}
};
export function playbackInstrumentFamily(value){
 const input=String(value||'').toLowerCase();
 if(input.includes('flute'))return 'flute';
 if(input.includes('strings')||input.includes('violin')||input.includes('cello'))return 'strings';
 if(input.includes('synth')||input.includes('mellotron')||input.includes('stylophone'))return 'synthesizer';
 if(input.includes('guitar'))return 'guitar';
 if(input.includes('vocal')||input.includes('voice'))return 'vocals';
 return null;
}
export function playableNoteRange(instrument){
 return ({flute:[60,96],strings:[43,96],synthesizer:[36,96],guitar:[40,88],vocals:[48,84]})[instrument]||null;
}
export function playModelledInstrument(ctx,instrument,midi,when,duration=1,volume=.12){
 const profile=profiles[instrument],range=playableNoteRange(instrument);
 if(!profile||!ctx?.createOscillator||!Number.isInteger(midi)||midi<range[0]||midi>range[1])return null;
 const start=Math.max(ctx.currentTime+.004,when),length=Math.max(.06,Math.min(16,duration));
 const fundamental=440*Math.pow(2,(midi-69)/12);
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=profile.cutoff;
 const gain=ctx.createGain(),max=Math.min(.18,Math.max(0,volume));
 gain.gain.setValueAtTime(.00001,start);
 gain.gain.linearRampToValueAtTime(max,start+Math.min(profile.attack,length/3));
 gain.gain.setValueAtTime(max*.66,start+Math.max(profile.attack,length*.66));
 gain.gain.exponentialRampToValueAtTime(.00001,start+length+profile.release);
 filter.connect(gain);gain.connect(ctx.destination);
 const nodes=profile.types.map((type,i)=>{
  const osc=ctx.createOscillator();
  osc.type=type;osc.frequency.setValueAtTime(fundamental*profile.partials[i],start);
  osc.detune.value=(i===1?3:-2);
  const partial=ctx.createGain();partial.gain.value=profile.amps[i];
  osc.connect(partial);partial.connect(filter);
  osc.start(start);osc.stop(start+length+profile.release+.03);
  return osc;
 });
 return {stop:(at=ctx.currentTime)=>{for(const node of nodes)try{node.stop(at)}catch{}},
  instrument,modelled:true};
}
