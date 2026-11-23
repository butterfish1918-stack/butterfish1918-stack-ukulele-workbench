/** Lyrics are opt-in, measure-anchored reading cues. Never infer or scrape song text.
 * Users may enter text they have the right to use. Stored in their own browser.
 * If no lyrics exist, section headings act as navigation cues, never fake lyrics.
 */
const MAX_CUES=300,MAX_TEXT=160;
const BAR=/^\s*(?:\[(\d+)(?:\s*-\s*(\d+))?\]|(\d+)(?:\s*-\s*(\d+))?\s*[:|])\s*(.+?)\s*$/;
export function parseBarLyricCues(input,{measureCount=500}={}){
 if(typeof input!=='string'||input.length>40000)throw Error('Lyric text must be under 40,000 characters');
 if(!Number.isInteger(measureCount)||measureCount<1)throw Error('Invalid song measure count');
 const cues=[],byBar=new Set();
 for(const [index,line] of input.split(/\r?\n/).entries()){
  if(!line.trim())continue;
  const match=line.match(BAR);
  if(!match)throw Error('Lyric line '+(index+1)+' needs a bar number: [9] Text to sing');
  const bar=Number(match[1]||match[3]),endBar=Number(match[2]||match[4]||bar);
  const text=match[5].trim().replace(/\s+/g,' ');
  if(!Number.isSafeInteger(bar)||bar<1||bar>measureCount||!Number.isSafeInteger(endBar)||endBar<bar||endBar>measureCount)
   throw Error('Lyric line '+(index+1)+' is outside the score (1–'+measureCount+' bars)');
  if(text.length>MAX_TEXT)throw Error('Lyric line '+(index+1)+' is too long (maximum '+MAX_TEXT+' characters)');
  if(byBar.has(bar))throw Error('Bar '+bar+' already has a lyric cue; combine text into one line');
  if(cues.length>=MAX_CUES)throw Error('Too many lyric lines (maximum '+MAX_CUES+')');
  byBar.add(bar);
  cues.push({bar,endBar,text,kind:'lyric'});
 }
 return cues.sort((a,b)=>a.bar-b.bar);
}
export function lyricCuesToText(cues){
 if(!Array.isArray(cues))return '';
 return cues.filter(x=>x.kind==='lyric').map(x=>`[${x.bar}${x.endBar&&x.endBar!==x.bar?'-'+x.endBar:''}] ${x.text}`).join('\n');
}
export function sectionMarkers(sections,measureCount){
 if(!Array.isArray(sections))return [];
 return sections.filter(x=>Number.isInteger(x.startBar)&&x.startBar>0&&x.startBar<=measureCount)
 .map(x=>({bar:x.startBar,endBar:x.startBar,text:String(x.label||'Section').slice(0,80),kind:'section'}));
}
export function mergeReadingCues(lyrics,sections,measureCount){
 const actual=Array.isArray(lyrics)?lyrics.filter(x=>x.kind==='lyric'&&x.bar>=1&&x.bar<=measureCount):[];
 const markers=sectionMarkers(sections,measureCount);
 return [...markers,...actual].sort((a,b)=>a.bar-b.bar||(a.kind==='section'?-1:1));
}
export function readingCuesForBars(cues,firstBar,lastBar){
 if(!Array.isArray(cues))return [];
 return cues.filter(cue=>cue.bar>=firstBar&&cue.bar<=lastBar);
}
