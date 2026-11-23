/** Read-only remote song repository, separate from the owner's local Songbook.
 * No authentication, upload, or execution of remote content is required.
 * The caller validates score documents with the canonical score model.
 */
export const CATALOG_FORMAT = 'ukulele-workbench-catalog';
export const ARRANGEMENT_FORMAT = 'ukulele-workbench-arrangement';
export const MAX_ENTRIES = 50;
export const MAX_FILE_CHARS = 150_000;
export const MAX_TOTAL_CHARS = 2_500_000;
export const DEFAULT_CATALOG_URL = './library/catalog.json';
const slug = v => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 80;
const text = (v, max=160) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const validTags = tags => Array.isArray(tags) && tags.length <= 12 && tags.every(t => text(t, 36));
const validBpm = v => Number.isInteger(v) && v >= 30 && v <= 240;
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj,key);

export function catalogUrl(input,base='http://localhost/') {
 const url=new URL(String(input || DEFAULT_CATALOG_URL).trim(),base);
 const page=new URL(base);
 if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search)
  throw Error('Repository must use a plain HTTP(S) catalog URL without credentials, query or fragment');
 if(url.protocol==='http:' && !(url.hostname==='localhost'||url.hostname==='127.0.0.1'||url.hostname==='[::1]'))
  throw Error('External repositories require HTTPS');
 if(page.protocol==='https:' && url.protocol!=='https:')throw Error('Mixed-content repository URL is not allowed');
 if(!url.pathname.endsWith('/catalog.json'))throw Error('Choose a catalog.json URL inside a library folder');
 return url.href;
}

export function validateCatalog(value) {
 if(!value || typeof value!=='object' || Array.isArray(value) || value.format!==CATALOG_FORMAT || value.schemaVersion!==1)
  throw Error('Unsupported song repository catalog');
 if(!text(value.name,120) || !Array.isArray(value.entries) || value.entries.length>MAX_ENTRIES)
  throw Error('Invalid repository name or number of arrangements');
 if(value.repertoire!==undefined)validateRepertoire(value.repertoire);
 const ids=new Set(), files=new Set();
 for(const item of value.entries){
  if(!item||!slug(item.id)||!Number.isInteger(item.revision)||item.revision<1||!text(item.title,120)||!text(item.artist,120)
    ||!/^songs\/[a-z0-9-]+\.json$/.test(item.file)|| !['beginner','intermediate','advanced'].includes(item.difficulty)
    ||!validTags(item.tags)||ids.has(item.id)||files.has(item.file))throw Error('Invalid or repeated repository entry');
  ids.add(item.id);files.add(item.file);
 }
 return true;
}

export function validateArrangement(value,metadata,validateScore){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.format!==ARRANGEMENT_FORMAT||value.schemaVersion!==1)
  throw Error('Unsupported song arrangement');
 if(!slug(value.id)||value.id!==metadata.id||value.revision!==metadata.revision||value.title!==metadata.title||value.artist!==metadata.artist)
  throw Error('Arrangement does not match its repository entry');
 if(!text(value.title,120)||!text(value.artist,120)||!['beginner','intermediate','advanced'].includes(value.difficulty)||value.difficulty!==metadata.difficulty)
  throw Error('Invalid arrangement information');
 if(!validTags(value.tags)||!value.tags.every(t=>metadata.tags.includes(t)))throw Error('Invalid arrangement tags');
 if(!validBpm(value.bpm)||!text(value.key,20)||!text(value.description,1000)||typeof value.body!=='string'||value.body.length>10000
  ||typeof value.notes!=='string'||value.notes.length>10000||!value.score)throw Error('Invalid song content');
 validateScore(value.score);
 if(value.tonalCenter!==undefined&&!text(value.tonalCenter,50))throw Error('Invalid tonal centre');
 if(value.score.tuning!==value.tuning||value.score.key!==value.key||value.score.tempo!==value.bpm)
  throw Error('Score tuning, key or tempo does not match arrangement metadata');
 return true;
}

export function validateSnapshot(value,validateScore){
 if(!value||typeof value!=='object'||!value.catalog||!value.songs||!text(value.catalogUrl,2048)||!text(value.syncedAt,64))
  throw Error('Invalid cached repository');
 validateCatalog(value.catalog);
 const ids=Object.keys(value.songs);
 if(ids.length!==value.catalog.entries.length)throw Error('Incomplete cached repository');
 for(const item of value.catalog.entries){
  if(!hasOwn(value.songs,item.id))throw Error('Missing cached arrangement');
  validateArrangement(value.songs[item.id],item,validateScore);
 }
 return true;
}

const fetchJson = async (url,fetcher,timeoutMs=12000) => {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try {
  const response=await fetcher(url,{signal:controller.signal,credentials:'omit',redirect:'follow',cache:'no-store'});
  if(!response?.ok)throw Error(`Repository request failed (${response?.status??'network'})`);
  const length=Number(response.headers?.get?.('content-length')||0);
  if(length>MAX_FILE_CHARS)throw Error('Repository file exceeds the size limit');
  const raw=await response.text();
  if(raw.length>MAX_FILE_CHARS)throw Error('Repository file exceeds the size limit');
  return JSON.parse(raw);
 } finally {clearTimeout(timer)}
};

