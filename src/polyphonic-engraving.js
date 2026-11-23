/** Lightweight responsive staff for imported multi-voice documents.
 * It preserves independent onsets, dynamics, tuplets, finger numbers and
 * instrument rows. This is a readable preview, not full publishing engraving.
 */
import {validateScoreDocument,planScoreSystems} from './polyphonic-score.js';
import {midiName,staffYForSpelling} from './music.js';
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
    for(const [voiceIndex,voice]of part.voices.entries()){
     for(const e of voice.measures[bar-1].events){
      const ex=x+14+e.onset/cap*124+(voiceIndex%2?5:-5),rest=e.type==='rest';
      const name=rest?'':midiName(e.midi),pitch=name.replace(/-?\d+$/,''),ey=rest?y+22:y+staffYForSpelling(e.midi,pitch,102)-54;
      svg+=`<g class="poly-voice-event" data-voice="${esc(voice.id)}" data-measure="${bar}" aria-label="${rest?'Rest':esc(name)} in voice ${esc(voice.id)} at beat ${e.onset}">
       ${rest?`<rect x="${ex-6}" y="${ey-3}" width="12" height="5" fill="#36473b"/>`:`<ellipse cx="${ex}" cy="${ey}" rx="7" ry="5" fill="#36473b" transform="rotate(-18 ${ex} ${ey})"/><line x1="${ex+(voiceIndex%2?-7:7)}" y1="${ey}" x2="${ex+(voiceIndex%2?-7:7)}" y2="${ey+(voiceIndex%2?29:-30)}" stroke="#36473b" stroke-width="1.5"/>`}
       ${e.articulation&&e.articulation!=='none'?`<text x="${ex}" y="${ey-13}" font-size="10" text-anchor="middle">${e.articulation==='staccato'?'•':e.articulation==='accent'?'>':esc(e.articulation)}</text>`:''}
       ${e.finger!==undefined?`<text x="${ex+13}" y="${ey+2}" font-size="9">${e.finger}</text>`:''}
       ${e.tuplet?`<text x="${ex}" y="${ey-19}" font-size="10" fill="#425743"> ${e.tuplet.actual}:${e.tuplet.normal}</text>`:''}
       ${e.dynamics&&e.dynamics!=='mf'?`<text x="${ex}" y="${y+66}" font-style="italic" text-anchor="middle" font-size="10">${esc(e.dynamics)}</text>`:''}
       </g>`;
     }
    }
   }
   svg+=`<line x1="${width-5}" y1="${y}" x2="${width-5}" y2="${y+44}" stroke="#36473b"/>`;
  });
  return svg+'</svg>';
 }).join('')}</div>`;
}
