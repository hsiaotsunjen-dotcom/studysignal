// Offline evaluation only. No inference, corrections, or automatic approvals.
import assert from 'node:assert/strict';
import {editDistance, textHash} from '../lib/ocr-quality-metrics.mjs';

export const VERSION = 'studysignal-ocr-benchmark-v1';
export const SPLITS = ['development', 'validation', 'test'];
export const MODEL_FAMILIES = ['tesseract.js', 'paddleocr', 'paddleocr-vl', 'commercial-vision', 'studysignal-finetuned'];
const digest = /^[a-f0-9]{64}$/;
const text = x => typeof x === 'string' && x.trim().length > 0;
const unique = xs => new Set(xs).size === xs.length;
const absent = reason => ({status:'NOT_EVALUATED', value:null, reason});
const unsupported = reason => ({status:'NOT_IMPLEMENTED', value:null, reason});
const nfc = x => x.normalize('NFC');
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function stableStringify(value) {
  const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
  return JSON.stringify(sort(value));
}

// A digest binds the whole annotation to the image/region/version. It is not
// authentication of a person: reviewer governance remains an external duty.
export function annotationDigest(s) {
  return textHash(stableStringify({sample_id:s.sample_id, source_id:s.source_id,
    material_id:s.material_id, page_id:s.page_id, image_sha256:s.image_sha256,
    region_id:s.region_id, region_type:s.region_type, bounding_box:s.bounding_box,
    polygon:s.polygon, reference_text:s.reference_text, reference_structure:s.reference_structure,
    reviewer:s.reviewer, reviewed_at:s.reviewed_at, annotation_version:s.annotation_version,
    reference_origin:s.reference_origin}));
}
export function hasHumanReference(s) {
  return s.annotation_status === 'human_confirmed' && s.reference_origin === 'human_checked_against_image'
    && text(s.reviewer) && typeof s.reviewed_at === 'string' && Number.isFinite(Date.parse(s.reviewed_at))
    && s.approval?.reviewer_type === 'human' && s.approval?.confirmed === true
    && s.approval?.annotation_sha256 === annotationDigest(s);
}
function validateStructure(st) {
  assert(st && typeof st === 'object' && !Array.isArray(st), 'Structure must be an object');
  for (const key of ['critical_fields','content_units','reading_order','questions','tables','captions']) {
    if (st[key] === undefined) continue;
    const list=st[key]; assert(Array.isArray(list), 'Expected array: '+key);
    assert(unique(list.map(x=>key==='reading_order'?x:x.id)), 'Duplicate structure IDs: '+key);
    if(key==='reading_order'){assert(list.every(text),'Invalid reading order ID');continue;}
    for (const item of list) {
      assert(text(item.id), 'Missing structure ID');
      if (key==='critical_fields') {
        assert(['chemical_formula','number','unit','script','term'].includes(item.type));
        assert(typeof item.value==='string');
      }
      if(key==='content_units') assert(typeof item.text==='string');
      if(key==='captions') assert(text(item.figure_id) && typeof item.text==='string');
      if(key==='questions') {
        assert(typeof item.number==='string' && typeof item.stem==='string');
        assert(Array.isArray(item.options) && unique(item.options.map(o=>o.label)));
        assert(item.options.every(o=>text(o.label)&&typeof o.text==='string'));
      }
      if(key==='tables') {
        assert(Array.isArray(item.cells)); const positions=[];
        for(const cell of item.cells) {
          for(const k of ['row','column','row_span','column_span']) assert(Number.isInteger(cell[k])&&cell[k]>=(k.endsWith('span')?1:0));
          assert(typeof cell.text==='string');
          for(let r=cell.row;r<cell.row+cell.row_span;r++)for(let c=cell.column;c<cell.column+cell.column_span;c++)positions.push(r+':'+c);
        }
        assert(unique(positions),'Overlapping/duplicate table cells');
      }
    }
  }
}
export function validateSample(s) {
  for(const k of ['sample_id','source_id','material_id','page_id','region_id','region_type','annotation_version','source_license_status','image_path']) assert(text(s[k]),'Missing '+k);
  assert(digest.test(s.image_sha256),'Invalid image SHA');
  assert(SPLITS.includes(s.dataset_split),'Unknown split');
  assert(['pending_human_review','human_confirmed','rejected'].includes(s.annotation_status));
  assert(Object.hasOwn(s,'reference_text') && (s.reference_text===null||typeof s.reference_text==='string'));
  assert(Object.hasOwn(s,'reference_structure'));
  assert(Object.hasOwn(s,'reviewer') && Object.hasOwn(s,'reviewed_at'));
  assert(s.reviewer===null||text(s.reviewer));assert(s.reviewed_at===null||text(s.reviewed_at));
  assert(s.coordinate_space==='original_image_pixels','Coordinate space required');
  assert(Number.isInteger(s.image_width)&&s.image_width>0&&Number.isInteger(s.image_height)&&s.image_height>0);
  assert(s.bounding_box!==null || s.polygon!==null,'Geometry required');
  if(s.bounding_box!==null){const b=s.bounding_box;assert(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite));const[x,y,w,h]=b;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=s.image_width&&y+h<=s.image_height,'Out of bounds');}
  if(s.polygon!==null) assert(Array.isArray(s.polygon)&&s.polygon.length>=3&&s.polygon.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<=s.image_width&&p[1]<=s.image_height));
  assert(Array.isArray(s.parent_image_sha256)&&s.parent_image_sha256.every(x=>digest.test(x)));
  assert(Array.isArray(s.derived_from)&&s.derived_from.every(text));
  assert(typeof s.training_consent==='boolean');
  if(s.reference_structure!==null)validateStructure(s.reference_structure);
  if(s.annotation_status==='human_confirmed') {assert(s.reference_text!==null||s.reference_structure!==null,'Empty annotation');assert(hasHumanReference(s),'Human confirmation/digest required');}
  else assert(s.approval===null,'Pending/rejected data cannot carry an approval');
  return s;
}

