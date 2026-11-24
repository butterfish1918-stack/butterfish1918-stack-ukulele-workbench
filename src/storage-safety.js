/** Validate an entire backup before touching persistent data; commit with rollback.
 * This supplements, but cannot replace, regularly exported JSON backups.
 */
import {validateScoreDocument} from './polyphonic-score.js';
import {ensemblePreferenceLibrary} from './ensemble-practice.js';
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const OWN='ukulele-workbench-backup';

/** Returns validated, prefix-free JSON data that may be written as one transaction. */
export function prepareBackupRestore(data,{validateScore,validateProgression,validTechniqueProgress,validRhythmProgress,validReadingProgress}){
 if(!isRecord(data)||data.format!==OWN||![1,2].includes(data.schemaVersion)||!Array.isArray(data.songs)||!Array.isArray(data.progress))throw new Error('Not a compatible backup');
 if(data.songs.length>1000||data.progress.length>10000)throw new Error('Backup has too many records');
 for(const song of data.songs){
  if(!isRecord(song)||typeof song.id!=='string'||typeof song.title!=='string'||song.title.length>120)throw new Error('Invalid song record');
  if(song.score!==undefined&&song.score!==null)validateScore(song.score);
  if(song.scoreDocument!==undefined&&song.scoreDocument!==null){
   if(song.score)throw Error('Song cannot contain both score schemas');
   validateScoreDocument(song.scoreDocument);
  }
 }
 for(const item of data.progress)if(!isRecord(item)||!Number.isFinite(item.minutes)||item.minutes<0||item.minutes>1440||typeof item.date!=='string')throw new Error('Invalid practice record');
 if(data.techniqueProgress!==undefined&&!validTechniqueProgress(data.techniqueProgress))throw new Error('Invalid technique progress');
 if(data.rhythmLabProgress!==undefined&&!validRhythmProgress(data.rhythmLabProgress))throw new Error('Invalid rhythm study progress');
 if(data.notationReadingProgress!==undefined&&!validReadingProgress(data.notationReadingProgress))throw new Error('Invalid notation reading progress');
 if(data.scoreDocument!==undefined&&data.scoreDocument!==null)validateScoreDocument(data.scoreDocument);
 if(data.scoreDraft!==undefined&&data.scoreDraft!==null)validateScore(data.scoreDraft);
 if(data.progressionDraft!==undefined&&data.progressionDraft!==null)validateProgression(data.progressionDraft);
 if(data.rhythm!==undefined&&(!Array.isArray(data.rhythm)||data.rhythm.length!==8||data.rhythm.some(x=>!['','D','U'].includes(x))))throw new Error('Invalid strumming pattern');
 const values={songs:data.songs,progress:data.progress,techniqueProgress:data.techniqueProgress??{},rhythmLabProgress:data.rhythmLabProgress??{},notationReadingProgress:data.notationReadingProgress??{}};
 values.ensembleSongPractice=ensemblePreferenceLibrary(data.songs,data.ensembleSongPractice??{});
 if(data.scoreDocument!==undefined)values.scoreDocument=data.scoreDocument;
 if(data.scoreDraft){values.scoreDraft=data.scoreDraft;values.scoreSongId=null;}
 if(data.progressionDraft)values.progressionDraft=data.progressionDraft;
 if(data.rhythm)values.rhythm=data.rhythm;
 if(data.tuning!==undefined){if(!['highG','lowG','baritone'].includes(data.tuning))throw new Error('Invalid tuning');values.tuning=data.tuning;}
 if(data.display!==undefined){if(!['notation','dual','tab'].includes(data.display))throw new Error('Invalid notation display');values.display=data.display;}
 return values;
}

/** Commit all validated keys, attempt to reinstate every old value if any write fails. */
export function commitBackupRestore(storage,values,{prefix='uw-'}={}){
 if(!isRecord(values))throw new Error('Invalid restoration plan');
 const writes=Object.entries(values).map(([key,value])=>{
  if(!/^[A-Za-z][A-Za-z0-9]*$/.test(key))throw new Error('Unsafe storage key');
  const encoded=JSON.stringify(value);
  if(typeof encoded!=='string')throw new Error('Cannot encode backup field');
  return [prefix+key,encoded];
 });
 const old=new Map();
 // Snapshot all affected fields BEFORE performing the first mutation.
 for(const [key] of writes)old.set(key,storage.getItem(key));
 try{
  for(const [key,encoded] of writes){
   storage.setItem(key,encoded);
   if(storage.getItem(key)!==encoded)throw new Error('A local storage write was not retained');
  }
 }catch(cause){
  let rollbackOK=true;
  // Remove all newly-written fields before restoring old values: avoids quota traps.
  for(const [key] of writes)try{storage.removeItem(key)}catch{rollbackOK=false}
  for(const [key,value] of old)try{
   if(value!==null)storage.setItem(key,value);
   if(storage.getItem(key)!==value)rollbackOK=false;
  }catch{rollbackOK=false}
  throw new Error(rollbackOK?'Restore cancelled; previous local data recovered':'Restore failed; previous local data could not be fully recovered. Use your exported backup.',{cause});
 }
 return writes.length;
}
