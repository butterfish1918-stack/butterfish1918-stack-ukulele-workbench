import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPolyphonicDocument} from '../src/polyphonic-engraving.js';
const doc={schema:2,title:'Two voices',tempo:92,meter:'4/4',measures:1,parts:[{id:'P1',name:'Uke',instrument:'ukulele',voices:[
 {id:'1',measures:[{events:[{type:'note',onset:0,duration:1,midi:60,dynamics:'p',finger:2,articulation:'staccato',tuplet:{actual:3,normal:2}}]}]},
 {id:'2',measures:[{events:[{type:'note',onset:0,duration:2,midi:67}]}]}]}]};
test('engraving shows concurrent voices with distinct marks and instruments',()=>{
 const html=renderPolyphonicDocument(doc);
 assert.match(html,/data-voice="1"/);assert.match(html,/data-voice="2"/);
 assert.match(html,/3:2/);assert.match(html,/>p<\/text>/);assert.match(html,/>2<\/text>/);
 assert.match(html,/measure="1"/);
});