export function validateDataset(dataset) {
  assert(dataset.schema_version===1 && dataset.benchmark_version===VERSION);
  assert(Array.isArray(dataset.samples)&&dataset.samples.length>0);
  const samples=dataset.samples.map(validateSample), byId=new Map(samples.map(s=>[s.sample_id,s]));
  assert(byId.size===samples.length,'Duplicate sample_id');
  const signatures=new Set();
  const parents=samples.map((_,i)=>i), find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));
  const owners=new Map();
  samples.forEach((s,i)=>{
    const signature=JSON.stringify([s.image_sha256,s.bounding_box,s.polygon]);
    assert(!signatures.has(signature),'Duplicate sample region'); signatures.add(signature);
    const keys=['book:'+s.material_id,'source:'+s.source_id,'page:'+s.page_id,
      ...[s.image_sha256,...s.parent_image_sha256].map(h=>'image:'+h)];
    if(s.leakage_group_id)keys.push('group:'+s.leakage_group_id);
    for(const parent of s.derived_from){assert(byId.has(parent),'Unknown derived_from');keys.push('sample:'+parent);}
    keys.push('sample:'+s.sample_id);
    for(const key of keys){if(owners.has(key))parents[find(i)]=find(owners.get(key));else owners.set(key,i);}
  });
  const groups=new Map();samples.forEach((s,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,new Set());groups.get(k).add(s.dataset_split);});
  assert([...groups.values()].every(g=>g.size===1),'Cross-split source/book/image/derivative leakage');
  // Exact hashes plus declared lineage cannot discover undeclared rotated crops.
  return {status:'PASS',samples:samples.length,groups:groups.size,
    undeclared_visual_derivatives:{status:'NOT_IMPLEMENTED',reason:'Requires visual near-duplicate detection and provenance review'},
    training_eligible:samples.filter(trainingEligible).length};
}
export function trainingEligible(s) {
  return hasHumanReference(s) && s.source_license_status==='training_permitted'
    && s.training_consent===true && s.dataset_split==='development';
}

