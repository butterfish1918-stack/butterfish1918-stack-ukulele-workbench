/** Construct playable, source-linked ukulele accompaniment studies from
 * section plans. This does not reproduce original lead melodies/recorded riffs.
 * Pure module: callers inject the canonical chord + score engines.
 */
const LETTERS=['C','D','E','F','G','A','B'];
const NATURAL={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const QUALITIES={
 '':[0,4,7],m:[0,3,7],7:[0,4,7,10],maj7:[0,4,7,11],
 m7:[0,3,7,10],dim:[0,3,6],sus2:[0,2,7],
 sus4:[0,5,7],'7sus4':[0,5,7,10]
};
const QUAL_DEGREES={
 '':[0,2,4],m:[0,2,4],7:[0,2,4,6],maj7:[0,2,4,6],
 m7:[0,2,4,6],dim:[0,2,4],sus2:[0,1,4],
 sus4:[0,3,4],'7sus4':[0,3,4,6]
};
function harmonicChord(symbol,notePc){
 const parsed=/^([A-G])([#b]?)(7sus4|maj7|sus4|sus2|m7|dim|7|m)?$/.exec(symbol);
 if(!parsed)throw Error('Unsupported harmony: '+symbol);
 const quality=parsed[3]||'',root=notePc(parsed[1]+parsed[2]);
 const pcs=QUALITIES[quality].map(interval=>(root+interval)%12);
 const spellings=pcs.map((p,i)=>{
  const name=LETTERS[(LETTERS.indexOf(parsed[1])+QUAL_DEGREES[quality][i])%7];
  const difference=((p-NATURAL[name]+18)%12)-6;
  return name+(difference>0?'#'.repeat(difference):'b'.repeat(-difference));
 });
 return {pcs,spellings};
}
const arpeggioOrders={
 picked:[0,2,1,2,0,2,1,2],
 finger:[0,2,0,1,0,2,1,2],
 ostinato:[0,1,2,1,0,1,2,1],
 drone:[0,0,2,0,1,0,2,0],
 piano:[0,2,1,2,0,1,2,1],
 space:[0,2,1,2,0,1,2,1],
 sync:[0,1,2,1,0,2,1,2],
 drive:[0,1,2,1,0,1,2,1],
 strum:[0,2,1,2,0,2,1,0],
 skank:[0,2,1,2,0,2,1,0],
 pulse:[0,1,2,0,2,1,0,2],
 compound:[0,2,1,0,2,1],
 'compound-drive':[0,1,2,1,0,2],
 'compound-picked':[0,2,1,2,0,1]
};
function rhythmicRecipe(style,beats){
 if(beats===1.5){
  if(style==='compound-drive')return ['c','c','c'];
  if(style==='compound-picked')return ['n','n','n'];
  return ['c','n','n'];
 }
 if(beats===3){
  if(style==='compound-drive')return ['c','c','c','c','c','c'];
  if(style==='compound-picked')return ['n','n','n','n','n','n'];
  return ['c','n','n','c','n','n'];
 }
 if(beats===2){
  if(style==='skank')return ['r','c','r','c'];
  if(style==='sync')return ['r','c','n','c'];
  if(style==='strum')return [['c',1],['c',.5],['c',.5]];
  if(style==='space')return [['c',1],['r',.5],['n',.5]];
  if(['picked','finger','piano','drone','ostinato','compound-picked'].includes(style))return ['n','n','n','n'];
  return ['c','c','c','c'];
 }
 switch(style){
 case 'skank':return ['r','c','r','c','r','c','r','c'];
 case 'sync':return ['r','c','n','c','r','c','n','c'];
 case 'drive':return ['c','c','c','c','c','c','c','c'];
 case 'strum':return [['c',1],['c',.5],['c',.5],['c',1],['c',.5],['c',.5]];
 case 'picked':case 'finger':return ['n','n','n','n','n','n','n','n'];
 case 'ostinato':return ['n','n',['c',1],'n','n',['c',1]];
 case 'drone':return [['n',1],'n','n',['c',1],['n',1]];
 case 'piano':return [['c',1],'n','n',['c',1],['n',1]];
 case 'space':return [['c',2],'r','n',['n',1]];
 case 'pulse':return [['c',1],'r','c',['c',1],'c','c'];
 default:throw Error('Unknown accompaniment rhythm '+style);
 }
}
export function buildAccompaniment(track,{notePc,generatedChordNotes,validateScore,validateArrangement}){
 if(!track||!Array.isArray(track.sections)||!track.sections.length)throw Error('Missing arrangement plan');
 const meterBeats=track.meter==='6/8'?3:4,scoreMeasures=[],sections=[];
 let barNumber=0;
 for(const section of track.sections){
  const firstBar=barNumber+1;
  for(let repeatIndex=0;repeatIndex<section.repeat;repeatIndex++){
   for(const chordSet of section.bars){
    if(![1,2].includes(chordSet.length))throw Error('One or two chords per measure only');
    const beatSpan=meterBeats/chordSet.length,events=[];
    for(const symbol of chordSet){
     const chord=harmonicChord(symbol,notePc);
     const notes=generatedChordNotes(chord.pcs,chord.spellings,'highG');
     const recipe=rhythmicRecipe(section.style,beatSpan);
     const order=arpeggioOrders[section.style]??arpeggioOrders.picked;
     let index=0,elapsed=0;
     for(const raw of recipe){
      const [type,duration]=Array.isArray(raw)?raw:[raw,.5];
      const evId=track.id+'-r2-b'+String(barNumber+1).padStart(3,'0')+'-e'+events.length;
      if(type==='r')events.push({id:evId,type:'rest',duration});
      else if(type==='c')events.push({
        id:evId,type:'chord',duration,symbol,stroke:index%2===0?'down':'up',
        notes,voicing:'generated',pcs:chord.pcs,spellings:chord.spellings
      });
      else if(type==='n'){
       const indexInChord=order[(index+barNumber)%order.length]%notes.length;
       const n=notes[indexInChord];
       events.push({id:evId,type:'note',midi:n.midi,spelling:n.spelling,duration,position:n.position});
      }else throw Error('Unknown attack '+type);
      elapsed+=duration;index++;
     }
     if(Math.abs(elapsed-beatSpan)>1e-9)throw Error('Rhythm duration mismatch '+section.style+' '+elapsed+' expected '+beatSpan);
    }
    scoreMeasures.push({events,section:section.name});
    barNumber++;
   }
  }
  sections.push({label:section.name,startBar:firstBar,endBar:barNumber,feel:section.style});
 }
 const score={schema:1,id:'score-'+track.id+'-highg-r2',
  title:track.id.replace(/-/g,' ')+' — Ukulele Accompaniment',
  tuning:'highG',meter:track.meter,key:track.key,tempo:track.bpm,measures:scoreMeasures};
 validateScore(score);
 const id=track.id,revision=2,title=track.title+' — Ukulele Song-Form Accompaniment';
 const descriptions=sections.map(s=>s.label+' ('+s.startBar+'–'+s.endBar+')').join(' · ');
 const sourceNote='Source harmonies: '+track.source;
 const arrangement={
  format:'ukulele-workbench-arrangement',schemaVersion:1,id,revision,title,artist:track.artist,
  difficulty:'advanced',tags:['song-form','high-g','accompaniment','notation','adaptation'],
  key:track.key,tonalCenter:track.centre,bpm:track.bpm,tuning:'highG',
  arrangementType:'song-form-accompaniment',
  description:'Playable, song-structured high-G ukulele accompaniment using the documented harmony and characteristic rhythmic feel of “'+track.title+'”. Designed for practice, not a note-for-note original guitar, vocal, bass or lead-riff transcription.',
  body:sections.map((s,i)=>s.label+': '+track.sections[i].bars.map(b=>b.join('+')).join(' | ')+' (repeat '+track.sections[i].repeat+'×)').join('\n'),
  notes:'High-G GCEA, no capo; concert pitch. '+track.tech+'\nScore section map: '+descriptions+'.\nOriginal meter where supported; some rhythmic/meter details are adapted to the current single-meter, single-voice score engine. Rhythmic parts are original and song-characteristic, not copied riffs. Slash-bass/inversion details beyond the ukulele range are omitted.\n'+sourceNote,
  sections,sourceUrl:track.source,score
 };
 const entry={id,revision,title,artist:track.artist,difficulty:'advanced',
  tags:arrangement.tags,file:'songs/'+id+'.json'};
 validateArrangement(arrangement,entry,validateScore);
 return {arrangement,entry};
}
