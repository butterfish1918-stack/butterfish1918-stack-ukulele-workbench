/** Pure helpers for Songbook rehearsal views.
 * The repertoire scores are practice arrangements, not transcriptions of commercial recordings.
 */
export function sectionScore(score,sections=[],index=0){
 if(!score||!Array.isArray(score.measures))return null;
 const selected=Array.isArray(sections)&&Number.isInteger(index)&&index>=0?sections[index]:null;
 if(!selected)return score;
 const start=selected.startBar,end=selected.endBar;
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>score.measures.length)return score;
 return {...score,measures:score.measures.slice(start-1,end)};
}
export function chordGuide(score,limit=20){
 if(!score||!Array.isArray(score.measures))return [];
 const result=[],seen=new Set();
 for(const bar of score.measures){
  for(const event of bar.events||[]){
   if(event.type!=='chord'||!event.symbol||!Array.isArray(event.notes))continue;
   const frets=Array(4).fill('–');
   for(const note of event.notes){
    const string=note?.position?.string, fret=note?.position?.fret;
    if(Number.isInteger(string)&&string>=0&&string<4&&Number.isInteger(fret))frets[string]=String(fret);
   }
   const key=event.symbol+':'+frets.join('-');
   if(seen.has(key))continue;
   result.push({symbol:event.symbol,frets:frets.join(' · ')});
   seen.add(key);
   if(result.length>=limit)return result;
  }
 }
 return result;
}
export function practiceTempo(bpm,percent=100){
 const base=Number(bpm),ratio=Number(percent);
 if(!Number.isFinite(base)||base<=0||!Number.isFinite(ratio)||ratio<50||ratio>150)throw Error('Invalid practice tempo');
 return base*ratio/100;
}

/** Recognize explicit chord symbols from section-based practice charts, not lyrics. */
export function extractChordSymbols(body,limit=32){
 if(typeof body!=='string')return [];
 const seen=new Set(),result=[];
 const matcher=/(?:^|[\s|\[])\[?([A-G](?:#|b)?(?:7sus4|maj7|m7|sus2|sus4|add2|dim|aug|m|7|9)?)\]?(?=$|[\s|\],;])/g;
 for(const line of body.split(/\r?\n/)){
  const fromChart=line.includes(':')?line.slice(line.indexOf(':')+1):line;
  for(const match of fromChart.matchAll(matcher)){
   const symbol=match[1];
   if(seen.has(symbol))continue;
   result.push(symbol);seen.add(symbol);
   if(result.length>=limit)return result;
  }
 }
 return result;
}
/** Ordered chart tokens, including repeated chord symbols. Needed for measure-by-measure harmony. */
export function chartChordSequence(body,limit=300){
 if(typeof body!=='string')return [];
 const tokens=[],matcher=/(?:^|[\s|\[])\[?([A-G](?:#|b)?(?:7sus4|maj7|m7|sus2|sus4|add2|dim|aug|m|7|9)?)\]?(?=$|[\s|\],;])/g;
 for(const line of body.split(/\r?\n/)){
  const text=line.includes(':')?line.slice(line.indexOf(':')+1):line;
  for(const match of text.matchAll(matcher)){
   tokens.push(match[1]);
   if(tokens.length>=limit)return tokens;
  }
 }
 return tokens;
}
/** Chord pitch classes for common major/minor/seventh/suspended harmonies. */
export function chordPitchClasses(symbol){
 const match=/^([A-G])([#b]?)(7sus4|maj7|m7|sus2|sus4|add2|dim|aug|m|7|9)?$/.exec(symbol||'');
 if(!match)return null;
 const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const root=(natural[match[1]]+(match[2]==='#'?1:match[2]==='b'?-1:0)+12)%12;
 const suffix=match[3]||'';
 const chord={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],sus2:[0,2,7],sus4:[0,5,7],dim:[0,3,6],aug:[0,4,8],add2:[0,2,4,7],'7sus4':[0,5,7,10],9:[0,4,10,2]}[suffix];
 return chord?chord.map(n=>(root+n)%12):null;
}

/** Conventional, low-position GCEA voicings for chords commonly used in repertoire.
 * The array is G-C-E-A order. Other symbols use calculated fretboard options.
 */
export const COMMON_HIGH_G_CHORDS=Object.freeze({
 C:[0,0,0,3],G:[0,2,3,2],F:[2,0,1,0],
 A:[2,1,0,0],Am:[2,0,0,0],A7:[0,1,0,0],
 D:[2,2,2,0],Dm:[2,2,1,0],D7:[2,2,2,3],
 Em:[0,4,3,2],Em7:[0,2,0,2],E7:[1,2,0,2],
 Bb:[3,2,1,1],Bm:[4,2,2,2],B:[4,3,2,2],
 Dsus2:[2,2,0,0],Dsus4:[0,2,3,0],
 Gm:[0,2,3,1],Bbmaj7:[2,2,1,1],
 'C#m':[1,1,0,4],'F#m':[2,1,2,0],
 Fm:[1,0,1,3],Esus2:[4,4,2,2],
 C7:[0,0,0,1]
});

/** Compare local approved-song copies with the published arrangement revision.
 * New revisions are offered without overwriting personal edits.
 */
export function repertoireCopyStatus(personalSongs,item,arrangement){
 const id=item?.preferredArrangementId||item?.id;
 const copies=(Array.isArray(personalSongs)?personalSongs:[]).filter(song=>song?.score && song.repertoireOrigin?.id===item?.id);
 const existing=copies.length>0;
 const upToDate=!!arrangement && copies.some(song=>song.repositoryOrigin?.id===id && song.repositoryOrigin?.revision===arrangement.revision);
 return {existing,upToDate,updateAvailable:existing && !!arrangement && !upToDate};
}
