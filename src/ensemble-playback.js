/** Absolute-beat scheduling plan for a licensed/imported multi-part MusicXML score.
 * The source's real independent rhythmic voices are preserved, NOT copied from
 * a generated backing chart. This module is browser-free and unit testable.
 */
import {flattenDocumentEvents,validateScoreDocument} from './polyphonic-score.js';
import {playbackInstrumentFamily} from './instrument-voices.js';

const dynamicGain=Object.freeze({pp:.28,p:.40,mp:.55,mf:.68,f:.80,ff:.93});
export function ensembleInstrument(part){
 const name=String(part?.instrument||part?.name||'').toLowerCase();
 if(name.includes('ukulele'))return 'ukulele';
 if(name.includes('bass'))return 'bass';
 if(name.includes('piano')||name.includes('keyboard'))return 'piano';
 if(name.includes('drum')||name.includes('percussion'))return 'drums';
 return playbackInstrumentFamily(name)||'unsupported';
}
export function ensemblePlaybackPlan(doc,{startBar=1,endBar=doc?.measures}={}){
 validateScoreDocument(doc);
 if(!Number.isInteger(startBar)||!Number.isInteger(endBar)||startBar<1||endBar>doc.measures||startBar>endBar)
  throw Error('Invalid ensemble playback bar range');
 const beats=doc.meter.split('/').map(Number).reduce((a,b)=>a*4/b);
 const instruments=new Map(doc.parts.map(part=>[part.id,ensembleInstrument(part)]));
 const events=flattenDocumentEvents(doc).filter(ev=>ev.type==='note'&&ev.measureIndex+1>=startBar&&ev.measureIndex+1<=endBar)
 .map(ev=>{
  const instrument=instruments.get(ev.partId);
  const articulationFactor=ev.articulation==='staccato'?.48:ev.articulation==='tenuto'?.98:.88;
  return {id:`${ev.partId}:${ev.voiceId}:${ev.measureIndex}:${ev.onset}:${ev.midi}`,
   partId:ev.partId,instrument,voiceId:ev.voiceId,midi:ev.midi,
   onset:ev.absoluteOnset-(startBar-1)*beats,duration:ev.duration*articulationFactor,
   velocity:dynamicGain[ev.dynamics]??.65,
   originalDuration:ev.duration,measure:ev.measureIndex+1};
 }).sort((a,b)=>a.onset-b.onset||a.partId.localeCompare(b.partId)||a.voiceId.localeCompare(b.voiceId));
 const unsupported=[...new Set(events.filter(ev=>ev.instrument==='unsupported').map(ev=>ev.partId))];
 return {events,unsupported,totalBeats:(endBar-startBar+1)*beats,beatsPerBar:beats,startBar,endBar,
  trackIds:doc.parts.map(part=>({id:part.id,name:part.name,instrument:instruments.get(part.id)}))};
}
