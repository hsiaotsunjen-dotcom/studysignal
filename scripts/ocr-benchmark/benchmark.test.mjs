// All text/annotations below are authored synthetic fixtures, not textbook GT.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {textHash} from '../lib/ocr-quality-metrics.mjs';
import {annotationDigest,hasHumanReference,validateSample,validateDataset,trainingEligible,textMetrics,
  evaluate,compare,VERSION,MODEL_FAMILIES} from './core.mjs';
import {importModelResult,publicResult,evaluateImported,readResultRecords} from './io.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sample=(extra={})=>({sample_id:'synthetic-a',source_id:'own-author-a',material_id:'own-book-a',page_id:'a/page1',
  image_sha256:'a'.repeat(64),image_path:'synthetic://authored-test-only',image_width:100,image_height:100,
  dataset_split:'development',region_id:'p1',region_type:'paragraph',coordinate_space:'original_image_pixels',
  bounding_box:[0,0,100,100],polygon:null,reference_text:null,reference_structure:null,annotation_status:'pending_human_review',
  reviewer:null,reviewed_at:null,annotation_version:'1',source_license_status:'unconfirmed',reference_origin:null,
  approval:null,parent_image_sha256:[],derived_from:[],training_consent:false,data_kind:'synthetic_test_only',...extra});
function confirmed(reference,structure=null,extra={}) {
  const s=sample({reference_text:reference,reference_structure:structure,annotation_status:'human_confirmed',
    reviewer:'synthetic-reviewer-not-a-real-approval',reviewed_at:'2026-11-04T00:00:00Z',reference_origin:'human_checked_against_image',...extra});
  s.approval={reviewer_type:'human',confirmed:true,annotation_sha256:annotationDigest(s)};return s;
}
const result=(s,text='',structure=null,extra={})=>({result_id:s.sample_id+'-r',sample_id:s.sample_id,image_sha256:s.image_sha256,
  model_family:'tesseract.js',model_id:'synthetic-engine',model_version:'1',model_config:{synthetic:true},
  execution_time:1,execution_time_unit:'ms',estimated_cost:0,actual_cost:0,currency:'USD',
  OCR_output:{text,structure,structure_alignment:'benchmark_canonical_ids'},benchmark_result:null,...extra});
const dataset=(...samples)=>({schema_version:1,benchmark_version:VERSION,samples});
const other=(extra={})=>sample({sample_id:'b',material_id:'other-book',source_id:'other-source',page_id:'other/page',
  image_sha256:'b'.repeat(64),...extra});
const score=(reference,hyp)=>{const s=confirmed(reference);return evaluate(s,result(s,hyp));};