function distance(reference,hypothesis) {
  const errors=editDistance(reference,hypothesis);
  return {status:reference.length?'EVALUATED':'NOT_EVALUATED',value:reference.length?errors/reference.length:null,
    errors,reference_units:reference.length,hypothesis_units:hypothesis.length,
    reason:reference.length?null:'Empty reference denominator; insertions retained as errors'};
}
const chars=s=>Array.from(nfc(s).replace(/\s/gu,''));
const han=s=>Array.from(nfc(s)).filter(c=>/\p{Script=Han}/u.test(c));
const english=s=>nfc(s).match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[];
export function textMetrics(reference,hypothesis) {
  return {cer:distance(chars(reference),chars(hypothesis)),chinese_cer:distance(han(reference),han(hypothesis)),
    english_wer:distance(english(reference),english(hypothesis)),
    english_wer_case_insensitive:distance(english(reference).map(x=>x.toLowerCase()),english(hypothesis).map(x=>x.toLowerCase()))};
}
function keyed(reference,hypothesis,serialize=x=>JSON.stringify(x)) {
  const r=new Map(reference.map(x=>[x.id,serialize(x)])), h=new Map(hypothesis.map(x=>[x.id,serialize(x)]));
  let missing=0,substitutions=0,insertions=0,correct=0;
  for(const[id,value]of r)if(!h.has(id))missing++;else if(value!==h.get(id))substitutions++;else correct++;
  for(const id of h.keys())if(!r.has(id))insertions++;
  return {status:'EVALUATED',value:r.size?(missing+substitutions+insertions)/r.size:null,
    reference_units:r.size,correct,missing,substitutions,insertions,
    empty_reference:r.size===0};
}
const normalizedOptions=q=>[q.number,nfc(q.stem),[...q.options].sort((a,b)=>a.label.localeCompare(b.label)).map(o=>[o.label,nfc(o.text)])];
const cells=t=>[...t.cells].sort((a,b)=>a.row-b.row||a.column-b.column).map(c=>[c.row,c.column,c.row_span,c.column_span,nfc(c.text)]);
function orderMetric(r,h) {
  const actual=new Map(h.map((x,i)=>[x,i])), known=new Set(r);let correct=0,wrong=0,missing=0;
  for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++) {
    if(!actual.has(r[i])||!actual.has(r[j]))missing++;else if(actual.get(r[i])<actual.get(r[j]))correct++;else wrong++;
  }
  const n=correct+wrong+missing;
  return {status:n?'EVALUATED':'NOT_EVALUATED',value:n?correct/n:null,correct_pairs:correct,wrong_pairs:wrong,missing_pairs:missing,
    extra_ids:h.filter(x=>!known.has(x)),missing_ids:r.filter(x=>!actual.has(x)),reason:n?null:'At least two reference blocks required'};
}
export function evaluate(sample,result) {
  validateSample(sample); validateResult(result,sample);
  const human=hasHumanReference(sample), ref=sample.reference_structure, hyp=result.OCR_output.structure;
  const tm=human && typeof sample.reference_text==='string'?textMetrics(sample.reference_text,result.OCR_output.text):
    Object.fromEntries(['cer','chinese_cer','english_wer','english_wer_case_insensitive'].map(k=>[k,absent('No human-confirmed reference text')]));
  const structure={};
  for(const key of ['critical_fields','content_units','reading_order','questions','tables','captions']) {
    if(!human||!ref||!Object.hasOwn(ref,key)){structure[key]=absent('No human-confirmed reference for this structure');continue;}
    if(!hyp||!Object.hasOwn(hyp,key)){structure[key]=absent('Model has not supplied this structure; not zero errors');continue;}
    if(result.OCR_output.structure_alignment!=='benchmark_canonical_ids') {structure[key]=absent('Canonical region/structure ID alignment required');continue;}
    if(key==='reading_order')structure[key]=orderMetric(ref[key],hyp[key]);
    else {
      const serialize=key==='critical_fields'?x=>JSON.stringify([x.type,nfc(x.value)]):
        key==='content_units'?x=>nfc(x.text):key==='captions'?x=>JSON.stringify([x.figure_id,nfc(x.text)]):
        key==='questions'?x=>JSON.stringify(normalizedOptions(x)):x=>JSON.stringify(cells(x));
      structure[key]=keyed(ref[key],hyp[key],serialize);
      if(key==='critical_fields') structure[key].by_type=Object.fromEntries(['chemical_formula','number','unit','script','term'].map(t=>[t,keyed(ref[key].filter(x=>x.type===t),hyp[key].filter(x=>x.type===t),serialize)]));
      if(key==='questions')structure[key].option_completeness=ref[key].map(q=>{
        const found=hyp[key].find(x=>x.id===q.id),labels=found?.options.map(o=>o.label)||[];
        return {question_id:q.id,missing_labels:q.options.filter(o=>!labels.includes(o.label)).map(o=>o.label),
          extra_labels:labels.filter(l=>!q.options.some(o=>o.label===l)),number_matches:found?.number===q.number};
      });
    }
  }
  return {benchmark_version:VERSION,sample_id:sample.sample_id,model_id:result.model_id,model_version:result.model_version,
    dataset_split:sample.dataset_split,annotation_version:sample.annotation_version,
    reference_status:human?'human_confirmed':'pending_human_review',metrics:{...tm,...structure,
      concept_graph:unsupported('Graph node/edge alignment and scoring not implemented'),
      phone_capture_quality:unsupported('Photo defect detector not implemented')},
    automatic_ocr_approval:false,confidence_used_as_accuracy:false,
    policies:{text:'NFC, whitespace removed, case and symbols preserved; no NFKC',
      chinese:'Han-only projection; does not measure mixed-language order/completeness',
      english:'ASCII English word tokens; primary case-sensitive; numbers/units require critical_fields',
      structure:'Exact structured agreement on explicit canonical IDs; no automatic extraction or alignment'}};
}

