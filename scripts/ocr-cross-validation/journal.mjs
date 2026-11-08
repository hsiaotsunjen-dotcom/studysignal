// Append-only experiment records. No annotation writes or overwrite operations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest,validateRights,usageAllowed,validateRequest} from './core.mjs';
import {writeNew} from '../lib/ocr-quality-io.mjs';
import {validateStoredCandidate} from './providers.mjs';
function secrets(value){
 if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){assert(!/^(?:api[_-]?key|authorization|password|secret|access_token)$/i.test(k),'Credential field rejected');secrets(v);}
 else if(typeof value==='string')assert(!/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value),'Credential value rejected');
}
export function openJournal(root,namespace){
 assert(['budget-simulation','learning-candidates'].includes(namespace),'Unknown journal namespace');root=path.resolve(root);
 function history(){
  if(!fs.existsSync(root))return [];
  assert(!fs.lstatSync(root).isSymbolicLink(),'Journal symlink rejected');
  const names=fs.readdirSync(root).sort();assert(names.every(n=>/^\d{9}\.json$/.test(n)),'Not an isolated journal directory');let previous=null;
  return names.map((n,i)=>{assert.equal(n,String(i+1).padStart(9,'0')+'.json','Journal revision gap');const file=path.join(root,n);assert(!fs.lstatSync(file).isSymbolicLink(),'Record symlink rejected');const r=JSON.parse(fs.readFileSync(file)),{record_digest,...body}=r;assert.equal(r.namespace,namespace);assert.equal(r.revision,i+1);assert.equal(r.previous_digest,previous);assert.equal(digest(body),record_digest,'Journal digest mismatch');previous=record_digest;return r;});
 }
 function append(payload,{expectedRevision,eventId}={}){
  secrets(payload);assert(typeof eventId==='string'&&eventId.trim(),'Event ID required');const rows=history(),old=rows.find(r=>r.event_id===eventId);
  if(old){assert.equal(digest(old.payload),digest(payload),'Event ID reused with changed payload');return old;}
  assert.equal(expectedRevision,rows.length,'Stale journal revision');const record={namespace,revision:rows.length+1,previous_revision:rows.length||null,previous_digest:rows.at(-1)?.record_digest??null,event_id:eventId,saved_at:new Date().toISOString(),payload:structuredClone(payload)};record.record_digest=digest(record);
  // wx is the concurrency fence: a competing writer wins or gets EEXIST, never overwrites.
  writeNew(path.join(root,String(record.revision).padStart(9,'0')+'.json'),record);return record;
 }
 return {history,append};
}
export function saveLearning(journal,record,{eventId,expectedRevision}={}){
 validateRights(record.rights);assert(usageAllowed(record.rights,'save'),'Saving rights unknown or denied');
 validateRights(record.provider_rights);if(record.paid_ocr.length)assert(usageAllowed(record.provider_rights,'save'),'Provider saving rights unknown or denied');
 for(const c of record.paid_ocr)validateStoredCandidate(c,record.source);
 assert(record.training_eligible===false&&record.confidence===null,'Machine records cannot claim training eligibility/confidence');
 assert(record.validation_state!=='verified','Verified annotations belong to existing Ground Truth store, not candidate journal');
 return journal.append(record,{eventId,expectedRevision});
}
export function cachedCandidate(journal,request){
 validateRequest(request);assert(usageAllowed(request.rights,'evaluate')&&usageAllowed(request.provider_rights,'evaluate'),'Cache evaluation rights unresolved');
 for(const r of journal.history().reverse()){
  if(!r.payload.paid_ocr)continue;
  for(const candidate of r.payload.paid_ocr)if(candidate.request_key===request.cache_key){assert.equal(digest(r.payload.source),digest(request.source),'Cached source changed');validateStoredCandidate(candidate,request.source);return structuredClone(candidate);}
 }
 return null;
}
