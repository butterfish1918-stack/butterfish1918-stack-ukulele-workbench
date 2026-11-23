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
