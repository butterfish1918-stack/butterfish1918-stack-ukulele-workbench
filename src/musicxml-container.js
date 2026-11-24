/** Bounded, local-only MusicXML ZIP container reader. No external dependencies. */
const LIMIT=2_000_000, ZIP_LIMIT=4_000_000, TOTAL_LIMIT=12_000_000;
const utf8=new TextDecoder('utf-8',{fatal:true});
const safePath=name=>name.length>0&&name.length<=512&&!/[\x00-\x1f\\:]/.test(name)&&name.split('/').every(p=>p&&p!=='.'&&p!=='..');
function crc32(bytes){
 let crc=0xffffffff;
 for(const b of bytes){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
 return (crc^0xffffffff)>>>0;
}
function zipEntries(bytes){
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=i=>d.getUint16(i,true),u32=i=>d.getUint32(i,true);
 if(bytes.length<22||bytes.length>ZIP_LIMIT)throw Error('Invalid or oversized MXL archive');
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break}
 }
 if(end<0)throw Error('MXL ZIP directory missing');
 const count=u16(end+10),size=u32(end+12),start=u32(end+16);
 if(u16(end+4)||u16(end+6)||u16(end+8)!==count||!count||count>128||start+size!==end)
  throw Error('Unsupported MXL ZIP directory');
 const entries=new Map(),ranges=[];let pos=start,total=0;
 for(let i=0;i<count;i++){
  if(pos+46>end||u32(pos)!==0x02014b50)throw Error('Invalid MXL directory entry');
  const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),compressed=u32(pos+20),plain=u32(pos+24);
  const n=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32),local=u32(pos+42);
  if(pos+46+n+extra+comment>end||u16(pos+34)||(flags&~0x080e)||![0,8].includes(method)||
     plain>LIMIT||compressed>ZIP_LIMIT||(method===0&&plain!==compressed)||local+30>start)
   throw Error('Unsupported or oversized MXL entry');
  total+=plain;if(total>TOTAL_LIMIT)throw Error('MXL expanded size limit exceeded');
  const name=utf8.decode(bytes.subarray(pos+46,pos+46+n));pos+=46+n+extra+comment;
  const directory=name.endsWith('/');
  if(!safePath(directory?name.slice(0,-1):name)||entries.has(name))throw Error('Unsafe or duplicate MXL path');
  if(u32(local)!==0x04034b50||u16(local+6)!==flags||u16(local+8)!==method)
   throw Error('Invalid MXL local header');
  const localN=u16(local+26),localExtra=u16(local+28),data=local+30+localN+localExtra;
  if(data+compressed>start||utf8.decode(bytes.subarray(local+30,local+30+localN))!==name)
   throw Error('Conflicting MXL local header');
  if(!(flags&8)&&(u32(local+14)!==crc||u32(local+18)!==compressed||u32(local+22)!==plain))
   throw Error('Conflicting MXL entry sizes');
  ranges.push([local,data+compressed]);
  entries.set(name,{method,crc,plain,compressed,data,directory});
 }
 if(pos!==end)throw Error('Invalid MXL directory size');
 ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw Error('Overlapping MXL entries');
 return entries;
}
async function readEntry(bytes,entry){
 if(!entry||entry.directory)throw Error('MXL root file missing');
 const data=bytes.subarray(entry.data,entry.data+entry.compressed);
 let out=data;
 if(entry.method===8){
  if(typeof DecompressionStream!=='function')throw Error('Compressed MXL requires a newer browser; export uncompressed MusicXML instead');
  let stream;
  try{stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))}
  catch{throw Error('This browser cannot decode compressed MXL; export uncompressed MusicXML instead')}
  const reader=stream.getReader(),chunks=[];let length=0;
  try{
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;
    if(length>entry.plain||length>LIMIT){await reader.cancel();throw Error('MXL expanded size limit exceeded')}
    chunks.push(value);
   }
  }finally{reader.releaseLock()}
  out=new Uint8Array(length);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}
 }
 if(out.length!==entry.plain||crc32(out)!==entry.crc)throw Error('Corrupt MXL entry');
 return utf8.decode(out);
}
export async function readCompressedMusicXML(input,{DOMParserClass=globalThis.DOMParser}={}){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 const entries=zipEntries(bytes),container=await readEntry(bytes,entries.get('META-INF/container.xml'));
 if(container.length>32_768||/<!DOCTYPE\b|<!ENTITY\b/i.test(container))throw Error('Unsafe MXL container');
 if(typeof DOMParserClass!=='function')throw Error('Browser XML parser required');
 const doc=new DOMParserClass().parseFromString(container,'application/xml');
 if(doc.querySelector('parsererror')||doc.documentElement.localName!=='container')throw Error('Invalid MXL container XML');
 const roots=Array.from(doc.documentElement.children).filter(e=>e.localName==='rootfiles');
 const candidates=roots.flatMap(e=>Array.from(e.children)).filter(e=>e.localName==='rootfile');
 if(!candidates.length)throw Error('MXL rootfile missing');
 const root=candidates[0],path=root.getAttribute('full-path'),media=root.getAttribute('media-type');
 if(!path||!safePath(path)||path==='META-INF/container.xml'||(media&&media!=='application/vnd.recordare.musicxml+xml'))
  throw Error('Unsupported MXL rootfile');
 return readEntry(bytes,entries.get(path));
}
/** Shared file-reader used by both notation editors. */
export async function readMusicXMLFile(file,options){
 if(!file||file.size>ZIP_LIMIT)throw Error('MusicXML file exceeds 4 MB');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const zip=bytes[0]===0x50&&bytes[1]===0x4b;
 if(zip||/\.mxl$/i.test(file.name||''))return readCompressedMusicXML(bytes,options);
 if(bytes.length>LIMIT)throw Error('MusicXML exceeds 2 MB');
 return utf8.decode(bytes);
}
