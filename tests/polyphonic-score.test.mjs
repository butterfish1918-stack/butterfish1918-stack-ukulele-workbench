import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScoreDocument,flattenDocumentEvents,planScoreSystems} from '../src/polyphonic-score.js';
const doc={schema:2,title:'Two voice score',tempo:96,meter:'4/4',measures:2,
parts:[{id:'P1',name:'Ukulele',instrument:'ukulele',voices:[
{id:'1',measures:[{events:[{type:'note',onset:0,duration:2,midi:60},{type:'note',onset:2,duration:2,midi:64}]},{events:[]}]},
{id:'2',measures:[{events:[{type:'note',onset:0,duration:4,midi:48}]},{events:[{type:'rest',onset:0,duration:4}]}]}]}]};
test('independent voices can overlap without losing rhythmic positions',()=>{
 assert.equal(validateScoreDocument(doc),true);
 const events=flattenDocumentEvents(doc);
 assert.equal(events.filter(e=>e.absoluteOnset===0).length,2);
 assert.equal(planScoreSystems(doc).length,1);
});
test('invalid score metadata and pitch are rejected',()=>{
 assert.throws(()=>validateScoreDocument({...doc,parts:[]}));
 assert.throws(()=>validateScoreDocument({...doc,meter:'99/4'}));
});
