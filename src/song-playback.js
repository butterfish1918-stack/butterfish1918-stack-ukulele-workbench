/** Read-only scheduling helpers for poly-instrument Songbook playback.
 * All event times are in score quarter-beats, not JavaScript wall-clock time.
 */
export function compilePracticeTimeline(tracks,makeTimeline){
 if(!Array.isArray(tracks)||typeof makeTimeline!=='function')throw Error('Invalid playback tracks');
 const byTrack=new Map(),combined=[];
 for(const part of tracks){
  if(!part?.id||!part?.score)throw Error('Invalid track');
  const list=makeTimeline(part.score);
  const events=list.map((event,index)=>{
   let tiedDuration=event.duration,j=index;
   while(list[j]?.tieToNext&&list[j+1]){j++;tiedDuration+=list[j].duration}
   return {...event,trackId:part.id,instrument:part.instrument,
     continuation:index>0&&list[index-1].tieToNext,tiedDuration};
  });
  byTrack.set(part.id,events);
  combined.push(...events);
 }
 combined.sort((a,b)=>a.onset-b.onset||a.trackId.localeCompare(b.trackId));
 return {events:combined,byTrack};
}
export function activeTrackEvents(byTrack,beat){
 const result=new Map();
 if(!Number.isFinite(beat)||beat<0)return result;
 for(const [id,events] of byTrack){
  let lo=0,hi=events.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(events[mid].onset<=beat)lo=mid+1;else hi=mid}
  const last=events[lo-1];
  if(last && last.type!=='rest' && beat<last.onset+last.duration)result.set(id,last.id);
 }
 return result;
}
export function sampleRequestsForWindow(working,fromBeat,toBeat){
 const ukulele=[],backing=[];
 for(const part of working){
  const events=part.events.filter(event=>event.onset>=fromBeat&&event.onset<toBeat);
  if(!events.length)continue;
  if(part.instrument==='drums'){
   const hits=[...new Set(events.flatMap(ev=>(ev.drumHits||[]).map(hit=>(ev.drumStyle==='electronic'?'electronic':'acoustic')+'-'+hit)))];
   if(hits.length)backing.push({instrument:'drums',hits});
  }else if(['ukulele','bass','piano'].includes(part.instrument)){
   const midis=[...new Set(events.flatMap(ev=>ev.type==='note'?[ev.midi]:ev.type==='chord'?ev.notes.map(n=>n.midi):[]))];
   if(!midis.length)continue;
   if(part.instrument==='ukulele')ukulele.push(...midis);
   else backing.push({instrument:part.instrument,midis});
  }
 }
 return {ukulele:[...new Set(ukulele)],backing};
}
export function shouldSkipLateEvent(scheduledTime,now,maxLateness=.22){
 return scheduledTime<now-maxLateness;
}
