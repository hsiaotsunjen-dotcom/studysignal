// Human interactions below are SYNTHETIC SIMULATIONS, never real approvals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createReviewPage,initialState,createEvent,advanceState,reviewQueue,textHash,fingerprint} from './lib/ocr-ai-review-v22.mjs';
import {openReviewStore} from './lib/ocr-ai-review-store-v22.mjs';
const raw='甲O₂ Heme 乙';
const proposal=(id,before,after,classification='human_review')=>({id,classification,originalProposal:{before,after},canonicalProposal:{before,after,span:{start:raw.indexOf(before),end:raw.indexOf(before)+before.length,unit:'utf16_code_units',endExclusive:true}},status:'pending_human_review'});
const input=(override={})=>({dataKind:'synthetic',subject:'synthetic',sourceId:'synthetic-only-no-textbook',pageId:'synthetic-a',scanSeq:1,printedPage:null,raw,rawSha256:textHash(raw),imageSha256:textHash('synthetic image, not a scan'),sourceRefs:[],proposals:[proposal('proposal-a','甲','合成甲'),proposal('proposal-b','O₂','O2'),proposal('proposal-c','Heme','heme'),proposal('proposal-d','乙','合成乙')],...override});
const page=()=>createReviewPage(input());
const selected=(p,id)=>p.body.proposals.find(x=>x.id===id);
const review=(p,s,id='proposal-a',extra={})=>({action:'review',pageFingerprint:p.fingerprint,proposalFingerprint:selected(p,id).proposalFingerprint,expectedHead:s.head,proposalId:id,reviewerType:'human',reviewerId:'SYNTHETIC FIXTURE - no real human',humanConfirmed:true,decision:'accept',approvedText:selected(p,id).canonicalProposal.after,checks:{imageCompared:true,textPosition:true,scientificNotation:true,readingOrder:true},notes:'Synthetic workflow test only; not a source confirmation',...extra});
const apply=(p,s,id='proposal-a')=>({action:'apply',pageFingerprint:p.fingerprint,proposalFingerprint:selected(p,id).proposalFingerprint,expectedHead:s.head,proposalId:id,actorId:'synthetic fixture'});
const rollback=(p,s,target=p.fingerprint)=>({action:'rollback',pageFingerprint:p.fingerprint,expectedHead:s.head,targetRevision:target,actorId:'synthetic fixture',reason:'synthetic rollback test'});
const step=(p,s,c)=>advanceState(p,s,createEvent(p,s,c,'2026-11-04T00:00:00.000Z'));
const temp=()=>path.join(fs.mkdtempSync(path.join(os.tmpdir(),'studysignal-v22-synthetic-')),'store');
test('page imports are deterministic, retain originals and never create Ground Truth',()=>{
  const a=page(),b=page();assert.deepEqual(a,b);assert.equal(a.body.raw,raw);assert.equal(a.body.isGroundTruth,false);assert(reviewQueue(a,initialState(a)).every(q=>q.reviewState==='pending_human_review'));
});
test('page versions differ when source evidence changes',()=>assert.notEqual(page().fingerprint,createReviewPage(input({imageSha256:textHash('another synthetic image')})).fingerprint));
test('unknown categories, duplicate IDs and reserved object keys are rejected',()=>{
  for(const proposals of [[proposal('x','甲','甲','verified')],[proposal('x','甲','甲'),proposal('x','乙','乙')],[proposal('constructor','甲','甲')]])assert.throws(()=>createReviewPage(input({proposals})));
});
test('invalid source hashes and incorrect anchors cannot be imported',()=>{
  assert.throws(()=>createReviewPage(input({rawSha256:'0'.repeat(64)})));const p=proposal('x','甲','乙');p.canonicalProposal.span.start=1;assert.throws(()=>createReviewPage(input({proposals:[p]})));
});
test('an auto-confirmable label does not authorize a text correction',()=>{
  const p=createReviewPage(input({proposals:[proposal('proposal-a','甲','甲','auto_confirmable')]})),s=initialState(p);assert.throws(()=>step(p,s,apply(p,s)));assert.equal(reviewQueue(p,s)[0].autoApplyAllowed,false);
});
test('apply without current human acceptance is blocked',()=>{const p=page(),s=initialState(p);assert.throws(()=>step(p,s,apply(p,s)));});
test('missing human confirmation or reviewer identity cannot approve content',()=>{
  const p=page(),s=initialState(p);for(const extra of [{humanConfirmed:false},{reviewerType:'agent'},{reviewerId:''}])assert.throws(()=>step(p,s,review(p,s,'proposal-a',extra)));
});
test('all four source checks and an explicit approved string are mandatory',()=>{
  const p=page(),s=initialState(p);for(const extra of [{checks:{}},{checks:{imageCompared:true,textPosition:true,scientificNotation:false,readingOrder:true}},{approvedText:undefined},{notes:''}])assert.throws(()=>step(p,s,review(p,s,'proposal-a',extra)));
});
test('page and proposal fingerprints reject approvals copied to another version',()=>{
  const p=page(),s=initialState(p);for(const extra of [{pageFingerprint:'0'.repeat(64)},{proposalFingerprint:'0'.repeat(64)}])assert.throws(()=>step(p,s,review(p,s,'proposal-a',extra)));
});
test('unknown command fields cannot silently mark a proposal verified',()=>{const p=page(),s=initialState(p);assert.throws(()=>step(p,s,{...review(p,s),verified:true}));});
test('uncertain and reject decisions never authorize replacement text',()=>{
  const p=page();for(const decision of ['uncertain','reject']){let s=initialState(p);s=step(p,s,review(p,s,'proposal-a',{decision,approvedText:null}));assert.throws(()=>step(p,s,apply(p,s)));assert.equal(s.text,raw);}
});
test('accepted review alone keeps raw unchanged and simulation scope explicit',()=>{
  const p=page(),s=step(p,initialState(p),review(p,initialState(p)));assert.equal(s.text,raw);assert.equal(s.reviews['proposal-a'].reviewerType,'synthetic_human_simulation');assert.equal(s.reviews['proposal-a'].isGroundTruth,false);
});
test('approved correction creates a derived revision and leaves immutable raw intact',()=>{
  const p=page();let s=initialState(p);s=step(p,s,review(p,s));const prior=s.textRevision;s=step(p,s,apply(p,s));assert.equal(s.text,'合成甲O₂ Heme 乙');assert.notEqual(s.textRevision,prior);assert.equal(p.body.raw,raw);assert.equal(s.patches[0].before,'甲');
});
test('length-changing corrections do not shift subsequent original anchors',()=>{
  const p=page();let s=initialState(p);for(const id of ['proposal-a','proposal-d']){s=step(p,s,review(p,s,id));s=step(p,s,apply(p,s,id));}assert.equal(s.text,'合成甲O₂ Heme 合成乙');
});
test('formulas and mixed-language text require exact approved replacements',()=>{
  const p=page();let s=initialState(p);s=step(p,s,review(p,s,'proposal-b',{approvedText:'O₂'}));s=step(p,s,apply(p,s,'proposal-b'));s=step(p,s,review(p,s,'proposal-c',{approvedText:'Heme'}));s=step(p,s,apply(p,s,'proposal-c'));assert.equal(s.text,raw);
});
test('human may explicitly approve a Unicode superscript string distinct from AI output',()=>{
  const p=page();let s=initialState(p);s=step(p,s,review(p,s,'proposal-b',{approvedText:'Fe²⁺'}));s=step(p,s,apply(p,s,'proposal-b'));assert.equal(s.patches[0].after,'Fe²⁺');assert.equal(s.patches[0].before,'O₂');
});
test('overlapping accepted proposals cannot both be applied',()=>{
  const p=createReviewPage(input({proposals:[proposal('proposal-a','甲O₂','X'),proposal('proposal-b','O₂','Y')]}));let s=initialState(p);for(const id of ['proposal-a','proposal-b'])s=step(p,s,review(p,s,id));s=step(p,s,apply(p,s));assert.throws(()=>step(p,s,apply(p,s,'proposal-b')));
});
test('repeat apply and stale expectedHead are rejected',()=>{
  const p=page();let s=initialState(p),old=review(p,s);s=step(p,s,old);assert.throws(()=>step(p,s,old));s=step(p,s,apply(p,s));assert.throws(()=>step(p,s,apply(p,s)));
});
test('reviewing an active patch requires rollback first',()=>{
  const p=page();let s=initialState(p);s=step(p,s,review(p,s));s=step(p,s,apply(p,s));assert.throws(()=>step(p,s,review(p,s,'proposal-a',{decision:'reject',approvedText:null})));
});
test('rollback restores baseline by appending a new version and retains old revisions',()=>{
  const p=page();let s=initialState(p);s=step(p,s,review(p,s));s=step(p,s,apply(p,s));const corrected=s.textRevision;s=step(p,s,rollback(p,s));assert.equal(s.text,raw);assert.equal(s.versions[corrected].text,'合成甲O₂ Heme 乙');assert.notEqual(s.textRevision,p.fingerprint);
});
test('rollback may restore an earlier approved derived version',()=>{
  const p=page();let s=initialState(p);s=step(p,s,review(p,s));s=step(p,s,apply(p,s));const corrected=s.textRevision;s=step(p,s,rollback(p,s));s=step(p,s,rollback(p,s,corrected));assert.equal(s.text,'合成甲O₂ Heme 乙');
});
test('unknown rollback targets and superseded approvals are blocked',()=>{
  const p=page();let s=initialState(p);assert.throws(()=>step(p,s,rollback(p,s,'0'.repeat(64))));s=step(p,s,review(p,s));s=step(p,s,apply(p,s));const old=s.textRevision;s=step(p,s,rollback(p,s));s=step(p,s,review(p,s,'proposal-a',{decision:'reject',approvedText:null}));assert.throws(()=>step(p,s,rollback(p,s,old)));
});
test('tampered event hashes or recomputed unauthorized results are rejected',()=>{
  const p=page(),s=initialState(p),e=createEvent(p,s,review(p,s));assert.throws(()=>advanceState(p,s,{...e,eventHash:'0'.repeat(64)}));const {eventHash,...body}=e;body.result.approvedText='tampered';assert.throws(()=>advanceState(p,s,{...body,eventHash:fingerprint(body)}));
});
test('missing/reordered event chain links are rejected',()=>{
  const p=page(),s=initialState(p),e=createEvent(p,s,review(p,s)),{eventHash,...body}=e;body.sequence=2;assert.throws(()=>advanceState(p,s,{...body,eventHash:fingerprint(body)}));
});
test('filesystem store resumes, deduplicates imports and preserves append-only records',()=>{
  const root=temp(),store=openReviewStore(root,{create:true}),a=store.importPage(input()),file=path.join(root,'pages',a.pageFingerprint+'.json'),before=fs.readFileSync(file);
  assert.equal(store.importPage(input()).created,false);let current=store.readState(a.pageFingerprint);const r=store.dispatch(a.pageFingerprint,review(current.page,current.state));
  const eventFile=path.join(root,'events',a.pageFingerprint,'000000001.json'),bytes=fs.readFileSync(eventFile);
  const reopened=openReviewStore(root);current=reopened.readState(a.pageFingerprint);assert.equal(current.state.head,r.eventHash);reopened.dispatch(a.pageFingerprint,apply(current.page,current.state));
  assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readFileSync(eventFile),bytes);assert.equal(reopened.readState(a.pageFingerprint).state.sequence,2);
});
test('filesystem stale client cannot overwrite an existing review',()=>{
  const store=openReviewStore(temp(),{create:true}),id=store.importPage(input()).pageFingerprint,{page:p,state:s}=store.readState(id),cmd=review(p,s);store.dispatch(id,cmd);assert.throws(()=>store.dispatch(id,cmd));assert.equal(store.readState(id).state.sequence,1);
});
test('malformed or missing event files stop replay instead of being ignored',()=>{
  const store=openReviewStore(temp(),{create:true}),id=store.importPage(input()).pageFingerprint,{page:p,state:s}=store.readState(id);store.dispatch(id,review(p,s));
  fs.writeFileSync(path.join(store.root,'events',id,'000000001.json'),'{synthetic corruption');assert.throws(()=>store.readState(id));
});
test('bounded synthetic batches retain per-page failures and can resume imports',()=>{
  const store=openReviewStore(temp(),{create:true}),inputs=[input(),input({pageId:'synthetic-b'}),input({rawSha256:'0'.repeat(64)})];
  const result=store.importBatch(inputs,{limit:3});assert.equal(result.processed,3);assert.equal(result.failures,1);assert(fs.existsSync(result.receipt));assert.equal(store.list().length,2);
  const again=store.importBatch(inputs.slice(0,2));assert(again.results.every(r=>r.created===false));
});
test('batch bounds do not consume the next generator page',()=>{
  const store=openReviewStore(temp(),{create:true});function* generator(){yield input();yield input({pageId:'synthetic-b'});}const it=generator();store.importBatch(it,{limit:1});assert.equal(it.next().value.pageId,'synthetic-b');assert.throws(()=>store.importBatch([],{limit:51}));
});
test('unknown store roots, path traversal and altered page snapshots fail closed',()=>{
  const root=temp(),store=openReviewStore(root,{create:true}),id=store.importPage(input()).pageFingerprint;assert.throws(()=>store.readState('../outside'));
  const file=path.join(root,'pages',id+'.json'),value=JSON.parse(fs.readFileSync(file,'utf8'));value.body.raw='synthetic tamper';fs.writeFileSync(file,JSON.stringify(value));assert.throws(()=>store.readState(id));
  assert.throws(()=>openReviewStore(path.dirname(root)));
});
test('real-source references are required; existing local source drift is blocked',()=>{
  assert.throws(()=>createReviewPage(input({dataKind:'textbook'})));
  const store=openReviewStore(temp(),{create:true}),refs=['image','raw','tsv','evidence'].map(role=>({role,kind:'project-file',path:'scripts/lib/ocr-quality-io.mjs',sha256:'0'.repeat(64)}));
  assert.throws(()=>store.importPage(input({dataKind:'textbook',sourceRefs:refs})));assert.equal(store.list().length,0);
});
test('unlocated proposal can be queued but cannot receive acceptance',()=>{
  const x=proposal('proposal-a','甲','甲');x.canonicalProposal.span=null;const p=createReviewPage(input({proposals:[x]}));assert.throws(()=>step(p,initialState(p),review(p,initialState(p))));
});
test('disk rollback survives reopen and does not overwrite earlier text revisions',()=>{
  const root=temp(),store=openReviewStore(root,{create:true}),id=store.importPage(input()).pageFingerprint;
  let {page:p,state:s}=store.readState(id);store.dispatch(id,review(p,s));s=store.readState(id).state;const corrected=store.dispatch(id,apply(p,s)).textRevision;
  s=store.readState(id).state;store.dispatch(id,rollback(p,s));const restored=openReviewStore(root).readState(id).state;
  assert.equal(restored.text,raw);assert.equal(restored.versions[corrected].text,'合成甲O₂ Heme 乙');assert.equal(restored.sequence,3);
  assert.equal(fs.readdirSync(path.join(root,'events',id)).length,3);
});
test('missing source event slot is detected without discarding any file',()=>{
  const store=openReviewStore(temp(),{create:true}),id=store.importPage(input()).pageFingerprint,{page:p,state:s}=store.readState(id);
  const dir=path.join(store.root,'events',id);fs.mkdirSync(dir,{recursive:true});const second=path.join(dir,'000000002.json');fs.writeFileSync(second,JSON.stringify(createEvent(p,s,review(p,s))));
  assert.throws(()=>store.readState(id));assert(fs.existsSync(second));
});
