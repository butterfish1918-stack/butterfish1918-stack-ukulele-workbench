/** Private, explicit song organization. Every collection is local unless the
 * owner exports the JSON; a public GitHub Pages URL is not private storage.
 */
export function addSongToPlaylist(playlists,name,songId){
 if(typeof name!=='string'||!name.trim()||name.length>75)throw Error('Invalid playlist name');
 if(typeof songId!=='string'||!songId||songId.length>140)throw Error('Invalid song ID');
 const safe=(playlists&&typeof playlists==='object'&&!Array.isArray(playlists))?playlists:{};
 const key=name.trim(),items=Array.isArray(safe[key])?safe[key]:[];
 if(Object.keys(safe).length>=30&&!Object.hasOwn(safe,key))throw Error('Playlist limit reached');
 return {...safe,[key]:[...new Set([...items,songId])].slice(0,120)};
}
export function removeSongFromPlaylist(playlists,name,songId){
 if(!playlists||!Array.isArray(playlists[name]))return playlists||{};
 return {...playlists,[name]:playlists[name].filter(x=>x!==songId)};
}
export function annotateSong(existing,songId,notes){
 if(typeof songId!=='string'||!songId||songId.length>140)throw Error('Invalid song');
 if(typeof notes!=='string'||notes.length>10000)throw Error('Notes must be under 10,000 characters');
 return {...existing,[songId]:notes};
}
export function printableSongFilename(title){
 return String(title||'ukulele-score').normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,70)||'ukulele-score';
}
