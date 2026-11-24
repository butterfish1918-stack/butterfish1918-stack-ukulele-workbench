/** Named local ensemble snapshots, distinct from legacy single-voice scores. */
import {validateScoreDocument} from './polyphonic-score.js';
const clone=value=>JSON.parse(JSON.stringify(value));
export function saveEnsembleSnapshot(songs,doc,{id,updated=new Date().toISOString(),replace=false}={}){
 validateScoreDocument(doc);
 if(!doc.title.trim())throw Error('Enter an ensemble title');
 if(!Array.isArray(songs)||typeof id!=='string'||!/^ensemble-[A-Za-z0-9-]{1,100}$/.test(id))throw Error('Invalid ensemble ID');
 const old=songs.find(song=>song.id===id);
 if(replace&&(!old?.scoreDocument||old.score))throw Error('The linked ensemble is no longer available');
 if(!replace&&old)throw Error('Song ID already exists');
 if(!replace&&songs.length>=1000)throw Error('Songbook limit reached');
 const snapshot={...(old||{}),id,title:doc.title,artist:old?.artist||'',bpm:doc.tempo,body:old?.body||'',notes:old?.notes||'',scoreDocument:clone(doc),updated};
 const entries=old?songs.map(s=>s.id===id?snapshot:s):[...songs,snapshot];
 return {snapshot,entries};
}
export function ensembleDraftFromSong(song){
 if(!song?.scoreDocument||song.score)throw Error('Select a saved ensemble');
 validateScoreDocument(song.scoreDocument);
 return clone(song.scoreDocument);
}
export function ensemblePracticeRange(doc,{startBar=1,endBar=doc.measures,speed=100}={}){
 validateScoreDocument(doc);
 if(!Number.isInteger(startBar)||!Number.isInteger(endBar)||startBar<1||endBar>doc.measures||startBar>endBar)
  throw Error('Choose a valid practice bar range');
 if(![50,60,75,90,100,110,125].includes(speed))throw Error('Choose a supported practice speed');
 return {startBar,endBar,speed,tempo:doc.tempo*speed/100};
}
