import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {encryptPortableBackup,decryptPortableBackup} from '../src/encrypted-backup.js';
test('portable encryption restores private data with the correct passphrase',async()=>{
 const original={format:'ukulele-workbench-backup',songs:[{title:'Original'}]};
 const enc=await encryptPortableBackup(original,'long-personal-passphrase',webcrypto);
 assert.equal(enc.cipher,'AES-256-GCM');assert.equal(enc.kdf,'PBKDF2-SHA256');
 assert.deepEqual(await decryptPortableBackup(enc,'long-personal-passphrase',webcrypto),original);
 await assert.rejects(decryptPortableBackup(enc,'wrong-passphrase',webcrypto));
});
