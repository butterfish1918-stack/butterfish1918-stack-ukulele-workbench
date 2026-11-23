/** Strict linearization of supported MusicXML repeat passages.
 *
 * Supported: forward/backward repeats with 2–4 passes, and conventional
 * first/second endings for two-pass repeats. No nested, overlapping or
 * noncontiguous endings: reject instead of silently playing a wrong score.
 *
 * The returned indices reference ORIGINAL written measures. Consumers should
 * copy those measures into one linear, independently playable score.
 */
const range=(start,end)=>Array.from({length:Math.max(0,end-start+1)},(_,i)=>start+i);
const hasEnding=m=>m.endingStart!==undefined||m.endingStop!==undefined;
export function expandRepeatOrder(markers,{maxMeasures=200}={}){
 if(!Array.isArray(markers)||!markers.length||markers.length>200||
    !Number.isInteger(maxMeasures)||maxMeasures<1||maxMeasures>200)
  throw Error('Invalid repeat measure count');
 const entries=markers.map((raw,i)=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid repeat marker in measure '+(i+1));
  const m={...raw};
  if(m.repeatForward!==undefined&&typeof m.repeatForward!=='boolean'||
     m.repeatBackward!==undefined&&typeof m.repeatBackward!=='boolean')
   throw Error('Invalid repeat direction marker');
  if(m.times!==undefined&&(!m.repeatBackward||!Number.isInteger(m.times)||m.times<2||m.times>4))
   throw Error('Supported repeat passes are 2–4');
  if(m.endingStart!==undefined&&![1,2].includes(m.endingStart)||
     m.endingStop!==undefined&&![1,2].includes(m.endingStop))
   throw Error('Only first and second endings are supported');
  return m;
 });
 const blocks=[];
 let opened=null,afterPrevious=0;
 for(let i=0;i<entries.length;i++){
  const m=entries[i];
  if(m.repeatForward){
   if(opened!==null)throw Error('Nested repeats are not supported');
   opened=i;
  }
  if(m.repeatBackward){
   const start=opened??afterPrevious;
   if(start>i)throw Error('Invalid repeat boundary');
   blocks.push({start,end:i,times:m.times??2});
   opened=null;afterPrevious=i+1;
  }
 }
 if(opened!==null)throw Error('Repeat start is missing its backward repeat');
 const consumedEndings=new Set(),order=[];
 const append=(start,end)=>{
  for(let i=start;i<=end;i++){
   order.push(i);
   if(order.length>maxMeasures)throw Error('Expanded score exceeds 200 measures');
  }
 };
 let cursor=0;
 for(const block of blocks){
  if(block.start<cursor)throw Error('Overlapping repeat passages');
  append(cursor,block.start-1);
  const firstStarts=range(block.start,block.end).filter(i=>entries[i].endingStart===1);
  const firstStops=range(block.start,block.end).filter(i=>entries[i].endingStop===1);
  const secondWithin=range(block.start,block.end).some(i=>
   entries[i].endingStart===2||entries[i].endingStop===2);
  if(firstStarts.length||firstStops.length||secondWithin){
   if(block.times!==2)throw Error('Alternative endings require exactly two passes');
   if(firstStarts.length!==1||firstStops.length!==1||
      firstStops[0]!==block.end||secondWithin)
    throw Error('First ending must finish at the backward repeat');
   const firstStart=firstStarts[0],secondStart=block.end+1;
   if(entries[secondStart]?.endingStart!==2)throw Error('Missing second ending after first ending');
   const secondStops=[];
   for(let i=secondStart;i<entries.length;i++){
    if(i>secondStart&&entries[i].endingStart!==undefined)throw Error('Nested ending markers not supported');
    if(entries[i].repeatForward||entries[i].repeatBackward)throw Error('Repeats inside second endings are not supported');
    if(entries[i].endingStop!==undefined){
     if(entries[i].endingStop!==2)throw Error('Mismatched second-ending closure');
     secondStops.push(i);break;
    }
   }
   if(secondStops.length!==1)throw Error('Unclosed second ending');
   const secondEnd=secondStops[0];
   if(blocks.some(other=>other!==block&&other.start<=secondEnd&&other.end>block.end))
    throw Error('Overlapping alternative ending and repeat passage');
   append(block.start,block.end);
   append(block.start,firstStart-1);
   append(secondStart,secondEnd);
   for(let i=firstStart;i<=block.end;i++)if(hasEnding(entries[i]))consumedEndings.add(i);
   for(let i=secondStart;i<=secondEnd;i++)if(hasEnding(entries[i]))consumedEndings.add(i);
   cursor=secondEnd+1;
  }else{
   for(let pass=0;pass<block.times;pass++)append(block.start,block.end);
   cursor=block.end+1;
  }
 }
 append(cursor,entries.length-1);
 for(let i=0;i<entries.length;i++)
  if(hasEnding(entries[i])&&!consumedEndings.has(i))
   throw Error('Orphaned or unsupported MusicXML ending marker');
 return {order,expanded:order.length!==entries.length||order.some((n,i)=>n!==i),
  writtenMeasures:entries.length,expandedMeasures:order.length,repeatPassages:blocks.length};
}
