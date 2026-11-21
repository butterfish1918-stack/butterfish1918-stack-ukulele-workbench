import {ROOTS,SCALES,TUNINGS,PITCH_CLASSES,mod,spelledScale,midiName,midiFreq,freqMidi,fretboard,optionsForMidi,scalePositions,harmonizedChords,chordVoicings,scaleMelody,staffYForSpelling} from './music.js';
import {createScore,validateScore,appendEvent,insertEvent,appendMeasure,findEvent,removeEvent,replaceEvent,assignPosition,changeTuning,timeline,measureBeats,remainingBeats,preferredPosition,DURATIONS,METERS,KEY_SIGNATURES,QUARTER_LABELS,spellingsForMidi,setTieToNext,canTieNext,setKeySignature,CHORD_SHAPES,ARTICULATIONS,STROKES,setArticulation,setSlurToNext,setStroke} from './score.js';
import {renderScoreView} from './score-view.js';
import {engravingPlan,loadVexFlow,renderEngravedScore} from './engraving.js';
import {estimateFundamental} from './tuner-dsp.js';
import {prepareBackupRestore,commitBackupRestore} from './storage-safety.js';
import {inspectDevice} from './device-qa.js';
import {BUNDLED_LIBRARY} from './library-seed.js';
import {DEFAULT_CATALOG_URL,catalogUrl,validateSnapshot,downloadRepository,copyToSongbook} from './song-library.js';
import {exportMusicXML,importMusicXML} from './musicxml.js';
import {createHistory,commitHistory,undoHistory,redoHistory,canUndo,canRedo} from './history.js';
import {TECHNIQUE_CATALOG,TECHNIQUE_LESSONS,techniqueScore,recordTechniquePractice,validTechniqueProgress} from './technique-lessons.js';
import {createProgression,validateProgression,editProgression,applyRhythmPreset,buildProgressionScore,progressionChords,progressionKeys,progressionPlacement,PROGRESSION_LIMIT,PROGRESSION_MODES,PROGRESSION_METERS,RHYTHM_PRESETS} from './progression.js';
import {RHYTHM_STUDIES,rhythmStudy,rhythmStudyScore,rhythmOnsets,countIn,gradeRhythmTaps,recordRhythmResult,validRhythmProgress} from './rhythm-lessons.js';
import {KEY_SEQUENCE,READING_STUDIES,keyQuestion,relativeMinor,sightStudy,sightStudyScore,sightEvent,sightChoices,gradeSightNote,writtenName,recordReadingProgress,validReadingProgress} from './reading-lessons.js';
const $=(q,scope=document)=>scope.querySelector(q);
const $$=(q,scope=document)=>Array.from(scope.querySelectorAll(q));
const h=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{const value=localStorage.getItem('uw-'+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}};
const store=(key,value)=>{try{localStorage.setItem('uw-'+key,JSON.stringify(value));return true}catch{toast('Local storage unavailable; export your work to back it up');return false}};
const state={page:'score',root:'C',scale:'major',tuning:read('tuning','highG'),display:read('display','notation'),labels:read('labels','notes'),selectedMidi:60,chordDegree:0,chordExtension:3,chordIndex:0,tempo:read('tempo',86),a4:read('a4',440),quizCorrect:0,quizTotal:0,quizMidi:64,quizAnswers:[],quizDone:false,showHints:read('hints',true),rhythm:read('rhythm',['D','','U','U','D','','U','']),rhythmStep:-1,rhythmQuizIndex:read('rhythmQuizIndex',0),rhythmQuizCorrect:read('rhythmQuizCorrect',0),rhythmQuizTotal:read('rhythmQuizTotal',0),rhythmQuizDone:false,rhythmQuizAnswer:null,expressionIndex:read('expressionIndex',0),expressionCorrect:read('expressionCorrect',0),expressionTotal:read('expressionTotal',0),expressionAnswer:null,expressionDone:false,songOpen:null,editing:false,techFocus:'left',techIndex:0,techDisplay:read('techDisplay','notation'),techShowFingers:read('techFingers',false),techTempo:null,techEventId:null,techPlayingEventId:null};
state.progNewDuration=4;
state.keyLessonIndex=Math.max(0,Math.floor(Number(read('keyLessonIndex',0))||0));
state.keyLessonMode=['major','relativeMinor'].includes(read('keyLessonMode','major'))?read('keyLessonMode','major'):'major';
state.keyLessonAnswer=null;
state.sightLessonId=READING_STUDIES.some(s=>s.id===read('sightLessonId','SR-01'))?read('sightLessonId','SR-01'):'SR-01';
state.sightLessonIndex=0;
state.sightLessonAnswer=null;
state.sightShowFingering=false;

state.rhythmLabId=RHYTHM_STUDIES.some(x=>x.id===read('rhythmLabId','RT-01'))?read('rhythmLabId','RT-01'):'RT-01';state.rhythmLabResult=null;
let engravedPreviewEnabled=false;
let deviceReport=null;
let progressionPlayback=null,techniquePlayback=null,rhythmLabPlayback=null,ac=null,scorePlayback=null,playToken=0,metronomeTimer=null,metroNext=0,metroBeat=0,rhythmTimer=null,tunerStream=null,tunerFrame=0,tunerCtx=null,tunerSource=null,tunerAnalyser=null;
const pageNames={explorer:'Fretboard & Theory',progression:'Progression Builder',notation:'Notation Academy',technique:'Technique Academy',rhythm:'Rhythm Studio',songbook:'My Songbook',practice:'Practice Room',score:'Score Studio'};
const songs=()=>read('songs',[]),progress=()=>read('progress',[]);
function initialRepository(){const cached=read('repositorySnapshot',null);try{if(cached&&validateSnapshot(cached,validateScore))return cached}catch{}return structuredClone(BUNDLED_LIBRARY)}
state.songbookView='mine';state.songSectionIndex=0;state.repositorySnapshot=initialRepository();state.repoSelectedId=state.repositorySnapshot.catalog.entries[0]?.id??null;state.repositorySource=read('repositorySource',DEFAULT_CATALOG_URL);state.repoSyncing=false;state.repoError=null;state.repoQuery='';state.repoDifficulty='all';state.repoSectionIndex=0;
function loadProgression(){const saved=read('progressionDraft',null);try{if(saved&&validateProgression(saved))return saved}catch{}return createProgression({tuning:TUNINGS[state.tuning]?state.tuning:'highG'});}
state.progression=loadProgression();
function updateProgression(next){try{validateProgression(next);stopProgression();state.progression=next;store('progressionDraft',next);render();return true}catch(e){toast(e.message);return false}}
function initializeScore(){const saved=read('scoreDraft',null);try{if(saved && validateScore(saved))return saved}catch{}return createScore({tuning:state.tuning});}
state.score=initializeScore();let scoreHistory=createHistory(state.score);state.scoreEventId=(timeline(state.score).find(e=>e.type==='note'&&e.position?.fret>0)||timeline(state.score).find(e=>e.type==='note'))?.id??null;state.scoreSongId=read('scoreSongId',null);state.playingEventId=null;state.draftMidi=60;state.draftSpelling='C';state.draftDuration=1;state.draftType='note';
function persistScore(){store('scoreDraft',state.score);store('scoreSongId',state.scoreSongId)}
function setScore(score,songId=null){validateScore(score);stopScorePlayback();state.score=structuredClone(score);scoreHistory=createHistory(state.score);state.scoreSongId=songId;state.scoreEventId=null;state.draftMidi=60;state.draftSpelling='C';state.draftDuration=1;state.draftType='note';persistScore();}
function scoreMutation(callback){stopScorePlayback();try{const draft=structuredClone(state.score);const result=callback(draft);validateScore(draft);scoreHistory=commitHistory(scoreHistory,draft);state.score=structuredClone(scoreHistory.current);persistScore();render();return result}catch(e){toast(e.message);return null}}
function restoreScoreHistory(direction){
 stopScorePlayback();
 if(direction==='undo'&&!canUndo(scoreHistory)||direction==='redo'&&!canRedo(scoreHistory))return;
 scoreHistory=direction==='undo'?undoHistory(scoreHistory):redoHistory(scoreHistory);
 state.score=structuredClone(scoreHistory.current);
 if(!findEvent(state.score,state.scoreEventId))state.scoreEventId=null;
 persistScore();render();toast(direction==='undo'?'Edit undone':'Edit restored');
}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2400)}
function audio(){if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)()}if(ac.state==='suspended')ac.resume().catch(()=>{});return ac}
function synth(midi,at=0,dur=.32,volume=.12){const ctx=audio();const time=at||ctx.currentTime+.012;const o=ctx.createOscillator();const g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(midiFreq(midi,state.a4),time);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(volume,.001),time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+dur);o.connect(g).connect(ctx.destination);o.start(time);o.stop(time+dur+.015);return o}
/** Plays a notated event, including simultaneous chord tones with a small strum offset.
 * Staccato/tenuto/accents are simplified reference playback, not human interpretation.
 */
