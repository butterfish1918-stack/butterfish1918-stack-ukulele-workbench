/** Dependency-free local HTTP server for normal-browser/PWA verification.
 * Bind only to loopback; do not expose user song data over the network.
 */
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const HOST='127.0.0.1';
const PORT=Number(process.env.PORT||4173);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('PORT must be between 1 and 65535');
const server=createServer(async(req,res)=>{
 const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message)};
 if(!['GET','HEAD'].includes(req.method)){fail(405,'Method not allowed');return}
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}
 catch{fail(400,'Invalid URL');return}
 if(pathname.includes('\0')||pathname.includes('\\')){fail(400,'Invalid path');return}
 let file=resolve(ROOT,'.'+pathname);
 if(file!==ROOT&&!file.startsWith(ROOT+sep)){fail(403,'Forbidden');return}
 try{
  const info=await stat(file);
  if(info.isDirectory())file=resolve(file,'index.html');
  if(file!==ROOT&&!file.startsWith(ROOT+sep)){fail(403,'Forbidden');return}
  const data=await readFile(file);
  const headers={'Content-Type':MIME[extname(file)]||'application/octet-stream',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Length':String(data.length)};
  res.writeHead(200,headers);
  if(req.method==='HEAD')res.end();else res.end(data);
 }catch(error){fail(error.code==='ENOENT'?404:500,error.code==='ENOENT'?'File not found':'Could not serve file')}
});
server.listen(PORT,HOST,()=>console.log(`Ukulele Workbench is served at http://${HOST}:${PORT}/ (Ctrl+C to stop)`));
