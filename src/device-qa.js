/** Non-invasive device checks. No microphone recording, telemetry or external requests. */
export async function inspectDevice({browserLocation,environment,storage,cacheStorage,secureContext}={}){
 const report=[];
 const add=(id,label,status,detail)=>report.push({id,label,status,detail});
 const protocol=browserLocation?.protocol??'unknown:';
 const originIsServed=protocol==='https:'||protocol==='http:';
 add('origin','Served browser origin',originIsServed?'pass':'action',originIsServed?'Page is served using HTTP(S).':'Standalone/file preview: installable PWA features require HTTPS or localhost.');
 add('secure','Secure context',secureContext===true?'pass':'action',secureContext===true?'Secure-context APIs are permitted.':'Use HTTPS or localhost to permit microphone and service workers.');
 let saved=false;
 const key='uw-qa-probe-'+Math.random().toString(36).slice(2);
 try{
  storage.setItem(key,'probe');
  saved=storage.getItem(key)==='probe';
 }catch{}finally{try{storage.removeItem(key)}catch{}}
 add('storage','Local storage write/read',saved?'pass':'action',saved?'A temporary value was written and read successfully. This does NOT prove survival after browser-data clearing.':'Local storage is unavailable or rejected this test write. Export your work before continuing.');
 const sw=environment?.serviceWorker;
 if(!sw||!originIsServed){add('worker','Offline service worker','action','Not available from this preview or browser. Install from HTTPS/localhost and run again.');}
 else{
  try{const registration=await sw.getRegistration();add('worker','Offline service worker',registration?.active?'pass':'action',registration?.active?'An active service worker was found. Offline reload still needs a separate test.':'No active service worker was found for this page.');}
  catch{add('worker','Offline service worker','action','Service-worker registration could not be inspected.');}
 }
 // Cache readback is a diagnostic, not a real disconnect-and-reload test.
 if(!originIsServed || !cacheStorage?.match || !browserLocation?.href){
  add('offline-shell','Offline shell cached','action','Install from HTTPS/localhost and check again; an HTML file cannot verify cached PWA resources.');
 }else{
  try{
   const needed=['./index.html','./styles.css','./src/app.js','./manifest.webmanifest','./assets/icon-192.png'];
   const urls=needed.map(p=>new URL(p,browserLocation.href).href);
   const hits=await Promise.all(urls.map(url=>cacheStorage.match(url)));
   const count=hits.filter(Boolean).length;
   add('offline-shell','Offline shell cached',count===needed.length?'pass':'action',
    `${count}/${needed.length} essential assets currently cached. A real offline reload is still required to verify operation.`);
  }catch{
   add('offline-shell','Offline shell cached','action','Cache inspection was blocked; verify offline reload manually in your browser.');
  }
 }
 add('microphone','Microphone API',secureContext&&environment?.mediaDevices?.getUserMedia?'available':'action',secureContext&&environment?.mediaDevices?.getUserMedia?'The API exists; permission and actual pitch accuracy are not yet tested.':'Microphone API unavailable; use a secure origin and supported browser.');
 try{
  const persisted=await environment?.storage?.persisted?.();
  add('persistence','Persistent storage grant',persisted===true?'pass':'info',persisted===true?'The browser reports storage persistence granted.':'Not granted or unavailable. Export JSON backups regularly.');
 }catch{add('persistence','Persistent storage grant','info','Browser did not provide a persistence result.');}
 return report;
}
