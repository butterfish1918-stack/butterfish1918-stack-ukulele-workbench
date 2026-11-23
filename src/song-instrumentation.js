/** Version-specific song instrumentation references.
 * Presence is tied to the ORIGINAL canonical recording, not invented by chord charts.
 * Only instrument parts with current sample/notation support are enabled.
 * All generated lines remain independent practice reconstructions, NOT original stems.
 */
const profiles={
 'isolation':{parts:['bass','drums'],other:['synthesizer'],source:'https://www.youtube.com/watch?v=bXFQEhdXN7c',percussion:'electronic'},
 'love-will-tear-us-apart':{parts:['bass','drums'],other:['synthesizer'],source:'https://www.qobuz.com/us-en/album/love-will-tear-us-apart-joy-division/dql2fe3z739hc'},
 'the-passenger':{parts:['bass','piano','drums'],other:['electric guitar'],source:'https://en.wikipedia.org/wiki/The_Passenger_(Iggy_Pop_song)'},
 'passover':{parts:['bass','drums'],other:['electric guitar','synthesizer textures'],source:'https://www.youtube.com/watch?v=WS1PU4kZ2ao'},
 'spellbound':{parts:['bass','drums'],other:['electric guitar'],source:'https://music.apple.com/us/song/1650831673'},
 'a-forest':{parts:['bass','drums'],other:['electric guitar','keyboards'],source:'https://www.soundonsound.com/techniques/classic-tracks-the-cure-a-forest'},
 'life-on-mars':{parts:['bass','piano','drums'],other:['strings','guitar'],source:'https://www.ism.org/advice/behind-the-lines-life-on-mars/'},
 'blackbird':{parts:[],other:['acoustic guitar','vocals','foot tapping','bird sounds'],source:'https://beatlesanswers.org/songs/blackbird',percussion:'none'},
 'space-oddity':{parts:['bass','drums'],other:['12-string acoustic guitar','Mellotron','Stylophone','strings'],source:'https://trackdive.app/track/213-space-oddity-david-bowie'},
 'while-my-guitar-gently-weeps':{parts:['bass','piano','drums'],other:['acoustic guitar','electric guitar','organ'],source:'https://www.the-paulmccartney-project.com/song/while-my-guitar-gently-weeps/'},
 'wish-you-were-here':{parts:['bass','drums'],other:['acoustic guitar','electric guitar'],source:'https://musicbrainz.org/release/14e150d6-fb97-42a1-8f75-770aaf6ed578'},
 // This particular score is an 1882 traditional-air transcription, NOT
 // the Simon & Garfunkel 1966 production with its specific instrumentation.
 'scarborough-fair-traditional-1882':{parts:[],other:['traditional voice or acoustic instrument'],source:null,percussion:'none'},
 'scarborough-fair':{parts:[],other:['traditional voice or acoustic instrument'],source:null,percussion:'none'},
 'babe-im-gonna-leave-you':{parts:['bass','drums'],other:['acoustic guitar','electric guitar'],source:'https://musicbrainz.org/release/eeb6596f-9492-4d4c-91d2-37ba949b9e4c'},
 'everybody-wants-to-rule-the-world':{parts:['bass','drums'],other:['synthesizers','electric guitar'],source:'https://www.mixonline.com/recording/classic-tracks/classic-tracks-tears-fears-everybody-wants-rule-world-365857',percussion:'electronic'},
 'california-dreamin':{parts:['bass','piano','drums'],other:['acoustic guitar','flute','vocals'],source:'https://www.mixonline.com/recording/classic-tracks/classic-tracks-mamas-papas-california-dreamin-365434'}
};
const allowed=new Set(['bass','piano','drums']);
for(const [id,profile] of Object.entries(profiles)){
 if(!Array.isArray(profile.parts)||profile.parts.some(x=>!allowed.has(x)))throw Error('Invalid instrument credits '+id);
}
export const ORIGINAL_INSTRUMENT_PROFILES=Object.freeze(profiles);
export function originalInstrumentProfile(arrangement){
 const key=arrangement?.repertoireOrigin?.id||arrangement?.id;
 const profile=profiles[key]||null;
 if(!profile)return {parts:[],other:[],source:null,verified:false,percussion:'none'};
 return {...profile,verified:!!profile.source};
}
export function availableSongParts(arrangement){
 return originalInstrumentProfile(arrangement).parts;
}
