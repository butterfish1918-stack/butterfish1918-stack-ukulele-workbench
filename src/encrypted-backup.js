/** Password-encrypted portable JSON for privately storing in a cloud provider
 * chosen by the user. This is not automatic sync and never sends data online.
 * PBKDF2 + AES-GCM; passphrase is never stored in localStorage.
 */
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const from64=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
export async function encryptPortableBackup(object,password,api=globalThis.crypto){
 if(typeof password!=='string'||password.length<12)throw Error('Use an encryption passphrase of at least 12 characters');
 if(!api?.subtle||!api.getRandomValues)throw Error('Web Crypto API is not available');
 const encoder=new TextEncoder(),salt=api.getRandomValues(new Uint8Array(16)),iv=api.getRandomValues(new Uint8Array(12));
 const secret=await api.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 const key=await api.subtle.deriveKey({name:'PBKDF2',salt,iterations:230000,hash:'SHA-256'},secret,{name:'AES-GCM',length:256},false,['encrypt']);
 const cipher=await api.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(object)));
 return {format:'ukulele-workbench-encrypted-backup',version:1,kdf:'PBKDF2-SHA256',iterations:230000,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(cipher)};
}
export async function decryptPortableBackup(envelope,password,api=globalThis.crypto){
 if(!envelope||envelope.format!=='ukulele-workbench-encrypted-backup'||envelope.version!==1||
  envelope.iterations!==230000||envelope.kdf!=='PBKDF2-SHA256'||envelope.cipher!=='AES-256-GCM'||typeof password!=='string')
  throw Error('Invalid encrypted backup');
 if(!api?.subtle)throw Error('Web Crypto API unavailable');
 try{
  const encoder=new TextEncoder(),salt=from64(envelope.salt),iv=from64(envelope.iv),encrypted=from64(envelope.data);
  if(salt.length!==16||iv.length!==12||encrypted.length>8_000_000)throw Error('Invalid encrypted payload');
  const material=await api.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  const key=await api.subtle.deriveKey({name:'PBKDF2',salt,iterations:230000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const bytes=await api.subtle.decrypt({name:'AES-GCM',iv},key,encrypted);
  return JSON.parse(new TextDecoder().decode(bytes));
 }catch{throw Error('Incorrect passphrase or damaged encrypted backup')}
}
