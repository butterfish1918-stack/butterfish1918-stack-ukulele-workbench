/** Multi-part, multi-voice MusicXML bridge. Preserves independent rhythmic voices,
 * ties/articulations, dynamics and tuplets when representable. Rejects unsupported
 * constructs instead of flattening polyphony into one misleading ukulele score.
 */
import {validateScoreDocument} from './polyphonic-score.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const child=(el,name)=>[...(el?.children||[])].find(e=>e.tagName===name)||null;
const children=(el,name)=>[...(el?.children||[])].filter(e=>e.tagName===name);
const val=(el,name,fallback='')=>child(el,name)?.textContent?.trim()??fallback;
const semitones={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const dynamicNames=['pp','p','mp','mf','f','ff'];
export function importMultiPartMusicXML(xml,{DOMParserClass=globalThis.DOMParser}={}){
 if(typeof xml!=='string'||xml.length>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid or unsafe MusicXML input');
 if(typeof DOMParserClass!=='function')throw Error('Browser XML parser required');
 const document=new DOMParserClass().parseFromString(xml,'application/xml');
 if(document.querySelector('parsererror'))throw Error('Malformed MusicXML');
 const root=document.documentElement;
 if(root.tagName!=='score-partwise')throw Error('Only score-partwise MusicXML is supported');
 const list=child(root,'part-list');const names=new Map(children(list,'score-part').map(x=>[x.getAttribute('id'),val(x,'part-name','Part')]));
 const rawParts=children(root,'part');if(!rawParts.length||rawParts.length>16)throw Error('MusicXML must contain 1–16 parts');
 const firstMeasures=children(rawParts[0],'measure');
 if(!firstMeasures.length||firstMeasures.length>200)throw Error('Invalid number of measures');
 let meter='4/4',tempo=96;const result=[];
 for(const [pIndex,part]of rawParts.entries()){
  const measures=children(part,'measure');
  if(measures.length!==firstMeasures.length)throw Error('Every part must have the same measure count');
  let divisions=1,partMeter=null,dynamics='mf';
  const byVoice=new Map();
  for(const [mi,measure]of measures.entries()){
   const attr=child(measure,'attributes');
   if(attr){
    const d=Number(val(attr,'divisions',''));if(d>0)divisions=d;
    const time=child(attr,'time');if(time)partMeter=val(time,'beats','4')+'/'+val(time,'beat-type','4');
    if(partMeter){if(mi===0&&pIndex===0)meter=partMeter;else if(partMeter!==meter)throw Error('Meter changes require explicit split into songs')}
   }
   if(mi===0&&pIndex===0){
    const sound=[...measure.getElementsByTagName('sound')].find(x=>x.hasAttribute('tempo'));
    if(sound)tempo=Math.round(Number(sound.getAttribute('tempo')));
   }
   let position=0,lastOnset=0;
   for(const el of measure.children){
    if(el.tagName==='backup'){position-=Number(val(el,'duration','0'))/divisions;continue}
    if(el.tagName==='forward'){position+=Number(val(el,'duration','0'))/divisions;continue}
    if(el.tagName==='direction'){
     const tag=child(child(el,'direction-type'),'dynamics');
     if(tag){const candidate=tag.firstElementChild?.tagName;if(dynamicNames.includes(candidate))dynamics=candidate}
     continue;
    }
    if(el.tagName!=='note')continue;
    if(child(el,'grace'))throw Error('Grace notes require a separate licensed conversion');
    const duration=Number(val(el,'duration','0'))/divisions;
    if(!Number.isFinite(duration)||duration<=0||duration>12)throw Error('Invalid rhythmic duration');
    const chord=!!child(el,'chord'),onset=chord?lastOnset:position;
    if(!chord)position+=duration;lastOnset=onset;
    const voiceId=val(el,'voice','1');
    if(!byVoice.has(voiceId))byVoice.set(voiceId,Array.from({length:measures.length},()=>({events:[]})));
    const rest=!!child(el,'rest'),pitch=child(el,'pitch');
    const step=val(pitch,'step','C'),alter=Number(val(pitch,'alter','0')),octave=Number(val(pitch,'octave','4'));
    const midi=rest?null:(octave+1)*12+(semitones[step]??0)+alter;
    const articulation=child(child(child(el,'notations'),'articulations'),'staccato')?'staccato':
      child(child(child(el,'notations'),'articulations'),'accent')?'accent':'none';
    const technical=child(child(el,'notations'),'technical'),finger=Number(val(technical,'fingering',''));
    const timeMod=child(el,'time-modification'),actual=Number(val(timeMod,'actual-notes','')),normal=Number(val(timeMod,'normal-notes',''));
    const tuplet=timeMod&&actual>=2&&normal>=1?{actual,normal}:undefined;
    byVoice.get(voiceId)[mi].events.push({type:rest?'rest':'note',onset,duration,
     ...(rest?{}:{midi}),dynamics,articulation,...(finger>=0&&finger<=4&&val(technical,'fingering')!==''?{finger}:{}),
     ...(tuplet?{tuplet}:{})});
   }
  }
  const id=part.getAttribute('id')||'P'+(pIndex+1),name=names.get(id)||'Instrument '+(pIndex+1);
  result.push({id,name,instrument:name.toLowerCase().includes('ukulele')?'ukulele':
   name.toLowerCase().includes('piano')?'piano':
   name.toLowerCase().includes('bass')?'bass':
   name.toLowerCase().includes('flute')?'flute':'unknown',
   voices:[...byVoice].map(([id,measures])=>({id,measures}))});
 }
 const score={schema:2,title:val(root,'movement-title',val(child(root,'work'),'work-title','Imported ensemble')),tempo,
  meter,measures:firstMeasures.length,parts:result};
 validateScoreDocument(score);return score;
}
export function exportMultiPartMusicXML(doc){
 validateScoreDocument(doc);
 const [beats,unit]=doc.meter.split('/').map(Number),divisions=480,length=beats*4/unit*divisions;
 const header=`<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><work><work-title>${esc(doc.title)}</work-title></work><movement-title>${esc(doc.title)}</movement-title><part-list>${doc.parts.map(x=>`<score-part id="${esc(x.id)}"><part-name>${esc(x.name)}</part-name></score-part>`).join('')}</part-list>`;
 const xml=doc.parts.map(part=>`<part id="${esc(part.id)}">${Array.from({length:doc.measures},(_,mi)=>{
  const voices=part.voices;
  const attrs=mi===0?`<attributes><divisions>${divisions}</divisions><time><beats>${beats}</beats><beat-type>${unit}</beat-type></time></attributes><direction><sound tempo="${doc.tempo}"/></direction>`:'';
  const content=voices.map((voice,index)=>{
   let cursor=0;
   const events=[...voice.measures[mi].events].sort((a,b)=>a.onset-b.onset);
   const notes=events.map(ev=>{
    let out='';
    const start=Math.round(ev.onset*divisions),dur=Math.round(ev.duration*divisions);
    if(start<cursor)throw Error('Overlapping notes in one voice need explicit chord encoding before MusicXML export');
    if(start>cursor)out+=`<forward><duration>${start-cursor}</duration></forward>`;
    cursor=start+dur;
    const pitch=ev.type==='rest'?'<rest/>':(()=>{
     const pc=(ev.midi%12+12)%12,stepNames=['C','C','D','D','E','F','F','G','G','A','A','B'],steps=stepNames[pc],alt=[0,1,0,1,0,0,1,0,1,0,1,0][pc];
     return `<pitch><step>${steps}</step>${alt?'<alter>1</alter>':''}<octave>${Math.floor(ev.midi/12)-1}</octave></pitch>`;
    })();
    const dynamics=ev.dynamics&&ev.dynamics!=='mf'?`<notations><dynamics><${ev.dynamics}/></dynamics></notations>`:'';
    return out+`<note>${pitch}<duration>${dur}</duration><voice>${esc(voice.id)}</voice>${dynamics}</note>`;
   }).join('');
   return (index?`<backup><duration>${length}</duration></backup>`:'')+notes;
  }).join('');
  return `<measure number="${mi+1}">${attrs}${content}</measure>`;
 }).join('')}</part>`).join('');
 return header+xml+'</score-partwise>';
}
