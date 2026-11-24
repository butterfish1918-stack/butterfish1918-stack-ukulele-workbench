/** MusicXML 4.0 partwise interchange, single rhythmic voice.
 * This is NOT a general MusicXML parser/engraver. Unsupported notation is rejected,
 * never silently dropped. The native JSON backup remains lossless for app data.
 */
import {normalizeMusicXMLPrologue} from './musicxml-multipart.js';
import {TUNINGS,notePc,mod} from './music.js';
import {KEY_SIGNATURES,DURATIONS,baseDuration,isDotted,createScore,appendEvent,validateScore,findEvent,chordNotes,generatedChordNotes} from './score.js';
import {writtenOctave} from './reading-lessons.js';
import {accidentalMarks} from './score-view.js';

export const MUSICXML_DIVISIONS=8;
const escapeXML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const types={.25:'16th',.5:'eighth',1:'quarter',2:'half',4:'whole'};
const typeOf=duration=>types[baseDuration(duration)];
export const MUSICXML_IMPORT_PROFILE=Object.freeze({format:'MusicXML partwise',parts:1,voices:1,meters:['4/4','3/4','6/8'],maxMeasures:200,compressed:false,preserved:['pitch','spelling','duration','rests','ties','slurs','supported chord voicings','string/fret'],discardedPresentation:['print layout','page breaks','system breaks','stem direction','beam layout']});
const pcs={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const alterOf=spelling=>[...spelling.slice(1)].reduce((sum,a)=>sum+(a==='#'?1:-1),0);
const validatePitch=(midi,spelling)=>{if(notePc(spelling)!==mod(midi,12))throw new Error('Written pitch disagrees with sound');return `<pitch><step>${spelling[0]}</step>${alterOf(spelling)?`<alter>${alterOf(spelling)}</alter>`:''}<octave>${writtenOctave(midi,spelling)}</octave></pitch>`};
const technical=pos=>pos?`<technical><string>${4-pos.string}</string><fret>${pos.fret}</fret></technical>`:'';
const articulation=mark=>mark&&mark!=='none'?`<articulations><${mark}/></articulations>`:'';
const fromTie=(prev,ev)=>prev?.type==='note'&&prev.tieToNext&&ev?.type==='note';
const fromSlur=(prev,ev)=>prev?.type==='note'&&prev.slurToNext&&ev?.type==='note';
function kindFor(symbol){
 const match=/^([A-G])([#b]?)(maj7|m\(maj7\)|m7b5|dim7|m7|7|dim|aug|m)?$/.exec(symbol);
 if(!match)return null;
 const [,step,alter,suffix='']=match;
 const kinds={'':'major',m:'minor',dim:'diminished',aug:'augmented','7':'dominant','maj7':'major-seventh','m7':'minor-seventh','m(maj7)':'major-minor','m7b5':'half-diminished','dim7':'diminished-seventh'};
 return {step,alter:alter==='b'?-1:alter==='#'?1:0,suffix,kind:kinds[suffix]};
}
function harmony(symbol){
 const k=kindFor(symbol);
 if(!k)return `<direction placement="above"><direction-type><words>${escapeXML(symbol)}</words></direction-type></direction>`;
 return `<harmony><root><root-step>${k.step}</root-step>${k.alter?`<root-alter>${k.alter}</root-alter>`:''}</root><kind text="${escapeXML(k.suffix)}">${k.kind}</kind></harmony>`;
}
function noteXML(note,{duration,isChord=false,tieStart=false,tieStop=false,slurStart=false,slurStop=false,mark,accidental=''}={}){
 const tieXML=(tieStop?'<tie type="stop"/>':'')+(tieStart?'<tie type="start"/>':'');
 const tied=(tieStop?'<tied type="stop"/>':'')+(tieStart?'<tied type="start"/>':'');
 const slurs=(slurStop?'<slur number="1" type="stop"/>':'')+(slurStart?'<slur number="1" type="start"/>':'');
 const tech=technical(note?.position);
 const extra=articulation(mark);
 const accidentalName={'#':'sharp','b':'flat','##':'double-sharp','bb':'flat-flat',natural:'natural'}[accidental];
 const printedAccidental=accidentalName?`<accidental>${accidentalName}</accidental>`:'';
 const notes=tied+slurs+tech+extra;
 return `<note>${isChord?'<chord/>':''}${note?validatePitch(note.midi,note.spelling):'<rest/>'}<duration>${Math.round(duration*MUSICXML_DIVISIONS)}</duration>${tieXML}<voice>1</voice><type>${typeOf(duration)}</type>${isDotted(duration)?'<dot/>':''}${printedAccidental}${notes?`<notations>${notes}</notations>`:''}</note>`;
}
/** Export standard, uncompressed, single-part MusicXML. No hidden app JSON is embedded. */
export function exportMusicXML(score){
 validateScore(score);
 const time=score.meter.split('/').map(Number),key=score.key??'C';
 const parts=[];const all=score.measures.flatMap(m=>m.events);
 let globalIndex=0;
 for(const [mi,measure] of score.measures.entries()){
  let xml=`  <measure number="${mi+1}">\n`;
  if(mi===0){xml+=`    <attributes><divisions>${MUSICXML_DIVISIONS}</divisions><key><fifths>${KEY_SIGNATURES[key]}</fifths></key><time><beats>${time[0]}</beats><beat-type>${time[1]}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n`;
   xml+=`    <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${score.tempo}</per-minute></metronome></direction-type><sound tempo="${score.tempo}"/></direction>\n`;}
  const preceding=score.measures[mi-1]?.events.at(-1);const accidentals=accidentalMarks(measure.events,key,!!preceding?.tieToNext);
  for(const [ei,ev] of measure.events.entries()){
   const prev=all[globalIndex-1],next=all[globalIndex+1];
   if(ev.type==='chord'){
    xml+=`    ${harmony(ev.symbol)}\n`;
    if(ev.stroke!=='none')xml+=`    <direction placement="above"><direction-type><words>${ev.stroke==='down'?'Downstroke':'Upstroke'}</words></direction-type></direction>\n`;
    ev.notes.forEach((note,index)=>{xml+=`    ${noteXML(note,{duration:ev.duration,isChord:index>0,mark:index===0?ev.articulation:null,accidental:accidentals[ei]?.[index]})}\n`});
   }else{
    xml+=`    ${noteXML(ev.type==='note'?ev:null,{duration:ev.duration,tieStart:!!ev.tieToNext,tieStop:fromTie(prev,ev),slurStart:!!ev.slurToNext,slurStop:fromSlur(prev,ev),mark:ev.articulation,accidental:accidentals[ei]})}\n`;
   }
   globalIndex++;
  }
  xml+='  </measure>';parts.push(xml);
 }
 return `<?xml version="1.0" encoding="utf-8"?>\n<score-partwise version="4.0">\n  <work><work-title>${escapeXML(score.title)}</work-title></work>\n  <movement-title>${escapeXML(score.title)}</movement-title>\n  <identification><miscellaneous><miscellaneous-field name="ukulele-workbench-tuning">${escapeXML(score.tuning)}</miscellaneous-field></miscellaneous></identification>\n  <defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling></defaults>\n  <part-list><score-part id="P1"><part-name>Ukulele</part-name><part-abbreviation>Uk.</part-abbreviation><score-instrument id="Ieuke"><instrument-name>Ukulele</instrument-name></score-instrument></score-part></part-list>\n  <part id="P1">\n${parts.join('\n')}\n  </part>\n</score-partwise>\n`;
}

const children=(node,name)=>Array.from(node?.children||[]).filter(x=>x.localName===name);
const child=(node,name)=>children(node,name)[0]??null;
const value=(node,name)=>child(node,name)?.textContent?.trim()??null;
const nval=(node,name)=>Number(value(node,name));
const local=(node,name)=>node?.localName===name;
const attr=(node,name)=>node?.getAttribute(name)??null;
const validSymbol=(value)=>typeof value==='string'&&/^[A-G][#b]?(?:maj7|m\(maj7\)|m7b5|dim7|m7|7|dim|aug|m)?$/.test(value);
function readPitch(note){
 const pitch=child(note,'pitch');if(!pitch)throw new Error('Pitched MusicXML note lacks <pitch>');
 const step=value(pitch,'step');const alteration=value(pitch,'alter')===null?0:nval(pitch,'alter');const octave=nval(pitch,'octave');
 if(!Object.hasOwn(pcs,step)||!Number.isInteger(alteration)||Math.abs(alteration)>2||!Number.isInteger(octave)||octave<1||octave>7)throw new Error('Unsupported written pitch');
 const spelling=step+(alteration>0?'#'.repeat(alteration):'b'.repeat(-alteration));
 const midi=(octave+1)*12+pcs[step]+alteration;
 const notation=child(note,'notations');const tech=child(notation,'technical');
 for(const item of Array.from(tech?.children||[]))if(!['string','fret'].includes(item.localName))throw new Error(`Unsupported fingering markup: ${item.localName}`);
 const hasString=value(tech,'string')!==null,hasFret=value(tech,'fret')!==null;
 if(hasString!==hasFret)throw new Error('Incomplete string/fret indication');
 let position=null;
 if(hasString){const string=nval(tech,'string'),fret=nval(tech,'fret');if(!Number.isInteger(string)||string<1||string>4||!Number.isInteger(fret)||fret<0||fret>12)throw new Error('Unsupported string/fret indication');position={string:4-string,fret};}
 return {midi,spelling,position};
}
function chordHint(harmonyNode){
 if(!harmonyNode)return null;
 const root=child(harmonyNode,'root');const step=value(root,'root-step');const a=value(root,'root-alter')===null?0:nval(root,'root-alter');
 for(const el of Array.from(harmonyNode.children))if(!['root','kind'].includes(el.localName))throw new Error(`Unsupported harmony detail: ${el.localName}`);
 const kind=child(harmonyNode,'kind'),text=attr(kind,'text');
 const aliases={'major':'','minor':'m','diminished':'dim','augmented':'aug','dominant':'7','major-seventh':'maj7','minor-seventh':'m7','major-minor':'m(maj7)','half-diminished':'m7b5','diminished-seventh':'dim7'};
 const suffix=text!==null?text:aliases[kind?.textContent?.trim()];
 const symbol=step+(a===1?'#':a===-1?'b':'')+suffix;
 if(!Object.hasOwn(pcs,step)||![-1,0,1].includes(a)||!validSymbol(symbol))throw new Error('Unsupported MusicXML harmony');
 return symbol;
}
function parseSimpleNote(note,divisions){
 const unsupported=['grace','cue','time-modification','beam','accidental-mark','notehead'];
 for(const x of unsupported)if(child(note,x)&&x!=='beam')throw new Error(`Unsupported MusicXML <${x}>`);
 const allowed=['pitch','rest','chord','duration','tie','voice','type','dot','notations','accidental','stem','beam','staff'];
 for(const el of Array.from(note.children))if(!allowed.includes(el.localName))throw new Error(`Unsupported MusicXML note content: ${el.localName}`);
 if(child(note,'voice')&&value(note,'voice')!=='1')throw new Error('Multiple voices are not supported');
 if(child(note,'staff')&&value(note,'staff')!=='1')throw new Error('Multiple staves are not supported');
 const duration=nval(note,'duration')/divisions;
 if(!DURATIONS.includes(duration))throw new Error('Unsupported MusicXML rhythm or tuplet');
 const dotted=children(note,'dot').length;
 if(dotted>1)throw new Error('Unsupported multiple-dotted note');
 // In MusicXML <type> is optional; duration (divisions) is the sounding authority.
 // If a type/dot is supplied, it must agree with sounding duration.
 const writtenType=value(note,'type');
 if(writtenType!==null&&writtenType!==typeOf(duration))throw new Error('Inconsistent MusicXML note type');
 if((writtenType!==null||dotted>0)&&Boolean(dotted)!==isDotted(duration))throw new Error('Inconsistent written duration or dot');
 const notations=child(note,'notations');
 if(notations){for(const item of Array.from(notations.children)){if(!['technical','articulations','tied','slur'].includes(item.localName))throw new Error(`Unsupported MusicXML notation: ${item.localName}`);}}
 const articulationEl=child(notations,'articulations');
 const articulations=Array.from(articulationEl?.children??[]);
 if(articulations.some(x=>!['staccato','tenuto','accent'].includes(x.localName))||articulations.length>1)throw new Error('Unsupported articulation');
 const tied=children(note,'tie').map(x=>attr(x,'type'));
 const slurs=children(notations,'slur').map(x=>attr(x,'type'));
 if(tied.some(x=>!['start','stop'].includes(x))||slurs.some(x=>!['start','stop'].includes(x)))throw new Error('Unsupported tie or slur');
 return {duration,rest:!!child(note,'rest'),chord:!!child(note,'chord'),pitch:child(note,'rest')?null:readPitch(note),articulation:articulations[0]?.localName??'none',tieStart:tied.includes('start'),tieStop:tied.includes('stop'),slurStart:slurs.includes('start'),slurStop:slurs.includes('stop')};
}
/** Browser-only, bounded reader. It refuses voices, tuplets, unsupported marks and XML entities. */
export function importMusicXML(xml,{tuning='highG'}={}){
 xml=normalizeMusicXMLPrologue(xml);
 if(typeof DOMParser==='undefined')throw new Error('MusicXML import requires a browser XML parser');
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror')||!local(doc.documentElement,'score-partwise'))throw new Error('Invalid MusicXML partwise document');
 const part=children(doc.documentElement,'part');if(part.length!==1)throw new Error('Only one musical part is supported');
 const allMeasures=children(part[0],'measure');if(!allMeasures.length||allMeasures.length>200)throw new Error('No valid measures found');
 const metadata=children(child(child(doc.documentElement,'identification'),'miscellaneous'),'miscellaneous-field')
   .find(x=>attr(x,'name')==='ukulele-workbench-tuning')?.textContent?.trim();
 const selectedTuning=metadata??tuning;if(!TUNINGS[selectedTuning])throw new Error('Unknown ukulele tuning in MusicXML');
 const firstAttributes=child(allMeasures[0],'attributes');
 const num=Number(value(child(firstAttributes,'time'),'beats')),den=Number(value(child(firstAttributes,'time'),'beat-type'));
 const meter=`${num}/${den}`;const keyNum=Number(value(child(firstAttributes,'key'),'fifths')??0);
 const key=Object.keys(KEY_SIGNATURES).find(x=>KEY_SIGNATURES[x]===keyNum);
 if(!key)throw new Error('Unsupported key signature');
 if(!['4/4','3/4','6/8'].includes(meter))throw new Error('Unsupported time signature');
 const d=Number(value(firstAttributes,'divisions'));if(!Number.isInteger(d)||d<1||d>16384)throw new Error('Unsupported MusicXML divisions');
 const signs=children(firstAttributes,'clef');if(signs.some(x=>value(x,'sign')!=='G'||nval(x,'line')!==2))throw new Error('Only treble clef is supported');
 if(firstAttributes&&children(firstAttributes,'staves').some(x=>Number(x.textContent)!==1))throw new Error('Multiple staves are not supported');
 const tempoDirection=children(allMeasures[0],'direction').find(x=>child(x,'sound')?.hasAttribute('tempo'));
 const t=Number(attr(child(tempoDirection,'sound'),'tempo')??84);const tempo=Math.round(t);
 if(!Number.isInteger(t)||t!==tempo||tempo<30||tempo>240)throw new Error('Unsupported tempo');
 const title=value(child(doc.documentElement,'work'),'work-title')||value(doc.documentElement,'movement-title')||'Imported MusicXML';
 const score=createScore({title:title.slice(0,120),tuning:selectedTuning,meter,key,tempo,sample:false});
 const marks=[];let pendingStroke='none',pendingHarmony=null;
 for(const [mi,measure] of allMeasures.entries()){
  if(mi>0)score.measures.push({events:[]});
  // Repeated attributes are permitted if musically unchanged (common in MusicXML exports).
  let grouped=[];let sawNote=false;
  const flush=()=>{
   if(!grouped.length)return;
   const first=grouped[0];let event;
   if(first.rest){if(grouped.length!==1)throw new Error('Rest cannot be a chord');event=appendEvent(score,{type:'rest',duration:first.duration});}
   else if(grouped.length===1){event=appendEvent(score,{type:'note',duration:first.duration,...first.pitch,articulation:first.articulation});}
   else{
    if(!pendingHarmony||!validSymbol(pendingHarmony))throw new Error('Chord stacks require a supported chord symbol');
    if(grouped.some(n=>n.rest||n.duration!==first.duration||n.tieStart||n.tieStop||n.slurStart||n.slurStop))throw new Error('Unsupported complex chord event');
    const inputNotes=grouped.map(x=>x.pitch),hasSame=(notes)=>notes.length===inputNotes.length&&notes.every((n,i)=>n.midi===inputNotes[i].midi&&n.spelling===inputNotes[i].spelling&&(!inputNotes[i].position||(n.position.string===inputNotes[i].position.string&&n.position.fret===inputNotes[i].position.fret)));
    let input=null;
    try{if(hasSame(chordNotes(pendingHarmony,selectedTuning)))input={symbol:pendingHarmony};}catch{}
    if(!input){const names=new Map();inputNotes.forEach(n=>names.set(mod(n.midi,12),n.spelling));const unique=[...names.entries()];
     if(![3,4].includes(unique.length))throw new Error('Unsupported chord voicing');
     const pcs=unique.map(x=>x[0]),spellings=unique.map(x=>x[1]);
     try{if(!hasSame(generatedChordNotes(pcs,spellings,selectedTuning)))throw new Error('Chord fingering differs from supported voicing');}catch(e){throw new Error(`Unsupported chord voicing: ${e.message}`)}
     input={symbol:pendingHarmony,voicing:'generated',pcs,spellings};
    }
    event=appendEvent(score,{type:'chord',duration:first.duration,stroke:pendingStroke,articulation:first.articulation,...input});
   }
   if(score.measures.length!==mi+1)throw new Error('MusicXML measure overflow');
   marks.push({id:event.id,first});grouped=[];pendingHarmony=null;pendingStroke='none';
  };
  for(const elem of Array.from(measure.children)){
   if(local(elem,'attributes')){
    if(sawNote)throw new Error('Mid-measure score attributes are not supported');
    for(const x of Array.from(elem.children))if(!['divisions','key','time','clef','staves'].includes(x.localName))throw new Error(`Unsupported MusicXML attribute: ${x.localName}`);
    if(value(elem,'divisions')!==null&&nval(elem,'divisions')!==d)throw new Error('Changing MusicXML divisions is not supported');
    if(value(child(elem,'key'),'fifths')!==null&&nval(child(elem,'key'),'fifths')!==keyNum)throw new Error('Changing key signatures is not supported');
    const time=child(elem,'time');if(time&&(nval(time,'beats')!==num||nval(time,'beat-type')!==den))throw new Error('Changing meter is not supported');
    if(children(elem,'clef').some(x=>value(x,'sign')!=='G'||nval(x,'line')!==2))throw new Error('Changing clefs is not supported');
    if(children(elem,'staves').some(x=>Number(x.textContent)!==1))throw new Error('Multiple staves are not supported');
    continue;
   }
   if(local(elem,'print'))continue; // presentation-only page/system breaks are not stored in the musical model

   if(local(elem,'direction')){
    const directionType=child(elem,'direction-type');
    for(const x of Array.from(directionType?.children||[]))if(!['words','metronome'].includes(x.localName))throw new Error(`Unsupported MusicXML direction: ${x.localName}`);
    const words=value(directionType,'words');
    if(mi>0&&child(elem,'sound')?.hasAttribute('tempo'))throw new Error('Tempo changes are not supported');
    const sound=child(elem,'sound');if(sound&&Array.from(sound.attributes).some(x=>x.name!=='tempo'))throw new Error('Unsupported playback direction');
    if(words==='Downstroke'||words==='Upstroke')pendingStroke=words==='Downstroke'?'down':'up';
    else if(words)throw new Error('Unsupported MusicXML direction');
    continue;
   }
   if(local(elem,'harmony')){flush();pendingHarmony=chordHint(elem);continue;}
   if(!local(elem,'note')){if(local(elem,'barline')){if(children(elem,'repeat').length||children(elem,'ending').length)throw new Error('Repeats and endings are not supported');continue;}throw new Error(`Unsupported MusicXML element: ${elem.localName}`);}
   const n=parseSimpleNote(elem,d);sawNote=true;
   if(n.chord){if(!grouped.length)throw new Error('Orphan MusicXML chord note');grouped.push(n)}
   else {flush();grouped=[n];}
  }
  flush();
 }
 for(let i=0;i<marks.length;i++){
  const {id,first}=marks[i],prev=marks[i-1];const ev=findEvent(score,id)?.event;
  if(first.tieStop&&!prev?.first.tieStart)throw new Error('Unmatched tie stop');
  if(first.slurStop&&!prev?.first.slurStart)throw new Error('Unmatched slur stop');
  if(first.tieStart){if(!marks[i+1]?.first.tieStop)throw new Error('Unmatched tie start');ev.tieToNext=true;}
  if(first.slurStart){if(!marks[i+1]?.first.slurStop)throw new Error('Unmatched slur start');ev.slurToNext=true;}
 }
 validateScore(score);
 return score;
}
