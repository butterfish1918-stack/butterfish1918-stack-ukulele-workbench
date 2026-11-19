/** Canonical, dependency-free ukulele theory model. All pitches are sounding MIDI values. */
export const PITCH_CLASSES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const ROOTS = ['C','C#','Db','D','Eb','E','F','F#','Gb','G','Ab','A','Bb','B'];
export const LETTERS = ['C','D','E','F','G','A','B'];
const NATURAL = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export const TUNINGS = {
  highG:{label:'High G · GCEA',names:['G','C','E','A'],midi:[67,60,64,69],description:'Re-entrant concert tuning'},
  lowG:{label:'Low G · GCEA',names:['G','C','E','A'],midi:[55,60,64,69],description:'Linear fourth string'},
  baritone:{label:'Baritone · DGBE',names:['D','G','B','E'],midi:[50,55,59,64],description:'Baritone ukulele tuning'}
};
export const SCALES = {
  major:{name:'Major (Ionian)',steps:[0,2,4,5,7,9,11],degrees:[0,1,2,3,4,5,6]},
  naturalMinor:{name:'Natural minor',steps:[0,2,3,5,7,8,10],degrees:[0,1,2,3,4,5,6]},
  harmonicMinor:{name:'Harmonic minor',steps:[0,2,3,5,7,8,11],degrees:[0,1,2,3,4,5,6]},
  melodicMinor:{name:'Melodic minor (ascending)',steps:[0,2,3,5,7,9,11],degrees:[0,1,2,3,4,5,6]},
  dorian:{name:'Dorian',steps:[0,2,3,5,7,9,10],degrees:[0,1,2,3,4,5,6]},
  phrygian:{name:'Phrygian',steps:[0,1,3,5,7,8,10],degrees:[0,1,2,3,4,5,6]},
  lydian:{name:'Lydian',steps:[0,2,4,6,7,9,11],degrees:[0,1,2,3,4,5,6]},
  mixolydian:{name:'Mixolydian',steps:[0,2,4,5,7,9,10],degrees:[0,1,2,3,4,5,6]},
  locrian:{name:'Locrian',steps:[0,1,3,5,6,8,10],degrees:[0,1,2,3,4,5,6]},
  majorPenta:{name:'Major pentatonic',steps:[0,2,4,7,9],degrees:[0,1,2,4,5]},
  minorPenta:{name:'Minor pentatonic',steps:[0,3,5,7,10],degrees:[0,2,3,4,6]},
  blues:{name:'Minor blues',steps:[0,3,5,6,7,10],degrees:[0,2,3,4,4,6]}
};
export const mod = (n,m) => ((n%m)+m)%m;
export function notePc(name){const m=/^([A-G])([#b]{0,2})$/.exec(name);if(!m)throw new Error('Invalid note: '+name);return mod(NATURAL[m[1]] + [...m[2]].reduce((a,c)=>a+(c==='#'?1:-1),0),12);}
export function spelledScale(root,scaleKey='major'){
  const s=SCALES[scaleKey];if(!s)throw new Error('Unknown scale');
  const tonic=notePc(root), tonicLetter=LETTERS.indexOf(root[0]);
  return s.steps.map((step,i)=>{
    const pc=mod(tonic+step,12);
    if(s.degrees===null){return {pc,name:nearestSpelling(pc,root),degree:i+1,step};}
    const letter=LETTERS[mod(tonicLetter+s.degrees[i],7)];
    const diff=mod(pc-NATURAL[letter]+6,12)-6;
    const suffix=diff>0?'#'.repeat(diff):'b'.repeat(-diff);
    return {pc,name:letter+suffix,degree:i+1,step};
  });
}
function nearestSpelling(pc,root){
 const preferred=/b/.test(root)?['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']:PITCH_CLASSES;
 return preferred[pc];
}
export function midiName(midi,preferFlats=false){
 const flat=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
 return (preferFlats?flat:PITCH_CLASSES)[mod(midi,12)] + (Math.floor(midi/12)-1);
}
export const midiFreq=(midi,concertA=440)=>concertA*Math.pow(2,(midi-69)/12);
export function freqMidi(hz,concertA=440){return 69+12*Math.log2(hz/concertA);}
export function fretboard(tuningKey='highG',frets=12){
 const t=TUNINGS[tuningKey];if(!t)throw new Error('Unknown tuning');
 return t.midi.map((open,string)=>Array.from({length:frets+1},(_,fret)=>({string,fret,midi:open+fret,pc:mod(open+fret,12)})));
}
export function optionsForMidi(midi,tuningKey='highG',frets=12){return fretboard(tuningKey,frets).flat().filter(p=>p.midi===midi);}
export function scalePositions(root,scale='major',tuning='highG',frets=12){const pcs=new Set(spelledScale(root,scale).map(x=>x.pc));return fretboard(tuning,frets).flat().filter(p=>pcs.has(p.pc));}
export function chordFromScale(root='C',scale='major',degree=0,extension=3){
 const notes=spelledScale(root,scale);if(notes.length!==7) return null;
 const s=SCALES[scale];
 const stack=Array.from({length:extension},(_,i)=>{const pos=degree+2*i;const idx=pos%7;return {...notes[idx],absolute:s.steps[idx]+12*Math.floor(pos/7)};});
 const d1=mod(stack[1].absolute-stack[0].absolute,12);
 const d2=mod(stack[2].absolute-stack[0].absolute,12);
 const quality=d1===4&&d2===7?'major':d1===3&&d2===7?'minor':d1===3&&d2===6?'diminished':d1===4&&d2===8?'augmented':'other';
 const name=stack[0].name+({major:'',minor:'m',diminished:'dim',augmented:'aug',other:''}[quality]);
 const seventh=extension===4?stack[3].absolute-stack[0].absolute:null;
 const suffix=extension===4 ? (quality==='major'&&seventh===11?'maj7':quality==='major'&&seventh===10?'7':quality==='minor'&&seventh===10?'m7':quality==='minor'&&seventh===11?'m(maj7)':quality==='diminished'&&seventh===10?'m7b5':quality==='diminished'&&seventh===9?'dim7':'7') : null;
 return {name:extension===4?stack[0].name+suffix:name,quality,pcs:stack.map(n=>n.pc),notes:stack.map(n=>n.name),degree:degree+1};
}
export function harmonizedChords(root='C',scale='major',extension=3){if(spelledScale(root,scale).length!==7)return [];return Array.from({length:7},(_,i)=>chordFromScale(root,scale,i,extension));}
/** Search easy four-string voicings by fewest fingered notes and narrowest span. */
export function chordVoicings(pcs,tuningKey='highG',frets=12,limit=5){
 const target=new Set(pcs), strings=fretboard(tuningKey,frets).map(row=>row.filter(x=>target.has(x.pc) && x.fret<=9));
 let candidates=[];
 function traverse(s,chosen){
  if(s===4){
   const notes=chosen.filter(Boolean);
   if(notes.length<3)return;
   const used=new Set(notes.map(x=>x.pc));
   if([...target].some(pc=>!used.has(pc)))return;
   const fretted=notes.filter(x=>x.fret>0).map(x=>x.fret), span=fretted.length?Math.max(...fretted)-Math.min(...fretted):0;
   if(span>4)return;
   const max=Math.max(...fretted,0);
   const score=span*3+max*.35+fretted.length*.5+(4-notes.length)*1.1;
   candidates.push({frets:chosen.map(x=>x?x.fret:-1),midis:chosen.map(x=>x?x.midi:null),score});return;
  }
  traverse(s+1,[...chosen,null]);
  for(const fret of strings[s]) traverse(s+1,[...chosen,fret]);
 }
 traverse(0,[]);
 candidates.sort((a,b)=>a.score-b.score);
 const uniq=new Set();return candidates.filter(c=>{const sig=c.frets.join('-');if(uniq.has(sig))return false;uniq.add(sig);return true;}).slice(0,limit);
}
export function scaleMelody(root='C',scale='major',tuningKey='highG'){
 const notes=spelledScale(root,scale),tonicPc=notePc(root),baseTuning=TUNINGS[tuningKey];
 const playable=[];
 for(let midi=48;midi<=74;midi++){
   if(mod(midi,12)!==tonicPc||!optionsForMidi(midi,tuningKey,12).length)continue;
   const score=notes.reduce((count,n)=>count+(optionsForMidi(midi+n.step,tuningKey,12).length?1:0),0);
   playable.push({midi,score});
 }
 playable.sort((a,b)=>b.score-a.score||a.midi-b.midi);
 const tonic=playable[0]?.midi??baseTuning.midi[1];
 return notes.map(n=>({midi:tonic+n.step,spelling:n.name,degree:n.degree,pc:n.pc}));
}

/** Y-coordinate of a written notehead in treble clef: E4 is y=baseline. */
export function staffY(midi,baseline=88){
 const pc=mod(midi,12);const natural=['C','D','E','F','G','A','B'];
 const idxByPc={0:0,1:0,2:1,3:1,4:2,5:3,6:3,7:4,8:4,9:5,10:5,11:6};
 const octave=Math.floor(midi/12)-1;const stepFromE4=(octave-4)*7+idxByPc[pc]-2;
 return baseline-stepFromE4*6;
}
export function staffYForSpelling(midi,spelling,baseline=88){
 const match=/^([A-G])([#b]*)$/.exec(spelling||midiName(midi).replace(/-?\d+$/, ''));
 const letter=match?.[1]??'C',accidental=match?.[2]??'';
 const correction=[...accidental].reduce((sum,c)=>sum+(c==='#'?1:-1),0);
 const octave=Math.round((midi-NATURAL[letter]-correction)/12)-1;
 return baseline-((octave-4)*7+LETTERS.indexOf(letter)-2)*6;
}