function synthEvent(ev,at,seconds,durationBeats=ev.duration){
 if(ev.type==='rest')return [];
 const length=Math.max(.075,durationBeats*seconds);
 const duration=ev.articulation==='staccato'?length*.48:ev.articulation==='tenuto'?length*.99:length*.92;
 const volume=ev.articulation==='accent'?.145:.095;
 if(ev.type==='chord'){
  const notes=ev.stroke==='up'?[...ev.notes].reverse():ev.notes;
  return notes.map((n,i)=>synth(n.midi,at+(ev.stroke==='none'?0:i*.024),duration,volume*.66));
 }
 return [synth(ev.midi,at,duration,volume)];
}
function tick(at=0,accent=false){const ctx=audio();const time=at||ctx.currentTime+.01;const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='square';osc.frequency.setValueAtTime(accent?1180:800,time);gain.gain.setValueAtTime(.085,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.047);osc.connect(gain).connect(ctx.destination);osc.start(time);osc.stop(time+.06)}
function playSeries(events,spacing=.35){const token=++playToken;const ctx=audio(),start=ctx.currentTime+.08;events.forEach((e,i)=>{const at=start+i*spacing;const m=typeof e==='number'?e:e?.midi;if(m!=null)synth(m,at,spacing*.82);});setTimeout(()=>{if(token===playToken)toast('Playback complete')},events.length*spacing*1000+100)}
function fromPcToMidi(pc,min=60){for(let m=min;m<85;m++)if(mod(m,12)===pc)return m;return 60}
function possibleMidi(m){return optionsForMidi(m,state.tuning,12).length>0}
function scaleNotes(){return spelledScale(state.root,state.scale)}
function melody(){return scaleMelody(state.root,state.scale,state.tuning).slice(0,8)}
function uiSelect(id,options,value){return `<select id="${id}">${options.map(([v,label])=>`<option value="${h(v)}" ${v===value?'selected':''}>${h(label)}</option>`).join('')}</select>`}
function tabbar(opts,current,attr){return `<div class="tabbar" role="group">${opts.map(([value,label])=>`<button type="button" ${attr}="${value}" class="${value===current?'active':''}">${label}</button>`).join('')}</div>`}
function hero(brow,title,desc,tag){return `<div class="hero"><div><div class="eyebrow">${brow}</div><h1>${title}</h1><p>${desc}</p></div>${tag?`<div class="hero-badge">${tag}</div>`:''}</div>`}
function fretSvg(){const tuning=TUNINGS[state.tuning],notes=scaleNotes(),pcs=new Set(notes.map(n=>n.pc)),selected=state.selectedMidi;const x0=70,spacing=51,xend=x0+12*spacing,ys=[50,103,156,209];let svg=`<svg role="img" aria-label="${h(tuning.label)} fretboard with ${h(state.root)} ${h(SCALES[state.scale].name)} notes" viewBox="0 0 750 269" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#253b30"/><stop offset="1" stop-color="#1c3027"/></linearGradient></defs><rect x="${x0}" y="30" width="612" height="197" rx="5" fill="url(#wood)"/>`;
 for(let i=0;i<=12;i++){const x=x0+i*spacing;svg+=`<line x1="${x}" y1="30" x2="${x}" y2="227" stroke="${i===0?'#d8c9a5':'#708476'}" stroke-width="${i===0?8:2}" opacity="${i===0?1:.8}"/>`}
 for(const [i,y] of ys.entries()){svg+=`<line x1="${x0}" y1="${y}" x2="${xend}" y2="${y}" stroke="${i===0?'#d2c8a9':'#c3cbc2'}" stroke-width="${1.5+i*.45}"/>`;svg+=`<text x="29" y="${y+6}" fill="#e8c48b" font-size="17" font-family="Georgia">${tuning.names[i]}</text>`}
 [3,5,7,9,12].forEach(n=>{const xx=x0+(n-.5)*spacing;svg+=`<circle cx="${xx}" cy="130" r="${n===12?7:4}" fill="#577661" opacity=".9"/>`});
 fretboard(state.tuning).flat().filter(p=>pcs.has(p.pc)).forEach(p=>{const x=p.fret===0?x0-22:x0+(p.fret-.5)*spacing,y=ys[p.string],root=p.pc===notes[0].pc,isSelected=p.midi===selected;const degree=notes.find(n=>n.pc===p.pc),n=state.labels==='degrees'?String(degree?.degree??''):state.labels==='frets'?String(p.fret):degree?.name??'';svg+=`<g class="fret-cell" data-midi="${p.midi}" data-string="${p.string}" data-fret="${p.fret}" role="button" aria-label="${h(degree?.name)} on string ${p.string+1}, fret ${p.fret}" tabindex="0"><circle cx="${x}" cy="${y}" r="${isSelected?17:14}" fill="${isSelected?'#f3ead6':root?'#deba79':'#598c72'}" stroke="${isSelected?'#e9c683':'#21382c'}" stroke-width="${isSelected?3:1.4}"/><text x="${x}" y="${y+4}" fill="${isSelected?'#13251c':'#f6f5e9'}" font-size="${n.length>2?9:11}" text-anchor="middle" font-family="system-ui" font-weight="700">${h(n)}</text></g>`});
 for(let i=1;i<=12;i++){const x=x0+(i-.5)*spacing;svg+=`<text x="${x}" y="251" text-anchor="middle" font-size="11" fill="#a0b5a5">${i}</text>`}return svg+'</svg>';
}
const SVG_NS='http://www.w3.org/2000/svg';
function scoreSvg(events,{showNames=false,title=null}={}){
 const notes=events??[],n=notes.length,w=Math.max(570,110+n*68),baseline=96,top=48,staffLeft=58;let svg=`<svg viewBox="0 0 ${w} 164" xmlns="${SVG_NS}" role="img" aria-label="Treble clef notation for the selected scale"><rect x="0" y="0" width="${w}" height="164" fill="#eee8db"/>`;
 for(let y=top;y<=baseline;y+=12)svg+=`<line x1="12" y1="${y}" x2="${w-14}" y2="${y}" stroke="#35413a" stroke-width="1.1"/>`;
 svg+=`<text x="18" y="${baseline-2}" fill="#2b392f" font-size="64" font-family="Georgia,serif">𝄞</text>`;
 if(title)svg+=`<text x="${w-20}" y="22" text-anchor="end" fill="#60705e" font-size="11">${h(title)}</text>`;
 notes.forEach((event,i)=>{
  const x=staffLeft+32+i*68,y=staffYForSpelling(event.midi,event.spelling,baseline),isSelected=event.midi===state.selectedMidi;
  // Every second staff step below E4 or above F5 needs a ledger line.
  if(y>baseline){for(let ly=baseline+12;ly<=y+1;ly+=12)svg+=`<line x1="${x-14}" y1="${ly}" x2="${x+14}" y2="${ly}" stroke="#35413a" stroke-width="1.1"/>`}
  if(y<top){for(let ly=top-12;ly>=y-1;ly-=12)svg+=`<line x1="${x-14}" y1="${ly}" x2="${x+14}" y2="${ly}" stroke="#35413a" stroke-width="1.1"/>`}
  const accidental=event.spelling?.match(/[#b]+/)?.[0]??'';
  if(accidental)svg+=`<text x="${x-25}" y="${y+5}" fill="#293b30" font-size="18">${accidental==='b'?'♭':accidental==='#'?'♯':h(accidental)}</text>`;
  svg+=`<g class="score-note" role="button" tabindex="0" aria-label="Play ${h(event.spelling||midiName(event.midi))}" data-midi="${event.midi}"><ellipse cx="${x}" cy="${y}" rx="9.5" ry="6" transform="rotate(-20 ${x} ${y})" fill="${isSelected?'#b77f39':'#1e3026'}"/><line x1="${x+8}" y1="${y}" x2="${x+8}" y2="${y-36}" stroke="${isSelected?'#b77f39':'#1e3026'}" stroke-width="2"/><rect x="${x-19}" y="${y-14}" width="40" height="53" fill="transparent"/></g>`;
  if(showNames)svg+=`<text x="${x}" y="145" text-anchor="middle" font-size="11" font-weight="700" fill="#3c5542">${h(event.spelling||midiName(event.midi))}</text>`;
 });
 return svg+'</svg>';
}
function tabSvg(events){let out=`<svg viewBox="0 0 620 145" xmlns="${SVG_NS}" role="img" aria-label="Four-string tablature"><rect width="620" height="145" fill="#eee8db"/>`;
 const tuning=TUNINGS[state.tuning];for(let s=0;s<4;s++){let y=18+s*32;out+=`<line x1="32" x2="608" y1="${y}" y2="${y}" stroke="#4a5b4b" stroke-width="1.1"/><text x="8" y="${y+5}" fill="#3c513f" font-size="14">${tuning.names[3-s]}</text>`}
 events.forEach((e,i)=>{const x=72+i*64;let options=optionsForMidi(e.midi,state.tuning,12);options.sort((a,b)=>a.fret-b.fret);if(options.length){let p=options[0],yy=18+(3-p.string)*32;out+=`<rect x="${x-10}" y="${yy-11}" width="21" height="22" fill="#eee8db"/><text x="${x}" y="${yy+5}" text-anchor="middle" fill="#253728" font-size="15">${p.fret}</text>`}});return out+'</svg>'}
function chordSvg(voicing,tuningKey=state.tuning){if(!voicing)return `<div class="small-text">No comfortable voicing within the current search constraints.</div>`;const f=voicing.frets,fretted=f.filter(n=>n>0),start=Math.max(1,(fretted.length?Math.min(...fretted):1)-1),end=start+4;let svg=`<svg viewBox="0 0 130 162" role="img" aria-label="Chord fingering ${h(f.join(', '))}" xmlns="${SVG_NS}">`;
 for(let i=0;i<4;i++){const x=27+i*27;svg+=`<line x1="${x}" y1="31" x2="${x}" y2="145" stroke="#b5c4af" stroke-width="1.3"/><text x="${x}" y="18" font-size="12" fill="#d5bd88" text-anchor="middle">${TUNINGS[tuningKey].names[i]}</text>`}
 for(let n=0;n<=4;n++){const y=31+n*27;svg+=`<line x1="27" y1="${y}" x2="108" y2="${y}" stroke="${n===0&&start===1?'#e4c58a':'#667b68'}" stroke-width="${n===0&&start===1?4:1.2}"/>`}
 f.forEach((fret,s)=>{const x=27+s*27;if(fret===-1)svg+=`<text x="${x}" y="29" fill="#ce9890" text-anchor="middle" font-size="13">×</text>`;else if(fret===0)svg+=`<circle cx="${x}" cy="26" r="5" fill="none" stroke="#e3c78f" stroke-width="1.6"/>`;else{const y=31+(fret-start+.5)*27;if(y>20&&y<145)svg+=`<circle cx="${x}" cy="${y}" r="10" fill="#e0ba7e"/>`}});
 if(start>1)svg+=`<text x="7" y="49" font-size="11" fill="#c1cebf">${start}</text>`;return svg+'</svg>'}
function chordSection(){const chords=harmonizedChords(state.root,state.scale,state.chordExtension);if(!chords.length)return `<p class="small-text">Five- and six-tone scales don't define a unique seven-chord diatonic harmonization. Choose a seven-note scale to explore its triads.</p>`;
 state.chordDegree=Math.min(state.chordDegree,6);const current=chords[state.chordDegree],voicings=chordVoicings(current.pcs,state.tuning),voice=voicings[Math.min(state.chordIndex,voicings.length-1)];return `<div class="panel-pad"><div class="panel-title"><h2>Chords in this key</h2>${tabbar([['3','Triads'],['4','Sevenths']],String(state.chordExtension),'data-extension')}</div><p class="panel-desc">Diatonic harmony, shown with playable ukulele voicings.</p><div class="chord-grid">${chords.map((c,i)=>`<button class="chord-tile ${i===state.chordDegree?'selected':''}" data-degree="${i}"><b>${h(c.name)}</b><small>${['I','II','III','IV','V','VI','VII'][i]} · ${h(c.quality)}</small></button>`).join('')}</div><div class="chord-display"><div class="chord-diagram">${chordSvg(voice)}</div><div class="chord-copy"><h3>${h(current.name)}</h3><p>Notes: ${current.notes.map(h).join(' · ')}<br>${voicings.length} suggested position${voicings.length===1?'':'s'}</p><div class="score-actions"><button class="btn compact" data-action="play-chord">▶ Hear chord</button><button class="btn compact ghost" data-action="next-voicing">Other shape ↻</button><button class="btn compact" data-action="prog-add-explorer">＋ Use in progression</button><button class="btn compact ghost" data-nav="progression">Builder →</button></div>${voice?`<span class="mini-pill">Frets ${h(voice.frets.map(v=>v<0?'×':v).join('–'))}</span>`:''}</div></div></div>`}
function explorer(){const notes=scaleNotes(),m=melody();return `${hero('EXPLORE · UNDERSTAND · PLAY','Discover your <em>fretboard.</em>','Understand scales through musical notation, see every playable position, and connect them to chords and sound.','GCEA · NOTATION FIRST')}
 <div class="workspace-grid"><section class="panel wide"><div class="panel-pad"><div class="panel-title"><h2>Scale Explorer</h2><div class="right"><span class="sub-label">UW-F01 / UW-F02</span></div></div><div class="control-row"><div class="control"><label for="root">KEY / TONIC</label>${uiSelect('root',ROOTS.map(x=>[x,x]),state.root)}</div><div class="control" style="flex:1;min-width:165px"><label for="scale">SCALE OR MODE</label>${uiSelect('scale',Object.entries(SCALES).map(([k,v])=>[k,v.name]),state.scale)}</div><div class="control" style="flex:1;min-width:150px"><label for="tuning">UKULELE TUNING</label>${uiSelect('tuning',Object.entries(TUNINGS).map(([k,v])=>[k,v.label]),state.tuning)}</div></div><div class="section-bar"><h2>The fretboard</h2>${tabbar([['notes','Note names'],['degrees','Degrees'],['frets','Fret numbers']],state.labels,'data-labels')}</div><div class="fretboard-wrap">${fretSvg()}</div><div class="legend"><span><i class="legend-dot root"></i>Root</span><span><i class="legend-dot scale"></i>Scale note</span><span><i class="legend-dot selected"></i>Selected pitch</span></div></div></section>
 <section class="panel"><div class="panel-pad"><div class="panel-title"><h2>Read the scale</h2><div class="right"><span class="sub-label">STANDARD NOTATION</span></div></div><p class="panel-desc">Tap a note on the stave to hear it and reveal its fretboard positions. Notation is always the default.</p><div class="fret-controls">${tabbar([['notation','Notation'],['dual','Score + Tab'],['tab','Tab only']],state.display,'data-display')}<button class="btn compact" data-action="play-scale">▶ Play scale</button></div>${state.display!=='tab'?`<div class="score-holder">${scoreSvg(m,{showNames:state.showHints,title:`${state.root} ${SCALES[state.scale].name}`})}</div>`:''}${state.display!=='notation'?`<div class="score-holder" style="margin-top:9px">${tabSvg(m)}</div>`:''}<div class="score-info"><span>${h(state.root)} · ${h(SCALES[state.scale].name)}</span><span>Treble clef · quarter notes · practice sketch</span></div><div class="note-strip">${notes.map((n,i)=>`<button class="note-pill ${i===0?'is-root':''} ${mod(state.selectedMidi,12)===n.pc?'selected':''}" data-pc="${n.pc}" title="Hear ${h(n.name)}"><b>${h(n.name)}</b><small>${i+1}${['st','nd','rd'][i]||'th'} tone</small></button>`).join('')}</div><label class="small-text"><input type="checkbox" id="showHints" ${state.showHints?'checked':''}/> Show optional note names beneath staff</label></div></section>
 <section class="panel">${chordSection()}</section></div><div class="section-bar"><h2>Continue learning</h2><small>YOUR NEXT STEPS</small></div><div class="workspace-grid"><div class="panel panel-pad"><div class="lesson"><div class="lesson-icon">𝄞</div><div><h3>Notation foundations</h3><p>Read notes directly from the stave, then find them on your ukulele.</p></div><button class="btn compact" data-nav="notation">Begin →</button></div></div><div class="panel panel-pad"><div class="lesson"><div class="lesson-icon">◷</div><div><h3>Rhythm in practice</h3><p>Build a strumming pattern and practise keeping time.</p></div><button class="btn compact" data-nav="rhythm">Explore →</button></div></div></div><div class="footer-note">Prototyping milestone M0/M1 · Notes and chord pitch are generated from a shared ukulele model.</div>`}
function progressionBuilder(){
 const p=state.progression,mode=p.mode??'major',meter=p.meter??'4/4',chords=progressionChords(p),available=harmonizedChords(p.root,mode,3),sevenths=harmonizedChords(p.root,mode,4);
 const score=chords.length?buildProgressionScore(p):null;
 const cap=measureBeats(meter),allowedDurations=DURATIONS.filter(n=>n<=cap&&n>=.5);
 const degreeNames=mode==='major'?['I','ii','iii','IV','V','vi','vii°']:mode==='naturalMinor'?['i','ii°','III','iv','v','VI','VII']:['i','ii°','III+','iv','V','VI','vii°'];
 const measures=score?score.measures.length:0,full=chords.length>=PROGRESSION_LIMIT;
 const newDuration=allowedDurations.includes(state.progNewDuration)?state.progNewDuration:cap;
 const patterns=Object.entries(RHYTHM_PRESETS).filter(([,r])=>r.meter===meter);
 return `${hero('COMPOSE · HARMONIZE · PLAY','Build a <em>progression.</em>','Compose diatonic harmony and real notated strumming rhythms, then save your music in the Songbook.',`${h(PROGRESSION_MODES[mode].toUpperCase())} · ${h(meter)} · SCORE FIRST`)}
 <div class="workspace-grid"><section class="panel panel-pad"><div class="panel-title"><h2>Harmony workspace</h2><span class="sub-label">UW-F04 · IN PROGRESS</span></div>
 <div class="control-row"><div class="control" style="flex:2"><label for="progTitle">TITLE</label><input id="progTitle" class="work-input" maxlength="120" value="${h(p.title)}"></div>
 <div class="control"><label for="progMode">HARMONY</label>${uiSelect('progMode',Object.entries(PROGRESSION_MODES),mode)}</div>
 <div class="control"><label for="progKey">KEY / TONIC</label>${uiSelect('progKey',progressionKeys(mode).map(key=>[key,key+' '+(mode==='major'?'major':'minor')]),p.root)}</div>
 <div class="control"><label for="progMeter">METER</label>${uiSelect('progMeter',PROGRESSION_METERS.map(m=>[m,m]),meter)}</div>
 <div class="control"><label for="progTuning">TUNING</label>${uiSelect('progTuning',Object.entries(TUNINGS).map(([k,t])=>[k,t.label]),p.tuning)}</div>
 <div class="control"><label for="progTempo">BPM</label><input id="progTempo" type="number" min="40" max="200" value="${p.tempo}" class="work-input"></div></div>
 <p class="small-text">Natural minor uses the relative-major key signature. Harmonic minor raises its seventh degree with written accidentals. Changing meter preserves whole-bar chords; an existing in-bar rhythm must be cleared before changing meter.</p>
 <div class="section-bar"><h2>Add a chord</h2><small>TRIADS / SEVENTHS</small></div>
 <div class="control-row"><div class="control"><label for="progAddDuration">NEW CHORD LENGTH</label>${uiSelect('progAddDuration',allowedDurations.map(d=>[String(d),`${d} beat${d===1?'':'s'}`]),String(newDuration))}</div><div class="control"><label>RHYTHM PRESETS</label><div class="small-text">Choose a full-bar chord below, then expand it into strummed attacks.</div></div></div>
 <div class="progression-options">${available.map((c,i)=>`<div class="progression-option"><b>${h(degreeNames[i])} · ${h(c.name)}</b><div class="score-actions"><button class="btn compact" data-prog-degree="${i}" data-prog-ext="3" ${full?'disabled':''}>Add triad</button><button class="btn compact ghost" data-prog-degree="${i}" data-prog-ext="4" ${full?'disabled':''}>${h(sevenths[i].name)}</button></div></div>`).join('')}</div>
 <div class="score-actions" style="margin-top:14px"><button class="btn ghost compact" data-action="prog-default">I – IV – V – I</button><button class="btn ghost compact" data-action="prog-pop">Clear progression</button></div>
 </section><section class="panel panel-pad"><div class="panel-title"><h2>Your progression</h2><span class="sub-label">${chords.length} / ${PROGRESSION_LIMIT} ATTACKS · ${measures} BARS</span></div>
 ${chords.length?`<div class="progression-list">${chords.map(c=>`<div class="progression-step ${progressionPlayback?.index===c.index?'active':''}" data-progress-index="${c.index}"><div class="progression-step-head"><span class="progression-number">${String(c.measureIndex+1).padStart(2,'0')}:${c.beat+1}</span><div><b>${h(c.name)}</b><small>${h(c.notes.join(' · '))}</small></div><span class="progression-frets">${c.frets.map(n=>n<0?'×':n).join('–')}</span></div><div class="score-actions"><button class="btn compact ghost" data-prog-move="-1" data-prog-index="${c.index}" ${c.index===0?'disabled':''} title="Move earlier">←</button><button class="btn compact ghost" data-prog-move="1" data-prog-index="${c.index}" ${c.index===chords.length-1?'disabled':''} title="Move later">→</button><button class="btn compact ghost" data-prog-stroke="${c.index}" title="Change strum direction">${c.stroke==='down'?'↓ Down':c.stroke==='up'?'↑ Up':'Together'}</button><button class="btn compact ghost" data-prog-duration="${c.index}" title="Change length">${c.duration} beat${c.duration===1?'':'s'} ↻</button><button class="btn compact ghost" data-prog-remove="${c.index}">Remove</button></div>${c.beat===0&&c.duration===cap&&patterns.length?`<div class="control" style="margin-top:8px"><label for="progPattern${c.index}">NOTATED STRUMMING PRESET</label><select id="progPattern${c.index}" data-prog-pattern-select="${c.index}"><option value="">Replace this bar with a rhythm…</option>${patterns.map(([key,v])=>`<option value="${key}">${h(v.label)}</option>`).join('')}</select></div>`:''}</div>`).join('')}</div>`:'<div class="empty-state"><h3>No chords yet</h3><p>Add a triad or seventh chord to start. Several chord attacks can share the same measure.</p></div>'}
 <div class="score-actions" style="margin-top:16px"><button class="btn gold" data-action="prog-play" ${!chords.length?'disabled':''}>${progressionPlayback?'■ Stop playback':'▶ Play chords'}</button><button class="btn" data-action="prog-open-score" ${!chords.length?'disabled':''}>𝄞 Open in Score Studio</button><button class="btn" data-action="prog-save-song" ${!chords.length?'disabled':''}>▤ Save in Songbook</button></div>
 <p class="small-text">Bar numbers and beats reflect each chord's notated onset. Gaps created when a chord cannot fit are written as rests, not hidden. Changes to an earlier duration can reflow following chord attacks. Opening in Score Studio replaces its current working draft; save it first.</p></section></div>
 ${score?`<section class="panel panel-pad progression-preview"><div class="panel-title"><h2>Read the harmony</h2><span class="sub-label">STANDARD NOTATION FIRST</span></div><div class="fret-controls">${tabbar([['notation','Notation'],['dual','Notation + Tab'],['tab','Tab only']],state.display,'data-display')}</div><div class="score-holder score-editor-view">${renderScoreView(score,{mode:state.display})}</div><p class="small-text">Notes, rests, tablature, fingering and playback use the same score events. Synthetic audio is for reference rather than a realistic strumming performance.</p></section>`:''}`;
}
function stopProgression(){
 const playing=progressionPlayback;if(!playing)return;
 for(const timer of playing.timers)clearTimeout(timer);
 for(const voice of playing.voices)try{voice.stop(audio().currentTime+.005)}catch{}
 progressionPlayback=null;
 const btn=$('[data-action="prog-play"]');if(btn)btn.textContent='▶ Play chords';
 $$('.progression-step.active').forEach(x=>x.classList.remove('active'));
}
function playProgression(){
 if(progressionPlayback){stopProgression();return}
 let score;try{score=buildProgressionScore(state.progression)}catch(e){toast(e.message);return}
 const events=timeline(score).filter(ev=>ev.type==='chord');if(!events.length){toast('Add a chord first');return}
 const ctx=audio(),seconds=60/score.tempo,start=ctx.currentTime+.12,playing={timers:[],voices:[],index:-1};progressionPlayback=playing;
 const btn=$('[data-action="prog-play"]');if(btn)btn.textContent='■ Stop playback';
 for(const [index,ev] of events.entries()){
  playing.voices.push(...synthEvent(ev,start+ev.onset*seconds,seconds));
  playing.timers.push(setTimeout(()=>{
   if(progressionPlayback!==playing)return;
   playing.index=index;
   $$('.progression-step').forEach(x=>x.classList.toggle('active',Number(x.dataset.progressIndex)===index));
  },Math.max(0,(start+ev.onset*seconds-ctx.currentTime)*1000)));
 }
 const finish=events.at(-1).onset+events.at(-1).duration;
 playing.timers.push(setTimeout(()=>{if(progressionPlayback!==playing)return;stopProgression();toast('Progression complete')},Math.max(0,(start+finish*seconds-ctx.currentTime)*1000)+80));
}
function saveProgressionToSongbook(){
 try{
  const score=buildProgressionScore(state.progression);if(!timeline(score).length)throw new Error('Add chords first');
  const song={id:score.id,title:score.title,artist:'',key:score.key,bpm:score.tempo,body:'',notes:'Created in Progression Builder',score,updated:new Date().toISOString()};
  if(store('songs',[...songs(),song]))toast('Progression and written chord score saved in Songbook');
 }catch(e){toast(e.message)}
}
function newQuestion(){state.quizMidi=[60,62,64,65,67,69,71,72,74][Math.floor(Math.random()*9)];state.quizDone=false;const correct=midiName(state.quizMidi).replace(/[0-9]/g,'');const names=['C','D','E','F','G','A','B'];state.quizAnswers=[correct];while(state.quizAnswers.length<4){const n=names[Math.floor(Math.random()*names.length)];if(!state.quizAnswers.includes(n))state.quizAnswers.push(n)}state.quizAnswers.sort(()=>Math.random()-.5)}
function quizBlock(){const q=state.quizMidi,correct=midiName(q).replace(/[0-9]/g,'');const showNames=false;const event={midi:q,spelling:correct};return `<div class="panel-pad"><div class="panel-title"><h2>Try reading a note</h2><span class="sub-label">SIGHT-READING DRILL</span></div><p class="panel-desc">Read the note on the treble stave, then select its letter name. The app remembers your score locally.</p><div class="score-holder">${scoreSvg([event],{showNames})}</div><div class="quiz-options">${state.quizAnswers.map(n=>`<button class="quiz-option" data-answer="${n}" ${state.quizDone?'disabled':''}>${n}</button>`).join('')}</div><p class="note-feedback" id="quizFeedback">${state.quizDone?`Correct answer: ${correct}. Try the next note.`:'Take your time; start by identifying the staff line or space.'}</p><div class="score-actions"><button class="btn gold" data-action="quiz-next">Next note →</button><button class="btn" data-action="quiz-hear">▶ Hear pitch</button></div><div class="score-info"><span>Current session: ${state.quizCorrect}/${state.quizTotal} correct</span><span>No microphone needed</span></div></div>`}
const rhythmReadingItems=[
 {duration:1,type:'note',description:'Quarter note: one beat in 4/4.'},
 {duration:.5,type:'note',description:'Eighth note: half a beat in 4/4.'},
 {duration:1.5,type:'note',description:'Dotted quarter: one and a half beats.'},
 {duration:2,type:'rest',description:'Half rest: two beats of silence.'},
 {duration:.75,type:'note',description:'Dotted eighth: three quarters of a beat.'},
 {duration:3,type:'note',description:'Dotted half: three beats.'},
 {duration:.25,type:'rest',description:'Sixteenth rest: one quarter of a beat.'},
 {duration:4,type:'note',description:'Whole note: four beats.'},
 {duration:.375,type:'note',description:'Dotted sixteenth: three eighths of a beat.'}
];
function rhythmReadingLesson(){
 const item=rhythmReadingItems[state.rhythmQuizIndex%rhythmReadingItems.length];
 const sample=createScore({title:'Identify the symbol',meter:'4/4',sample:false});
 appendEvent(sample,item.type==='rest'?{type:'rest',duration:item.duration}:{type:'note',midi:60,duration:item.duration});
 const opts=[.25,.375,.5,.75,1,1.5,2,3,4];
 return `<section class="panel panel-pad rhythm-reading" style="margin-top:16px"><div class="panel-title"><h2>Rhythm reading · interactive lesson</h2><span class="sub-label">NOTATION ACADEMY / UNIT N-B</span></div>
 <p class="panel-desc">A dot adds half the note’s original value. A rest represents silence for the same duration. Read the symbol below, then select the correct duration in quarter-note beats.</p>
 <div class="score-holder score-editor-view rhythm-question">${renderScoreView(sample,{mode:'notation'})}</div>
 <div class="quiz-options" role="group" aria-label="Rhythm duration answers">${opts.map(d=>`<button class="quiz-option ${state.rhythmQuizAnswer===d?'active':''}" data-rhythm-answer="${d}" ${state.rhythmQuizDone?'disabled':''}>${h(QUARTER_LABELS[String(d)])}<small> ${d} beat${d===1?'':'s'}</small></button>`).join('')}</div>
 <p class="note-feedback" role="status">${state.rhythmQuizDone?(state.rhythmQuizAnswer===item.duration?'Correct. ':'Not quite. ')+h(item.description):'Count the value before choosing an answer.'}</p>
 <div class="score-actions"><button class="btn gold" data-action="rhythm-quiz-next">Next symbol →</button><button class="btn" data-action="rhythm-quiz-restart">Restart lesson</button><span class="small-text">${state.rhythmQuizCorrect}/${state.rhythmQuizTotal} correct · question ${(state.rhythmQuizIndex%rhythmReadingItems.length)+1} of ${rhythmReadingItems.length}</span></div>
 </section>`;
}
const expressionItems=[
 {type:'tie',label:'Tie',description:'One sustained pitch crosses the curved line. The second written note is not re-attacked.'},
 {type:'slur',label:'Slur',description:'Two different notes form one legato phrase. Both pitches are played; the line is not a tie.'},
 {type:'staccato',label:'Staccato',description:'The dot near the notehead means a shorter, detached articulation; it is not a rhythm dot.'},
 {type:'accent',label:'Accent',description:'The wedge-like > mark asks for a stronger attack, without changing the written duration.'}
];

function rhythmLabProgress(){const saved=read('rhythmLabProgress',{});return validRhythmProgress(saved)?saved:{}}
function rhythmLab(){
 const lesson=rhythmStudy(state.rhythmLabId),score=rhythmStudyScore(lesson.id,state.tuning),stats=rhythmLabProgress()[lesson.id],result=state.rhythmLabResult;
 const active=!!rhythmLabPlayback;
 return `<section class="panel panel-pad rhythm-lab" style="margin-top:18px"><div class="panel-title"><h2>Read and perform a rhythm</h2><span class="sub-label">NOTATION ACADEMY / GUIDED SIGHT-READING</span></div>
 <p class="panel-desc">Read two measures in standard notation, listen to a counted reference and tap the written note attacks. A rest means no tap. This trains rhythm reading, not pitch recognition or acoustic performance.</p>
 <div class="control-row"><div class="control" style="flex:3;min-width:210px"><label for="rhythmLabSelect">RHYTHM STUDY</label>${uiSelect('rhythmLabSelect',RHYTHM_STUDIES.map(x=>[x.id,`${x.id} · ${x.title}`]),lesson.id)}</div><div class="control"><label>TIME</label><div class="mini-pill">${lesson.meter} · ${lesson.tempo} BPM</div></div><div class="control"><label>DIFFICULTY</label><div class="mini-pill">${h(lesson.level)}</div></div></div>
 <p class="small-text">${h(lesson.goal)} The tempo uses quarter-note BPM; 6/8 is counted in two dotted-quarter pulses.</p>
 <div class="score-holder score-editor-view rhythm-lab-score">${renderScoreView(score,{mode:'notation'})}</div>
 <div class="score-actions rhythm-lab-controls"><button class="btn gold" data-action="rhythm-lab-start" ${active?'disabled':''}>▶ Count in & play</button><button class="btn" data-action="rhythm-lab-tap" ${active?'':'disabled'} aria-keyshortcuts="Space">Tap the rhythm <span class="kbd">Space</span></button><button class="btn compact ghost" data-action="rhythm-lab-stop" ${active?'':'disabled'}>Stop</button><span id="rhythmLabTapCount" class="small-text">${active?rhythmLabPlayback.taps.length:0} taps</span></div>
 <div class="now-playing rhythm-lab-status" id="rhythmLabStatus" role="status">${active?'Count in…':result?`Last attempt: ${result.matched}/${result.expected} on-time attacks · ${result.extra} extra taps · ${result.missed} missed · ${result.accuracy}% matched.`:'Ready to practise. You will hear one measure of count-in, then two measures of example music.'}</div>
 ${result?`<p class="small-text">Average deviation of matched taps: ${result.meanErrorMs===null?'—':result.meanErrorMs+' ms'}. Tolerance ±${result.toleranceMs} ms. This is a browser timing estimate; audio device latency can affect the result.</p>`:''}
 <div class="score-info"><span>${stats?.sessions??0} previous attempt${stats?.sessions===1?'':'s'} · best ${stats?.best??0}% matched</span><span>Local progress, included in JSON backup</span></div></section>`;
}
function stopRhythmLab({redraw=false}={}){
 const run=rhythmLabPlayback;
 if(!run)return;
 run.timers.forEach(clearTimeout);
 for(const voice of run.voices){try{voice.stop(audio().currentTime+.006)}catch{}}
 rhythmLabPlayback=null;
 if(redraw)render();
}
function finishRhythmLab(run){
 if(rhythmLabPlayback!==run)return;
 const result=gradeRhythmTaps(run.score,run.taps,run.score.tempo);
 rhythmLabPlayback=null;
 state.rhythmLabResult=result;
 store('rhythmLabProgress',recordRhythmResult(rhythmLabProgress(),run.lesson.id,result));
 if(state.page==='notation')render();
 toast(`Rhythm reading: ${result.matched}/${result.expected} attacks matched`);
}
function startRhythmLab(){
 stopRhythmLab();
 const lesson=rhythmStudy(state.rhythmLabId),score=rhythmStudyScore(lesson.id,state.tuning);
 const count=countIn(score),seconds=60/score.tempo,ctx=audio(),delay=.18;
 const startAudio=ctx.currentTime+delay+count.quarterBeats*seconds;
 const startPerformance=performance.now()+delay*1000+count.quarterBeats*seconds*1000;
 const run={lesson,score,startPerformance,taps:[],timers:[],voices:[]};
 rhythmLabPlayback=run;state.rhythmLabResult=null;render();
 // Audio is scheduled against the Web Audio clock; displayed countdown is advisory.
 for(let i=0;i<count.pulses;i++){
  const at=startAudio-(count.quarterBeats-i*count.pulseBeats)*seconds;
  tick(at,i===0);
  run.timers.push(setTimeout(()=>{if(rhythmLabPlayback===run){const status=$('#rhythmLabStatus');if(status)status.textContent=`Count-in ${i+1} of ${count.pulses}…`;}},Math.max(0,(at-ctx.currentTime)*1000)));
 }
 for(const ev of timeline(score)){
  const at=startAudio+ev.onset*seconds;
  if(ev.type==='note')run.voices.push(...synthEvent(ev,at,seconds));
  run.timers.push(setTimeout(()=>{if(rhythmLabPlayback!==run)return;
   const status=$('#rhythmLabStatus');if(status)status.textContent=`Playing: measure ${ev.measureIndex+1}. Tap only written notes; skip rests.`;
   $$('.rhythm-lab .score-event').forEach(el=>el.classList.toggle('playing',el.dataset.eventId===ev.id));
  },Math.max(0,(at-ctx.currentTime)*1000)));
 }
 const duration=score.measures.length*measureBeats(score.meter)*seconds*1000;
 run.timers.push(setTimeout(()=>finishRhythmLab(run),Math.max(0,startPerformance-performance.now())+duration+280));
}
function tapRhythmLab(){const run=rhythmLabPlayback;if(!run)return;
 const elapsed=performance.now()-run.startPerformance;
 if(elapsed<-35)return;
 const maxMs=run.score.measures.length*measureBeats(run.score.meter)*60000/run.score.tempo;
 if(elapsed>maxMs+270)return;
 run.taps.push(Math.max(0,elapsed));
 const count=$('#rhythmLabTapCount');if(count)count.textContent=`${run.taps.length} taps`;
 const tap=$('[data-action="rhythm-lab-tap"]');if(tap){tap.classList.remove('tap-flash');void tap.offsetWidth;tap.classList.add('tap-flash')}
}
function readingProgress(){
 const saved=read('notationReadingProgress',{});
 return validReadingProgress(saved)?saved:{};
}
function keySignatureLesson(){
 const q=keyQuestion(state.keyLessonIndex,state.keyLessonMode);
 const score=createScore({title:'Identify the signature',meter:'4/4',key:q.key,tuning:state.tuning,sample:false});
 appendEvent(score,{type:'rest',duration:4});
 const results=readingProgress()['keys-'+q.mode];
 const answered=state.keyLessonAnswer!==null;
 const label=value=>h(value)+' '+(q.mode==='major'?'major':'minor');
 return `<section class="panel panel-pad key-reading-lab" style="margin-top:18px"><div class="panel-title"><h2>Key signatures · identify the key</h2><span class="sub-label">NOTATION ACADEMY / UNIT N-C</span></div>
 <p class="panel-desc">Sharps always follow F–C–G–D–A–E–B; flats follow B–E–A–D–G–C–F. Read the signs at the beginning of the stave, then name the major key or its relative minor. The notation deliberately does not reveal the answer until you choose.</p>
 <div class="control-row"><div class="control"><label for="keyLessonMode">ANSWER TYPE</label>${uiSelect('keyLessonMode',[['major','Major key'],['relativeMinor','Relative minor key']],q.mode)}</div><div class="control"><label>QUESTIONS</label><div class="mini-pill">${(state.keyLessonIndex%KEY_SEQUENCE.length)+1} of ${KEY_SEQUENCE.length}</div></div></div>
 <div class="score-holder score-editor-view key-reading-score">${renderScoreView(score,{mode:'notation'})}</div>
 <div class="quiz-options key-answer-grid" role="group" aria-label="Choose the key signature">${q.choices.map(v=>`<button class="quiz-option ${answered&&v===state.keyLessonAnswer?'active':''}" data-key-answer="${h(v)}" ${answered?'disabled':''}>${label(v)}</button>`).join('')}</div>
 <p class="note-feedback" role="status">${answered?(state.keyLessonAnswer===q.correct?'Correct. ':'Not quite. ')+`This is ${label(q.correct)}. ${q.accidentals===0?'There are no sharps or flats.':`${Math.abs(q.accidentals)} ${q.accidentals>0?'sharp':'flat'}${Math.abs(q.accidentals)===1?'':'s'} are written at the clef.`}`:'Identify the signature without using the fretboard.'}</p>
 <div class="score-actions"><button class="btn gold" data-action="key-next">Next signature →</button><button class="btn" data-action="key-restart">Restart keys</button><span class="small-text">Saved: ${results?.correct??0}/${results?.attempts??0} correct · Mode: ${q.mode==='major'?'major':'relative minor'}</span></div></section>`;
}
function pitchSightReadingLesson(){
 const lesson=sightStudy(state.sightLessonId),score=sightStudyScore(lesson.id,state.tuning);
 const index=Math.min(state.sightLessonIndex,7),event=sightEvent(score,index);
 const {correct,choices}=sightChoices(score,index);
 const answered=state.sightLessonAnswer!==null;
 const stats=readingProgress()[lesson.id];
 const show=answered||state.sightShowFingering;
 const pos=event.position;
 const tuned=TUNINGS[state.tuning];
 const fingering=`${tuned.names[pos.string]} string, fret ${pos.fret}`;
 return `<section class="panel panel-pad pitch-reading-lab" style="margin-top:18px"><div class="panel-title"><h2>Read a melody · pitch by pitch</h2><span class="sub-label">NOTATION ACADEMY / GUIDED ETUDES</span></div>
 <p class="panel-desc">Read the highlighted written note, including its key signature and octave. Answer from the stave first; reveal the ukulele fingering only when needed. All eight notes belong to one two-measure piece.</p>
 <div class="control-row"><div class="control" style="flex:3;min-width:210px"><label for="sightLessonSelect">READING ÉTUDE</label>${uiSelect('sightLessonSelect',READING_STUDIES.map(s=>[s.id,`${s.id} · ${s.title}`]),lesson.id)}</div><div class="control"><label for="readingTuning">INSTRUMENT TUNING</label>${uiSelect('readingTuning',Object.entries(TUNINGS).map(([id,t])=>[id,t.label]),state.tuning)}</div><div class="control"><label>READING LEVEL</label><div class="mini-pill">${lesson.level} of 3</div></div></div>
 <p class="small-text">${h(lesson.goal)} Step ${index+1} of 8. The initial learning mode is notation only; tablature is not shown automatically.</p>
 <div class="score-holder score-editor-view pitch-reading-score">${renderScoreView(score,{mode:'notation',selectedEventId:event.id,showNames:show})}</div>
 <div class="quiz-options pitch-answer-grid" role="group" aria-label="Read the highlighted note">${choices.map(v=>`<button class="quiz-option ${answered&&v===state.sightLessonAnswer?'active':''}" data-sight-answer="${h(v)}" ${answered?'disabled':''}>${h(v.replace(/#/g,'♯').replace(/b/g,'♭'))}</button>`).join('')}</div>
 <p class="note-feedback" role="status">${answered?(state.sightLessonAnswer===correct?'Correct. ':'Not quite. ')+`The written note is ${h(correct)} (${h(fingering)}).`:'Choose the full written pitch, including the octave.'}</p>
 <div class="score-actions"><button class="btn gold" data-action="sight-next">${index===7?'Restart phrase ↺':'Next note →'}</button><button class="btn" data-action="sight-hear">▶ Hear note</button><button class="btn" data-action="sight-hint">${state.sightShowFingering?'Hide':'Show'} fingering hint</button><button class="btn" data-action="sight-copy">Edit score →</button></div>
 ${show?`<div class="now-playing" role="status"><strong>Fingering hint:</strong> ${h(fingering)} · ${h(writtenName(event.midi,event.spelling))} · ${h(tuned.label)}. Other playable fret positions may exist.</div>`:''}
 <div class="score-info"><span>${stats?.correct??0}/${stats?.attempts??0} correctly identified notes for ${lesson.id}</span><span>Local progress · JSON backup supported</span></div></section>`;
}
function expressionLesson(){
 const item=expressionItems[state.expressionIndex%expressionItems.length],sample=createScore({title:'Read the expression',tuning:state.tuning,tempo:72,meter:'4/4',sample:false});
 const a=appendEvent(sample,{type:'note',midi:60,duration:1});
 if(item.type==='tie'){appendEvent(sample,{type:'note',midi:60,duration:1});setTieToNext(sample,a.id,true)}
 else if(item.type==='slur'){appendEvent(sample,{type:'note',midi:62,duration:1});setSlurToNext(sample,a.id,true)}
 else{setArticulation(sample,a.id,item.type);appendEvent(sample,{type:'note',midi:64,duration:1})}
 const choices=[['tie','Tie'],['slur','Slur'],['staccato','Staccato'],['accent','Accent']];
 return `<section class="panel panel-pad" style="margin-top:18px"><div class="panel-title"><h2>Expression and articulation</h2><span class="sub-label">READ THE SYMBOL · LEVEL 2</span></div><p class="panel-desc">Read the notation and decide what the marking tells you to do. A tie joins the same pitch, a slur connects phrasing across different notes, and articulation changes how a note is attacked or released.</p>
 <div class="score-holder score-editor-view">${renderScoreView(sample,{mode:'notation'})}</div>
 <div class="quiz-options" role="group" aria-label="Articulation answers">${choices.map(([id,label])=>`<button class="quiz-option ${state.expressionAnswer===id?'active':''}" data-expression-answer="${id}" ${state.expressionDone?'disabled':''}>${label}</button>`).join('')}</div>
 <p class="note-feedback" role="status">${state.expressionDone?(state.expressionAnswer===item.type?'Correct. ':'Not quite. ')+h(item.description):'What musical instruction is shown in the score?'}</p>
 <div class="score-actions"><button class="btn gold" data-action="expression-next">Next symbol →</button><button class="btn" data-action="expression-restart">Restart lesson</button><span class="small-text">${state.expressionCorrect}/${state.expressionTotal} correct · example ${(state.expressionIndex%expressionItems.length)+1} of ${expressionItems.length}</span></div></section>`;
}
function notation(){return `${hero('NOTATION ACADEMY','Learn to <em>read music.</em>','From the first treble-clef note to reading complete arrangements. Staff notation comes first; fretboard labels and tablature are optional aids.','CURRICULUM · LEVEL 1')}
<div class="workspace-grid"><section class="panel">${quizBlock()}</section><section class="panel panel-pad"><div class="panel-title"><h2>Your reading pathway</h2></div><div class="lesson-list"><div class="lesson"><div class="lesson-icon">1</div><div><h3>The five-line staff</h3><p>Treble clef, lines and spaces, C4–A4.</p></div><span class="status-tag">ACTIVE</span></div><div class="lesson"><div class="lesson-icon">2</div><div><h3>Rhythmic values</h3><p>Quarter, half, dotted notes and rests.</p></div><span class="status-tag">ACTIVE</span></div><div class="lesson"><div class="lesson-icon">3</div><div><h3>Accidentals & keys</h3><p>Sharps, flats, naturals, and key signatures.</p></div><span class="status-tag">ACTIVE</span></div><div class="lesson"><div class="lesson-icon">4</div><div><h3>Expression</h3><p>Ties, slurs, staccato and accents.</p></div><span class="status-tag">ACTIVE</span></div><div class="lesson"><div class="lesson-icon">5</div><div><h3>Reading actual music</h3><p>Eight graded, two-bar rhythm sight-reading études and tap-along practice.</p></div><span class="status-tag">ACTIVE</span></div></div><hr class="divider"><div class="callout"><strong>Read before you look.</strong> Try identifying each note from the score, then use the Fretboard Explorer to verify its position on your instrument.</div></section></div>${rhythmReadingLesson()}${rhythmLab()}${expressionLesson()}${keySignatureLesson()}${pitchSightReadingLesson()}` }
function currentTechnique(){return TECHNIQUE_CATALOG[state.techFocus][state.techIndex]}
const techniqueProgress=()=>{const saved=read('techniqueProgress',{});return validTechniqueProgress(saved)?saved:{}};
function technique(){
 const group=TECHNIQUE_CATALOG[state.techFocus],unit=group[state.techIndex],available=!!unit.pattern;
 const progress=techniqueProgress(),done=Object.keys(progress).length;
 const temp=available?techniqueScore(unit.id,state.tuning):null,lessonStatus=progress[unit.id];
 const annotations=temp?.annotations??{};
 const selected=temp?.steps.find(x=>x.id===state.techEventId),noteData=selected&&selected.type!=='rest'?temp.score.measures.flatMap(bar=>bar.events).find(x=>x.id===state.techEventId):null;
 const tun=TUNINGS[state.tuning];
 return `${hero('TECHNIQUE ACADEMY','Practice with <em>intention.</em>','Study finger placement, right-hand strokes, and musical phrasing with a written score. These are guided self-practice exercises, not microphone-graded evaluations.',`${TECHNIQUE_LESSONS.length} GUIDED EXERCISES`)}
 <section class="panel panel-pad"><div class="panel-title"><h2>Your learning record</h2><span class="sub-label">LOCAL & PRIVATE</span></div><div class="stats"><div class="stat"><strong>${done}</strong><span>Exercises practised</span></div><div class="stat"><strong>${Object.values(progress).reduce((n,v)=>n+v.sessions,0)}</strong><span>Self-reported attempts</span></div><div class="stat"><strong>${TECHNIQUE_LESSONS.length}</strong><span>Playable studies</span></div></div><p class="small-text">Progress is recorded only when you mark a practice attempt. The app does not claim to assess your playing automatically.</p></section>
 <div class="workspace-grid" style="margin-top:18px"><section class="panel panel-pad"><div class="panel-title"><h2>Technique syllabus</h2></div><div class="tech-pills">${[['left','Left hand'],['right','Right hand'],['musical','Musicality']].map(([key,label])=>`<button class="tech-pill ${key===state.techFocus?'selected':''}" data-techfocus="${key}" aria-pressed="${key===state.techFocus}">${label}</button>`).join('')}</div><div class="lesson-list" style="margin-top:17px">${group.map((t,i)=>`<div class="lesson"><div class="lesson-icon">${i+1}</div><div><h3>${h(t.name)}</h3><p>${h(t.description)}</p><small class="tech-status">${t.pattern?(progress[t.id]?`Practised ${progress[t.id].sessions} time(s) · ${h(progress[t.id].confidence)}`:'Guided score available'):'Detailed exercise planned'}</small></div><button class="btn compact ${state.techIndex===i?'active':''}" data-techindex="${i}" aria-label="Study ${h(t.name)}">${state.techIndex===i?'Selected':'Open'}</button></div>`).join('')}</div></section>
 <section class="panel panel-pad"><div class="eyebrow">${h(unit.id)} · ${available?'GUIDED ÉTUDE':'CURRICULUM OUTLINE'}</div><h2 class="tech-heading">${h(unit.name)}</h2><p class="panel-desc">${h(unit.description)}</p>
 ${available?`<div class="callout"><strong>Goal:</strong> ${h(unit.goal)}<br><strong>How to play:</strong> ${h(unit.instruction)}<br><strong>Listen for:</strong> ${h(unit.listen)}</div>
 <div class="section-bar"><h2>Read the exercise</h2><small>STANDARD NOTATION FIRST</small></div><label class="control"><span>Ukulele tuning</span>${uiSelect('techTuning',Object.entries(TUNINGS).map(([id,v])=>[id,v.label]),state.tuning)}</label>
 <div class="fret-controls">${tabbar([['notation','Notation'],['dual','Score + tab'],['tab','Tab only']],state.techDisplay,'data-tech-display')}<label class="small-text"><input type="checkbox" id="techFingers" ${state.techShowFingers?'checked':''}/> Show fingerings</label></div>
 <div class="score-editor-view technique-score">${renderScoreView(temp.score,{mode:state.techDisplay,selectedEventId:state.techEventId,playingEventId:state.techPlayingEventId,annotations:state.techShowFingers?annotations:null})}</div>
 <div class="score-info"><span>${h(tun.label)} · ${h(temp.score.meter)} · ${h(unit.tempo)} BPM suggested</span><span>Labels: right-hand p/i/m/a · left-hand 0–4</span></div>
 <div class="tech-steps" role="group" aria-label="Exercise notes and fingering">${temp.steps.map((step,i)=>`<button data-tech-note="${step.id}" class="tech-step ${state.techEventId===step.id?'selected':''}" aria-label="Select event ${i+1}${step.type==='rest'?', rest':step.type==='chord'?', chord':', note'}"><b>${i+1}</b><span>${step.type==='rest'?'Rest':step.type==='chord'?`${h(step.symbol)} chord`:state.techShowFingers?`${h(tun.names[step.string])} · fret ${step.fret}`:'Read note'}</span><small>${step.type==='rest'?`${step.duration} beat(s)`:step.type==='chord'?`${h(step.stroke)}stroke · ${step.duration} beat(s)`:state.techShowFingers?`RH ${h(step.right)} · LH ${h(step.left)}`:'Hints hidden'}</small></button>`).join('')}</div>
 ${noteData?noteData.type==='chord'?`<div class="now-playing"><b>Selected chord:</b> ${h(noteData.symbol)} · ${h(noteData.stroke)}stroke · ${h(noteData.notes.map(n=>midiName(n.midi)).join(' · '))}. <b>Frets:</b> ${h(noteData.notes.map(n=>n.position.fret).join('–'))} (${h(tun.label)}).</div>`:`<div class="now-playing"><b>Selected pitch:</b> ${h(noteData.spelling)} (${h(midiName(noteData.midi))}) · ${h(tun.names[selected.string])} string, fret ${selected.fret}. ${state.techShowFingers?`Right-hand ${h(selected.right)}; left-hand ${h(selected.left)}.`:'Enable fingering hints to reveal suggested hands.'}</div>`:''}
 <div class="tech-playbar"><label class="control" for="techTempo">Practice tempo: <strong>${state.techTempo||unit.tempo} BPM</strong></label><input id="techTempo" type="range" min="40" max="140" step="2" value="${state.techTempo||unit.tempo}"/><div class="score-actions"><button class="btn gold" data-action="tech-play">${techniquePlayback?'■ Stop':'▶ Count in & play'}</button><button class="btn" data-action="open-metronome">◷ Metronome</button><button class="btn" data-action="tech-copy-score">Edit this study in Score Studio →</button></div><p class="small-text" id="techPlaybackStatus" role="status" aria-live="polite">Four-beat count-in, followed by the written exercise. You can replay it as often as needed.</p></div>
 <div class="section-bar"><h2>Record your practice</h2></div><p class="small-text">After playing on your instrument, choose how confident you feel. This is self-reporting—not an automated performance grade.</p><div class="score-actions">${[['learning','Still learning'],['comfortable','Comfortable'],['confident','Confident']].map(([value,label])=>`<button class="btn compact ${lessonStatus?.confidence===value?'gold':''}" data-tech-rating="${value}">${label}</button>`).join('')}</div>
 ${lessonStatus?`<p class="small-text">Last practised ${h(new Date(lessonStatus.lastPracticed).toLocaleDateString())}; ${lessonStatus.sessions} recorded attempts.</p>`:''}`:
 `<div class="callout"><strong>Planned content</strong><br>This technique does not yet have an accurately notated practice study. Its explanation is a syllabus outline, not a completed lesson. Choose an exercise marked “Guided score available” from the list.</div>`}</section></div>`;
}
function stopTechniquePlayback({redraw=false}={}){
 if(!techniquePlayback)return;
 const playback=techniquePlayback;techniquePlayback=null;
 playback.timers.forEach(clearTimeout);
 playback.voices.forEach(o=>{try{o.stop()}catch{}});
 state.techPlayingEventId=null;
 $$('.technique-score .score-event').forEach(e=>e.classList.remove('playing'));
 if(redraw&&state.page==='technique')render();
}
function playTechnique(){
 if(techniquePlayback){stopTechniquePlayback({redraw:true});return;}
 const unit=currentTechnique();if(!unit.pattern)return;
 const {score}=techniqueScore(unit.id,state.tuning),seconds=60/(state.techTempo||unit.tempo);
 const ctx=audio(),start=ctx.currentTime+.08+seconds*4;
 const playing={timers:[],voices:[]};techniquePlayback=playing;
 for(let beat=0;beat<4;beat++)tick(ctx.currentTime+.08+beat*seconds,beat===0);
 const status=$('#techPlaybackStatus');if(status)status.textContent='Count in: 4 beats, then play the score.';
 const events=timeline(score);
 for(const ev of events){
  if(ev.type!=='rest')playing.voices.push(...synthEvent(ev,start+ev.onset*seconds,seconds));
  playing.timers.push(setTimeout(()=>{
   if(techniquePlayback!==playing)return;
   state.techPlayingEventId=ev.id;
   $$('.technique-score .score-event').forEach(n=>n.classList.toggle('playing',n.dataset.eventId===ev.id));
   const current=$('#techPlaybackStatus');if(current)current.textContent=ev.type==='rest'?'Rest: keep the written silence.':ev.type==='chord'?`Now playing ${ev.symbol} chord (${ev.stroke}stroke).`:`Now playing ${ev.spelling} (${midiName(ev.midi)}).`;
  },Math.max(0,(start+ev.onset*seconds-ctx.currentTime)*1000)));
 }
 const finish=events.at(-1)?.onset+events.at(-1)?.duration||0;
 playing.timers.push(setTimeout(()=>{if(techniquePlayback!==playing)return;stopTechniquePlayback({redraw:true});toast('Étude complete — practise it yourself, then rate your confidence');},Math.max(0,(start+finish*seconds-ctx.currentTime)*1000)+100));
 render();
}

function rhythm(){return `${hero('RHYTHM STUDIO','Feel the <em>pulse.</em>','Build a two-bar eighth-note strumming pattern, play it with sound, and connect rhythmic movement to steady musical time.','RHYTHM · 4/4')}
<div class="workspace-grid"><section class="panel panel-pad"><div class="panel-title"><h2>Strumming pattern studio</h2><span class="sub-label">8 EIGHTH-NOTE SLOTS</span></div><p class="panel-desc">Tap each slot to cycle through a downstroke (↓), upstroke (↑), and rest (–). A full measure is eight eighth notes in 4/4.</p><div class="pattern-grid">${state.rhythm.map((v,i)=>`<button data-step="${i}" class="beat-cell ${i===state.rhythmStep?'active':''}" aria-label="Beat slot ${i+1}, ${v==='D'?'downstroke':v==='U'?'upstroke':'rest'}"><span class="beat-num">${Math.floor(i/2)+1}${i%2?'&':''}</span><span class="beat-dir">${v==='D'?'↓':v==='U'?'↑':'–'}</span></button>`).join('')}</div><div class="step-actions"><button class="btn gold" data-action="play-rhythm">${rhythmTimer?'■ Stop pattern':'▶ Play pattern'}</button><button class="btn" data-action="open-metronome">◷ Metronome</button><button class="btn ghost" data-action="reset-pattern">Reset</button></div><div class="score-info"><span>Tempo: ${state.tempo} BPM</span><span>Pattern stored on your device</span></div></section><section class="panel panel-pad"><div class="panel-title"><h2>Learn rhythm from notation</h2></div><div class="lesson-list"><div class="lesson"><div class="lesson-icon">♩</div><div><h3>Pulse and quarter notes</h3><p>Feel four even beats in a bar.</p></div><span class="status-tag">ACTIVE</span></div><div class="lesson"><div class="lesson-icon">♫</div><div><h3>Eighth-note subdivision</h3><p>Count 1 & 2 & 3 & 4 &.</p></div><span class="status-tag">ACTIVE</span></div><div class="lesson"><div class="lesson-icon">𝄽</div><div><h3>Rests & syncopation</h3><p>Read and tap short written phrases in Notation Academy.</p></div><span class="status-tag">ACTIVE</span></div></div><hr class="divider"><label class="control"><span>Adjust tempo (${state.tempo} BPM)</span><input id="rhythmTempo" type="range" min="40" max="200" step="2" value="${state.tempo}"></label><p class="small-text">The pattern sequencer uses pitched clicks as a placeholder for actual ukulele strum samples. The notation-based tap trainer is available under Notation Academy.</p></section></div>`}
function exportBackup(){const data={format:'ukulele-workbench-backup',schemaVersion:2,exportedAt:new Date().toISOString(),scoreDraft:state.score,songs:songs(),progress:progress(),rhythm:state.rhythm,tuning:state.tuning,display:state.display,techniqueProgress:techniqueProgress(),rhythmLabProgress:rhythmLabProgress(),notationReadingProgress:readingProgress(),progressionDraft:state.progression};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ukulele-workbench-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Backup exported')}
function songScoreSections(score){
 const result=[];
 score?.measures?.forEach((bar,i)=>{
  if(!bar.section)return;
  if(result.at(-1)?.label===bar.section)result.at(-1).endBar=i+1;
  else result.push({label:bar.section,startBar:i+1,endBar:i+1});
 });
 return result;
}
function mySongbook(){
 const all=songs(),current=all.find(x=>x.id===state.songOpen);
 const sections=songScoreSections(current?.score);
 const active=sections[Math.min(state.songSectionIndex,Math.max(sections.length-1,0))];
 const songPreviewScore=active?{...current.score,measures:current.score.measures.slice(active.startBar-1,active.endBar)}:current?.score;
 return `${hero('PERSONAL REPERTOIRE','Keep your <em>music close.</em>','Save your songs, keys, chord progressions, lyrics and practice notes locally. Compose directly on a staff in Score Studio, then save the score with your song.','LOCAL SONG LIBRARY')}
<div class="workspace-grid"><section class="panel panel-pad"><div class="panel-title"><h2>${state.editing?'Song sketch editor':'Your songbook'}</h2><div class="right"><button class="btn compact" data-nav="score">𝄞 Score Studio</button><button class="btn compact" data-action="new-song">＋ New song</button><button class="btn compact ghost" data-action="export-backup">↓ Backup</button></div></div>${state.editing?`<form id="songForm" class="form-grid"><div><label for="songTitle">Song title *</label><input id="songTitle" required maxlength="120" value="${h(current?.title||'')}"></div><div><label for="songArtist">Artist / composer</label><input id="songArtist" maxlength="120" value="${h(current?.artist||'')}"></div><div><label for="songKey">Key</label>${uiSelect('songKey',[...ROOTS.map(x=>[x,x]),...(!ROOTS.includes(current?.key)&&current?.key?[[current.key,current.key]]:[])],current?.key||state.root)}</div><div><label for="songBpm">Tempo (BPM)</label><input id="songBpm" type="number" min="30" max="240" value="${current?.bpm||state.tempo}"></div><div class="span2"><label for="songBody">ChordPro-style sketch (chords in square brackets)</label><textarea id="songBody" placeholder="[C]A short melody begins...\n[F]Another chord comes in...">${h(current?.body||'')}</textarea></div><div class="span2"><label for="songNotes">Performance and practice notes</label><textarea id="songNotes" placeholder="Fingerings, techniques, bars to work on...">${h(current?.notes||'')}</textarea></div><div class="span2 score-actions"><button class="btn gold" type="submit">Save song sketch</button><button class="btn" type="button" data-action="cancel-edit">Cancel</button></div></form>`:all.length?`<div class="song-list">${all.map(s=>`<div class="song-row"><div class="song-initial">♫</div><div class="song-title"><b>${h(s.title)}</b><small>${h(s.artist||'Personal sketch')} · ${h(s.key||'Key not set')}${s.bpm?' · '+s.bpm+' BPM':''}</small></div><button class="btn compact" data-song="${h(s.id)}">Open</button></div>`).join('')}</div>`:`<div class="empty-state"><div class="big-icon">♬</div><h3>A library waiting for music</h3><p>Start with a simple song sketch. Create a staff-based melody in Score Studio, or add chords and lyrics here.</p><button class="btn gold" data-action="new-song">＋ Create your first song</button></div>`}
<div class="subtle-rule"></div><div class="score-actions"><button class="btn compact ghost" data-action="import-backup">↑ Restore backup</button><input type="file" accept=".json,application/json" id="backupFile" hidden></div><p class="hint-text">Songs are kept in this browser's local storage. Export regular backups; clearing browser data can delete them. Import will replace existing songs only after confirmation.</p></section><section class="panel panel-pad"><div class="panel-title"><h2>Song practice preview</h2></div>${current&&!state.editing?`<div class="eyebrow">NOW OPEN</div><h2 style="font:26px Georgia,serif">${h(current.title)}</h2><p class="small-text">${h(current.artist||'Original arrangement')} · ${h(current.key||'Key not set')}${current.bpm?' · '+current.bpm+' BPM':''}</p><pre style="white-space:pre-wrap;font:13px/1.9 ui-monospace,monospace;color:#e5d2a3;background:#14261e;padding:15px;border-radius:8px;min-height:100px">${h(current.body||'No chord sketch yet.')}</pre><p class="small-text">${h(current.notes||'No practice notes.')}</p>${current.score?`${sections.length?`<p class="small-text">Preview one section at a time · ${current.score.measures.length} bars total. Score Studio opens all bars for editing.</p><div class="repo-tags" role="group" aria-label="Select song practice section">${sections.map((sec,i)=>`<button class="btn compact ${sec===active?'gold':'ghost'}" data-song-section="${i}" aria-pressed="${sec===active}">${h(sec.label)} (${sec.startBar}–${sec.endBar})</button>`).join('')}</div>`:''}
 <div class="score-holder score-editor-view song-score-preview">${renderScoreView(songPreviewScore,{mode:state.display})}</div><button class="btn gold compact" data-action="load-song-score">𝄞 Edit notation score</button>`:''}<div class="score-actions"><button class="btn compact" data-action="edit-song">✎ Edit</button><button class="btn compact" data-action="delete-song">Delete</button></div>`:`<div class="callout"><strong>Notation-first roadmap:</strong> Score Studio now stores a single-voice staff score alongside optional lyric/chord sketches. A professionally engraved score editor, full MusicXML support, and independent voices remain future milestones.</div><hr class="divider"><p class="small-text">JSON backup is the lossless app backup. Score Studio now supports a limited single-part MusicXML interchange; unsupported notation is rejected rather than discarded.</p>`}</section></div>`}
function repositorySongbook(){
 const snapshot=state.repositorySnapshot, all=snapshot.catalog.entries, current=snapshot.songs[state.repoSelectedId]??null;
 const sections=Array.isArray(current?.sections)?current.sections:[];
 const activeSection=sections[Math.min(state.repoSectionIndex,Math.max(0,sections.length-1))];
 const previewScore=activeSection?{...current.score,measures:current.score.measures.slice(activeSection.startBar-1,activeSection.endBar)}:current?.score;
 return `${hero('REMOTE REPERTOIRE / OFFLINE CACHE','Load your <em>next challenge.</em>','Arrangements maintained in a separate repository. Sync downloads validated score files; copying a song creates an independent local arrangement that updates cannot overwrite.',`${all.length} ARRANGEMENTS · ${h(snapshot.catalog.name)}`)}
 <div class="panel panel-pad repo-source-panel"><div class="panel-title"><h2>Song repository</h2><span class="sub-label">ONE-WAY DOWNLOAD</span></div>
 <label for="repositoryUrl">Catalog address (relative to app, GitHub Pages or raw GitHub HTTPS)</label>
 <div class="repo-source-row"><input type="text" inputmode="url" id="repositoryUrl" autocomplete="off" spellcheck="false" value="${h(state.repositorySource)}" placeholder="./library/catalog.json" aria-label="Repository catalog URL"><button type="button" class="btn gold" data-action="repo-sync" ${state.repoSyncing?'disabled':''}>${state.repoSyncing?'Syncing…':'↻ Sync Library'}</button></div>
 <p class="small-text">${h(state.repoError||'Starter arrangements are included offline. On a served site, Sync Library checks the configured source for new editions. No login or upload is required.')} · ${h(snapshot.syncedAt.startsWith('Bundled')?snapshot.syncedAt:'Last downloaded '+snapshot.syncedAt)}</p></div>
 <div class="workspace-grid repo-library-grid"><section class="panel panel-pad"><div class="panel-title"><h2>Repository library</h2><span class="sub-label">READ-ONLY REFERENCES</span></div>
 <div class="repo-filter-row"><label for="repoSearch">Find arrangement<input type="search" id="repoSearch" placeholder="Title, artist or technique" value="${h(state.repoQuery)}" autocomplete="off"></label><label for="repoDifficulty">Difficulty<select id="repoDifficulty">${[['all','Any level'],['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced']].map(([v,label])=>`<option value="${v}" ${v===state.repoDifficulty?'selected':''}>${label}</option>`).join('')}</select></label></div>
 ${all.length?`<div class="song-list repo-song-list">${all.map(item=>`<div data-repo-row data-search="${h([item.title,item.artist,...item.tags].join(' ').toLowerCase())}" data-difficulty="${h(item.difficulty)}" class="song-row ${item.id===state.repoSelectedId?'repo-selected':''}"><div class="song-initial">♪</div><div class="song-title"><b>${h(item.title)}</b><small>${h(item.artist)} · ${h(item.difficulty)} · rev ${item.revision}</small></div><button class="btn compact" data-repo="${h(item.id)}" aria-label="Preview ${h(item.title)}">Preview</button></div>`).join('')}</div>`:`<p class="small-text">Repository has no arrangements yet.</p>`}
 <p class="hint-text">The repository is separate from My Songbook. Sync replaces only cached reference arrangements, never your imported songs, annotations or progress.</p></section>
 <section class="panel panel-pad"><div class="panel-title"><h2>${current?'Arrangement preview':'Select a score'}</h2></div>
 ${current?`<div class="eyebrow">${h(current.difficulty)} / REVISION ${current.revision}</div><h2 class="repo-song-heading">${h(current.title)}</h2><p class="small-text">${h(current.artist)} · ${h(current.tonalCenter||current.key||'Key not set')}${current.bpm?' · '+current.bpm+' BPM':''} · ${h(current.tuning)}</p><p class="small-text">${h(current.description)}</p><div class="repo-tags">${current.tags.map(t=>`<span>${h(t)}</span>`).join('')}</div>${sections.length?`<p class="small-text">Sections · select one to preview; copying always imports the entire score (${current.score.measures.length} bars).</p><div class="repo-tags" role="group" aria-label="Choose practice section">${sections.map((sec,i)=>`<button class="btn compact ${activeSection===sec?'gold':'ghost'}" data-repo-section="${i}" aria-pressed="${activeSection===sec}">${h(sec.label)} (${sec.startBar}–${sec.endBar})</button>`).join('')}</div>`:''}
 <div class="score-holder score-editor-view repo-score-preview">${renderScoreView(previewScore,{mode:state.display})}</div><p class="small-text">${h(current.notes)}</p><div class="score-actions"><button class="btn gold" data-action="repo-import">＋ Copy to My Songbook</button><button class="btn ghost" data-action="repo-view-mine">My Songbook →</button></div>`:`<p class="small-text">Select an arrangement to see its musical score.</p>`}
 </section></div>`;
}
function repertoireItems(){return state.repositorySnapshot.catalog.repertoire??BUNDLED_LIBRARY.catalog.repertoire??[];}
function repertoireScoreId(item){return item.preferredArrangementId||item.id;}
function approvedRepertoireSongbook(){
 const items=repertoireItems();
 const owned=new Set(songs().filter(s=>s.repositoryOrigin?.id&&s.repositoryOrigin.revision===state.repositorySnapshot.songs[s.repositoryOrigin.id]?.revision).map(s=>s.repositoryOrigin.id));
 return `${hero('APPROVED PRACTICE SONGS','Your <em>repertoire.</em>','Selected songs now have section-based high-G ukulele accompaniment, plus a complete historical traditional melody. These are playable adaptations, not original recording transcriptions.',`${items.length} APPROVED SONGS · ORIGINAL STUDIES`)}
 <section class="panel panel-pad"><div class="panel-title"><h2>Approved repertoire</h2><button class="btn gold compact" data-action="repertoire-import-all">＋ Import available uke arrangements</button></div>
 <p class="small-text">Sync the Repository Library to access all the available scores. These include original technique studies and one complete historical version of Scarborough Fair; the latter is not Simon & Garfunkel’s arrangement. Copying imports notation and optional tablature as independent local scores. Previously copied songs are not replaced.</p>
 <div class="song-list">${items.map(item=>`<div class="song-row"><div class="song-initial">♫</div><div class="song-title"><b>${h(item.title)}</b><small>${h(item.artist)} · ${h(item.practiceFocus)} · ${owned.has(repertoireScoreId(item))?'In My Songbook':state.repositorySnapshot.songs[repertoireScoreId(item)]?(item.preferredArrangementId?'Full traditional tune available':'Ukulele arrangement available'):'Sync Library for score'}</small></div><button class="btn compact" data-repertoire="${h(item.id)}" ${owned.has(repertoireScoreId(item))||!state.repositorySnapshot.songs[repertoireScoreId(item)]?'disabled':''}>${owned.has(repertoireScoreId(item))?'Added':state.repositorySnapshot.songs[repertoireScoreId(item)]?(item.preferredArrangementId?'Copy full tune':'Copy study'):'Sync first'}</button></div>`).join('')}</div>
 </section>`;
}
function songbook(){return `<div class="repo-tabs" role="group" aria-label="Songbook collections"><button class="btn ${state.songbookView==='mine'?'gold':'ghost'}" data-action="repo-view-mine" aria-pressed="${state.songbookView==='mine'}">My Songbook</button><button class="btn ${state.songbookView==='repertoire'?'gold':'ghost'}" data-action="repo-view-repertoire" aria-pressed="${state.songbookView==='repertoire'}">Approved Songs <span class="repo-count">${repertoireItems().length}</span></button><button class="btn ${state.songbookView==='repository'?'gold':'ghost'}" data-action="repo-view-repository" aria-pressed="${state.songbookView==='repository'}">Repository Library <span class="repo-count">${state.repositorySnapshot.catalog.entries.length}</span></button></div>${state.songbookView==='repository'?repositorySongbook():state.songbookView==='repertoire'?approvedRepertoireSongbook():mySongbook()}`;}

async function syncLibrary(){
 if(state.repoSyncing)return;
 const source=$('#repositoryUrl')?.value.trim()||DEFAULT_CATALOG_URL;
 try{
  const url=catalogUrl(source,location.href);
  state.repositorySource=source;store('repositorySource',source);
  state.repoSyncing=true;state.repoError=null;render();
  const snapshot=await downloadRepository({source:url,base:location.href,validateScore});
  if(!store('repositorySnapshot',snapshot))throw Error('Could not cache arrangements; the previous repository remains available');
  state.repositorySnapshot=snapshot;state.repoSectionIndex=0;
  if(!snapshot.songs[state.repoSelectedId])state.repoSelectedId=snapshot.catalog.entries[0]?.id??null;
  toast(`Synced ${snapshot.catalog.entries.length} arrangement(s); your songs are unchanged`);
 }catch(err){state.repoError=`Sync failed: ${err.message}. The last validated library is unchanged.`;toast('Repository sync failed; cached songs are intact')}
 finally{state.repoSyncing=false;if(state.page==='songbook')render()}
}
function copyRepositorySong(){
 try {
  const item=state.repositorySnapshot.songs[state.repoSelectedId];if(!item)throw Error('Select an arrangement');
  const prior=songs();const already=prior.some(s=>s.repositoryOrigin?.id===item.id&&s.repositoryOrigin?.revision===item.revision);
  if(already&&!confirm('You already have a copy of this revision. Create another independent copy?'))return;
  const id=`repository-copy-${globalThis.crypto?.randomUUID?.()??Date.now()+'-'+Math.floor(Math.random()*1e6)}`;
  const updated=copyToSongbook(state.repositorySnapshot,item.id,prior,{id,validateScore});
  if(!store('songs',updated))return;
  state.songOpen=id;state.songbookView='mine';state.songSectionIndex=0;state.editing=false;render();toast('Independent copy saved in My Songbook');
 }catch(err){toast(`Could not import arrangement: ${err.message}`)}
}
function addApprovedSongs(ids=null){
 try{
  const items=repertoireItems().filter(item=>ids===null||ids.includes(item.id));
  let next=songs(),added=0;
  for(const item of items){
   const arrangementId=repertoireScoreId(item);
   if(next.some(s=>s.repositoryOrigin?.id===arrangementId && s.repositoryOrigin.revision===state.repositorySnapshot.songs[arrangementId]?.revision))continue;
   if(!state.repositorySnapshot.songs[arrangementId])continue;
   const id='repertoire-study-copy-'+(globalThis.crypto?.randomUUID?.()??Date.now()+'-'+Math.floor(Math.random()*1e6))+'-'+added;
   next=copyToSongbook(state.repositorySnapshot,arrangementId,next,{id,validateScore});
   next.at(-1).repertoireOrigin={id:item.id};
   added++;
  }
  if(!added){toast('No new scored studies available. Sync Library to retrieve the latest arrangements.');return;}
  if(!store('songs',next))return;
  state.songOpen=next.at(-1).id;state.songbookView='mine';state.editing=false;render();
  toast(added+' scored '+(added===1?'arrangement':'arrangements')+' added to My Songbook');
 }catch(err){toast('Study import failed: '+err.message)}
}
function fmtBeats(n){return Number(n).toLocaleString(undefined,{maximumFractionDigits:2})}
function scoreFretboard(){
 const score=state.score,chosen=findEvent(score,state.scoreEventId)?.event;const choices=chosen?.type==='note'?new Set(optionsForMidi(chosen.midi,score.tuning,12).map(p=>`${p.string}-${p.fret}`)):new Set();
 const y=[42,85,128,171],x0=74,spacing=48,w=730;
 let svg=`<svg class="score-fretboard" viewBox="0 0 ${w} 222" role="group" aria-label="Playable positions for selected note in ${h(score.tuning)} tuning" xmlns="${SVG_NS}"><rect x="${x0}" y="24" width="576" height="165" rx="5" fill="#21362b"/>`;
 for(let f=0;f<=12;f++){const x=x0+spacing*f;svg+=`<line x1="${x}" x2="${x}" y1="24" y2="189" stroke="${f===0?'#d5c59c':'#627969'}" stroke-width="${f===0?6:1.4}"/>`}
 for(let s=0;s<4;s++){const yy=y[s];svg+=`<line x1="${x0}" x2="650" y1="${yy}" y2="${yy}" stroke="#c1cbbd" stroke-width="${1.7+s*.2}"/><text x="34" y="${yy+5}" fill="#cbdccb" font-size="16" text-anchor="middle">${h(TUNINGS[score.tuning].names[s])}</text>`;}
 for(const p of fretboard(score.tuning,12).flat()){
  if(!choices.has(`${p.string}-${p.fret}`))continue;
  const x=p.fret===0?x0-22:x0+(p.fret-.5)*spacing,yy=y[p.string];
  const assigned=chosen.position?.string===p.string&&chosen.position?.fret===p.fret;
  svg+=`<g role="button" tabindex="0" data-score-position="${p.string}-${p.fret}" aria-label="Assign string ${TUNINGS[score.tuning].names[p.string]} fret ${p.fret}"><circle cx="${x}" cy="${yy}" r="${assigned?17:14}" fill="${assigned?'#d7ac69':'#5f917d'}" stroke="#f1e5c8" stroke-width="${assigned?3:1.2}"/><text x="${x}" y="${yy+4}" fill="#16291e" text-anchor="middle" font-size="13" font-weight="700">${p.fret}</text></g>`;
 }
 for(let f=1;f<=12;f++)svg+=`<text x="${x0+(f-.5)*spacing}" y="208" text-anchor="middle" fill="#a3bda7" font-size="11">${f}</text>`;
 return svg+'</svg>';
}
function scoreStudio(){
 const score=state.score,found=findEvent(score,state.scoreEventId),selected=found?.event,rem=remainingBeats(score),total=timeline(score).length;
 const available=[...new Set(fretboard(score.tuning,12).flat().map(p=>p.midi))].sort((a,b)=>a-b);
 const activeNote=available.includes(state.draftMidi)?state.draftMidi:available[0];
 const spellingOptions=spellingsForMidi(selected?.type==='note'?selected.midi:activeNote);const chosenSpelling=selected?.type==='note'?selected.spelling:(spellingOptions.includes(state.draftSpelling)?state.draftSpelling:spellingOptions[0]);
 const positions=selected?.type==='note'?optionsForMidi(selected.midi,score.tuning,12):[];
 const tieAvailable=selected?.type==='note'&&canTieNext(score,selected.id);
 const articulation=selected?.articulation??'none',stroke=selected?.type==='chord'?selected.stroke:'down',chordSymbol=selected?.type==='chord'?selected.symbol:'C';
 const lengthItems=DURATIONS.filter(x=>x<=measureBeats(score.meter)).map(x=>[String(x),QUARTER_LABELS[String(x)]+` (${fmtBeats(x)})`]);
 const refMidi=selected?.type==='note'?selected.midi:selected?.type==='chord'?selected.notes?.find(n=>Number.isFinite(n.midi))?.midi:null;
 const refPitch=Number.isFinite(refMidi)?midiName(refMidi):'—';
 const refHz=Number.isFinite(refMidi)?`${midiFreq(refMidi).toFixed(2)} Hz`:'SELECT A NOTE';
 const barNumber=found?found.measureIndex+1:1;
 const barRatio=Math.max(0,Math.min(100,Math.round(100*barNumber/score.measures.length)));
 return `<header class="studio-heading" aria-label="Score Studio session"><div class="studio-heading-title"><span class="studio-eyebrow">/// COMPOSITION / MODULE 01</span><h1>SCORE <em>STUDIO</em></h1></div><div class="studio-heading-meta"><span><small>KEY</small>${h(score.key??'C')} MAJOR</span><span><small>TIME</small>${h(score.meter)}</span><span><small>TEMPO</small>${score.tempo} BPM</span><span><small>TUNING</small>${h(TUNINGS[score.tuning].label)}</span></div></header>
 <div class="studio-layout"><section class="panel panel-pad studio-score-sheet">
  <div class="panel-title studio-score-title"><h2>01 / COMPOSITION GRID</h2><span class="sub-label">STANDARD NOTATION · LIVE</span></div>

  <div class="fret-controls studio-score-tools"><div>${tabbar([['notation','Notation'],['dual','Notation + Tab'],['tab','Tab only']],state.display,'data-display')}</div><button class="btn compact ghost" data-action="score-undo" ${canUndo(scoreHistory)?'':'disabled'} title="Undo last score edit (Ctrl/⌘ + Z)">↶ Undo</button><button class="btn compact ghost" data-action="score-redo" ${canRedo(scoreHistory)?'':'disabled'} title="Redo score edit (Ctrl/⌘ + Y or ⌘ + Shift + Z)">↷ Redo</button><button class="btn compact ghost" data-action="score-new">＋ New blank score</button><button class="btn compact" data-action="score-export-xml">↓ MusicXML</button><button class="btn compact" data-action="score-import-xml">↑ Import MusicXML</button><input type="file" id="musicXmlFile" accept=".musicxml,.xml,application/vnd.recordare.musicxml+xml,text/xml,application/xml" hidden></div>
  <div class="score-actions"><button class="btn compact ${engravedPreviewEnabled?'gold':'ghost'}" data-action="score-engraving">${engravedPreviewEnabled?'Hide VexFlow preview':'♬ Professional engraving preview (online)'}</button></div>
  ${engravedPreviewEnabled?`<div class="engraving-wrapper"><div class="sub-label">VEXFLOW 5 · OPTIONAL READABLE SCORE PREVIEW</div><div class="engraving-scroll" id="engravingHost" aria-label="Engraved music score"></div><p class="small-text">This preview is fetched only on request and needs internet access. Your editable score and local fallback remain below. Click engraved notes to select the matching event. Tablature and fingering remain in the editable score below.</p></div>`:''}
  <div class="studio-paper-label"><span>${h(score.title||'Untitled score')}</span><small>${score.measures.length} MEASURES · ${h(score.key??'C')} / ${h(score.meter)}</small></div><div class="score-holder score-editor-view">${renderScoreView(score,{mode:state.display,selectedEventId:state.scoreEventId,playingEventId:state.playingEventId,showNames:state.showHints})}</div>
  <div class="score-info"><span>${score.measures.length} measure${score.measures.length===1?'':'s'} · ${total} events · ${score.meter}</span><span>Last bar: ${fmtBeats(measureBeats(score.meter)-rem)}/${fmtBeats(measureBeats(score.meter))} quarter-note beats</span></div>
  <label class="small-text score-help"><input type="checkbox" id="showHints" ${state.showHints?'checked':''}> Show note names (optional reading aid)</label>
 <details class="studio-settings"><summary>SESSION CONFIGURATION <span>PIECE TITLE · KEY · METER · TEMPO · TUNING</span></summary>  <div class="control-row"><div class="control" style="flex:2;min-width:160px"><label for="scoreTitle">PIECE TITLE</label><input id="scoreTitle" class="work-input" type="text" maxlength="120" value="${h(score.title)}"></div><div class="control"><label for="scoreMeter">TIME SIGNATURE</label>${uiSelect('scoreMeter',Object.keys(METERS).map(x=>[x,x]),score.meter)}</div><div class="control"><label for="scoreKey">KEY SIGNATURE</label>${uiSelect('scoreKey',Object.keys(KEY_SIGNATURES).map(x=>[x,x+' major']),score.key??'C')}</div><div class="control"><label for="scoreTempo">TEMPO</label><input id="scoreTempo" class="work-input" type="number" min="30" max="240" value="${score.tempo}"></div><div class="control"><label for="scoreTuning">TUNING</label>${uiSelect('scoreTuning',Object.entries(TUNINGS).map(([key,t])=>[key,t.label]),score.tuning)}</div></div></details>
 </section>
 <section class="panel panel-pad studio-inspector"><div class="panel-title"><h2>NOTE INSPECTOR</h2><span class="sub-label">${selected?`BAR ${found.measureIndex+1} · EDIT SELECTED`:'INSERT AN EVENT'}</span></div>
 <p class="panel-desc">${selected?'Change the selected symbol, delete it, or choose another valid fret.':'Enter a note or rest. New measures are created when a value no longer fits.'}</p>
 <div class="form-grid score-entry">
  <div><label for="scoreType">EVENT</label>${uiSelect('scoreType',[['note','Pitch'],['chord','Four-string chord'],['rest','Rest']],selected?.type||state.draftType)}</div>
  <div><label for="scoreDuration">DURATION</label>${uiSelect('scoreDuration',lengthItems,String(selected?.duration||state.draftDuration))}</div>
  <div><label for="scorePitch">SOUNDING NOTE</label>${uiSelect('scorePitch',available.map(m=>[String(m),midiName(m)]),String(selected?.midi||activeNote))}</div><div><label for="scoreSpelling">WRITTEN SPELLING</label>${uiSelect('scoreSpelling',spellingOptions.map(x=>[x,x.replace('#','♯').replace('b','♭')]),chosenSpelling)}</div>
  <div><label for="scoreChord">CHORD SHAPE</label>${uiSelect('scoreChord',Object.keys(CHORD_SHAPES).map(x=>[x,x]),chordSymbol)}</div><div><label for="scoreStroke">STRUM DIRECTION</label>${uiSelect('scoreStroke',[['down','↓ Down'],['up','↑ Up'],['none','Together']],stroke)}</div>
  <div class="span2"><label for="scoreArticulation">ARTICULATION (NOTES / CHORDS)</label>${uiSelect('scoreArticulation',ARTICULATIONS.map(x=>[x,x==='none'?'Unmarked':x[0].toUpperCase()+x.slice(1)]),articulation)}</div>
  <div class="span2 score-actions"><button class="btn gold" data-action="score-add">＋ Append event</button>${selected?`<button class="btn" data-action="score-replace">✓ Replace selected</button><button class="btn compact" data-action="score-insert-before">← Insert before</button><button class="btn compact" data-action="score-insert-after">Insert after →</button><button class="btn ghost" data-action="score-remove">Delete selected</button><button class="btn ghost" data-action="score-clear-selection">Deselect</button>${selected.type==='note'?`<button class="btn compact ${selected.tieToNext?'gold':''}" data-action="score-tie" ${!selected.tieToNext&&!tieAvailable?'disabled title="Add an adjacent note of identical pitch first"':''}>${selected.tieToNext?'⌢ Remove tie':'⌢ Tie to next'}</button><button class="btn compact ${selected.slurToNext?'gold':''}" data-action="score-slur">${selected.slurToNext?'Remove slur':'Add slur →'}</button>`:''}`:''}</div>
 </div>
 <p class="small-text">For a four-string chord, choose Chord as the event type; the named shape and stroke apply to its written stack. For ties, put two identical adjacent notes in sequence; a tie sustains one sounding note across their combined durations. Changing key signature does not transpose the score. <button type="button" class="btn compact ghost" data-action="score-add-measure">＋ Add empty measure</button></p></section><section class="panel panel-pad studio-fret-panel"><div class="panel-title"><h2>02 / UKULELE FRETBOARD <span class="studio-sync">SYNC</span></h2><span class="sub-label">REAL STRING POSITIONS</span></div>
 ${selected?.type==='note'?`<p class="small-text">Selected: <b>${h(selected.spelling)} ${h(midiName(selected.midi))}</b> · ${positions.length} playable position${positions.length===1?'':'s'} within 12 frets. Tap a circle to assign an exact string/fret.</p>`:`<p class="small-text">Select a single note to see alternative fingerings; chord events carry four validated frets shown in optional tablature.</p>`}
 <div class="fretboard-wrap score-fret-wrap">${scoreFretboard()}</div>
 ${selected?.type==='note'?`<div class="score-actions fingering-choice">${positions.map(p=>`<button class="btn compact ${selected.position?.string===p.string&&selected.position?.fret===p.fret?'gold':''}" data-score-position="${p.string}-${p.fret}">${h(TUNINGS[score.tuning].names[p.string])} string · fret ${p.fret}</button>`).join('')}</div>`:''}
 </section></div>
 <div class="studio-transport" aria-label="Score playback and session telemetry"><div class="studio-transport-label">TRANSPORT <b>// REHEARSAL</b></div><div class="studio-transport-controls"><button class="transport-play" id="scorePlaybackToggle" data-action="score-play">${scorePlayback?'■ STOP':'▶ PLAY'}</button><button class="transport-utility" data-action="score-undo" ${canUndo(scoreHistory)?'':'disabled'}>↶ UNDO</button><button class="transport-utility" data-action="score-redo" ${canRedo(scoreHistory)?'':'disabled'}>↷ REDO</button><button class="transport-utility transport-save" data-action="score-save-song">▤ SAVE</button><div class="studio-bpm"><small>BPM</small><strong>${score.tempo}</strong></div></div><div class="studio-telemetry" aria-label="Selected note and score progress"><div class="studio-telemetry-pitch"><small>REFERENCE PITCH</small><strong>${h(refPitch)}</strong><span>${h(refHz)}</span></div><div class="studio-telemetry-progress"><small>BAR ${String(barNumber).padStart(2,'0')} / ${String(score.measures.length).padStart(2,'0')}</small><div class="studio-progress-track"><i style="width:${barRatio}%"></i></div></div></div></div>
 <div class="workspace-grid studio-secondary" style="margin-top:16px"><section class="panel panel-pad"><div class="panel-title"><h2>Keep this arrangement</h2></div><p class="panel-desc">Your working score autosaves locally. Save a snapshot into the Songbook to practise or edit it later, then export a JSON backup to protect against browser-data deletion.</p><div class="score-actions"><button class="btn gold" data-action="score-save-song">▤ Save in Songbook</button><button class="btn" data-nav="songbook">Open Songbook →</button></div><p class="small-text" style="margin-top:10px">MusicXML export creates standard single-part score notation, chords and fret indications for supported events. Import accepts only one treble-clef rhythmic voice in 4/4, 3/4 or 6/8, with supported notes, rests and chord voicings. Complex scores, tuplets, transposing instruments, multiple voices and compressed MXL are intentionally rejected. Use JSON Backup to preserve the entire app library.</p></section><section class="panel panel-pad"><h2>What this editor does not claim yet</h2><p class="small-text">This stage supports a single rhythmic voice (including four-note chord stacks), simple meters and bar-aware accidentals. Short notes are beamed by beat; dotted durations, simple ties and major key signatures are supported. Independent polyphonic voices, transposition, broad MusicXML interoperability and professional engraving remain planned. Undo/Redo tracks edits during the current session only. The display shows <strong>sounding pitch</strong>; high-G octave conventions will be a separate setting.</p></section></div>`;
}
function stopScorePlayback(){
 if(!scorePlayback)return;
 for(const timer of scorePlayback.timers)clearTimeout(timer);
 for(const voice of scorePlayback.voices)try{voice.stop(audio().currentTime+.005)}catch{}
 scorePlayback=null;state.playingEventId=null;
 $$('.score-event.playing').forEach(el=>el.classList.remove('playing'));
 const button=$('#scorePlaybackToggle');if(button)button.textContent='▶ PLAY';
}
function playScore(){
 if(scorePlayback){stopScorePlayback();return;}
 const events=timeline(state.score);if(!events.length){toast('Add at least one note to play');return;}
 const ctx=audio(),seconds=60/state.score.tempo,start=ctx.currentTime+.16;
 scorePlayback={timers:[],voices:[]};
 $('#scorePlaybackToggle')?.replaceChildren(document.createTextNode('■ STOP'));
 for(const [i,ev] of events.entries()){
  // A tie is one continuous note across consecutive score events: do not retrigger.
  const tiedFromPrevious=i>0&&events[i-1].tieToNext;
  if(ev.type==='note'&&!tiedFromPrevious){let duration=ev.duration,following=i;
   while(events[following]?.tieToNext&&events[following+1]){following++;duration+=events[following].duration;}
   scorePlayback.voices.push(...synthEvent(ev,start+ev.onset*seconds,seconds,duration))}
  else if(ev.type==='chord')scorePlayback.voices.push(...synthEvent(ev,start+ev.onset*seconds,seconds));
  const ms=Math.max(0,(start+ev.onset*seconds-ctx.currentTime)*1000);
  scorePlayback.timers.push(setTimeout(()=>{
   if(!scorePlayback)return;
   state.playingEventId=ev.id;
   $$('.score-event').forEach(n=>n.classList.toggle('playing',n.dataset.eventId===ev.id));
  },ms));
 }
 const end=Math.max(...events.map(ev=>ev.onset+ev.duration));
 scorePlayback.timers.push(setTimeout(()=>{stopScorePlayback();toast('Score playback complete')},Math.max(0,(start+end*seconds-ctx.currentTime)*1000)+80));
}
function saveScoreToSongbook(){
 try{validateScore(state.score);const id=state.scoreSongId||state.score.id,old=songs().find(s=>s.id===id);
 const copy=structuredClone(state.score),song={id,title:state.score.title||'Untitled score',artist:old?.artist||'',key:state.score.key??'C',bpm:state.score.tempo,body:old?.body||'',notes:old?.notes||'',score:copy,repositoryOrigin:old?.repositoryOrigin,updated:new Date().toISOString()};
 if(store('songs',[...songs().filter(x=>x.id!==id),song])){state.scoreSongId=id;persistScore();toast('Notation score saved in your Songbook')}
 }catch(e){toast('Could not save score: '+e.message)}
}
function practice(){const logs=progress(),minutes=logs.reduce((s,x)=>s+(x.minutes||0),0);return `${hero('PRACTICE ROOM','Make every note <em>count.</em>','Build a repeatable routine across reading, scales, technique and repertoire, and keep a simple local log of your sessions.','YOUR PERSONAL STUDIO')}
<div class="stats"><div class="stat"><strong>${logs.length}</strong><span>Sessions logged</span></div><div class="stat"><strong>${minutes}</strong><span>Practice minutes</span></div><div class="stat"><strong>${new Set(logs.map(x=>x.date.slice(0,10))).size}</strong><span>Days practiced</span></div></div><div class="workspace-grid" style="margin-top:17px"><section class="panel panel-pad"><div class="panel-title"><h2>Suggested 20-minute session</h2></div><div class="lesson-list">${[['04','Tuning & warm-up','Open tuner and play slowly.'],['05','Sight-reading','Identify notes without tablature.'],['05','Fingering & technique','Work on one specific movement.'],['04','Repertoire','Loop a difficult passage.'],['02','Reflect','Save what improved and what was difficult.']].map(([num,title,desc])=>`<div class="lesson"><div class="lesson-icon">${num}</div><div><h3>${title}</h3><p>${desc}</p></div><span class="status-tag">MIN</span></div>`).join('')}</div><div class="step-actions"><button class="btn gold" data-action="log-practice">＋ Log a 20-minute session</button><button class="btn" data-nav="notation">𝄞 Read notes</button></div></section><section class="panel panel-pad"><div class="panel-title"><h2>Recent activity</h2></div>${logs.length?`<div class="lesson-list">${logs.slice().reverse().slice(0,8).map(x=>`<div class="lesson"><div class="lesson-icon">✓</div><div><h3>${x.minutes} minutes practiced</h3><p>${h(x.note||'General practice')}<br>${h(new Date(x.date).toLocaleDateString())}</p></div></div>`).join('')}</div>`:`<div class="empty-state"><div class="big-icon">◎</div><h3>Your practice starts here</h3><p>Log your first session after completing an exercise or working through a song.</p></div>`}<p class="hint-text">Practice history stays on this device and can be exported from the songbook's backup control.</p></section></div>${deviceQASection()}`}
function deviceQASection(){
 return `<section class="panel panel-pad" style="margin-top:18px"><div class="panel-title"><h2>Device & data safety</h2><button class="btn compact gold" data-action="device-check">Run device checks</button></div><p class="small-text">Checks browser capabilities without accessing your microphone, uploading anything or inspecting your music. They do not replace a physical tuner test or an offline-reload test.</p>${deviceReport?`<div class="lesson-list">${deviceReport.map(row=>`<div class="lesson"><div class="lesson-icon">${row.status==='pass'?'✓':row.status==='available'?'?':row.status==='action'?'!':'i'}</div><div><h3>${h(row.label)}</h3><p>${h(row.detail)}</p></div><span class="status-tag">${row.status==='pass'?'CHECKED':row.status==='available'?'API ONLY':row.status==='action'?'TO TEST':'INFO'}</span></div>`).join('')}</div>`:'<p class="hint-text">Not yet checked in this session.</p>'}<p class="hint-text">Backups: Songbook → ↓ Backup. An imported backup is validated before anything is saved, and failed writes trigger rollback. Keep an exported copy outside the browser.</p></section>`;
}
function updateEngraving(){
 const host=$('#engravingHost');if(!host)return;
 if(!globalThis.VexFlow?.Renderer){host.textContent='Loading optional engraving renderer…';return;}
 try{renderEngravedScore(host,state.score,{onSelect:id=>{const found=findEvent(state.score,id);if(found){state.scoreEventId=id;render()}}})}
 catch(error){host.textContent=`Engraved preview unavailable: ${error.message}. The editable score below is unaffected.`}
}
function filterRepositoryRows(){if(state.page!=='songbook'||state.songbookView!=='repository')return;const query=state.repoQuery.toLowerCase().trim();for(const row of $$('[data-repo-row]'))row.hidden=!!((query&&!row.dataset.search.includes(query))||(state.repoDifficulty!=='all'&&row.dataset.difficulty!==state.repoDifficulty));}
function render(){const pages={explorer,progression:progressionBuilder,notation,technique,rhythm,songbook,practice,score:scoreStudio};$('#pageContent').dataset.mode=state.page;$('#pageContent').innerHTML=pages[state.page]();$('#currentPage').textContent=pageNames[state.page];$$('[data-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===state.page));if(state.page==='score'&&engravedPreviewEnabled)updateEngraving();filterRepositoryRows()}
function navigate(page){if(!pageNames[page])return;stopRhythm();if(state.page==='notation'&&page!=='notation')stopRhythmLab();if(state.page==='progression'&&page!=='progression')stopProgression();if(state.page==='score' && page!=='score')stopScorePlayback();if(state.page==='technique'&&page!=='technique')stopTechniquePlayback();state.page=page;render();window.scrollTo({top:0,behavior:'smooth'});$('#mainContent').focus({preventScroll:true})}
function nextMelodyPitch(pc){const matches=scalePositions(state.root,state.scale,state.tuning);const match=matches.find(x=>x.pc===pc && x.midi>=60)||matches.find(x=>x.pc===pc);return match?.midi??60}
function choosePitch(midi){state.selectedMidi=midi;synth(midi);render()}
function chooseChordSound(){const chord=harmonizedChords(state.root,state.scale,state.chordExtension)[state.chordDegree];if(!chord)return;const voices=chordVoicings(chord.pcs,state.tuning);const voice=voices[Math.min(state.chordIndex,voices.length-1)];if(voice){const midis=voice.midis.filter(x=>x!==null);const ctx=audio(),at=ctx.currentTime+.03;midis.forEach((m,i)=>synth(m,at+i*.025,.7,.075))}else toast('No matching chord voicing in this position range')}
function handleClick(e){const node=e.target.closest('[data-prog-degree],[data-prog-move],[data-prog-stroke],[data-prog-duration],[data-prog-remove],[data-event-id],[data-score-position],[data-midi],[data-pc],[data-nav],[data-page],[data-action],[data-degree],[data-extension],[data-labels],[data-display],[data-answer],[data-rhythm-answer],[data-expression-answer],[data-key-answer],[data-sight-answer],[data-step],[data-techfocus],[data-techindex],[data-tech-display],[data-tech-note],[data-tech-rating],[data-repo],[data-song]');if(!node)return;
 if(node.dataset.page){navigate(node.dataset.page);return}if(node.dataset.nav){navigate(node.dataset.nav);return}
 if(node.dataset.eventId){
  if(state.page==='progression')return;
  if(state.page==='technique'){const exercise=currentTechnique();if(!exercise.pattern)return;const {score}=techniqueScore(exercise.id,state.tuning);const found=findEvent(score,node.dataset.eventId);if(found){state.techEventId=found.event.id;if(found.event.type!=='rest')synthEvent(found.event,audio().currentTime+.012,60/(state.techTempo||currentTechnique().tempo));render()}return;}
  if(state.page==='notation')return;
  if(state.page==='songbook'){if(state.songbookView==='repository')return;const current=songs().find(x=>x.id===state.songOpen);if(current?.score){setScore(current.score,current.id);navigate('score')}}
  const found=findEvent(state.score,node.dataset.eventId);
  if(found){state.scoreEventId=found.event.id;state.draftDuration=found.event.duration;state.draftType=found.event.type;
   if(found.event.type==='note'){state.draftMidi=found.event.midi;state.draftSpelling=found.event.spelling;state.selectedMidi=found.event.midi;synth(found.event.midi)}render();}return;
 }
 if(node.dataset.scorePosition){const [str,fret]=node.dataset.scorePosition.split('-').map(Number);scoreMutation(draft=>assignPosition(draft,state.scoreEventId,str,fret));return} if(node.dataset.midi){choosePitch(Number(node.dataset.midi));return}if(node.dataset.pc){choosePitch(nextMelodyPitch(Number(node.dataset.pc)));return}
 if(node.dataset.progDegree!==undefined){
  try{updateProgression(editProgression(state.progression,'add',{degree:Number(node.dataset.progDegree),extension:Number(node.dataset.progExt),duration:state.progNewDuration}))}catch(e){toast(e.message)}return;
 }
 if(node.dataset.progMove!==undefined){try{updateProgression(editProgression(state.progression,'move',Number(node.dataset.progMove),Number(node.dataset.progIndex)))}catch(e){toast(e.message)}return}
 if(node.dataset.progRemove!==undefined){try{updateProgression(editProgression(state.progression,'remove',null,Number(node.dataset.progRemove)))}catch(e){toast(e.message)}return}
 if(node.dataset.progDuration!==undefined){const i=Number(node.dataset.progDuration),cap=measureBeats(state.progression.meter??'4/4'),cycle=DURATIONS.filter(d=>d>=.5&&d<=cap),old=state.progression.steps[i]?.duration??4;try{updateProgression(editProgression(state.progression,'duration',cycle[(cycle.indexOf(old)+1)%cycle.length],i))}catch(e){toast(e.message)}return}
 if(node.dataset.progStroke!==undefined){
  const i=Number(node.dataset.progStroke),cycle=['down','up','none'],current=state.progression.steps[i]?.stroke;
  try{updateProgression(editProgression(state.progression,'stroke',cycle[(cycle.indexOf(current)+1)%cycle.length],i))}catch(e){toast(e.message)}return;
 }
 if(node.dataset.degree!==undefined){state.chordDegree=Number(node.dataset.degree);state.chordIndex=0;render();return}
 if(node.dataset.extension){state.chordExtension=Number(node.dataset.extension);state.chordIndex=0;render();return}
 if(node.dataset.labels){state.labels=node.dataset.labels;store('labels',state.labels);render();return}
 if(node.dataset.display){state.display=node.dataset.display;store('display',state.display);render();return}
 if(node.dataset.answer){if(state.quizDone)return;const correct=midiName(state.quizMidi).replace(/[0-9]/g,'');state.quizTotal++;state.quizDone=true;if(node.dataset.answer===correct){state.quizCorrect++;toast('Correct! Well read.')}else toast(`That was ${correct}. Try another.`);render();return}
 if(node.dataset.rhythmAnswer!==undefined){if(state.rhythmQuizDone)return;const answer=Number(node.dataset.rhythmAnswer),item=rhythmReadingItems[state.rhythmQuizIndex%rhythmReadingItems.length];state.rhythmQuizAnswer=answer;state.rhythmQuizDone=true;state.rhythmQuizTotal++;if(answer===item.duration)state.rhythmQuizCorrect++;store('rhythmQuizCorrect',state.rhythmQuizCorrect);store('rhythmQuizTotal',state.rhythmQuizTotal);render();return}
 if(node.dataset.expressionAnswer!==undefined){
  if(state.expressionDone)return;
  const item=expressionItems[state.expressionIndex%expressionItems.length];state.expressionAnswer=node.dataset.expressionAnswer;
  state.expressionDone=true;state.expressionTotal++;if(state.expressionAnswer===item.type)state.expressionCorrect++;
  store('expressionCorrect',state.expressionCorrect);store('expressionTotal',state.expressionTotal);render();return;
 }
 if(node.dataset.keyAnswer!==undefined){
   if(state.keyLessonAnswer!==null)return;
   const answer=node.dataset.keyAnswer;
   const q=keyQuestion(state.keyLessonIndex,state.keyLessonMode);
   if(!q.choices.includes(answer))return;
   state.keyLessonAnswer=answer;
   store('notationReadingProgress',recordReadingProgress(readingProgress(),'keys-'+q.mode,answer===q.correct));
   render();return;
 }
 if(node.dataset.sightAnswer!==undefined){
   if(state.sightLessonAnswer!==null)return;
   const score=sightStudyScore(state.sightLessonId,state.tuning);
   const result=gradeSightNote(score,state.sightLessonIndex,node.dataset.sightAnswer);
   state.sightLessonAnswer=node.dataset.sightAnswer;
   store('notationReadingProgress',recordReadingProgress(readingProgress(),state.sightLessonId,result.passed));
   render();return;
 }
 if(node.dataset.step!==undefined){const i=Number(node.dataset.step),cycle=['','D','U'];state.rhythm[i]=cycle[(cycle.indexOf(state.rhythm[i])+1)%3];store('rhythm',state.rhythm);render();return}
 if(node.dataset.techfocus){stopTechniquePlayback();state.techFocus=node.dataset.techfocus;state.techIndex=0;state.techTempo=null;state.techEventId=null;render();return}if(node.dataset.techindex){stopTechniquePlayback();state.techIndex=Number(node.dataset.techindex);state.techTempo=null;state.techEventId=null;render();return}
 if(node.dataset.techDisplay){state.techDisplay=node.dataset.techDisplay;store('techDisplay',state.techDisplay);render();return}
 if(node.dataset.techNote){const {score}=techniqueScore(currentTechnique().id,state.tuning);const found=findEvent(score,node.dataset.techNote);if(found){state.techEventId=found.event.id;if(found.event.type!=='rest')synthEvent(found.event,audio().currentTime+.012,60/(state.techTempo||currentTechnique().tempo));render()}return}
 if(node.dataset.techRating){const rated=recordTechniquePractice(techniqueProgress(),currentTechnique().id,node.dataset.techRating);if(store('techniqueProgress',rated)){toast('Practice attempt recorded');render()}return}
 if(node.dataset.repo){state.repoSelectedId=node.dataset.repo;state.repoSectionIndex=0;render();return}
  if(node.dataset.repoSection!==undefined){state.repoSectionIndex=Number(node.dataset.repoSection)||0;render();return}
  if(node.dataset.repertoire){addApprovedSongs([node.dataset.repertoire]);return}
 if(node.dataset.song){state.songOpen=node.dataset.song;state.songSectionIndex=0;state.editing=false;render();return}
  if(node.dataset.songSection!==undefined){state.songSectionIndex=Number(node.dataset.songSection)||0;render();return}
 if(node.dataset.action){const action=node.dataset.action;switch(action){
 case 'prog-add-explorer':{
   if(state.scale!=='major'||!Object.hasOwn(KEY_SIGNATURES,state.root)){toast('Progression Builder currently supports major-key harmony; choose a major scale first');break}
   try{
    let p=state.progression;
    if(p.root!==state.root||p.tuning!==state.tuning||(p.mode??'major')!=='major'){
     if(p.steps.length&&!confirm('Use the explorer key and tuning? Existing progression chords will be re-harmonized in the new key.'))break;
     if((p.mode??'major')!=='major')p=editProgression(p,'property','major','mode');p=editProgression(p,'property',state.root,'root');p=editProgression(p,'property',state.tuning,'tuning');
    }
    if(updateProgression(editProgression(p,'add',{degree:state.chordDegree,extension:state.chordExtension,duration:measureBeats(p.meter??'4/4')})))navigate('progression');
   }catch(e){toast(e.message)}break;
 }
 case 'prog-default':updateProgression(createProgression({root:state.progression.root,mode:state.progression.mode??'major',meter:state.progression.meter??'4/4',tuning:state.progression.tuning,title:state.progression.title,tempo:state.progression.tempo}));break;
 case 'prog-pop':updateProgression(createProgression({root:state.progression.root,mode:state.progression.mode??'major',meter:state.progression.meter??'4/4',tuning:state.progression.tuning,title:state.progression.title,tempo:state.progression.tempo,preset:false}));break;
 case 'prog-play':playProgression();break;
 case 'prog-save-song':saveProgressionToSongbook();break;
 case 'prog-open-score':{
   try{if(!state.progression.steps.length)throw new Error('Add chords first');if(!confirm('Open this progression in Score Studio? The current score draft will be replaced; save it to Songbook first if needed.'))break;setScore(buildProgressionScore(state.progression));navigate('score');}
   catch(e){toast(e.message)}break;
 }
 case 'key-next':state.keyLessonIndex++;state.keyLessonAnswer=null;store('keyLessonIndex',state.keyLessonIndex);render();break;
 case 'key-restart':state.keyLessonIndex=0;state.keyLessonAnswer=null;store('keyLessonIndex',0);render();break;
 case 'sight-next':state.sightLessonIndex=(state.sightLessonIndex+1)%8;state.sightLessonAnswer=null;state.sightShowFingering=false;render();break;
 case 'sight-hint':state.sightShowFingering=!state.sightShowFingering;render();break;
 case 'sight-hear':{const ev=sightEvent(sightStudyScore(state.sightLessonId,state.tuning),state.sightLessonIndex);if(ev)synth(ev.midi);break;}
 case 'sight-copy':{const score=sightStudyScore(state.sightLessonId,state.tuning);if(!confirm('Copy this reading étude into Score Studio? Your existing draft will be replaced. Save it in Songbook first if needed.'))break;setScore(score);navigate('score');break;}
 case 'rhythm-lab-start':startRhythmLab();break;
 case 'rhythm-lab-tap':tapRhythmLab();break;
 case 'rhythm-lab-stop':stopRhythmLab({redraw:true});break;
 case 'expression-next':state.expressionIndex++;state.expressionDone=false;state.expressionAnswer=null;store('expressionIndex',state.expressionIndex);render();break;
 case 'expression-restart':state.expressionIndex=0;state.expressionDone=false;state.expressionAnswer=null;state.expressionCorrect=0;state.expressionTotal=0;store('expressionIndex',0);store('expressionCorrect',0);store('expressionTotal',0);render();break;
 case 'rhythm-quiz-next':state.rhythmQuizIndex++;state.rhythmQuizDone=false;state.rhythmQuizAnswer=null;store('rhythmQuizIndex',state.rhythmQuizIndex);render();break;
 case 'rhythm-quiz-restart':state.rhythmQuizIndex=0;state.rhythmQuizDone=false;state.rhythmQuizAnswer=null;state.rhythmQuizCorrect=0;state.rhythmQuizTotal=0;store('rhythmQuizIndex',0);store('rhythmQuizCorrect',0);store('rhythmQuizTotal',0);render();break;
 case 'tech-play':playTechnique();break;
 case 'tech-copy-score':{const unit=currentTechnique();if(!unit.pattern)break;stopTechniquePlayback();const {score}=techniqueScore(unit.id,state.tuning);setScore(score);navigate('score');toast('Exercise copied to your editable score — save it in Songbook when ready');}break;
 case 'score-engraving':{
  engravedPreviewEnabled=!engravedPreviewEnabled;render();
  if(engravedPreviewEnabled&&!globalThis.VexFlow?.Renderer){loadVexFlow().then(()=>{if(state.page==='score'&&engravedPreviewEnabled)updateEngraving();filterRepositoryRows()}).catch(error=>{const host=$('#engravingHost');if(host)host.textContent=`${error.message}. The editable notation below works offline.`;toast(error.message)})}
 }break;
 case 'score-play':playScore();break;
  case 'score-undo':restoreScoreHistory('undo');break;
  case 'score-redo':restoreScoreHistory('redo');break;
  case 'score-add-measure':scoreMutation(draft=>appendMeasure(draft));break;
 case 'score-tie':scoreMutation(draft=>setTieToNext(draft,state.scoreEventId,!findEvent(draft,state.scoreEventId)?.event.tieToNext));break;
 case 'score-slur':scoreMutation(draft=>setSlurToNext(draft,state.scoreEventId,!findEvent(draft,state.scoreEventId)?.event.slurToNext));break;
 case 'score-add':case 'score-replace':case 'score-insert-before':case 'score-insert-after':{
  const type=$('#scoreType')?.value||'note',duration=Number($('#scoreDuration')?.value||1),midi=Number($('#scorePitch')?.value||60),spelling=$('#scoreSpelling')?.value||spellingsForMidi(midi)[0],symbol=$('#scoreChord')?.value||'C',stroke=$('#scoreStroke')?.value||'down',articulation=$('#scoreArticulation')?.value||'none';
  state.draftType=type;state.draftDuration=duration;state.draftMidi=midi;state.draftSpelling=spelling;
  const ev=scoreMutation(draft=>action==='score-add'?
    appendEvent(draft,{type,duration,midi,spelling,symbol,stroke,articulation}):action==='score-replace'?
    replaceEvent(draft,state.scoreEventId,{type,duration,midi,spelling,symbol,stroke,articulation}):
    insertEvent(draft,state.scoreEventId,{type,duration,midi,spelling,symbol,stroke,articulation},action==='score-insert-before'?'before':'after'));
  if(ev){state.scoreEventId=ev.id;if(ev.type==='note')state.selectedMidi=ev.midi;render()}
 }break;
 case 'score-remove':{const removed=scoreMutation(draft=>removeEvent(draft,state.scoreEventId));if(removed){state.scoreEventId=null;render()}}break;
 case 'score-clear-selection':state.scoreEventId=null;render();break;
 case 'score-export-xml':{
  try{const xml=exportMusicXML(state.score);const blob=new Blob([xml],{type:'application/vnd.recordare.musicxml+xml'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=(state.score.title.toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,70)||'ukulele-score')+'.musicxml';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast('MusicXML score exported');}
  catch(err){toast(`MusicXML export: ${err.message}`)}
 }break;
 case 'score-import-xml':$('#musicXmlFile')?.click();break;
 case 'score-save-song':saveScoreToSongbook();break;
 case 'score-new':if(confirm('Start a blank score? You can undo in this session, but save your current piece to the Songbook for long-term preservation.')){
    const fresh=createScore({title:'Untitled score',tuning:state.score.tuning,meter:state.score.meter,key:state.score.key??'C',tempo:state.score.tempo,sample:false});
    scoreMutation(draft=>{for(const key of Object.keys(draft))delete draft[key];Object.assign(draft,fresh);});
    state.scoreSongId=null;state.scoreEventId=null;persistScore();render();}break;
 case 'load-song-score':{const song=songs().find(x=>x.id===state.songOpen);if(song?.score){try{setScore(song.score,song.id);navigate('score')}catch(e){toast(e.message)}}}break;
 case 'play-scale':playSeries(melody(),60/state.tempo);break;
 case 'play-chord':chooseChordSound();break;
 case 'next-voicing':{const c=harmonizedChords(state.root,state.scale,state.chordExtension)[state.chordDegree];const count=c?chordVoicings(c.pcs,state.tuning).length:0;state.chordIndex=count?(state.chordIndex+1)%count:0;render();}break;
 case 'quiz-hear':synth(state.quizMidi);break;
 case 'quiz-next':newQuestion();render();break;
 case 'open-metronome':openMetronome();break;
 case 'play-rhythm':rhythmTimer?stopRhythm():startRhythm();render();break;
 case 'reset-pattern':state.rhythm=['D','','U','U','D','','U',''];store('rhythm',state.rhythm);render();break;
 case 'repo-view-mine':state.songbookView='mine';render();break;
  case 'repo-view-repertoire':state.songbookView='repertoire';state.editing=false;render();break;
  case 'repertoire-import-all':addApprovedSongs();break;
 case 'repo-view-repository':state.songbookView='repository';state.editing=false;render();break;
 case 'repo-sync':syncLibrary();break;
 case 'repo-import':copyRepositorySong();break;
 case 'new-song':state.songOpen=null;state.editing=true;render();break;
 case 'edit-song':state.editing=true;render();break;
 case 'cancel-edit':state.editing=false;render();break;
 case 'delete-song':if(confirm('Delete this song sketch from local storage?')){store('songs',songs().filter(s=>s.id!==state.songOpen));state.songOpen=null;render();toast('Song deleted')}break;
 case 'export-backup':exportBackup();break;
 case 'import-backup':$('#backupFile')?.click();break;
 case 'device-check':inspectDevice({browserLocation:window.location,environment:navigator,storage:window.localStorage,cacheStorage:window.caches,secureContext:window.isSecureContext}).then(result=>{deviceReport=result;if(state.page==='practice')render()}).catch(error=>toast(`Device check unavailable: ${error.message}`));break;
 case 'log-practice':{const note=prompt('What did you practise? (optional)','Reading, scales and technique');if(note===null)return;const duration=prompt('Minutes practised?','20');if(duration===null)return;const mins=Number(duration);if(!Number.isFinite(mins)||mins<1||mins>720){toast('Enter a valid number of minutes');return}store('progress',[...progress(),{date:new Date().toISOString(),minutes:Math.round(mins),note}]);toast('Practice logged');render();}break;
 }}}
function handleChange(e){const el=e.target;
 if(el.id==='repoDifficulty'){state.repoDifficulty=el.value;filterRepositoryRows();return;}
 if(el.id==='keyLessonMode'){if(['major','relativeMinor'].includes(el.value)){state.keyLessonMode=el.value;state.keyLessonAnswer=null;store('keyLessonMode',el.value);render()}return}
 if(el.id==='sightLessonSelect'){try{sightStudy(el.value);state.sightLessonId=el.value;state.sightLessonIndex=0;state.sightLessonAnswer=null;state.sightShowFingering=false;store('sightLessonId',el.value);render()}catch(e){toast(e.message)}return}
 if(el.id==='readingTuning'){if(Object.hasOwn(TUNINGS,el.value)){state.tuning=el.value;store('tuning',state.tuning);state.sightLessonIndex=0;state.sightLessonAnswer=null;state.sightShowFingering=false;render()}return}
 if(el.id==='rhythmLabSelect'){try{rhythmStudy(el.value);stopRhythmLab();state.rhythmLabId=el.value;state.rhythmLabResult=null;store('rhythmLabId',el.value);render()}catch(e){toast(e.message)}return}
 if(el.id==='progAddDuration'){state.progNewDuration=Number(el.value);return}
 if(el.dataset.progPatternSelect!==undefined){try{if(el.value)updateProgression(applyRhythmPreset(state.progression,el.value,Number(el.dataset.progPatternSelect)))}catch(e){toast(e.message);render()}return}
 if(['progTitle','progKey','progMode','progMeter','progTuning','progTempo'].includes(el.id)){
  const field={progTitle:'title',progKey:'root',progMode:'mode',progMeter:'meter',progTuning:'tuning',progTempo:'tempo'}[el.id];
  try{if(updateProgression(editProgression(state.progression,'property',field==='tempo'?Number(el.value):el.value,field))&&field==='meter')state.progNewDuration=measureBeats(el.value)}
  catch(e){toast(e.message);render()}return;
 }
 if(el.id==='techTuning'){if(TUNINGS[el.value]){stopTechniquePlayback();state.tuning=el.value;state.techEventId=null;store('tuning',state.tuning);render()}return}
 if(el.id==='techFingers'){state.techShowFingers=!!el.checked;store('techFingers',state.techShowFingers);render();return}
 if(el.id==='techTempo'){const n=Number(el.value);if(n>=40&&n<=140&&Number.isInteger(n)){stopTechniquePlayback();state.techTempo=n;render()}return}
 if(el.id==='scoreTitle'){scoreMutation(draft=>{draft.title=el.value.slice(0,120)});return}
 if(el.id==='scoreTempo'){const tempo=Number(el.value);if(Number.isInteger(tempo)&&tempo>=30&&tempo<=240){scoreMutation(draft=>{draft.tempo=tempo})}else {toast('Tempo must be 30–240 BPM');render()}return}
 if(el.id==='scoreMeter'){if(state.score.measures.some(bar=>bar.events.length) && !confirm('Changing meter starts a blank score. Save the current score to the Songbook first if needed. You can undo this change during this session.')){render();return}
  const fresh=createScore({title:state.score.title,tuning:state.score.tuning,meter:el.value,key:state.score.key??'C',tempo:state.score.tempo,sample:false});
  scoreMutation(draft=>{for(const key of Object.keys(draft))delete draft[key];Object.assign(draft,fresh)});state.scoreSongId=null;state.scoreEventId=null;persistScore();render();return}
 if(el.id==='scoreKey'){scoreMutation(draft=>setKeySignature(draft,el.value));return}
 if(el.id==='scoreTuning'){scoreMutation(draft=>changeTuning(draft,el.value));return}
 if(el.id==='scoreType'){state.draftType=el.value;return}
 if(el.id==='scoreDuration'){state.draftDuration=Number(el.value);return}
 if(el.id==='scorePitch'){state.draftMidi=Number(el.value);const entries=spellingsForMidi(state.draftMidi);state.draftSpelling=entries[0];const target=$('#scoreSpelling');if(target)target.innerHTML=entries.map(x=>`<option value="${h(x)}">${h(x.replace('#','♯').replace('b','♭'))}</option>`).join('');return}
 if(el.id==='scoreSpelling'){state.draftSpelling=el.value;return}
if(['root','scale','tuning'].includes(el.id)){state[el.id]=el.value;if(el.id==='tuning')store('tuning',state.tuning);state.chordDegree=0;state.chordIndex=0;state.selectedMidi=melody()[0]?.midi??60;render()}if(el.id==='showHints'){state.showHints=el.checked;store('hints',el.checked);render()}if(el.id==='rhythmTempo'){state.tempo=Number(el.value);store('tempo',state.tempo);render()}if(el.id==='backupFile'&&el.files?.[0])importBackup(el.files[0]);if(el.id==='musicXmlFile'&&el.files?.[0])loadMusicXMLFile(el.files[0]);}
async function loadMusicXMLFile(file){
 try{if(file.size>2_000_000)throw new Error('MusicXML exceeds 2 MB');
 const score=importMusicXML(await file.text(),{tuning:state.score.tuning});
 if(!confirm(`Import “${score.title}” (${score.measures.length} measures)? This replaces your active score draft. Save your current draft to Songbook first if needed.`))return;
 setScore(score);navigate('score');toast('MusicXML score imported');
 }catch(error){toast(`MusicXML import failed: ${error.message}`)}
}
async function importBackup(file){
 try{
  if(file.size>5_000_000)throw new Error('Backup exceeds 5 MB');
  const data=JSON.parse(await file.text());
  // Validate every field, including all song scores, BEFORE requesting confirmation.
  const plan=prepareBackupRestore(data,{validateScore,validateProgression,validTechniqueProgress,validRhythmProgress,validReadingProgress});
  if(!confirm(`Restore ${data.songs.length} song(s) and ${data.progress.length} practice session(s)? This replaces the current local library. Export a backup of your current data first.`))return;
  // A write failure triggers restoration of the previous keys where possible.
  commitBackupRestore(localStorage,plan);
  if(data.progressionDraft)state.progression=structuredClone(data.progressionDraft);
  if(data.scoreDraft){
   stopScorePlayback();state.score=structuredClone(data.scoreDraft);
   scoreHistory=createHistory(state.score);state.scoreSongId=null;state.scoreEventId=null;
  }
  if(data.rhythm)state.rhythm=[...data.rhythm];
  if(data.tuning)state.tuning=data.tuning;
  if(data.display)state.display=data.display;
  state.songOpen=null;state.editing=false;
  render();toast('Backup restored. Keep your exported copy for safety.');
 }catch(error){toast(`Restore failed: ${error.message}`)}
}
function handleSubmit(e){if(e.target.id==='songForm'){e.preventDefault();const data={id:state.songOpen||String(Date.now()),title:$('#songTitle').value.trim(),artist:$('#songArtist').value.trim(),key:$('#songKey').value,bpm:Math.max(30,Math.min(240,Number($('#songBpm').value)||86)),body:$('#songBody').value,notes:$('#songNotes').value,score:songs().find(x=>x.id===state.songOpen)?.score,repositoryOrigin:songs().find(x=>x.id===state.songOpen)?.repositoryOrigin,repertoireOrigin:songs().find(x=>x.id===state.songOpen)?.repertoireOrigin,updated:new Date().toISOString()};if(!data.title){toast('Please enter a title');return}const updated=[...songs().filter(x=>x.id!==data.id),data];if(store('songs',updated)){state.songOpen=data.id;state.editing=false;render();toast('Song sketch saved locally')}}}
function stopRhythm(){if(rhythmTimer){clearInterval(rhythmTimer);rhythmTimer=null}state.rhythmStep=-1}
function startRhythm(){stopRhythm();let step=0;const play=()=>{state.rhythmStep=step;const hit=state.rhythm[step];if(hit)tick(0,hit==='D');const cells=$$('.beat-cell');cells.forEach((c,i)=>c.classList.toggle('active',i===step));step=(step+1)%8};play();rhythmTimer=setInterval(play,(60/state.tempo)*500)}
function modal(title,content){const d=$('#toolDialog');$('#dialogContent').innerHTML=`<div class="dialog-pad"><div class="dialog-head"><h2>${title}</h2><button class="btn icononly" data-dialog-close aria-label="Close">×</button></div>${content}</div>`;d.showModal();}
function openMetronome(){modal('Metronome',`<div class="eyebrow">STAY IN TIME</div><div class="metronome-numeral"><strong id="metronomeBpm">${state.tempo}</strong> <span>BPM</span></div><div class="metro-beats" id="metroBeats">${[0,1,2,3].map((i)=>`<i data-beat="${i}"></i>`).join('')}</div><div class="control"><label for="metroRange">TEMPO</label><input id="metroRange" type="range" min="40" max="220" value="${state.tempo}"></div><div class="step-actions" style="justify-content:center"><button class="btn gold large" id="metroToggle">▶ Start metronome</button><button class="btn" id="metroTap">Tap tempo</button></div><p class="small-text">A four-beat metronome with the first beat accented. Background tabs may suspend browser audio.</p>`);$('#metroRange').oninput=e=>{state.tempo=Number(e.target.value);$('#metronomeBpm').textContent=state.tempo;store('tempo',state.tempo)};$('#metroToggle').onclick=()=>{metronomeTimer?stopMetronome():startMetronome();$('#metroToggle').textContent=metronomeTimer?'■ Stop metronome':'▶ Start metronome'};let taps=[];$('#metroTap').onclick=()=>{const t=performance.now();taps=taps.filter(x=>t-x<2500).concat(t);if(taps.length>=2){const intervals=taps.slice(1).map((x,i)=>x-taps[i]);state.tempo=Math.min(220,Math.max(40,Math.round(60000/(intervals.reduce((a,b)=>a+b,0)/intervals.length))));$('#metronomeBpm').textContent=state.tempo;$('#metroRange').value=state.tempo;store('tempo',state.tempo)}tick()}}
function metronomeSchedule(){if(!ac)return;while(metroNext<ac.currentTime+.13){tick(metroNext,metroBeat===0);const beat=metroBeat,time=metroNext-ac.currentTime;setTimeout(()=>$$('#metroBeats [data-beat]').forEach(el=>el.classList.toggle('active',Number(el.dataset.beat)===beat)),Math.max(0,time*1000));metroNext+=60/state.tempo;metroBeat=(metroBeat+1)%4}}
function startMetronome(){stopMetronome();const ctx=audio();metroNext=ctx.currentTime+.06;metroBeat=0;metronomeTimer=setInterval(metronomeSchedule,25);metronomeSchedule()}
function stopMetronome(){if(metronomeTimer){clearInterval(metronomeTimer);metronomeTimer=null}$$('#metroBeats [data-beat]').forEach(el=>el.classList.remove('active'))}
function openTuner(){modal('Chromatic tuner',`<div class="eyebrow">TUNE BY EAR OR MICROPHONE</div><div class="big-tuner"><div class="tuner-note" id="tunerNote">—</div><div class="tuner-cents" id="tunerCents">Play one string at a time</div><div class="tuner-track"><div class="tuner-marker" id="tunerMarker"></div></div><div class="tuner-nums"><span>♭ 50¢</span><span>IN TUNE</span><span>50¢ ♯</span></div></div><div class="step-actions"><button class="btn gold" id="tunerMic">◉ Start microphone</button><button class="btn" id="tunerStop">■ Stop</button></div><p class="small-text" id="micStatus">Microphone audio is analysed only on your device; the app does not upload or save recordings. Use headphones to avoid feedback from reference tones.</p><hr class="divider"><div class="sub-label" style="margin-bottom:12px">REFERENCE STRINGS · ${h(TUNINGS[state.tuning].label)}</div><div class="tuner-strings">${TUNINGS[state.tuning].midi.map((m,i)=>`<button data-tone="${m}">${TUNINGS[state.tuning].names[i]}<small>${h(midiName(m))}</small></button>`).join('')}</div><div class="control" style="margin-top:16px"><label for="concertPitch">REFERENCE A4 (${state.a4} Hz)</label><input id="concertPitch" type="range" min="430" max="450" step="1" value="${state.a4}"></div>`);$('#tunerMic').onclick=startTuner;$('#tunerStop').onclick=stopTuner;$('#concertPitch').oninput=e=>{state.a4=Number(e.target.value);store('a4',state.a4);const label=e.target.previousElementSibling;label.textContent=`REFERENCE A4 (${state.a4} Hz)`};$$('[data-tone]').forEach(btn=>btn.onclick=()=>synth(Number(btn.dataset.tone),0,1,.14))}
async function startTuner(){stopTuner();const status=$('#micStatus');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser requires HTTPS or localhost for microphone access');tunerStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});tunerCtx=audio();tunerSource=tunerCtx.createMediaStreamSource(tunerStream);tunerAnalyser=tunerCtx.createAnalyser();tunerAnalyser.fftSize=4096;tunerSource.connect(tunerAnalyser);const data=new Float32Array(tunerAnalyser.fftSize);let last=0;const update=ts=>{if(!tunerAnalyser||!$('#tunerNote'))return;if(ts-last>90){last=ts;tunerAnalyser.getFloatTimeDomainData(data);const estimated=estimateFundamental(data,tunerCtx.sampleRate);const hz=estimated?.hz;if(hz){const fractional=freqMidi(hz,state.a4);const nearest=Math.round(fractional),cents=Math.round((fractional-nearest)*100);$('#tunerNote').textContent=midiName(nearest);$('#tunerCents').textContent=`${Math.round(hz)} Hz · ${Math.abs(cents)<=4?'In tune ✓':`${Math.abs(cents)} cents ${cents<0?'flat':'sharp'}`}`;$('#tunerMarker').style.left=`${Math.max(0,Math.min(100,50+cents))}%`;}else{$('#tunerNote').textContent='—';$('#tunerCents').textContent='Listening… play one clear note';}}tunerFrame=requestAnimationFrame(update)};status.textContent='Microphone active. All processing remains on this device.';tunerFrame=requestAnimationFrame(update);$('#tunerMic').textContent='◉ Listening…';}catch(e){status.textContent=`Microphone unavailable: ${e.message}. You can still tap the reference strings.`;stopTuner(false)}}
function stopTuner(updateUi=true){if(tunerFrame){cancelAnimationFrame(tunerFrame);tunerFrame=0}if(tunerStream){tunerStream.getTracks().forEach(t=>t.stop());tunerStream=null}if(tunerSource){tunerSource.disconnect();tunerSource=null}if(tunerAnalyser){tunerAnalyser.disconnect();tunerAnalyser=null}if(updateUi&&$('#tunerMic')){$('#tunerMic').textContent='◉ Start microphone';$('#micStatus').textContent='Microphone stopped. No audio was recorded or uploaded.'}}
function closeDialog(){stopTuner();stopMetronome();$('#toolDialog').close()}
function init(){newQuestion();state.selectedMidi=melody()[0]?.midi??60;render();$('#openTuner').onclick=openTuner;$('#openMetronome').onclick=openMetronome;document.addEventListener('click',handleClick);document.addEventListener('change',handleChange);document.addEventListener('input',e=>{if(e.target.id==='repoSearch'){state.repoQuery=e.target.value;filterRepositoryRows()}});document.addEventListener('submit',handleSubmit);document.addEventListener('keydown',e=>{
 if(state.page==='score' && (e.ctrlKey||e.metaKey) && !e.altKey && !e.target.closest('input,textarea,select,[contenteditable="true"]')){
   if(e.key.toLowerCase()==='z'){e.preventDefault();restoreScoreHistory(e.shiftKey?'redo':'undo');return}
   if(e.key.toLowerCase()==='y'){e.preventDefault();restoreScoreHistory('redo');return}
 }
 if(e.code==='Space'&&state.page==='notation'&&rhythmLabPlayback&&!e.repeat&&!e.target.closest('input,textarea,select,[contenteditable="true"]')&&(!e.target.closest('button')||e.target.closest('[data-action="rhythm-lab-tap"]'))){e.preventDefault();tapRhythmLab();return}
 if((e.key==='Enter'||e.key===' ')&&e.target.closest('.score-event,[data-score-position],.score-note,.fret-cell')){e.preventDefault();e.target.closest('.score-event,[data-score-position],.score-note,.fret-cell').dispatchEvent(new MouseEvent('click',{bubbles:true}))}});$('#toolDialog').addEventListener('click',e=>{if(e.target.matches('[data-dialog-close]')||e.target===$('#toolDialog'))closeDialog()});$('#toolDialog').addEventListener('close',()=>{stopTuner();stopMetronome()});window.addEventListener('beforeunload',()=>{stopTuner();stopMetronome();stopRhythm();stopScorePlayback();stopTechniquePlayback();stopProgression();stopRhythmLab()});if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}
init();
