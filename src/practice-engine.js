/** Song-specific practice state, loop boundaries, and review statistics.
 * All bars are 1-based, and tempos are percentages of the score's BPM.
 * Persist only small data summaries — audio/microphone input is never stored.
 */
const MAX_LOGS=800;
const integer=(n)=>Number.isInteger(n);
export function validateLoopRange(measures,start=1,end=measures){
 if(!integer(measures)||measures<1||measures>500)throw Error('Invalid score length');
 if(!integer(start)||!integer(end)||start<1||start>measures||end<start||end>measures)
  throw Error('Loop must start and end within the score, in ascending order');
 return {start,end,bars:end-start+1};
}
export function practiceExcerpt(score,range){
 if(!score?.measures)throw Error('A musical score is required');
 const {start,end}=validateLoopRange(score.measures.length,range?.start??1,range?.end??score.measures.length);
 return {...score,measures:score.measures.slice(start-1,end)};
}
export function nextPracticeSpeed(percent,{step=5,max=125,every=1,cycle=1}={}){
 if(!Number.isFinite(percent)||percent<30||percent>180)throw Error('Invalid practice tempo');
 if(!integer(step)||step<0||step>30||!integer(every)||every<1||every>20||!integer(cycle)||cycle<1)throw Error('Invalid tempo ramp');
 if(!Number.isFinite(max)||max<percent||max>200)throw Error('Invalid maximum tempo');
 return cycle%every===0?Math.min(max,percent+step):percent;
}
export function saveSongBookmark(bookmarks,songId,bar,totalBars){
 if(typeof songId!=='string'||songId.length>140||!songId)throw Error('Invalid song identity');
 validateLoopRange(totalBars,bar,bar);
 const result={...(bookmarks||{})};
 result[songId]={bar,totalBars,updatedAt:new Date().toISOString()};
 const keys=Object.keys(result);
 if(keys.length>120)for(const key of keys.sort((a,b)=>(result[a].updatedAt||'').localeCompare(result[b].updatedAt||'')).slice(0,keys.length-120))delete result[key];
 return result;
}
export function practiceLog(logs,{songId,title,bars,seconds,loops=0,speed=100,focus='',confidence=3}){
 if(!Array.isArray(logs))throw Error('Invalid history');
 if(typeof songId!=='string'||!songId||songId.length>140)throw Error('Invalid practice song');
 if(!Number.isFinite(seconds)||seconds<0||seconds>43200)throw Error('Invalid practice duration');
 if(!integer(bars?.start)||!integer(bars?.end)||bars.start<1||bars.end<bars.start)throw Error('Invalid practice bars');
 if(!integer(loops)||loops<0||loops>10000)throw Error('Invalid loop count');
 if(!integer(confidence)||confidence<1||confidence>5)throw Error('Confidence must be 1–5');
 const item={songId,title:String(title||'').slice(0,120),bars:{start:bars.start,end:bars.end},
  seconds:Math.round(seconds),loops,speed,focus:String(focus||'').slice(0,160),confidence,
  date:new Date().toISOString()};
 return [...logs,item].slice(-MAX_LOGS);
}
export function songPracticeStats(logs,songId){
 const items=(Array.isArray(logs)?logs:[]).filter(x=>x.songId===songId);
 const totalSeconds=items.reduce((n,x)=>n+(x.seconds||0),0);
 const dates=new Set(items.map(x=>String(x.date||'').slice(0,10)));
 const counts=new Map();
 for(const item of items)for(let b=item.bars.start;b<=item.bars.end;b++){
  const old=counts.get(b)||{sessions:0,confidence:0};
  old.sessions++;old.confidence+=(item.confidence||3);counts.set(b,old);
 }
 const weakBars=[...counts].filter(([,v])=>v.sessions>=2).sort((a,b)=>(a[1].confidence/a[1].sessions)-(b[1].confidence/b[1].sessions)||b[1].sessions-a[1].sessions).slice(0,6).map(([bar,v])=>({bar,sessions:v.sessions,meanConfidence:v.confidence/v.sessions}));
 const last=items.at(-1)||null;
 return {sessions:items.length,minutes:Math.round(totalSeconds/60),days:dates.size,loops:items.reduce((n,x)=>n+(x.loops||0),0),weakBars,last};
}
export function reviewDue(lastDate,{intervalDays=2,now=new Date()}={}){
 if(!lastDate)return true;
 const date=new Date(lastDate);
 if(!Number.isFinite(date.getTime()))return true;
 return now.getTime()-date.getTime()>=intervalDays*86400000;
}
export function validatedPracticePreferences(value){
 const input=value&&typeof value==='object'?value:{};
 const minutes=integer(input.minutes)&&input.minutes>=5&&input.minutes<=120?input.minutes:20;
 const chunks=Array.isArray(input.chunks)&&input.chunks.length===5&&input.chunks.every(n=>integer(n)&&n>=0)?input.chunks:[4,5,5,4,2];
 const sum=chunks.reduce((a,b)=>a+b,0);
 return {minutes,chunks:sum>0?chunks.map(n=>Math.round(n/sum*minutes)): [4,5,5,4,2]};
}
