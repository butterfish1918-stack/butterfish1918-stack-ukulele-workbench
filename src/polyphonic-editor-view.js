import {ENSEMBLE_INSTRUMENTS} from './polyphonic-editor.js';
import {SUPPORTED_DYNAMICS,SUPPORTED_ARTICULATIONS} from './polyphonic-score.js';
import {midiName} from './music.js';
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(value,label,current)=>'<option value="'+h(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+h(label)+'</option>';
const select=(id,label,options)=>'<label>'+h(label)+' <select id="'+id+'">'+options+'</select></label>';
const button=(action,label,disabled=false)=>'<button type="button" class="btn compact" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+h(label)+'</button>';
export function ensembleSelection(doc,selection={}){
 const part=doc.parts.find(p=>p.id===selection.partId)||doc.parts[0];
 const voice=part.voices.find(v=>v.id===selection.voiceId)||part.voices[0];
 const barIndex=Math.max(0,Math.min(doc.measures-1,Number.isInteger(selection.barIndex)?selection.barIndex:0));
 const events=voice.measures[barIndex].events;
 const eventIndex=Number.isInteger(selection.eventIndex)&&events[selection.eventIndex]?selection.eventIndex:-1;
 return {partId:part.id,voiceId:voice.id,barIndex,eventIndex,part,voice,events,event:events[eventIndex]};
}
export function renderEnsembleEditor(doc,selection,{canUndo=false,canRedo=false}={}){
 const s=ensembleSelection(doc,selection),e=s.event;
 const [n,d]=doc.meter.split('/').map(Number),capacity=n*4/d;
 const number=(id,label,value,min,max,step)=>'<label>'+label+' <input id="'+id+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+h(value)+'"></label>';
 return '<section class="ensemble-editor" aria-label="Multi-part score editor"><h3>Edit ensemble</h3>'+
 '<p class="small-text">Choose a part, voice and bar, or select a note in the score. Onset is measured from zero in quarter-note beats; equal onset and duration create a chord. Edits autosave locally. Tied and tuplet notes have restricted editing.</p>'+
 '<div class="ensemble-editor-fields"><label>Title <input id="ensembleTitle" maxlength="120" value="'+h(doc.title)+'"></label>'+number('ensembleTempo','BPM',doc.tempo,30,240,1)+button('ensemble-metadata','Save title / tempo')+'</div>'+
 '<div class="ensemble-editor-fields">'+select('ensemblePart','Instrument',doc.parts.map(p=>opt(p.id,p.name,s.partId)).join(''))+
 select('ensembleVoice','Voice',s.part.voices.map(v=>opt(v.id,v.id,s.voiceId)).join(''))+
 select('ensembleBar','Bar',Array.from({length:doc.measures},(_,i)=>opt(i,i+1,s.barIndex)).join(''))+
 select('ensembleEvent','Event',opt(-1,'New note or rest',s.eventIndex)+s.events.map((v,i)=>opt(i,(v.type==='rest'?'Rest':midiName(v.midi))+' · beat '+(v.onset+1)+' · '+v.duration,s.eventIndex)).join(''))+'</div>'+
 '<div class="ensemble-editor-fields">'+select('ensembleType','Type',['note','rest'].map(t=>opt(t,t,e?.type||'note')).join(''))+
 number('ensembleMidi','MIDI pitch',e?.midi??60,20,110,1)+number('ensembleOnset','Onset (0-based)',e?.onset??0,0,capacity,.000001)+number('ensembleDuration','Duration (beats)',e?.duration??1,.000001,capacity,.000001)+
 select('ensembleDynamics','Dynamics',SUPPORTED_DYNAMICS.map(x=>opt(x,x,e?.dynamics??'mf')).join(''))+
 select('ensembleArticulation','Articulation',SUPPORTED_ARTICULATIONS.map(x=>opt(x,x,e?.articulation??'none')).join(''))+'</div>'+
 '<div class="score-actions">'+button('ensemble-insert','Add note / rest')+button('ensemble-replace','Update selected',!e)+button('ensemble-delete','Delete selected',!e)+button('ensemble-undo','Undo',!canUndo)+button('ensemble-redo','Redo',!canRedo)+'</div>'+
 '<div class="ensemble-editor-fields">'+select('ensembleNewInstrument','New instrument',ENSEMBLE_INSTRUMENTS.map(x=>opt(x,x,'piano')).join(''))+button('ensemble-add-part','Add instrument',doc.parts.length>=16)+button('ensemble-add-voice','Add voice',s.part.voices.length>=8)+button('ensemble-append-bar','Append bar',doc.measures>=200)+'</div></section>';
}
