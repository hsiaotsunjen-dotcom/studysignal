import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkUniverse,checkDecision,validateSchema,writeExclusive} from './kb-review.mjs';
const scope={years:[1],questionsPerYear:2,idPrefix:'TEST'};
test('reject duplicate, missing and out-of-scope question ids',()=>{
  const a={id:'TEST1-Q01',year:1,number:1},b={id:'TEST1-Q02',year:1,number:2};
  checkUniverse([a,b],scope);
  assert.throws(()=>checkUniverse([a,a],scope));
  assert.throws(()=>checkUniverse([a],scope));
  assert.throws(()=>checkUniverse([a,{...b,year:2}],scope));
});
test('review guard rejects primary assignments without direct evidence and human claims',()=>{
  const q={id:'TEST1-Q01',status:'unit',placement:{unit:'01',section:null},candidates:['1-1']};
  const d={id:q.id,oldClassification:{status:q.status,placement:q.placement,candidates:q.candidates},newClassification:{unit:'01',section:'1-1',bucket:'1-1'},outcome:'proposed-section',confidence:'high',evidenceIds:['page'],secondarySections:[],reviewerType:'agent',needsHumanReview:true};
  const sections=new Map([['1-1',{unit:'01'}]]),ev=new Map([['page',{observedSections:['1-1']}]]);
  checkDecision(d,q,sections,ev);
  assert.throws(()=>checkDecision({...d,evidenceIds:[]},q,sections,ev));
  assert.throws(()=>checkDecision({...d,needsHumanReview:false},q,sections,ev));
  assert.throws(()=>checkDecision({...d,outcome:'pending'},q,sections,ev));
  assert.throws(()=>checkDecision({...d,oldClassification:{...d.oldClassification,status:'ambiguous'}},q,sections,ev));
});
test('generic scope accepts chemistry fixture without biology-specific years or counts',()=>{
  // Synthetic contract fixture only; no invented real exam or chemistry content.
  checkUniverse([{id:'CHEM7-Q01',year:7,number:1}],{years:[7],questionsPerYear:1,idPrefix:'CHEM'});
});
test('schema rejects missing reviewer fields, malformed hashes and unknown fields',()=>{
  const schema=JSON.parse(fs.readFileSync('scripts/kb-review-plan.schema.json'));
  const p=JSON.parse(fs.readFileSync('content/knowledge-base/derived/biology/phase-2e-review-decisions.json'));
  validateSchema(schema,p);
  const a=structuredClone(p);delete a.decisions[0].needsHumanReview;assert.throws(()=>validateSchema(schema,a));
  assert.throws(()=>validateSchema(schema,{...p,baselineSha256:'incorrect'}));
  assert.throws(()=>validateSchema(schema,{...p,humanVerified:true}));
});
test('exclusive output preflight refuses existing paths before any writes',()=>{
  const f='scripts/kb-review.mjs',before=fs.readFileSync(f);
  assert.throws(()=>writeExclusive({[f]:'must never overwrite'}));
  assert.deepEqual(fs.readFileSync(f),before);
});
