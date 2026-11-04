// Append-only human review state machine. No OCR, API, filesystem or DB writes.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {locateExact} from './ocr-ai-proposal-audit.mjs';
export const labels={auto_confirmable:'可自動確認',human_review:'需要人工審核',insufficient_evidence:'來源證據不足',potential_error:'疑似辨識錯誤'};
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export const textHash=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
export const fingerprint=v=>textHash(JSON.stringify(sort(v)));
const same=(a,b)=>fingerprint(a)===fingerprint(b);
const id=s=>typeof s==='string'&&s.trim().length>0&&s.length<=256;
export function createReviewPage(input){
  assert(input&&['textbook','synthetic'].includes(input.dataKind),'Explicit dataKind required');
  assert(id(input.subject)&&id(input.sourceId)&&id(input.pageId),'Page identity required');
  assert(Number.isSafeInteger(input.scanSeq)&&input.scanSeq>0,'Invalid scan sequence');
  assert(typeof input.raw==='string'&&hex(input.imageSha256)&&textHash(input.raw)===input.rawSha256,'Source hashes required');
  assert(Array.isArray(input.sourceRefs)&&Array.isArray(input.proposals),'Source references and proposals required');
  if(input.dataKind==='textbook')for(const role of ['image','raw','tsv','evidence'])assert(input.sourceRefs.some(r=>r.role===role),'Missing source role: '+role);
  const seen=new Set();
  const proposals=input.proposals.map(p=>{
    assert(typeof p.id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(p.id)&&!['constructor','prototype','__proto__'].includes(p.id)&&!seen.has(p.id),'Duplicate or invalid proposal ID');seen.add(p.id);
    assert(Object.hasOwn(labels,p.classification),'Unknown classification');
    const c=p.canonicalProposal;
    if(c){assert(typeof c.before==='string'&&typeof c.after==='string','Invalid proposal text');
      if(c.span){const exact=locateExact(input.raw,c.before);assert(exact.span&&same(exact.span,c.span),'Proposal does not match unique source anchor');}}
    return {...p,proposalFingerprint:fingerprint({sourceId:input.sourceId,pageId:input.pageId,imageSha256:input.imageSha256,rawSha256:input.rawSha256,proposal:p}),status:'pending_human_review',autoApplyAllowed:false,semanticVerified:false};
  });
  const body=JSON.parse(JSON.stringify({...input,proposals,schemaVersion:1,kind:'ocr-ai-review-page-v22',isGroundTruth:false}));
  return {fingerprint:fingerprint(body),body};
}
export function initialState(page){
  assert(fingerprint(page.body)===page.fingerprint,'Page snapshot integrity failure');
  return {head:null,sequence:0,reviewEventCount:0,reviews:{},text:page.body.raw,textRevision:page.fingerprint,patches:[],versions:{[page.fingerprint]:{text:page.body.raw,patches:[]}}};
}
const fields={review:['action','pageFingerprint','proposalFingerprint','expectedHead','proposalId','reviewerType','reviewerId','humanConfirmed','decision','approvedText','checks','notes'],apply:['action','pageFingerprint','proposalFingerprint','expectedHead','proposalId','actorId'],rollback:['action','pageFingerprint','expectedHead','targetRevision','actorId','reason']};
export function previewCommand(page,state,command){
  assert(command&&Object.hasOwn(fields,command.action),'Unknown action');
  assert(Object.keys(command).every(k=>fields[command.action].includes(k)),'Unknown command fields');
  assert.equal(command.pageFingerprint,page.fingerprint,'Command belongs to another page/source version');
  assert(Object.hasOwn(command,'expectedHead')&&command.expectedHead===state.head,'Stale review state; reload before saving');
  const data=page.body;
  if(command.action==='rollback'){
    assert(id(command.actorId)&&id(command.reason),'Rollback actor and reason required');
    assert(Object.hasOwn(state.versions,command.targetRevision),'Unknown text revision');
    const target=state.versions[command.targetRevision];
    for(const p of target.patches)assert(state.reviews[p.proposalId]?.eventHash===p.reviewEventHash&&state.reviews[p.proposalId]?.decision==='accept','Target revision approval has been superseded');
    return {text:target.text,textSha256:textHash(target.text),patches:target.patches,parentTextRevision:state.textRevision,restoredFrom:command.targetRevision};
  }
  const proposal=data.proposals.find(p=>p.id===command.proposalId);assert(proposal,'Unknown proposal');
  assert.equal(command.proposalFingerprint,proposal.proposalFingerprint,'Proposal version mismatch');
  if(command.action==='review'){
    assert(command.reviewerType==='human'&&id(command.reviewerId)&&command.humanConfirmed===true,'Explicit human attestation required');
    assert(['accept','reject','uncertain'].includes(command.decision),'Invalid review decision');
    assert(typeof command.notes==='string'&&command.notes.length<=10000,'Review notes required');
    assert(!state.patches.some(p=>p.proposalId===proposal.id),'Rollback active correction before changing its review');
    if(command.decision==='accept'){
      const c=proposal.canonicalProposal;assert(c?.span&&locateExact(data.raw,c.before).span,'Cannot approve unresolved source location');
      assert(typeof command.approvedText==='string'&&command.approvedText.length<=20000,'Explicit exact approvedText required');
      assert(command.checks&&['imageCompared','textPosition','scientificNotation','readingOrder'].every(k=>command.checks[k]===true),'All source checks must be explicitly confirmed');
      assert(command.notes.trim(),'Acceptance rationale required');
    }else assert(command.approvedText===null,'Unaccepted review cannot authorize replacement text');
    return {proposalId:proposal.id,proposalFingerprint:proposal.proposalFingerprint,decision:command.decision,
      approvedText:command.decision==='accept'?command.approvedText:null,
      approvedTextSha256:command.decision==='accept'?textHash(command.approvedText):null,
      reviewerType:data.dataKind==='synthetic'?'synthetic_human_simulation':'human',isSimulation:data.dataKind==='synthetic',
      reviewerId:command.reviewerId,checks:command.checks??null,notes:command.notes,isGroundTruth:false,
      attestationMeaning:'self-reported local human action, not independently authenticated identity'};
  }
  assert(id(command.actorId),'Apply actor required');
  const review=state.reviews[proposal.id];
  assert(review?.decision==='accept'&&review.proposalFingerprint===proposal.proposalFingerprint,'No matching current human acceptance');
  assert(review.reviewerType===(data.dataKind==='synthetic'?'synthetic_human_simulation':'human'),'Review scope mismatch');
  assert(textHash(review.approvedText)===review.approvedTextSha256,'Accepted text integrity failure');
  assert(!state.patches.some(p=>p.proposalId===proposal.id),'Correction already active');
  const c=proposal.canonicalProposal;assert(c?.span&&data.raw.slice(c.span.start,c.span.end)===c.before,'Source anchor changed');
  assert(!state.patches.some(p=>c.span.start<p.end&&p.start<c.span.end),'Overlapping approved corrections');
  const patch={proposalId:proposal.id,proposalFingerprint:proposal.proposalFingerprint,start:c.span.start,end:c.span.end,before:c.before,after:review.approvedText,reviewEventHash:review.eventHash};
  const patches=[...state.patches,patch].sort((a,b)=>a.start-b.start);
  let text=data.raw;for(const p of [...patches].reverse())text=text.slice(0,p.start)+p.after+text.slice(p.end);
  return {text,textSha256:textHash(text),patches,parentTextRevision:state.textRevision};
}
export function advanceState(page,state,event){
  const {eventHash,...body}=event;
  assert(hex(eventHash)&&fingerprint(body)===eventHash,'Event hash mismatch');
  assert(body.schemaVersion===1&&body.pageFingerprint===page.fingerprint&&body.sequence===state.sequence+1&&body.previousEventHash===state.head,'Broken event chain');
  assert(typeof body.savedAt==='string'&&!Number.isNaN(Date.parse(body.savedAt)),'Invalid event time');
  const expected=previewCommand(page,state,body.command);assert(same(expected,body.result),'Event result does not match authorized command');
  const next={...state,head:eventHash,sequence:body.sequence,reviews:{...state.reviews},versions:{...state.versions}};
  if(body.command.action==='review'){next.reviews[body.result.proposalId]={...body.result,eventHash};next.reviewEventCount++;}
  else {next.text=body.result.text;next.patches=body.result.patches;next.textRevision=eventHash;next.versions[eventHash]={text:next.text,patches:next.patches};}
  return next;
}
export function createEvent(page,state,command,savedAt=new Date().toISOString()){
  const body={schemaVersion:1,pageFingerprint:page.fingerprint,sequence:state.sequence+1,previousEventHash:state.head,command,result:previewCommand(page,state,command),savedAt};
  const event={...body,eventHash:fingerprint(body)};advanceState(page,state,event);return event;
}
export function reviewQueue(page,state){
  return page.body.proposals.map(p=>{const review=state.reviews[p.id],active=state.patches.some(x=>x.proposalId===p.id);
    return {id:p.id,proposalFingerprint:p.proposalFingerprint,classification:p.classification,label:labels[p.classification],
      reviewState:active?'human_correction_derived':review?.decision==='accept'?'human_accepted_not_applied':review?.decision==='reject'?'human_rejected':'pending_human_review',
      reviewEventHash:review?.eventHash??null,autoApplyAllowed:false,isGroundTruth:false};});
}
