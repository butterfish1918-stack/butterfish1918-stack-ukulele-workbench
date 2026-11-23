/** Dependency-free SVG notation renderer for basic scored ukulele events.
 * Explicitly limited: simplified notehead and chord-stack engraving; no independent polyphonic voices.
 */
import {staffYForSpelling,midiName,TUNINGS} from './music.js';
import {preferredPosition,usedBeats,measureBeats,baseDuration,isDotted,KEY_SIGNATURES,KEY_SHARP_ORDER,KEY_FLAT_ORDER,keyAccidental} from './score.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=n=>String(Math.round(n*100)/100);
export function writtenNoteName(midi,spelling){return (spelling||midiName(midi).replace(/-?\d+$/,''))+(Math.floor(midi/12)-1);}

function ledgerLines(x,y,top,bottom){
 let out='';
 if(y>bottom)for(let pos=bottom+12;pos<=y+1;pos+=12)out+=`<line x1="${x-14}" x2="${x+14}" y1="${pos}" y2="${pos}" stroke="#3e453b" stroke-width="1.2"/>`;
 if(y<top)for(let pos=top-12;pos>=y-1;pos-=12)out+=`<line x1="${x-14}" x2="${x+14}" y1="${pos}" y2="${pos}" stroke="#3e453b" stroke-width="1.2"/>`;
 return out;
}
function restGlyph(x,y,duration){
 const color='#344339';
 const basic=baseDuration(duration);
 if(basic===4)return `<rect x="${x-10}" y="${y-10}" width="20" height="7" fill="${color}"/>`;
 if(basic===2)return `<rect x="${x-10}" y="${y+4}" width="20" height="7" fill="${color}"/>${isDotted(duration)?`<circle cx="${x+19}" cy="${y+7}" r="3.2" fill="${color}"/>`:``}`;
 if(basic===1)return `<path d="M${x+4} ${y-25} l-9 14 10 11 -9 11 8 11" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round"/>${isDotted(duration)?`<circle cx="${x+19}" cy="${y+2}" r="3.2" fill="${color}"/>`:``}`;
 const count=basic===.25?2:1;
 let out=`<path d="M${x+6} ${y-25}V${y+20}" stroke="${color}" stroke-width="2.4"/>`;
 for(let i=0;i<count;i++)out+=`<circle cx="${x+2}" cy="${y-17+i*12}" r="4.4" fill="${color}"/><path d="M${x+4} ${y-17+i*12}Q${x+18} ${y-11+i*12} ${x+6} ${y+2+i*12}" stroke="${color}" stroke-width="2" fill="none"/>`;
 if(isDotted(duration))out+=`<circle cx="${x+19}" cy="${y+2}" r="3.3" fill="${color}"/>`;
 return out;
}
/** Groups adjacent short notes within a beat (6/8: within a dotted-quarter pulse). */
export function beamGroups(events,meter='4/4') {
 const bucketSize=meter==='6/8'?1.5:1;
 const result=[];let group=[],groupBucket=-1,elapsed=0;
 const flush=()=>{if(group.length>1)result.push([...group]);group=[];};
 events.forEach((ev,i)=>{
  const beginning=Math.floor((elapsed+1e-7)/bucketSize);
  const ending=Math.floor((elapsed+ev.duration-1e-7)/bucketSize);
  const eligible=ev.type==='note' && baseDuration(ev.duration)<=.5 && beginning===ending;
  if(!eligible || (group.length && beginning!==groupBucket))flush();
  if(eligible){group.push(i);groupBucket=beginning;}
  elapsed+=ev.duration;
 });
 flush();return result;
}
/** With no key signature, accidentals apply to one written letter at one octave, per bar. */
export function accidentalMarks(events,keySignature='C',suppressFirstTied=false) {
 const active=new Map();
 const mark=(note,suppress)=>{
  if(suppress)return '';
  const spelling=note.spelling, key=spelling[0]+':'+staffYForSpelling(note.midi,spelling,102);
  const suffix=spelling.slice(1),previous=active.has(key)?active.get(key):keyAccidental(keySignature,spelling[0]);
  active.set(key,suffix);
  return suffix===previous?'':suffix||'natural';
 };
 return events.map((ev,index)=>{
  if(ev.type==='chord')return ev.notes.map(note=>mark(note,false));
  if(ev.type==='note')return mark(ev,index===0&&suppressFirstTied);
  return '';
 });
}
function accidentalGlyph(symbol){
 return symbol==='natural'?'♮':symbol==='##'?'𝄪':symbol==='bb'?'𝄫':symbol.replace(/#/g,'♯').replace(/b/g,'♭');
}
function noteGlyph(x,y,ev,selected,{beamed=false,accidental=''}={}){
 const color=selected?'#b47b32':'#23372b',duration=ev.duration;
 const basic=baseDuration(duration),filled=basic<2;
 let out=ledgerLines(x,y,54,102);
 if(accidental)out+=`<text x="${x-26}" y="${y+6}" fill="#30463a" font-size="23" font-family="serif">${esc(accidentalGlyph(accidental))}</text>`;
 out+=`<ellipse cx="${x}" cy="${y}" rx="9" ry="6" transform="rotate(-18 ${x} ${y})" fill="${filled?color:'#eee8db'}" stroke="${color}" stroke-width="2.1"/>`;
 if(basic<4 && !beamed){
  const stemUp=y>=78,stemX=stemUp?x+8:x-8,tip=stemUp?y-38:y+38;
  out+=`<path d="M${stemX} ${y} V${tip}" stroke="${color}" stroke-width="2" fill="none"/>`;
  if(basic<=.5){const sign=stemUp?1:-1;
   out+=`<path d="M${stemX} ${tip}q${sign*23} ${sign*7} ${sign*8} ${sign*29}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
   if(basic===.25)out+=`<path d="M${stemX} ${tip+sign*11}q${sign*22} ${sign*7} ${sign*7} ${sign*27}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
 }
 if(isDotted(duration))out+=`<circle class="score-dot" cx="${x+17}" cy="${y+3}" r="3.4" fill="${color}"/>`;
 return out;
}
function articulationGlyph(x,y,mark){
 if(!mark||mark==='none')return '';
 const color='#4e674f',at=y-18;
 if(mark==='staccato')return `<circle class="score-articulation" cx="${x}" cy="${at}" r="3.3" fill="${color}" aria-label="Staccato"/>`;
 if(mark==='tenuto')return `<path class="score-articulation" d="M${x-7} ${at}h14" stroke="${color}" stroke-width="2.6" aria-label="Tenuto"/>`;
 if(mark==='accent')return `<path class="score-articulation" d="M${x-10} ${at-4}L${x+8} ${at}L${x-10} ${at+4}" fill="none" stroke="${color}" stroke-width="2.5" aria-label="Accent"/>`;
 return '';
}
function chordGlyph(x,ev,marks,selected,showChordLabels=true){
 const color=selected?'#ad7635':'#263e31';
 const notes=ev.notes.map((n,i)=>({...n,y:staffYForSpelling(n.midi,n.spelling,102),mark:marks[i]})).sort((a,b)=>b.y-a.y);
 const filled=baseDuration(ev.duration)<2;let out='';
 // Chord stacks are one rhythmic event. Their noteheads share a stem, not separate stems.
 for(const n of notes){
  out+=ledgerLines(x,n.y,54,102);
  if(n.mark)out+=`<text x="${x-28}" y="${n.y+6}" fill="#30463a" font-size="21" font-family="serif">${esc(accidentalGlyph(n.mark))}</text>`;
  out+=`<ellipse cx="${x}" cy="${n.y}" rx="9" ry="6" transform="rotate(-18 ${x} ${n.y})" fill="${filled?color:'#eee8db'}" stroke="${color}" stroke-width="2"/>`;
  if(isDotted(ev.duration))out+=`<circle cx="${x+17}" cy="${n.y+2}" r="3" fill="${color}"/>`;
 }
 const hi=Math.min(...notes.map(n=>n.y)),lo=Math.max(...notes.map(n=>n.y));
 if(baseDuration(ev.duration)<4){
  const up=(hi+lo)/2>=78,stemX=x+(up?8:-8),stemStart=up?lo:hi,tip=up?hi-37:lo+37;
  out+=`<path d="M${stemX} ${stemStart} V${tip}" stroke="${color}" stroke-width="2"/>`;
  if(baseDuration(ev.duration)<=.5){const dir=up?1:-1;out+=`<path d="M${stemX} ${tip}q${dir*22} ${dir*8} ${dir*7} ${dir*28}" fill="none" stroke="${color}" stroke-width="2.7"/>`}
 }
 // Chord name and strum direction always appear: these are essential reading instructions.
 if(showChordLabels)out+=`<text class="score-chord-name" x="${x}" y="29" font-size="14" font-weight="bold" fill="#355642" text-anchor="middle">${esc(ev.symbol)}</text>`;
 if(ev.stroke!=='none')out+=`<text class="score-strum" x="${x+22}" y="${Math.max(46,hi-8)}" font-size="18" fill="#406450" aria-label="${ev.stroke}stroke">${ev.stroke==='down'?'Π':'V'}</text>`;
 out+=articulationGlyph(x,hi,ev.articulation);
 return out;
}
function renderBeams(groups,events,xs,selectedId,playingId){
 let out='';
 for(const group of groups){
  const ys=group.map(i=>staffYForSpelling(events[i].midi,events[i].spelling,102));
  const up=ys.reduce((a,b)=>a+b,0)/ys.length>=78;
  const beamY=up?Math.min(...ys)-38:Math.max(...ys)+38;
  const sx=i=>xs[i]+(up?8:-8);
  const color=group.some(i=>events[i].id===selectedId||events[i].id===playingId)?'#b47b32':'#23372b';
  const mainX1=sx(group[0]),mainX2=sx(group.at(-1));
  out+=`<g class="score-beam" aria-hidden="true" stroke="${color}" fill="none"><path d="M${mainX1} ${beamY} L${mainX2} ${beamY}" stroke-width="6"/>`;
  group.forEach((i,j)=>{out+=`<path d="M${sx(i)} ${ys[j]} V${beamY}" stroke-width="2"/>`;});
  // Secondary beam for consecutive sixteenths; isolated ones get a short hook.
  const secondaryY=beamY+(up?10:-10);
  let run=[];
  const flush=()=>{
   if(!run.length)return;
   if(run.length>=2)out+=`<path d="M${sx(run[0])} ${secondaryY} L${sx(run.at(-1))} ${secondaryY}" stroke-width="5"/>`;
   else {const i=run[0],at=group.indexOf(i);const dir=at===group.length-1?-1:1;out+=`<path d="M${sx(i)} ${secondaryY} h${dir*13}" stroke-width="5"/>`;}
   run=[];
  };
  group.forEach(i=>{if(baseDuration(events[i].duration)===.25)run.push(i);else flush();});flush();
  out+='</g>';
 }
 return out;
}

/** Returns HTML containing one synchronized SVG. A click on staff or tab carries data-event-id. */
/** Paginated stave systems instead of an ever-widening SVG.
 * One dense measure or two/three light measures per system; browser width
 * determines physical scaling, but the SVG never overflows horizontally.
 */
export function scoreSystems(score,{maxSystemWidth=490,maxBarsPerSystem=3,showNames=false}={}){
 if(!score?.measures?.length)return [];
 const systems=[];
 let from=0,total=115,bars=0;
 const maxWidth=Math.max(420,Number(maxSystemWidth)||710);
 const limit=Math.max(1,Math.min(4,Number(maxBarsPerSystem)||3));
 for(let i=0;i<score.measures.length;i++){
  const bar=score.measures[i];
  const width=Math.max(165,Math.round(46+bar.events.length*(showNames?43:29)));
  if(bars>0&&(total+width>maxWidth || bars>=limit)){
   systems.push({start:from,end:i});
   from=i;total=115;bars=0;
  }
  total+=width;bars++;
 }
 systems.push({start:from,end:score.measures.length});
 return systems;
}
export function renderScoreView(score,{mode='notation',selectedEventId=null,playingEventId=null,showNames=false,annotations=null,layout='strip',measureOffset=0,chordSymbols=null,showChordLabels=true,readingCues=null}={}){
 if(layout==='systems'&&score?.measures?.length){
  const desktop=typeof window!=='undefined'&&window.innerWidth>=820;
  const systems=scoreSystems(score,{maxSystemWidth:desktop?840:490,maxBarsPerSystem:desktop?4:2,showNames});
  return `<div class="score-systems" role="group" aria-label="Multi-line sheet music: ${systems.length} stave systems, ${score.measures.length} measures">${systems.map(({start,end})=>{
   const single={...score,measures:score.measures.slice(start,end)};
   const chords=Array.isArray(chordSymbols)?chordSymbols.slice(start,end):null;
   return `<div class="score-system" data-first-measure="${measureOffset+start+1}" data-last-measure="${measureOffset+end}" role="group" aria-label="Measures ${measureOffset+start+1} to ${measureOffset+end}">${renderScoreView(single,{mode,selectedEventId,playingEventId,showNames,annotations,layout:'compact',measureOffset:measureOffset+start,chordSymbols:chords,showChordLabels,readingCues})}</div>`;
  }).join('')}</div>`;
 }

 const showNotation=mode!=='tab',showTab=mode!=='notation';
 const bassClef=score.clef==='bass8vb',percussionClef=score.clef==='percussion';
 const staffNoteY=(midi,spelling)=>percussionClef?(midi===42?54:midi===38?78:102):staffYForSpelling(midi+(bassClef?12:0),spelling,102)-(bassClef?72:0);
 const meter=score.meter.split('/');
 const key=score.key??'C',keyCount=Math.abs(KEY_SIGNATURES[key]);
 const extra=keyCount*14;
 const segments=score.measures.map((bar,i)=>({bar,i,width:layout==='compact'?Math.max(165,Math.round(46+bar.events.length*(showNames?43:29))):Math.max(205,Math.round(90+bar.events.length*(showNames?68:61)))}));
 const width=125+extra+segments.reduce((a,s)=>a+s.width,0)+25;
 const height=layout==='compact'?(showNotation&&showTab?241:showNotation?159:155):(showNotation&&showTab?347:showNotation?202:189);
 const tabTop=showNotation?(layout==='compact'?146:226):62;
 const tabStep=layout==='compact'?21:27;
 const bottom=102,top=54;
 let out=`<svg class="composed-score" role="group" aria-label="${esc(score.title)} in ${esc(score.meter)}, ${score.measures.length} measures" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="${layout==='compact'?'width:100%;min-width:0;max-width:100%;':'min-width:'+Math.min(1450,Math.max(400,width*.83))+'px;'}" ><rect width="${width}" height="${height}" fill="#eee8db"/>`;
 if(layout!=='compact')out+=`<text x="16" y="22" fill="#4b6150" font-size="12" font-weight="700">${esc(score.title)}</text><text x="${width-20}" y="22" text-anchor="end" fill="#60705e" font-size="11">${esc(score.tuning==='highG'?'HIGH G':score.tuning==='lowG'?'LOW G':'BARITONE')} · ${esc(score.tempo)} BPM</text>`;
 if(showNotation){
  for(let y=top;y<=bottom;y+=12)out+=`<line x1="16" x2="${width-20}" y1="${y}" y2="${y}" stroke="#637469" stroke-width=".85"/>`;
  out+=`<text x="21" y="102" fill="#2f4034" font-family="'Noto Music','Segoe UI Symbol','Apple Symbols',serif" font-size="61">${percussionClef?'𝄥':bassClef?'𝄢':'𝄞'}</text>${bassClef?'<text x="35" y="127" font-size="14" fill="#2f4034">8</text>':''}`;
  const symbols=keyCount?(KEY_SIGNATURES[key]>0?KEY_SHARP_ORDER:KEY_FLAT_ORDER).slice(0,keyCount):[];
  const sharpYs=[54,72,42,66,84,60,78],flatYs=[78,60,84,66,90,72,96];
  symbols.forEach((letter,i)=>{const yy=KEY_SIGNATURES[key]>0?sharpYs[i]:flatYs[i];out+=`<text class="key-signature" x="${66+i*14}" y="${yy+7}" fill="#263f34" font-size="24" font-family="serif" aria-label="${esc(letter)} ${KEY_SIGNATURES[key]>0?'sharp':'flat'}">${KEY_SIGNATURES[key]>0?'♯':'♭'}</text>`;});
  out+=`<text x="${77+extra}" y="74" text-anchor="middle" fill="#28382d" font-family="Georgia,serif" font-size="24" font-weight="700">${meter[0]}</text><text x="${77+extra}" y="100" text-anchor="middle" fill="#28382d" font-family="Georgia,serif" font-size="24" font-weight="700">${meter[1]}</text>`;
 }
 if(showTab){
  out+=`<text x="16" y="${tabTop-18}" fill="#506756" font-size="11" font-weight="700">OPTIONAL TAB</text>`;
  for(let s=0;s<4;s++){
   const y=tabTop+s*tabStep;
   out+=`<line x1="54" x2="${width-20}" y1="${y}" y2="${y}" stroke="#718374" stroke-width="1"/><text x="29" y="${y+5}" fill="#354e3b" text-anchor="middle" font-size="14">${esc(TUNINGS[score.tuning].names[3-s])}</text>`;
  }
 }
 let x=111+extra;
 const noteCoords=new Map();
 for(const seg of segments){
  const {bar,i,width:barWidth}=seg;
  const start=x,end=x+barWidth;
  out+=`<text x="${start+5}" y="42" fill="#849386" font-size="10">${measureOffset+i+1}</text>`;
  if(chordSymbols?.[i])out+=`<text class="score-chord-symbol" x="${start+32}" y="19" fill="#2d4837" font-size="15" font-weight="700">${esc(chordSymbols[i])}</text>`;
  const count=Math.max(bar.events.length,1);
  let elapsed=0;
  const cap=measureBeats(score.meter),span=barWidth-64;
  const xs=bar.events.map((ev,j)=>{const x=start+31+span*(.60*(elapsed/cap)+.40*(j/count));elapsed+=ev.duration;return x;});
  const groups=beamGroups(bar.events,score.meter);
  const beamed=new Set(groups.flat());
  const previousBarLast=score.measures[i-1]?.events.at(-1);
  const accidentals=accidentalMarks(bar.events,key,!!previousBarLast?.tieToNext);
  bar.events.forEach((ev,j)=>{
   const px=xs[j];
   if(ev.type==='note')noteCoords.set(ev.id,{x:px,y:staffNoteY(ev.midi,ev.spelling)});
   const selected=ev.id===selectedEventId,playing=ev.id===playingEventId;
   if(showNotation){
    const y=ev.type==='rest'?82:ev.type==='note'?staffNoteY(ev.midi,ev.spelling):82;
    const mark=ev.type==='rest'?restGlyph(px,82,ev.duration):ev.type==='chord'?chordGlyph(px,ev,accidentals[j],selected||playing,showChordLabels):noteGlyph(px,y,ev,selected||playing,{beamed:beamed.has(j),accidental:accidentals[j]})+(ev.articulation?articulationGlyph(px,y,ev.articulation):'');
    if(selected||playing)out+=`<rect x="${px-23}" y="32" width="46" height="117" rx="7" fill="${playing?'#84b295':'#e1b879'}" opacity=".24"/>`;
    out+=`<g class="score-event ${selected?'selected':''} ${playing?'playing':''}" role="button" tabindex="0" data-event-id="${esc(ev.id)}" aria-label="${percussionClef&&ev.drumHits?'Drums '+esc(ev.drumHits.join(' and ')):ev.type==='rest'?'Rest':ev.type==='chord'?`Chord ${esc(ev.symbol)}, ${esc(ev.stroke)}stroke`:`Note ${esc(ev.spelling)}${esc(midiName(ev.midi).slice(-1))}`} ${esc(ev.duration)} quarter beats, measure ${measureOffset+i+1}"><rect x="${px-28}" y="25" width="56" height="123" fill="transparent"/>${mark}</g>`;
    if(percussionClef&&ev.drumHits)out+=`<text x="${px}" y="152" text-anchor="middle" fill="#3e5848" font-size="10">${esc(ev.drumHits.map(x=>({kick:'K',snare:'S',hat:'H'}[x]||'?')).join('+'))}</text>`;
    if(annotations?.[ev.id]&&ev.type!=='rest')out+=`<text class="score-tech-fingering" x="${px}" y="162" fill="#3c5e48" font-size="12" font-weight="700" text-anchor="middle">${esc(annotations[ev.id])}</text>`;
    if(showNames&&ev.type==='note')out+=`<text class="score-note-label" x="${px+18}" y="${staffNoteY(ev.midi,ev.spelling)-11}" fill="#28553b" font-size="12" font-weight="700">${esc(writtenNoteName(ev.midi,ev.spelling))}</text>`;
    if(showNames&&ev.type==='chord'&&Array.isArray(ev.notes))for(const note of ev.notes)out+=`<text class="score-note-label" x="${px+19}" y="${staffNoteY(note.midi,note.spelling)-8}" fill="#28553b" font-size="10" font-weight="700">${esc(writtenNoteName(note.midi,note.spelling))}</text>`;
   }
   if(showTab){
    const pos=preferredPosition(ev,score.tuning);
    if(ev.type==='chord'){
     out+=`<g class="score-event ${selected?'selected':''} ${playing?'playing':''}" role="button" tabindex="0" data-event-id="${esc(ev.id)}" aria-label="${esc(ev.symbol)} chord on four ukulele strings">`;
     for(const n of ev.notes){const yy=tabTop+(3-n.position.string)*tabStep;
      out+=`<rect x="${px-14}" y="${yy-11}" width="28" height="22" rx="4" fill="${selected||playing?'#d5ac6b':'#eee8db'}"/><text x="${px}" y="${yy+5}" text-anchor="middle" fill="#253e2d" font-size="14" font-weight="700">${n.position.fret}</text>${showNames?`<text class="score-tab-note-label" x="${px+18}" y="${yy+5}" font-size="11" font-weight="700" fill="#27573a">${esc(writtenNoteName(n.midi,n.spelling))}</text>`:''}`;
     }
     out+='</g>';
    }else if(pos){const yy=tabTop+(3-pos.string)*tabStep;
     out+=`<g class="score-event ${selected?'selected':''} ${playing?'playing':''}" role="button" tabindex="0" data-event-id="${esc(ev.id)}" aria-label="Fret ${pos.fret} on ${esc(TUNINGS[score.tuning].names[pos.string])} string"><rect x="${px-16}" y="${yy-13}" width="32" height="26" rx="5" fill="${selected||playing?'#d5ac6b':'#eee8db'}"/><text x="${px}" y="${yy+6}" fill="#253e2d" text-anchor="middle" font-size="16" font-weight="700">${pos.fret}</text>${showNames?`<text class="score-tab-note-label" x="${px+19}" y="${yy+5}" font-size="11" fill="#27573a" font-weight="700">${esc(writtenNoteName(ev.midi,ev.spelling))}</text>`:''}</g>`;
    }else if(ev.type==='rest')out+=`<text x="${px}" y="${tabTop+42}" text-anchor="middle" fill="#7b8b77" font-size="11">rest</text>`;
    else out+=`<text x="${px}" y="${tabTop+42}" text-anchor="middle" fill="#a35243" font-size="13">×</text>`;
   }
  });
  if(showNotation)out+=renderBeams(groups,bar.events,xs,selectedEventId,playingEventId);
  if(showNotation)out+=`<line x1="${end}" x2="${end}" y1="${top}" y2="${bottom}" stroke="#415347" stroke-width="1.8"/>`;
  if(showTab)out+=`<line x1="${end}" x2="${end}" y1="${tabTop}" y2="${tabTop+tabStep*3}" stroke="#415347" stroke-width="1.6"/>`;
  const remainder=measureBeats(score.meter)-usedBeats(bar);
  if(remainder>.001)out+=`<text x="${end-14}" y="${showNotation?150:174}" text-anchor="end" fill="#a36046" font-size="10">${fmt(remainder)} beat${remainder===1?'':'s'} free</text>`;
  x=end;
 }
 if(showNotation){
  const notes=score.measures.flatMap(bar=>bar.events);
  notes.forEach((ev,i)=>{if(!ev.tieToNext)return;
   const a=noteCoords.get(ev.id),b=noteCoords.get(notes[i+1]?.id);if(!a||!b)return;
   const y=a.y+13,x1=a.x+8,x2=b.x-8,mid=(x1+x2)/2;
   out+=`<path class="score-tie" d="M${x1} ${y} Q${mid} ${y+20} ${x2} ${b.y+13}" fill="none" stroke="#445b4b" stroke-width="2.4" stroke-linecap="round"/>`;
  });
  notes.forEach((ev,i)=>{if(!ev.slurToNext)return;
   const a=noteCoords.get(ev.id),b=noteCoords.get(notes[i+1]?.id);if(!a||!b)return;
   const x1=a.x+7,x2=b.x-7,mid=(x1+x2)/2;
   out+=`<path class="score-slur" d="M${x1} ${a.y-12} Q${mid} ${Math.min(a.y,b.y)-33} ${x2} ${b.y-12}" fill="none" stroke="#3e6454" stroke-width="2.4" stroke-linecap="round"/>`;
  });
 }
 out+='</svg>';
 if(layout==='compact'&&Array.isArray(readingCues)){
  const first=measureOffset+1,last=measureOffset+score.measures.length;
  const showing=readingCues.filter(cue=>cue&&Number.isInteger(cue.bar)&&cue.bar>=first&&cue.bar<=last&&typeof cue.text==='string');
  if(showing.length){
   out+=`<div class="score-reading-cues" aria-label="Lyric and song-section cues for measures ${first} to ${last}">${showing.map(cue=>
    `<div class="score-reading-cue ${cue.kind==='section'?'cue-section':'cue-lyric'}" data-lyric-bar="${cue.bar}"><span class="cue-bar">Bar ${cue.bar}</span><span class="cue-text">${esc(cue.text)}</span>${cue.kind==='section'?'<span class="cue-kind">Section</span>':''}</div>`
   ).join('')}</div>`;
  }
 }
 return out;
}
