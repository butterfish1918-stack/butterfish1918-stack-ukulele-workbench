/** Attach an already published accompaniment to a legacy title-only repertoire entry.
 * Preserve the user's own song identity, annotations, chord sketch and musical metadata.
 * Never replace an existing score or an unrelated personal song.
 */
const OLD_MISSING_SCORE_NOTICE = 'No notation or tablature has been imported. Add your own transcription or an appropriately licensed score in Score Studio.';

export function attachApprovedRepertoireScores(snapshot, existingSongs, {ids=null, now=new Date().toISOString()}={}) {
 if(!Array.isArray(existingSongs))throw Error('Invalid personal songbook');
 const repertoire=snapshot?.catalog?.repertoire;
 if(!Array.isArray(repertoire)||!snapshot?.songs)throw Error('Invalid repository snapshot');
 const selected=ids===null?null:new Set(ids);
 const repertoireById=new Map(repertoire.map(item=>[item.id,item]));
 let upgraded=0;
 const next=existingSongs.map(song=>{
  if(!song || typeof song!=='object' || song.score || !song.repertoireOrigin?.id) return song;
  if(selected && !selected.has(song.repertoireOrigin.id))return song;
  const item=repertoireById.get(song.repertoireOrigin.id);
  if(!item)return song;
  const arrangementId=item.preferredArrangementId||item.id;
  const arrangement=snapshot.songs[arrangementId];
  if(!arrangement?.score || arrangement.id!==arrangementId)return song;
  const previousNotes=typeof song.notes==='string'?song.notes:'';
  const retainedNotes=previousNotes.split('\n').filter(line=>line.trim()!==OLD_MISSING_SCORE_NOTICE).join('\n').trim();
  const arrangementNotes=typeof arrangement.notes==='string'?arrangement.notes:'';
  const notes=[retainedNotes,arrangementNotes].filter(Boolean).join('\n\n');
  const score=structuredClone(arrangement.score);
  upgraded++;
  return {
   ...song,
   key: song.key || arrangement.tonalCenter || arrangement.key,
   bpm: Number.isFinite(song.bpm)&&song.bpm>0 ? song.bpm : arrangement.bpm,
   body: typeof song.body==='string'&&song.body.trim()? song.body : arrangement.body,
   notes,
   score,
   repositoryOrigin:{id:arrangement.id,revision:arrangement.revision,catalogUrl:snapshot.catalogUrl},
   updated:now
  };
 });
 return {songs:upgraded?next:existingSongs,upgraded};
}
