/** Multi-part, multi-voice MusicXML bridge. Preserves independent rhythmic voices,
 * ties/articulations, dynamics and tuplets when representable. Rejects unsupported
 * constructs instead of flattening polyphony into one misleading ukulele score.
 */
import {validateScoreDocument,writtenPitchForMidi} from './polyphonic-score.js';
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
 const prohibited=['transpose','harmony','sound-deviation'];
 for(const tag of prohibited)if(root.getElementsByTagName(tag).length)throw Error('Unsupported MusicXML element: '+tag);
 for(const part of rawParts)for(const measure of children(part,'measure')){
  for(const line of children(measure,'barline'))
   if(line.getElementsByTagName('repeat').length||line.getElementsByTagName('ending').length)throw Error('Repeats and endings require expanded MusicXML measures');
  for(const note of children(measure,'note'))
   if(child(note,'tie')||child(child(note,'notations'),'tied'))throw Error('Tied notes require explicit supported conversion');
 }
 const firstMeasures=children(rawParts[0],'measure');
 if(!firstMeasures.length||firstMeasures.length>200)throw Error('Invalid number of measures');
 let meter='4/4',tempo=96;const result=[];
 for(const [pIndex,part]of rawParts.entries()){
  const measures=children(part,'measure');
  if(measures.length!==firstMeasures.length)throw Error('Every part must have the same measure count');
  let divisions=1,partMeter=null,dynamics='mf';
  const voiceDynamics=new Map();
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
   let position=0,lastOnset=0,lastVoice=null;
   for(const el of measure.children){
    if(el.tagName==='backup'){position-=Number(val(el,'duration','0'))/divisions;lastVoice=null;if(position<0)throw Error('Invalid MusicXML voice backup');continue}
    if(el.tagName==='forward'){position+=Number(val(el,'duration','0'))/divisions;lastVoice=null;continue}
    if(el.tagName==='direction'){
     const tag=child(child(el,'direction-type'),'dynamics');
     if(tag){const candidate=tag.firstElementChild?.tagName;if(dynamicNames.includes(candidate)){
      const directionVoice=val(el,'voice','');
      if(directionVoice)voiceDynamics.set(directionVoice,candidate);else dynamics=candidate;
     }}
     continue;
    }
    if(el.tagName!=='note')continue;
    if(child(el,'grace'))throw Error('Grace notes require a separate licensed conversion');
    const duration=Number(val(el,'duration','0'))/divisions;
    if(!Number.isFinite(duration)||duration<=0||duration>12)throw Error('Invalid rhythmic duration');
    const chord=!!child(el,'chord'),voiceId=val(el,'voice','1');
    if(chord&&lastVoice!==voiceId)throw Error('MusicXML chord must follow a note in the same voice');
    const onset=chord?lastOnset:position;
    if(!chord)position+=duration;lastOnset=onset;lastVoice=voiceId;
    if(!byVoice.has(voiceId))byVoice.set(voiceId,Array.from({length:measures.length},()=>({events:[]})));
    const rest=!!child(el,'rest'),pitch=child(el,'pitch');
    const step=val(pitch,'step','C'),alter=Number(val(pitch,'alter','0')),octave=Number(val(pitch,'octave','4'));
    if(!rest&&(!pitch||!Object.hasOwn(semitones,step)||!Number.isInteger(alter)||Math.abs(alter)>2||!Number.isInteger(octave)||octave<0||octave>8))throw Error('Invalid MusicXML pitch');
    const midi=rest?null:(octave+1)*12+semitones[step]+alter;
    const spelling=rest?null:step+(alter>0?'#'.repeat(alter):'b'.repeat(-alter));
    const notations=child(el,'notations'),art=child(notations,'articulations');
    const articulation=child(art,'staccato')?'staccato':child(art,'tenuto')?'tenuto':
      child(art,'accent')?'accent':child(art,'strong-accent')?'marcato':
      child(notations,'fermata')?'fermata':child(child(notations,'ornaments'),'trill-mark')?'trill':'none';
    const technical=child(child(el,'notations'),'technical'),finger=Number(val(technical,'fingering',''));
    const timeMod=child(el,'time-modification'),actual=Number(val(timeMod,'actual-notes','')),normal=Number(val(timeMod,'normal-notes',''));
    const tuplet=timeMod&&actual>=2&&normal>=1?{actual,normal}:undefined;
    byVoice.get(voiceId)[mi].events.push({type:rest?'rest':'note',onset,duration,
     ...(rest?{}:{midi,spelling}),dynamics:voiceDynamics.get(voiceId)??dynamics,articulation,...(finger>=0&&finger<=4&&val(technical,'fingering')!==''?{finger}:{}),
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
/** Export polyphonic MusicXML with cursor-correct voice backups and real chord
 * groups. Written annotations are carried through the interchange rather than
 * silently dropped; the canonical score document remains the source of truth.
 */
export function exportMultiPartMusicXML(doc){
 validateScoreDocument(doc);
 const [beats,unit]=doc.meter.split('/').map(Number),divisions=480;
 const header='<?xml version="1.0" encoding="utf-8"?>'+
  '<score-partwise version="4.0"><work><work-title>'+esc(doc.title)+'</work-title></work>'+
  '<movement-title>'+esc(doc.title)+'</movement-title><part-list>'+
  doc.parts.map(part=>'<score-part id="'+esc(part.id)+'"><part-name>'+esc(part.name)+'</part-name></score-part>').join('')+'</part-list>';
 const encodePitch=(midi,spelling)=>{
  if(spelling){
   const {step,alter,octave}=writtenPitchForMidi(midi,spelling);
   return '<pitch><step>'+step+'</step>'+(alter?'<alter>'+alter+'</alter>':'')+'<octave>'+octave+'</octave></pitch>';
  }
  const pc=(midi%12+12)%12;
  const step=['C','C','D','D','E','F','F','G','G','A','A','B'][pc];
  const alt=[0,1,0,1,0,0,1,0,1,0,1,0][pc];
  return '<pitch><step>'+step+'</step>'+(alt?'<alter>1</alter>':'')+
   '<octave>'+Math.floor(midi/12-1)+'</octave></pitch>';
 };
 const xml=doc.parts.map(part=>{
  const measures=Array.from({length:doc.measures},(_,mi)=>{
   const attrs=mi===0?'<attributes><divisions>'+divisions+'</divisions>'+
    '<time><beats>'+beats+'</beats><beat-type>'+unit+'</beat-type></time></attributes>'+
    '<direction><sound tempo="'+doc.tempo+'"/></direction>':'';
   let previousCursor=0;
   const voices=part.voices.map((voice,index)=>{
    let cursor=0,lastStart=-1,lastDuration=-1,lastType='';
    // Declare the first dynamic in each measure, including a return to mf.
    let currentDynamics=null;
    const events=[...voice.measures[mi].events].sort((a,b)=>a.onset-b.onset||b.duration-a.duration||((a.midi??0)-(b.midi??0)));
    const notes=events.map(ev=>{
     const start=Math.round(ev.onset*divisions),dur=Math.round(ev.duration*divisions);
     if(dur<1)throw Error('MusicXML resolution is too low for this duration');
     const isChord=ev.type==='note'&&lastType==='note'&&start===lastStart&&dur===lastDuration;
     if(start<cursor&&!isChord)throw Error('Overlapping notes in one voice require separate voices');
     let out='';
     if(start>cursor)out+='<forward><duration>'+(start-cursor)+'</duration></forward>';
     if(!isChord)cursor=start+dur;
     lastStart=start;lastDuration=dur;lastType=ev.type;
     if(ev.dynamics&&ev.dynamics!==currentDynamics){
      out+='<direction placement="below"><direction-type><dynamics><'+ev.dynamics+
       '/></dynamics></direction-type><voice>'+esc(voice.id)+'</voice></direction>';
      currentDynamics=ev.dynamics;
     }
     const pitch=ev.type==='rest'?'<rest/>':encodePitch(ev.midi,ev.spelling);
     const articulation=ev.articulation==='marcato'?'strong-accent':ev.articulation;
     let notation='';
     if(articulation==='fermata')notation+='<fermata/>';
     else if(articulation==='trill')notation+='<ornaments><trill-mark/></ornaments>';
     else if(articulation&&articulation!=='none')notation+='<articulations><'+articulation+'/></articulations>';
     if(ev.finger!==undefined)notation+='<technical><fingering>'+ev.finger+'</fingering></technical>';
     const tuplet=ev.tuplet?'<time-modification><actual-notes>'+ev.tuplet.actual+
      '</actual-notes><normal-notes>'+ev.tuplet.normal+'</normal-notes></time-modification>':'';
     return out+'<note>'+(isChord?'<chord/>':'')+pitch+'<duration>'+dur+'</duration>'+
      '<voice>'+esc(voice.id)+'</voice>'+tuplet+(notation?'<notations>'+notation+'</notations>':'')+'</note>';
    }).join('');
    const backup=index&&previousCursor>0?'<backup><duration>'+previousCursor+'</duration></backup>':'';
    previousCursor=cursor;
    return backup+notes;
   }).join('');
   return '<measure number="'+(mi+1)+'">'+attrs+voices+'</measure>';
  }).join('');
  return '<part id="'+esc(part.id)+'">'+measures+'</part>';
 }).join('');
 return header+xml+'</score-partwise>';
}
