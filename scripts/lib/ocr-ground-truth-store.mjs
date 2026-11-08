// Append-only human annotations. OCR/AI text is never imported as a reference.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {sha,writeNew} from './ocr-quality-io.mjs';
import {stableStringify,annotationDigest,validateSample,evaluate} from '../ocr-benchmark/core.mjs';
import {editDistance} from './ocr-quality-metrics.mjs';
import {validateCandidateAction,candidatesFor} from './ocr-ground-truth-candidates.mjs';
import {tableProposal} from './ocr-review-assistance.mjs';
import {textEdits} from './ocr-ai-source-evidence.mjs';
export const GT_STATUSES=['draft','pending_human_review','verified','rejected'];
const digest=x=>sha(Buffer.from(stableStringify(x)));
const recordDigest=r=>{const {annotation_digest,...body}=r;return digest(body);};
const absent=reason=>({status:'NOT_EVALUATED',value:null,reason});
export function wordRate(reference,hypothesis){
 const seg=new Intl.Segmenter('zh-Hant',{granularity:'word'});
 const tokenize=s=>[...seg.segment(s.normalize('NFC'))].filter(x=>x.isWordLike).map(x=>x.segment);
 const a=tokenize(reference),b=tokenize(hypothesis),errors=editDistance(a,b);
 return {status:a.length?'EVALUATED':'NOT_EVALUATED',value:a.length?errors/a.length:null,errors,reference_units:a.length,
  tokenizer:'Intl.Segmenter zh-Hant word; isWordLike; NFC; case preserved; mixed Chinese/Latin/numbers',icu_version:process.versions.icu};
}
export function openGroundTruthStore(root,cases,verifySources,{profile='two-region',readOnly=false}={}){
 assert(['two-region','existing15-pages','scan200-differences'].includes(profile),'Unknown source profile');
 assert(!readOnly||profile==='existing15-pages','Read-only subset is restricted to historical page sources');
 root=path.resolve(root);assert((readOnly?cases.length>=1&&cases.length<=15:cases.length===(profile==='two-region'?2:profile==='existing15-pages'?15:1))&&new Set(cases.map(c=>c.id)).size===cases.length);
 if(profile==='existing15-pages'){
  assert(cases.every(c=>/^scan-\d{4}-full-page$/.test(c.id)&&c.sample.region_type==='page'&&c.sample.region_id===c.id),'Page profile requires full-page sources');
  assert.equal(new Set(cases.map(c=>c.sample.page_id)).size,cases.length,'Duplicate page identity');
  for(const c of cases)assert.deepEqual(c.sample.bounding_box,[0,0,c.sample.image_width,c.sample.image_height],'Page scope must cover the original image');
 }
 if(profile==='scan200-differences'){assert(cases.length===1&&cases[0].id==='scan-0200-full-page'&&cases[0].sample.scan_seq===200&&cases[0].sample.region_type==='page');assert.deepEqual(cases[0].sample.bounding_box,[0,0,cases[0].sample.image_width,cases[0].sample.image_height]);}
 assert(cases.every(c=>['real','synthetic_test_only'].includes(c.kind))&&new Set(cases.map(c=>c.kind)).size===1);
 const marker={format:'studysignal-ground-truth-v1',data_kind:cases[0].kind,...(profile!=='two-region'?{source_profile:profile}:{})};
 const sourceOcr=c=>c.engines.map(e=>({engine_id:e.id,version:e.version,config:e.config,raw_ref:e.raw_ref??null,result_ref:e.result_ref??null,layout_ref:e.layout_ref??null}));
 const checkDir=d=>{const s=fs.lstatSync(d);assert(s.isDirectory()&&!s.isSymbolicLink(),'Unsafe directory');};
 const checkRoot=()=>{if(fs.existsSync(root)){checkDir(root);assert(!fs.lstatSync(path.join(root,'store.json')).isSymbolicLink());assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'store.json'),'utf8')),marker);}};
 checkRoot();
 const selected=id=>{verifySources();const c=cases.find(c=>c.id===id);assert(c,'Unknown region');return c;};
 function sampleFrom(c,r){
  const s={...structuredClone(c.sample),reference_text:r.ground_truth_text,reference_structure:r.ground_truth_structure,
   annotation_status:r.review_status==='verified'?'human_confirmed':'pending_human_review',reviewer:r.review_status==='verified'?r.reviewer_id:null,
   reviewed_at:r.reviewed_at,annotation_version:String(r.revision),reference_origin:r.review_status==='verified'?'human_checked_against_image':null,approval:null};
  if(r.review_status==='verified')s.approval={reviewer_type:'human',confirmed:true,annotation_sha256:annotationDigest(s)};
  validateSample(s);return s;
 }
 function validate(r,c,previous,index){
  assert([marker.format,'studysignal-ground-truth-v1+ocr-candidates','studysignal-ground-truth-v2-ui-assistance'].includes(r.format)&&r.data_kind===c.kind&&r.revision===index);
  assert.equal(r.previous_revision,previous?.revision??null);assert.equal(r.previous_digest,previous?.annotation_digest??null);
  assert.equal(r.annotation_digest,recordDigest(r),'Broken annotation digest');
  assert.equal(r.source_fingerprint,c.fingerprint);assert.equal(r.source_image_sha256,c.sample.image_sha256,'Source SHA mismatch');
  assert.equal(r.quality_gate_sha256,c.quality_sha256);assert.equal(r.is_ground_truth,r.review_status==='verified'&&c.kind==='real');
  assert.equal(r.source_image_id,c.sample.image_path);assert.equal(r.page_id,c.sample.page_id);assert.equal(r.region_id,c.id);assert.deepEqual(r.crop_coordinates,c.sample.bounding_box);
  if(profile!=='two-region')assert.deepEqual(r.source_ocr,sourceOcr(c),'Original OCR source/version mismatch');
  if(profile==='scan200-differences')assert.deepEqual(r.baseline_review_ref,c.baseline_draft?.record_ref??null,'Baseline review source changed');
  if(r.candidate_actions!==undefined){
   assert(['studysignal-ground-truth-v1+ocr-candidates','studysignal-ground-truth-v2-ui-assistance'].includes(r.format),'Candidate history requires a capable writer');
   assert(Array.isArray(r.candidate_actions)&&new Set(r.candidate_actions.map(a=>a.event_id)).size===r.candidate_actions.length);
   const prior=previous?.candidate_actions??[];assert.deepEqual(r.candidate_actions.slice(0,prior.length),prior,'Candidate history was overwritten');
   for(const a of r.candidate_actions){validateCandidateAction(a,c);assert(Number.isFinite(Date.parse(a.recorded_at)));}
   if(r.candidate_actions.length>prior.length)assert.equal(r.review_status,'draft','Candidate acceptance must first be saved as draft');
   assert.deepEqual(r.working_text_diff,textEdits(previous?.ground_truth_text??'',r.ground_truth_text));
  }else assert(!previous?.candidate_actions,'Candidate provenance cannot disappear');
  assert(GT_STATUSES.includes(r.review_status));assert(typeof r.ground_truth_text==='string'&&r.ground_truth_text.length<=20000);
  assert(typeof r.notes==='string'&&r.notes.length<=10000);assert(Array.isArray(r.uncertainties)&&r.uncertainties.every(x=>typeof x==='string'&&x.length<=1000));
  if(r.review_status==='rejected')assert(r.notes.trim(),'Rejection reason required');
  if(r.ground_truth_structure!==null){assert(typeof r.ground_truth_structure==='object'&&!Array.isArray(r.ground_truth_structure));assert(Object.keys(r.ground_truth_structure).every(k=>['critical_fields','content_units','reading_order','questions','tables','captions'].includes(k)),'Unknown structure field');}
  for(const table of r.ground_truth_structure?.tables??[]){
   if(table.proposal_origin){
    const origin=table.proposal_origin,candidate=candidatesFor(c).find(x=>x.source.engine_id===origin.engine_id);
    assert(origin.algorithm==='ocr-box-grid-v1'&&candidate&&candidate.candidate_sha256===origin.candidate_sha256&&origin.source_fingerprint===c.fingerprint,'Stale table proposal source');
    const expected=tableProposal(c,c.engines.find(e=>e.id===origin.engine_id),candidate.candidate_sha256);assert(expected&&expected.proposal_origin.proposal_id===origin.proposal_id,'Unknown table proposal');
    const prior=previous?.ground_truth_structure?.tables?.find(t=>t.proposal_origin?.proposal_id===origin.proposal_id);
    if(!prior){assert.equal(r.review_status,'draft','Table proposals must first be saved as draft');assert(!previous?.ground_truth_structure?.tables?.length,'Table proposal cannot overwrite a saved human table');}
    assert.equal(r.format,'studysignal-ground-truth-v2-ui-assistance');
   }
   assert(table.cells.every(c=>c.uncertain===undefined||typeof c.uncertain==='boolean'),'Cell uncertainty must be boolean');
   if(table.row_count!==undefined||table.column_count!==undefined){
    assert(Number.isInteger(table.row_count)&&table.row_count>=1&&table.row_count<=100&&Number.isInteger(table.column_count)&&table.column_count>=1&&table.column_count<=50,'Invalid grid dimensions');
    assert.equal(table.source_scope,'roi','Grid scope must remain the original ROI');
    assert(table.cells.every(c=>c.row>=0&&c.column>=0&&c.row+c.row_span<=table.row_count&&c.column+c.column_span<=table.column_count),'Cell outside grid');
    assert.equal(table.cells.reduce((n,c)=>n+c.row_span*c.column_span,0),table.row_count*table.column_count,'Incomplete grid');
    if(r.review_status==='verified'){
     assert(table.cells.every(c=>c.uncertain===false),'Every grid cell requires explicit confirmation');
     assert(r.checks?.table_roi_checked===true,'Confirm table stays within original ROI');
     if(c.sample.region_type==='table'&&r.ground_truth_structure.tables.length===1){
      const compact=s=>s.normalize('NFC').replace(/\s/gu,'');
      const cellText=[...table.cells].sort((a,b)=>a.row-b.row||a.column-b.column).map(c=>c.text).join('');
      assert.equal(compact(r.ground_truth_text),compact(cellText),'Confirmed table and text disagree');
     }
    }
   }
   if(r.review_status==='verified')assert(table.cells.every(c=>c.uncertain!==true),'Uncertain table cell cannot be verified');
  }
  const audit=r.risk_audit;assert(audit&&Array.isArray(audit.labels)&&Array.isArray(audit.misses)&&typeof audit.scope_complete==='boolean');
  if(r.review_metrics){const m=r.review_metrics;
   assert.equal(r.format,'studysignal-ground-truth-v2-ui-assistance');assert.equal(m.region_id,c.id);assert(m.mode===(c.kind==='real'?'human_ui_self_reported':'synthetic_ui'));
   assert(typeof m.session_id==='string'&&m.session_id.length<=100&&Number.isFinite(Date.parse(m.started_at)));
   assert(Number.isFinite(m.active_ms)&&m.active_ms>=0&&m.active_ms<=604800000);assert(m.action_counts&&Object.values(m.action_counts).every(v=>Number.isSafeInteger(v)&&v>=0&&v<=10000000));
  }
  const ids=new Set(c.quality.issues.map(i=>i.issue_id));assert(new Set(audit.labels.map(x=>x.issue_id)).size===audit.labels.length);
  for(const x of audit.labels)assert(ids.has(x.issue_id)&&['confirmed_problem','false_alarm','uncertain'].includes(x.decision));
  for(const x of audit.misses)assert(typeof x.id==='string'&&typeof x.notes==='string'&&x.notes.trim()&&Array.isArray(x.bbox)&&x.bbox.length===4&&x.bbox.every(Number.isFinite)&&x.bbox[2]>0&&x.bbox[3]>0&&x.bbox[0]>=c.sample.bounding_box[0]&&x.bbox[1]>=c.sample.bounding_box[1]&&x.bbox[0]+x.bbox[2]<=c.sample.bounding_box[0]+c.sample.bounding_box[2]&&x.bbox[1]+x.bbox[3]<=c.sample.bounding_box[1]+c.sample.bounding_box[3]);
  if(audit.scope_complete)assert(audit.labels.length===ids.size&&audit.labels.every(x=>x.decision!=='uncertain'),'Incomplete risk audit');
  if(profile==='scan200-differences'&&r.review_status!=='draft'){
   assert(previous,'Save draft before changing review status');
   assert.equal(r.ground_truth_text,previous.ground_truth_text,'Modified text must first be saved as draft');
   assert.deepEqual(r.ground_truth_structure,previous.ground_truth_structure,'Modified structure must first be saved as draft');
  }
  if(r.review_status==='verified'){
   if(profile==='scan200-differences'){assert(previous&&['draft','pending_human_review'].includes(previous.review_status),'Save draft before human verification');assert.equal(r.ground_truth_text,previous.ground_truth_text,'Modified text must first be saved as draft');assert.deepEqual(r.ground_truth_structure,previous.ground_truth_structure,'Modified structure must first be saved as draft');}
   assert(r.reviewer_id?.trim()&&Number.isFinite(Date.parse(r.reviewed_at))&&r.ground_truth_text.trim(),'Explicit human identity/time/text required');
   assert(r.uncertainties.length===0,'Unresolved text/scientific symbols cannot be verified');
   assert(r.checks?.image_compared===true&&r.checks?.text_complete===true&&r.checks?.science_checked===true,'Human image/text/science confirmation required');
   if(r.ground_truth_structure!==null)assert(r.checks.structure_compared===true,'Structure needs separate image confirmation');
  }else assert(r.reviewed_at===null&&r.checks===null);
  sampleFrom(c,r);return r;
 }
 function history(id){
  const c=selected(id);checkRoot();const dir=path.join(root,id);if(!fs.existsSync(dir))return [];
  checkDir(dir);const files=fs.readdirSync(dir).sort();assert(files.every(f=>/^\d{9}\.json$/.test(f)),'Unexpected review file');
  const records=[];for(const [i,file]of files.entries()){
   assert.equal(file,String(i+1).padStart(9,'0')+'.json');const p=path.join(dir,file);assert(!fs.lstatSync(p).isSymbolicLink());
   records.push(validate(JSON.parse(fs.readFileSync(p,'utf8')),c,records.at(-1),i+1));
  }return records;
 }
 const latest=id=>history(id).at(-1)??null;
 function save(id,body){
  assert(!readOnly,'Historical page subset is read-only');
  const c=selected(id),records=history(id),previous=records.at(-1);
  const allowed=['source_fingerprint','source_image_sha256','expected_revision','request_id','review_status','ground_truth_text','ground_truth_structure','reviewer_id','notes','uncertainties','checks','risk_audit','candidate_actions','review_metrics'];
  assert(body&&Object.keys(body).every(k=>allowed.includes(k)),'Unknown submitted field');
  assert(/^[a-zA-Z0-9-]{8,80}$/.test(body.request_id),'Request ID required');
  const submission_digest=digest(body),replayed=records.find(r=>r.request_id===body.request_id);
  if(replayed){assert.equal(replayed.submission_digest,submission_digest,'Request ID reused with changed content');return replayed;}
  assert.equal(body.source_fingerprint,c.fingerprint,'Source fingerprint changed');assert.equal(body.source_image_sha256,c.sample.image_sha256,'Source SHA mismatch');
  assert.equal(body.expected_revision,previous?.revision??0,'Stale revision; reload before saving');
  assert(typeof body.reviewer_id==='string'&&body.reviewer_id.length<=256);assert(Object.hasOwn(body,'ground_truth_structure'));
  const verified=body.review_status==='verified',now=new Date().toISOString();
  const r={format:marker.format,data_kind:c.kind,source_image_id:c.sample.image_path,source_image_sha256:c.sample.image_sha256,
   source_fingerprint:c.fingerprint,page_id:c.sample.page_id,region_id:id,crop_coordinates:c.sample.bounding_box,
   ground_truth_text:body.ground_truth_text,ground_truth_structure:body.ground_truth_structure,reviewer_id:body.reviewer_id.trim(),
   review_status:body.review_status,reviewed_at:verified?now:null,saved_at:now,revision:(previous?.revision??0)+1,
   previous_revision:previous?.revision??null,previous_digest:previous?.annotation_digest??null,notes:body.notes,
   uncertainties:body.uncertainties,checks:verified?body.checks:null,risk_audit:body.risk_audit,
   quality_gate_sha256:c.quality_sha256,request_id:body.request_id,submission_digest,
   verification_scope:body.ground_truth_structure===null?'text_only':'text_and_declared_structure',
   is_ground_truth:verified&&c.kind==='real'};
  if(profile!=='two-region')r.source_ocr=sourceOcr(c);
  if(profile==='scan200-differences')r.baseline_review_ref=c.baseline_draft?.record_ref??null;
  if(body.candidate_actions!==undefined||previous?.candidate_actions){
   // Older writers fail closed on this record format instead of dropping provenance.
   // Existing marker and old records stay byte-identical; this reader accepts both.
   r.format='studysignal-ground-truth-v1+ocr-candidates';
   const incoming=body.candidate_actions??[];assert(Array.isArray(incoming)&&incoming.length<=100,'Too many candidate actions');
   for(const a of incoming){assert(!Object.hasOwn(a,'recorded_at'),'Candidate timestamps are server assigned');validateCandidateAction(a,c);}
   if(incoming.some(a=>a.application==='seed_empty'))assert(!(previous?.ground_truth_text?.length),'Candidate cannot overwrite a saved human draft');
   r.candidate_actions=[...(previous?.candidate_actions??[]),...incoming.map(a=>({...a,recorded_at:now}))];
   r.working_text_diff=textEdits(previous?.ground_truth_text??'',r.ground_truth_text);
  }
  if(body.review_metrics!==undefined)r.review_metrics=body.review_metrics;
  else if(previous?.review_metrics)r.review_metrics=previous.review_metrics;
  if(r.review_metrics||r.ground_truth_structure?.tables?.some(t=>t.proposal_origin))r.format='studysignal-ground-truth-v2-ui-assistance';
  r.annotation_digest=recordDigest(r);validate(r,c,previous,r.revision);verifySources();
  if(!fs.existsSync(root)){fs.mkdirSync(root,{recursive:true});writeNew(path.join(root,'store.json'),marker);}checkRoot();
  const dir=path.join(root,id);if(!fs.existsSync(dir))fs.mkdirSync(dir);
  writeNew(path.join(dir,String(r.revision).padStart(9,'0')+'.json'),r);return r;
 }
 function benchmark(id){
  const c=selected(id),r=latest(id),empty={review_status:r?.review_status??'pending_human_review',sample_status:'樣本不足',CER:null,WER:null,
   gate_audit:absent('Verified text plus separately confirmed risk audit required'),results:[],ground_truth:null};
  if(r?.review_status!=='verified')return empty;
  const sample=sampleFrom(c,r);
  const results=c.engines.map(e=>{
   const model={result_id:c.id+'-'+e.id,sample_id:sample.sample_id,image_sha256:sample.image_sha256,
    model_family:e.id==='tesseract'?'tesseract.js':'paddleocr',model_id:e.id,model_version:typeof e.version==='string'?e.version:e.version.paddleocr,
    model_config:e.config,execution_time:null,execution_time_unit:'ms',estimated_cost:0,actual_cost:0,currency:'USD',
    OCR_output:{text:e.text,structure:null,structure_alignment:null},benchmark_result:null};
   const evaluation=evaluate(sample,model);model.benchmark_result=evaluation;
   return {engine_id:e.id,CER:evaluation.metrics.cer,WER:wordRate(r.ground_truth_text,e.text),benchmark:evaluation,model,
    table_structure:absent('Human structure may be saved; model cell IDs/structure are not aligned'),
    scientific_text_exact:c.sample.region_type==='formula'?{status:'EVALUATED',value:r.ground_truth_text.normalize('NFC').replace(/\s/gu,'')===e.text.normalize('NFC').replace(/\s/gu,''),scope:'strict whole-formula text; no image typography reconstruction'}:absent('No aligned scientific critical-field hypothesis')};
  });
  let gate=absent('Risk audit not independently confirmed');
  if(r.checks.risk_audit_confirmed===true){
   const a=r.risk_audit,tp=a.labels.filter(x=>x.decision==='confirmed_problem').length,fp=a.labels.filter(x=>x.decision==='false_alarm').length,fn=a.misses.length;
   gate={status:'HUMAN_REVIEWED_SUBSET',true_positives:tp,false_alarms:fp,misses_recorded:fn,
    precision:tp+fp?tp/(tp+fp):null,false_discovery_fraction:tp+fp?fp/(tp+fp):null,
    recall:a.scope_complete&&tp+fn?tp/(tp+fn):null,false_negative_rate:a.scope_complete&&tp+fn?fn/(tp+fn):null,
    false_positive_rate:null,reason:'No true-negative denominator; overlapping risk events are not independent errors',scope_complete:a.scope_complete};
  }
  return {...empty,review_status:'verified',results,gate_audit:gate,ground_truth:{sample,record:r,is_ground_truth:r.is_ground_truth},
   sample_status:'樣本不足：僅此區域，不能推論平台或全書品質',CER:results.map(x=>x.CER),WER:results.map(x=>x.WER)};
 }
 return {root,selected,latest,history,save,benchmark};
}
