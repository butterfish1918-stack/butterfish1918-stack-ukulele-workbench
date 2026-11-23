/** ChordPro interchange. Chords and personal lyric lines are preserved.
 * ChordPro has no guarantee of staff-level pitch/rhythm transcription.
 */
export function parseChordPro(text){
 if(typeof text!=='string'||text.length>150000)throw Error('ChordPro text too large');
 const result={title:'Untitled song',artist:'',key:'C',tempo:86,sections:[],lines:[]};
 let section='Verse';
 for(const source of text.split(/\r?\n/)){
  const line=source.trim();
  if(!line)continue;
  const directive=line.match(/^\{([a-z_]+):?\s*([^}]*)\}$/i);
  if(directive){
   const key=directive[1].toLowerCase(),value=directive[2].trim();
   if(['title','t'].includes(key))result.title=value.slice(0,120);
   else if(['artist','subtitle','st'].includes(key))result.artist=value.slice(0,120);
   else if(key==='key')result.key=value.slice(0,12);
   else if(key==='tempo'&&Number.isInteger(Number(value)))result.tempo=Math.max(30,Math.min(240,Number(value)));
   else if(key==='start_of_chorus')section='Chorus';
   else if(key==='end_of_chorus')section='Verse';
   else if(key==='comment')section=value.slice(0,80)||section;
   continue;
  }
  const chords=[...line.matchAll(/\[([^\]]{1,30})\]/g)].map(m=>m[1]);
  const lyrics=line.replace(/\[[^\]]+\]/g,'').trim();
  result.lines.push({section,lyrics,chords});
 }
 if(!result.lines.length)throw Error('ChordPro contains no lyric or chord lines');
 return result;
}
export function exportChordPro(song){
 if(!song||typeof song!=='object')throw Error('Invalid song');
 const info=[`{title: ${String(song.title||'Untitled').replace(/[{}]/g,'')}}`,`{artist: ${String(song.artist||'').replace(/[{}]/g,'')}}`];
 if(song.key)info.push(`{key: ${song.key}}`);
 if(Number.isInteger(song.tempo))info.push(`{tempo: ${song.tempo}}`);
 const lines=Array.isArray(song.chordProLines)?song.chordProLines:[];
 for(const line of lines){
  if(!line||typeof line!=='object')continue;
  info.push((Array.isArray(line.chords)?line.chords:[]).map(chord=>`[${String(chord).replace(/[\[\]]/g,'')}]`).join('')+String(line.lyrics||''));
 }
 return info.join('\n')+'\n';
}