export function validateResult(r,s) {
  for(const key of ['result_id','sample_id','image_sha256','model_id','model_version'])assert(text(r[key]),'Missing result '+key);
  assert(r.sample_id===s.sample_id && r.image_sha256===s.image_sha256,'Result source/sample mismatch');
  assert(MODEL_FAMILIES.includes(r.model_family),'Unknown model family');
  assert(r.model_config && typeof r.model_config==='object'&&!Array.isArray(r.model_config));
  for(const key of ['execution_time','estimated_cost','actual_cost']) assert(r[key]===null||typeof r[key]==='number'&&Number.isFinite(r[key])&&r[key]>=0,'Invalid '+key);
  assert(r.currency==='USD' && r.execution_time_unit==='ms');
  assert(typeof r.OCR_output?.text==='string','OCR_output.text required');
  assert(r.OCR_output.structure===null||typeof r.OCR_output.structure==='object');
  if(r.OCR_output.structure!==null)validateStructure(r.OCR_output.structure);
  assert(Object.hasOwn(r,'benchmark_result'),'benchmark_result slot required');
  return r;
}
export function compare(dataset,results) {
  validateDataset(dataset);assert(Array.isArray(results));
  assert(unique(results.map(r=>r.result_id)),'Duplicate result_id');
  const samples=new Map(dataset.samples.map(s=>[s.sample_id,s]));
  const groups=new Map();
  for(const r of results) {
    const s=samples.get(r.sample_id);assert(s,'Unknown sample in results');
    validateResult(r,s);
    const k=stableStringify([r.model_family,r.model_id,r.model_version,r.model_config]);
    if(!groups.has(k))groups.set(k,{model_family:r.model_family,model_id:r.model_id,model_version:r.model_version,model_config:r.model_config,rows:[]});
    const g=groups.get(k);assert(!g.rows.some(x=>x.sample_id===r.sample_id),'Duplicate model/sample result');g.rows.push(evaluate(s,r));
  }
  const models=[...groups.values()].map(g=>{
    g.rows.sort((a,b)=>a.sample_id.localeCompare(b.sample_id));
    const rates={};
    for(const key of ['cer','chinese_cer','english_wer','english_wer_case_insensitive']) {
      const referenced=g.rows.map(r=>r.metrics[key]).filter(m=>typeof m.errors==='number');
      const units=referenced.reduce((n,m)=>n+m.reference_units,0),errors=referenced.reduce((n,m)=>n+m.errors,0);
      rates[key]={status:units?'EVALUATED':'NOT_EVALUATED',value:units?errors/units:null,reference_units:units,
        errors:referenced.length?errors:null,evaluated_samples:referenced.filter(m=>m.status==='EVALUATED').length,
        empty_reference_samples:referenced.filter(m=>m.reference_units===0).length};
    }
    return {...g,rates};
  }).sort((a,b)=>stableStringify([a.model_family,a.model_id,a.model_version,a.model_config]).localeCompare(stableStringify([b.model_family,b.model_id,b.model_version,b.model_config])));
  const coverage=models.map(g=>g.rows.map(r=>r.sample_id));
  const comparable=coverage.length>1&&coverage.every(ids=>same(ids,coverage[0]));
  return {benchmark_version:VERSION,models,matched_sample_sets:comparable,
    ranking:null,ranking_reason:'No composite ranking; compare identical samples, annotation versions and individual metrics',
    empty_reference_policy:'Rate null for zero denominator; per-sample insertion counts remain visible'};
}
