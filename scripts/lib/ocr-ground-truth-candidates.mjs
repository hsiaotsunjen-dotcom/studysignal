// Existing OCR hypotheses only. No inference, source writes or approval.
import assert from 'node:assert/strict';
import {sha} from './ocr-quality-io.mjs';
import {stableStringify} from '../ocr-benchmark/core.mjs';
import {textEdits} from './ocr-ai-source-evidence.mjs';
import {tableProposal,riskHints} from './ocr-review-assistance.mjs';
const digest=x=>sha(Buffer.from(stableStringify(x)));
export function candidatesFor(c){
 return c.engines.map(e=>{
  assert(typeof e.text==='string');
  const text_sha256=sha(Buffer.from(e.text));
  if(c.kind==='real')assert(e.raw_ref?.sha256===text_sha256,'Candidate OCR text SHA mismatch');
  const source={fingerprint:c.fingerprint,image_sha256:c.sample.image_sha256,page_id:c.sample.page_id,
   region_id:c.id,roi:c.sample.bounding_box,engine_id:e.id,engine_version:e.version,engine_config:e.config,
   raw_ref:e.raw_ref??null,result_ref:e.result_ref??null};
  const candidate_sha256=digest({source,text_sha256});
  return {candidate_id:e.id+'-'+candidate_sha256.slice(0,16),candidate_sha256,text_sha256,text:e.text,source,
   status:'candidate_not_verified',generation_kind:'existing_ocr',is_ground_truth:false};
 });
}
export function candidatePanel(c){const candidates=candidatesFor(c);return {candidates,
 difference:candidates.length===2?textEdits(candidates[0].text,candidates[1].text):null,
 table_proposals:candidates.map((x,i)=>tableProposal(c,c.engines[i],x.candidate_sha256)).filter(Boolean),risk_hints:riskHints(c),
 agreement_is_correctness:false,automatic_ground_truth:false};}
export function validateCandidateAction(action,c){
 const allowed=['event_id','candidate_id','candidate_sha256','source_fingerprint','decision','selected_text','application','insertion_offset','recorded_at','difference_group_id','difference_snapshot_sha256','difference_choice'];
 assert(action&&Object.keys(action).every(k=>allowed.includes(k)),'Unknown candidate action field');
 assert(/^[a-zA-Z0-9-]{8,80}$/.test(action.event_id),'Candidate event ID required');
 const candidate=candidatesFor(c).find(x=>x.candidate_id===action.candidate_id);assert(candidate,'Unknown or stale candidate');
 assert.equal(action.candidate_sha256,candidate.candidate_sha256,'Candidate digest mismatch');assert.equal(action.source_fingerprint,c.fingerprint,'Candidate source mismatch');
 assert(['accept','edit_accept','reject'].includes(action.decision));assert(['seed_empty','insert','none'].includes(action.application));
 assert(typeof action.selected_text==='string'&&action.selected_text.length<=20000);
 if(['difference_group_id','difference_snapshot_sha256','difference_choice'].some(k=>Object.hasOwn(action,k))){
  const d=c.difference_review;assert(d&&action.difference_snapshot_sha256===d.snapshot_sha256,'Difference snapshot mismatch');const group=d.groups.find(g=>g.id===action.difference_group_id);assert(group,'Unknown difference group');assert(['tesseract','paddle','manual','reject'].includes(action.difference_choice));
  if(action.difference_choice==='reject')assert.equal(action.decision,'reject');
  else if(action.difference_choice!=='manual'){const side=group.left.engine===action.difference_choice?group.left:group.right;assert.equal(side.engine,action.difference_choice);assert.equal(candidate.source.engine_id,action.difference_choice);assert(side.text.length>0,'Unmatched empty side cannot supply text');assert.equal(action.selected_text,side.text,'Claimed engine fragment differs');}
 }
 if(action.decision==='reject')assert(action.selected_text===''&&action.application==='none'&&action.insertion_offset===null,'Rejected candidate cannot be applied');
 else{
  assert(['seed_empty','insert'].includes(action.application));
  assert(Number.isInteger(action.insertion_offset)&&action.insertion_offset>=0&&action.insertion_offset<=20000);
  if(action.application==='seed_empty')assert.equal(action.insertion_offset,0);
  if(action.decision==='accept')assert.equal(action.selected_text,candidate.text,'Changed candidate must use edit_accept');
  else assert.notEqual(action.selected_text,candidate.text,'Unchanged candidate must use accept');
 }
 if(action.recorded_at!==undefined)assert(Number.isFinite(Date.parse(action.recorded_at)));
 return true;
}
