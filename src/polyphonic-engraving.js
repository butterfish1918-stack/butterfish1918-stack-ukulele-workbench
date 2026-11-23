/** Lightweight responsive staff for imported multi-voice documents.
 * It preserves independent onsets, dynamics, tuplets, finger numbers and
 * instrument rows. This is a readable preview, not full publishing engraving.
 */
import {validateScoreDocument,planScoreSystems} from './polyphonic-score.js';
import {midiName,staffYForSpelling} from './music.js';
const displayName=e=>e.spelling||midiName(e.midi).replace(/-?\d+$/,'');
const writtenY=(e,top)=>top+44+(staffYForSpelling(e.midi,displayName(e),102)-102)*11/12;
function ledgerMarks(x,y,staffTop){
 let out='';
 for(let line=staffTop-11;line>=y-1;line-=11)out+='<line class="poly-ledger" x1="'+(x-12)+'" x2="'+(x+12)+'" y1="'+line+'" y2="'+line+'" stroke="#36473b"/>';
 for(let line=staffTop+55;line<=y+1;line+=11)out+='<line class="poly-ledger" x1="'+(x-12)+'" x2="'+(x+12)+'" y1="'+line+'" y2="'+line+'" stroke="#36473b"/>';
 return out;
}
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
export function renderPolyphonicDocument(doc,{pageWidth=760}={}){
 validateScoreDocument(doc);
 const systems=planScoreSystems(doc,{pageWidth,maxBars:4});
 const [beats,den]=doc.meter.split('/').map(Number),cap=beats*4/den,barWidth=156;
 return `<div class="polyphonic-doc" role="group" aria-label="${esc(doc.title)}, ${doc.parts.length} instrumental parts">
 ${systems.map(({startBar,endBar})=>{
  const parts=doc.parts.length,staffHeight=116,top=42,width=80+(endBar-startBar+1)*barWidth,
    height=top+parts*staffHeight+30;
  let svg=`<svg class="polyphonic-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Measures ${startBar} to ${endBar}">`;
  doc.parts.forEach((part,pi)=>{
   const y=top+pi*staffHeight,partTop=y;
   svg+=`<text x="5" y="${y+29}" font-size="11" font-weight="700" fill="#263f31">${esc(part.name)}</text>`;
   for(let line=0;line<5;line++)svg+=`<line x1="75" y1="${y+line*11}" x2="${width-5}" y2="${y+line*11}" stroke="#64736b" stroke-width="1"/>`;
   for(let bar=startBar;bar<=endBar;bar++){
    const x=75+(bar-startBar)*barWidth;
    svg+=`<line x1="${x}" y1="${y}" x2="${x}" y2="${y+44}" stroke="#36473b"/><text x="${x+5}" y="${y-9}" font-size="10" fill="#56675a">${bar}</text>`;
    if(bar===startBar)svg+=`<text class="poly-clef" x="${x+5}" y="${y+40}" font-family="serif" font-size="30">𝄞</text>`;
    if(bar===1)svg+=`<text class="poly-meter" x="${x+24}" y="${y+19}" font-size="11" text-anchor="middle">${beats}</text><text class="poly-meter" x="${x+24}" y="${y+36}" font-size="11" text-anchor="middle">${den}</text>`;
    for(const [voiceIndex,voice]of part.voices.entries()){
     const events=voice.measures[bar-1].events;
     for(const e of events){
      const ex=x+55+e.onset/cap*85+(voiceIndex%2?10:-10),rest=e.type==='rest';
      const name=rest?'':midiName(e.midi),ey=rest?y+22:writtenY(e,y),accidental=e.spelling?.includes('#')?'♯':e.spelling?.includes('b')?'♭':'';
      svg+=`<g class="poly-voice-event" data-voice="${esc(voice.id)}" data-measure="${bar}" aria-label="${rest?'Rest':esc(name)} in voice ${esc(voice.id)} at beat ${e.onset}">
       ${rest?`<rect x="${ex-6}" y="${ey-3}" width="12" height="5" fill="#36473b"/>`:`${ledgerMarks(ex,ey,y)}${accidental?`<text class="poly-accidental" x="${ex-18}" y="${ey+5}" font-size="15">${accidental}</text>`:''}<ellipse cx="${ex}" cy="${ey}" rx="7" ry="5" fill="${e.duration>=2?'none':'#36473b'}" stroke="#36473b" stroke-width="1.5" transform="rotate(-18 ${ex} ${ey})"/>${e.duration>=4?'':`<line x1="${ex+(voiceIndex%2?-7:7)}" y1="${ey}" x2="${ex+(voiceIndex%2?-7:7)}" y2="${ey+(voiceIndex%2?29:-30)}" stroke="#36473b" stroke-width="1.5"/>`}`}
       ${e.articulation&&e.articulation!=='none'?`<text x="${ex}" y="${ey-13}" font-size="10" text-anchor="middle">${e.articulation==='staccato'?'•':e.articulation==='accent'?'>':esc(e.articulation)}</text>`:''}
       ${e.finger!==undefined?`<text x="${ex+13}" y="${ey+2}" font-size="9">${e.finger}</text>`:''}
       ${e.tuplet?`<text x="${ex}" y="${ey-19}" font-size="10" fill="#425743"> ${e.tuplet.actual}:${e.tuplet.normal}</text>`:''}
       ${e.dynamics&&e.dynamics!=='mf'?`<text x="${ex}" y="${y+66}" font-style="italic" text-anchor="middle" font-size="10">${esc(e.dynamics)}</text>`:''}
       </g>`;
      if(e.type==='note'&&e.tieStart){
       const nextBar=e.onset+e.duration<cap-1e-7?bar:bar+1;
       const successor=nextBar<=doc.measures?voice.measures[nextBar-1].events.find(next=>
        next.type==='note'&&next.tieStop&&next.midi===e.midi&&
        Math.abs((nextBar-bar)*cap+next.onset-e.onset-e.duration)<1e-7):null;
       if(successor){
        const offset=voiceIndex%2?10:-10,arcY=ey+10;
        const nextX=75+(nextBar-startBar)*barWidth+55+successor.onset/cap*85+offset;
        const endpoint=nextBar<=endBar?nextX-8:width-8;
        const mid=(ex+8+endpoint)/2;
        svg+=`<path class="poly-tie${nextBar>endBar?'-out':''}" data-voice="${esc(voice.id)}" d="M${ex+8} ${arcY} Q${mid} ${arcY+17} ${endpoint} ${arcY}" fill="none" stroke="#36473b" stroke-width="1.5"/>`;
       }
      }
      if(e.type==='note'&&e.tieStop&&bar===startBar&&bar>1){
       const prior=voice.measures[bar-2].events.find(previous=>
        previous.type==='note'&&previous.tieStart&&previous.midi===e.midi&&
        Math.abs(previous.onset+previous.duration-cap-e.onset)<1e-7);
       if(prior){
        const arcY=ey+10,startX=x+7;
        svg+=`<path class="poly-tie-in" data-voice="${esc(voice.id)}" d="M${startX} ${arcY} Q${(startX+ex-8)/2} ${arcY+14} ${ex-8} ${arcY}" fill="none" stroke="#36473b" stroke-width="1.5"/>`;
       }
      }
     }
     // Beam consecutive notes from the same independent voice; never bridge
     // rests, gaps, bar lines or competing voices.
     let group=[];
     const drawBeam=()=>{
      if(group.length<2){
       if(group.length===1){
        const note=group[0],up=voiceIndex%2?1:-1;
        const nx=x+55+note.onset/cap*85+(voiceIndex%2?10:-10)+(voiceIndex%2?-7:7);
        const ny=writtenY(note,y)+up*30;
        svg+='<path class="poly-voice-flag" d="M'+nx+' '+ny+' q'+(up===-1?18:-18)+' '+(up===-1?3:-3)+' '+(up===-1?14:-14)+' '+(up===-1?19:-19)+'" fill="none" stroke="#36473b" stroke-width="2"/>';
        if(note.duration<=.25)svg+='<path class="poly-voice-flag-16th" d="M'+nx+' '+(ny+up*8)+' q'+(up===-1?16:-16)+' '+(up===-1?3:-3)+' '+(up===-1?13:-13)+' '+(up===-1?18:-18)+'" fill="none" stroke="#36473b" stroke-width="2"/>';
       }
       group=[];return
      }
      const stemDir=voiceIndex%2?1:-1;
      const endpoints=group.map(note=>{
       const noteY=writtenY(note,y);
       return {x:x+55+note.onset/cap*85+(voiceIndex%2?10:-10)+(voiceIndex%2?-7:7),y:noteY+stemDir*30};
      });
      const first=endpoints[0],last=endpoints.at(-1);
      svg+=`<line class="poly-voice-beam" data-voice="${esc(voice.id)}" x1="${first.x}" y1="${first.y}" x2="${last.x}" y2="${last.y}" stroke="#36473b" stroke-width="4"/>`;
      if(group.every(note=>note.duration<=.25)){
       svg+=`<line class="poly-voice-beam-16th" x1="${first.x}" y1="${first.y+stemDir*8}" x2="${last.x}" y2="${last.y+stemDir*8}" stroke="#36473b" stroke-width="3"/>`;
      }
      group=[];
     };
     for(const note of [...events].sort((a,b)=>a.onset-b.onset)){
      const last=group.at(-1);
      if(note.type==='note'&&note.duration<=.5&&(!last||Math.abs(last.onset+last.duration-note.onset)<.00001)){group.push(note)}
      else{drawBeam();if(note.type==='note'&&note.duration<=.5)group=[note]}
     }
     drawBeam();
    }
   }
   svg+=`<line x1="${width-5}" y1="${y}" x2="${width-5}" y2="${y+44}" stroke="#36473b"/>`;
  });
  return svg+'</svg>';
 }).join('')}</div>`;
}