test('exact Traditional Chinese and English CER/WER',()=>{const m=score('細胞 nucleus','細胞 nucleus').metrics;assert.equal(m.cer.value,0);assert.equal(m.chinese_cer.value,0);assert.equal(m.english_wer.value,0);});
for(const [kind,hyp]of [['insertion','細胞核'],['deletion','細'],['substitution','細包']])test('CER '+kind,()=>assert.equal(score('細胞',hyp).metrics.cer.value,.5));
test('primary English is case-sensitive; secondary is explicitly insensitive',()=>{const m=score('DNA polymerase','dna polymerase').metrics;assert.equal(m.english_wer.value,.5);assert.equal(m.english_wer_case_insensitive.value,0);});
test('English insertion/deletion/substitution words',()=>{assert.equal(score('one two','one two three').metrics.english_wer.value,.5);assert.equal(score('one two','one').metrics.english_wer.value,.5);assert.equal(score('one two','one too').metrics.english_wer.value,.5);});
test('Chinese projection excludes English and is not mixed-language accuracy',()=>{const m=score('細胞 DNA','細胞 RNA').metrics;assert.equal(m.chinese_cer.value,0);assert.equal(m.english_wer.value,1);assert(m.cer.value>0);});
test('digits and units stay in overall CER',()=>{assert(score('12 nm','13 mm').metrics.cer.value>0);});
test('scripts are never NFKC folded',()=>assert(score('CO₂ Fe³⁺','CO2 Fe3+').metrics.cer.value>0));
test('NFC canonical equivalence',()=>assert.equal(textMetrics('é','e\u0301').cer.value,0));
test('whitespace-only reference is not a perfect score',()=>{const m=score(' \n','').metrics.cer;assert.equal(m.value,null);assert.equal(m.status,'NOT_EVALUATED');});
test('empty reference hallucinations counted, rate undefined',()=>{const m=score('','noise').metrics.cer;assert.equal(m.value,null);assert.equal(m.errors,5);});
test('empty hypothesis against real reference is 100% deletion',()=>assert.equal(score('核糖體','').metrics.cer.value,1));
test('missing GT never becomes 0% errors',()=>{const s=sample(),m=evaluate(s,result(s,'text')).metrics;assert.equal(m.cer.value,null);assert.equal(m.cer.status,'NOT_EVALUATED');assert.equal(compare(dataset(s),[result(s)]).models[0].rates.cer.errors,null);});
test('candidate transcription remains pending',()=>{const s=sample({reference_text:'候選'});assert.equal(evaluate(s,result(s,'候選')).metrics.cer.value,null);});
test('OCR origin cannot serve as human reference',()=>assert.throws(()=>validateSample(confirmed('x',null,{reference_origin:'ocr_output'}))));
test('AI reviewer cannot authorize GT',()=>{const s=confirmed('x');s.approval.reviewer_type='agent';assert.throws(()=>validateSample(s));});
test('changed text invalidates approval',()=>{const s=confirmed('x');s.reference_text='y';assert.throws(()=>validateSample(s));});
test('changed structure invalidates approval',()=>{const s=confirmed(null,{reading_order:['a','b']});s.reference_structure.reading_order.reverse();assert.throws(()=>validateSample(s));});
test('changed region invalidates approval',()=>{const s=confirmed('x');s.bounding_box=[1,0,99,100];assert.throws(()=>validateSample(s));});
test('empty approval date rejected',()=>{assert.throws(()=>validateSample(confirmed('x',null,{reviewed_at:null})));});
test('pending sample cannot carry approval',()=>{const s=confirmed('x');s.annotation_status='pending_human_review';assert.throws(()=>validateSample(s));});
test('geometry out of bounds fails',()=>assert.throws(()=>validateSample(sample({bounding_box:[95,0,10,5]}))));
test('polygon can replace bbox',()=>assert.doesNotThrow(()=>validateSample(sample({bounding_box:null,polygon:[[1,1],[5,1],[2,5]]}))));
test('polygon bounds checked',()=>assert.throws(()=>validateSample(sample({bounding_box:null,polygon:[[1,1],[101,1],[2,5]]}))));
test('duplicate sample ID rejected',()=>assert.throws(()=>validateDataset(dataset(sample(),sample()))));
test('duplicate same-image region rejected even under renamed sample',()=>assert.throws(()=>validateDataset(dataset(sample(),sample({sample_id:'b'})))));
test('same-image different regions in same split allowed',()=>assert.equal(validateDataset(dataset(sample(),sample({sample_id:'b',region_id:'p2',bounding_box:[1,1,50,50]}))).groups,1));
for(const [name,changes]of [
  ['same book',{material_id:'own-book-a'}],['same source',{source_id:'own-author-a'}],
  ['same page',{page_id:'a/page1'}],['same hash',{image_sha256:'a'.repeat(64),region_id:'p2',bounding_box:[1,1,50,50]}],
  ['rotated derivative',{parent_image_sha256:['a'.repeat(64)]}],['declared crop',{derived_from:['synthetic-a']}],
  ['shared group',{leakage_group_id:'shared'}]
])test('cross-split leakage: '+name,()=>{const a=sample({leakage_group_id:'shared'}),b=other({dataset_split:'test',...changes});assert.throws(()=>validateDataset(dataset(a,b)),/Cross-split/);});
test('independent books may occupy independent splits',()=>assert.equal(validateDataset(dataset(sample(),other({dataset_split:'validation'}))).groups,2));
test('unknown derivative provenance rejected',()=>assert.throws(()=>validateDataset(dataset(sample({derived_from:['missing']})))));
test('training permission requires consent, rights, human approval, development',()=>{const s=confirmed('own',null,{source_license_status:'training_permitted',training_consent:true});assert(trainingEligible(s));assert(!trainingEligible({...s,training_consent:false}));assert(!trainingEligible({...s,source_license_status:'unconfirmed'}));assert(!trainingEligible({...s,dataset_split:'test'}));});