/** Fetch and validate the ENTIRE new catalog before returning. No local state changes. */
export async function downloadRepository({source=DEFAULT_CATALOG_URL,base,fetcher=fetch,validateScore}){
 const url=catalogUrl(source,base);
 const catalog=await fetchJson(url,fetcher);
 validateCatalog(catalog);
 const songs={};let size=0;
 const root=new URL('.',url);
 for(const metadata of catalog.entries){
  const target=new URL(metadata.file,root);
  if(target.origin!==root.origin || !target.pathname.startsWith(root.pathname))throw Error('Invalid arrangement path');
  const arrangement=await fetchJson(target.href,fetcher);
  size+=JSON.stringify(arrangement).length;
  if(size>MAX_TOTAL_CHARS)throw Error('Repository exceeds local cache budget');
  validateArrangement(arrangement,metadata,validateScore);
  songs[metadata.id]=arrangement;
 }
 const snapshot={catalogUrl:url,syncedAt:new Date().toISOString(),catalog,songs};
 validateSnapshot(snapshot,validateScore);
 return snapshot;
}

/** Fetch just one approved song instead of downloading the entire catalog.
 * The result is a validated one-arrangement snapshot suitable for copyToSongbook.
 */
export async function downloadSingleApprovedArrangement({source=DEFAULT_CATALOG_URL,base,repertoireId,fetcher=fetch,validateScore}){
 const url=catalogUrl(source,base);
 const catalog=await fetchJson(url,fetcher);
 validateCatalog(catalog);
 const repertoireItem=(catalog.repertoire??[]).find(item=>item.id===repertoireId);
 if(!repertoireItem)throw Error('Song is not in the approved repertoire');
 const id=repertoireItem.preferredArrangementId||repertoireItem.id;
 const metadata=catalog.entries.find(item=>item.id===id);
 if(!metadata)throw Error('This approved song does not have a published practice arrangement');
 const root=new URL('.',url);
 const target=new URL(metadata.file,root);
 if(target.origin!==root.origin || !target.pathname.startsWith(root.pathname))throw Error('Invalid arrangement path');
 const arrangement=await fetchJson(target.href,fetcher);
 validateArrangement(arrangement,metadata,validateScore);
 const snapshot={catalogUrl:url,syncedAt:new Date().toISOString(),catalog:{...catalog,entries:[metadata]},songs:{[id]:arrangement}};
 validateSnapshot(snapshot,validateScore);
 return snapshot;
}

/** Creates a NEW independent local song. An upstream update cannot mutate it. */
export function copyToSongbook(snapshot,arrangementId,existingSongs,{id,now=new Date().toISOString(),validateScore}={}) {
 validateSnapshot(snapshot,validateScore);
 if(!Array.isArray(existingSongs))throw Error('Invalid local Songbook');
 const source=snapshot.songs[arrangementId];
 if(!source)throw Error('Arrangement not found');
 if(!text(id,120)||existingSongs.some(x=>x.id===id))throw Error('Choose a unique local song ID');
 return [...existingSongs,{
  id,title:source.title,artist:source.artist,key:source.tonalCenter??source.key,bpm:source.bpm,
  body:source.body,notes:source.notes,score:structuredClone(source.score),updated:now,
  repositoryOrigin:{id:source.id,revision:source.revision,catalogUrl:snapshot.catalogUrl}
 }];
}

/** A repertoire entry is a verified song request, not a copyrighted transcription.
 * It has no notation score until an authorized arrangement is provided.
 */
export function validateRepertoire(entries){
 if(!Array.isArray(entries)||entries.length>50)throw Error('Invalid repertoire list');
 const ids=new Set();
 for(const item of entries){
  if(!item||!slug(item.id)||!text(item.title,120)||!text(item.artist,120)
   ||!text(item.practiceFocus,200)||(item.preferredArrangementId!==undefined&&!slug(item.preferredArrangementId))||ids.has(item.id))throw Error('Invalid or duplicate repertoire item');
  ids.add(item.id);
 }
 return true;
}

/** Idempotently add approved-song metadata as editable personal sketches.
 * Importing a title never asserts that the app contains the original score.
 */
export function importApprovedRepertoire(catalog,existingSongs,{ids=null,now=new Date().toISOString()}={}){
 validateCatalog(catalog);
 if(!Array.isArray(existingSongs))throw Error('Invalid local Songbook');
 const repertoire=catalog.repertoire??[];
 const selected=ids===null?repertoire:repertoire.filter(item=>ids.includes(item.id));
 const priorIds=new Set(existingSongs.filter(x=>x.repertoireOrigin?.id).map(x=>x.repertoireOrigin.id));
 const usedIds=new Set(existingSongs.map(x=>x.id));
 const additions=[];
 for(const item of selected){
  if(priorIds.has(item.id))continue;
  let id='repertoire-'+item.id,suffix=2;
  while(usedIds.has(id))id='repertoire-'+item.id+'-'+suffix++;
  usedIds.add(id);
  additions.push({
   id,title:item.title,artist:item.artist,key:'',bpm:null,body:'',
   notes:'Practice focus: '+item.practiceFocus+'\nNo notation or tablature has been imported. Add your own transcription or an appropriately licensed score in Score Studio.',
   updated:now,repertoireOrigin:{id:item.id}
  });
 }
 return [...existingSongs,...additions];
}
