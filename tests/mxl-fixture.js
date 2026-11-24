// Original ZIP fixture builder for tests; no archive library or runtime dependency.
const encoder=new TextEncoder();
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out};
export async function zipFixture(files,compress){
 const locals=[],central=[];let offset=0;
 for(const [path,content] of files){
  const name=encoder.encode(path),plain=encoder.encode(content),data=compress?await compress(plain):plain,method=compress?8:0,crc=crc32(plain);
  const local=new Uint8Array(30),l=new DataView(local.buffer),header=new Uint8Array(46),h=new DataView(header.buffer);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(8,method,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,plain.length,true);l.setUint16(26,name.length,true);
  h.setUint32(0,0x02014b50,true);h.setUint16(4,20,true);h.setUint16(6,20,true);h.setUint16(10,method,true);h.setUint32(16,crc,true);h.setUint32(20,data.length,true);h.setUint32(24,plain.length,true);h.setUint16(28,name.length,true);h.setUint32(42,offset,true);
  locals.push(local,name,data);central.push(header,name);offset+=local.length+name.length+data.length;
 }
 const directory=join(central),end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,directory.length,true);e.setUint32(16,offset,true);
 return join([...locals,directory,end]);
}
export const containerXML=(path='score.musicxml')=>'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="'+path+'" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>';