const critical=[{id:'chem',type:'chemical_formula',value:'Fe³⁺'},{id:'n',type:'number',value:'12'},{id:'u',type:'unit',value:'nm'},{id:'s',type:'script',value:'₂'}];
test('critical fields preserve formula, charge, number, units and typography',()=>{const s=confirmed(null,{critical_fields:critical});const changed=critical.map(x=>({...x,value:x.id==='chem'?'Fe3+':x.id==='u'?'mm':x.value}));const m=evaluate(s,result(s,'',{critical_fields:changed})).metrics.critical_fields;assert.equal(m.value,.5);assert.equal(m.by_type.chemical_formula.substitutions,1);assert.equal(m.by_type.unit.substitutions,1);});
test('missing/extra critical fields count as errors',()=>{const s=confirmed(null,{critical_fields:critical});const h=[...critical.slice(1),{id:'extra',type:'number',value:'2'}];const m=evaluate(s,result(s,'',{critical_fields:h})).metrics.critical_fields;assert.equal(m.missing,1);assert.equal(m.insertions,1);});
test('missing model structure is NOT_EVALUATED',()=>{const s=confirmed(null,{critical_fields:critical});assert.equal(evaluate(s,result(s)).metrics.critical_fields.status,'NOT_EVALUATED');});
test('unmapped structure is NOT_EVALUATED',()=>{const s=confirmed(null,{reading_order:['a','b']}),r=result(s,'',{reading_order:['a','b']});r.OCR_output.structure_alignment=null;assert.equal(evaluate(s,r).metrics.reading_order.value,null);});
test('reading order detects reversal and missing block',()=>{const s=confirmed(null,{reading_order:['a','b','c']});const m=evaluate(s,result(s,'',{reading_order:['b','a']})).metrics.reading_order;assert.equal(m.wrong_pairs,1);assert.equal(m.missing_pairs,2);assert.equal(m.value,0);});
test('reading order reports extra block',()=>{const s=confirmed(null,{reading_order:['a','b']});assert.deepEqual(evaluate(s,result(s,'',{reading_order:['a','b','c']})).metrics.reading_order.extra_ids,['c']);});
test('content units detect omitted paragraph',()=>{const s=confirmed(null,{content_units:[{id:'a',text:'第一段'},{id:'b',text:'第二段'}]});assert.equal(evaluate(s,result(s,'',{content_units:[{id:'a',text:'第一段'}]})).metrics.content_units.missing,1);});
test('question numbers and options omissions are reported',()=>{const q={id:'q1',number:'1',stem:'自編測試',options:[{label:'A',text:'一'},{label:'B',text:'二'}]},s=confirmed(null,{questions:[q]});const m=evaluate(s,result(s,'',{questions:[{...q,number:'7',options:q.options.slice(0,1)}]})).metrics.questions;assert.equal(m.substitutions,1);assert.deepEqual(m.option_completeness[0].missing_labels,['B']);assert.equal(m.option_completeness[0].number_matches,false);});
const table={id:'t',cells:[{row:0,column:0,row_span:1,column_span:2,text:'自編表格'}]};
test('table row/column/span errors are not hidden by same text',()=>{const s=confirmed(null,{tables:[table]});assert.equal(evaluate(s,result(s,'',{tables:[{...table,cells:[{...table.cells[0],column_span:1}]}]})).metrics.tables.substitutions,1);});
test('duplicate/overlapping table cells rejected',()=>{const s=sample({reference_structure:{tables:[{...table,cells:[...table.cells,...table.cells]}]}});assert.throws(()=>validateSample(s));});
test('caption to wrong figure is an error',()=>{const c={id:'c1',figure_id:'f1',text:'自編圖說'},s=confirmed(null,{captions:[c]});assert.equal(evaluate(s,result(s,'',{captions:[{...c,figure_id:'f2'}]})).metrics.captions.substitutions,1);});
test('unsupported graph and photo metrics explicitly marked',()=>{const s=sample(),m=evaluate(s,result(s)).metrics;assert.equal(m.concept_graph.status,'NOT_IMPLEMENTED');assert.equal(m.phone_capture_quality.status,'NOT_IMPLEMENTED');});
for(const family of MODEL_FAMILIES)test('generic model import '+family,()=>{const s=sample();assert.equal(importModelResult(result(s,'',null,{model_family:family}),s).model_family,family);});
test('result source identity mismatch rejected',()=>{const s=sample();assert.throws(()=>importModelResult(result(s,'',null,{image_sha256:'b'.repeat(64)}),s));});
test('negative or unknown cost metadata rejected',()=>{const s=sample();assert.throws(()=>importModelResult(result(s,'',null,{actual_cost:-1}),s));assert.throws(()=>importModelResult(result(s,'',null,{estimated_cost:undefined}),s));});
test('OCR confidence never changes metrics or approval',()=>{const s=sample(),r=result(s);assert.deepEqual(evaluate(s,r),evaluate(s,{...r,confidence:1}));assert.equal(evaluate(s,r).automatic_ocr_approval,false);});
test('comparison stable under input order; no invented ranking',()=>{const a=confirmed('中文'),b=other(),d=dataset(a,b);const rs=[result(a,'中文'),result(b,'x'),result(a,'中',null,{model_id:'second',result_id:'second-a'}),result(b,'y',null,{model_id:'second',result_id:'second-b'})];const x=compare(d,rs);assert.deepEqual(x,compare(d,[...rs].reverse()));assert.equal(x.matched_sample_sets,true);assert.equal(x.ranking,null);});
test('different sample coverage is not a fair comparison',()=>{const a=sample(),b=other();assert.equal(compare(dataset(a,b),[result(a),result(b,'',null,{model_id:'second'})]).matched_sample_sets,false);});
test('duplicate model/sample results rejected',()=>{const s=sample();assert.throws(()=>compare(dataset(s),[result(s),result(s,'',null,{result_id:'different'})]));});
test('config object key order does not create a new model arm',()=>{const a=sample(),b=other();const rs=[result(a,'',null,{model_config:{a:1,b:2}}),result(b,'',null,{model_config:{b:2,a:1}})];assert.equal(compare(dataset(a,b),rs).models.length,1);assert(evaluateImported(dataset(a,b),rs).results.every(r=>r.benchmark_result));});
test('empty-reference insertions contribute to corpus CER when denominator exists',()=>{const a=confirmed(''),b=confirmed('中',null,{...other(),annotation_status:'human_confirmed',reviewer:'synthetic',reviewed_at:'2026-11-04T00:00:00Z',reference_origin:'human_checked_against_image',reference_text:'中'});const m=compare(dataset(a,b),[result(a,'多'),result(b,'中')]).models[0].rates.cer;assert.equal(m.value,1);assert.equal(m.errors,1);});
test('evaluation and import never mutate caller data',()=>{const s=confirmed('自編'),r=result(s,'自編'),before=JSON.stringify({s,r});evaluate(s,r);importModelResult(r,s);assert.equal(JSON.stringify({s,r}),before);});
test('public serialization removes raw textbook text and preserves source ref',()=>{const s=sample(),r=result(s,'synthetic');r.OCR_output.text_ref={path:'existing/raw.txt',sha256:'a'.repeat(64)};assert(!Object.hasOwn(publicResult(r).OCR_output,'text'));assert.equal(r.OCR_output.text,'synthetic');});
test('persisting real text without immutable ref is refused',()=>assert.throws(()=>publicResult(result(sample(),'x'))));
test('real 15-page manifest is pending, development only, and text-free',()=>{const file=path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json');if(!fs.existsSync(file))throw Error('Run prepare before tests');const d=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(validateDataset(d).samples,15);assert(d.samples.every(s=>s.dataset_split==='development'&&s.annotation_status==='pending_human_review'&&s.reference_text===null&&s.reference_structure===null&&!hasHumanReference(s)));assert.equal(validateDataset(d).training_eligible,0);});
test('renaming region ID cannot bypass exact-region deduplication',()=>assert.throws(()=>validateDataset(dataset(sample(),sample({sample_id:'b',region_id:'renamed'}))),/Duplicate/));
test('same model ID in different model families stays separate',()=>{const s=sample(),a=result(s),b=result(s,'',null,{result_id:'b',model_family:'paddleocr'});assert.equal(compare(dataset(s),[a,b]).models.length,2);assert(evaluateImported(dataset(s),[a,b]).results.every(x=>x.benchmark_result));});
test('file-ref import round trip checks digest and exact inline text',()=>{
  const file='scripts/ocr-benchmark/core.mjs',body=fs.readFileSync(path.join(project,file),'utf8'),s=sample(),r=result(s,body);
  r.OCR_output.text_ref={path:file,sha256:textHash(body)};
  assert.equal(readResultRecords(project,dataset(s),[publicResult(r)])[0].OCR_output.text,body);
  r.OCR_output.text='changed';assert.throws(()=>readResultRecords(project,dataset(s),[r]),/immutable text/);
  delete r.OCR_output.text;r.OCR_output.text_ref.sha256='f'.repeat(64);assert.throws(()=>readResultRecords(project,dataset(s),[r]),/hash mismatch/);
});
test('CLI refuses overwrite of existing dataset without touching it',()=>{
  const target=path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json'),before=fs.readFileSync(target);
  assert.throws(()=>execFileSync(process.execPath,['scripts/ocr-benchmark/cli.mjs','prepare','--out','scripts/ocr-benchmark/datasets/biology-development.v1.json'],{cwd:project,stdio:'pipe'}),e=>e.stderr.toString().includes('refusing overwrite'));
  assert.deepEqual(fs.readFileSync(target),before);
});
