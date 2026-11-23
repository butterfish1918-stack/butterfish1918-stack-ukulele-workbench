import test from 'node:test';
import assert from 'node:assert/strict';
import {addSongToPlaylist,removeSongFromPlaylist,annotateSong,printableSongFilename} from '../src/song-organizer.js';
test('playlists remain deduplicated and locally owned',()=>{
 const a=addSongToPlaylist({},'Monday practice','study');
 const b=addSongToPlaylist(a,'Monday practice','study');
 assert.deepEqual(b['Monday practice'],['study']);
 assert.deepEqual(removeSongFromPlaylist(b,'Monday practice','study')['Monday practice'],[]);
});
test('annotations bound to song ID and output names are sanitized',()=>{
 assert.equal(annotateSong({},'id','Use fourth finger').id,'Use fourth finger');
 assert.equal(printableSongFilename('Scarborough Fair?'),'Scarborough-Fair');
 assert.throws(()=>annotateSong({},'id','x'.repeat(10001)));
});
