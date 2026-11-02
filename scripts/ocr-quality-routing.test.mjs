import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assess} from './lib/ocr-quality-routing.mjs';
const header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n';
function input(){return {page:{seq:1,width:1000,height:1000,layout:{regions:[],words:[]}},raw:'',tsv:header};}
test('deterministic and immutable; missing semantic checks prevent sampling',()=>{const a=input(),copy=structuredClone(a);assert.deepEqual(assess(a),assess(a));assert.deepEqual(a,copy);assert.equal(assess(a).route,'review');});
test('execution failure recommends retry without executing OCR',()=>{assert.equal(assess({...input(),executionFailed:true}).route,'retry');});
test('confidence never produces accuracy or approval',()=>{const a=input();a.page.engineConfidence=100;const r=assess(a);assert.equal(r.accuracy,null);assert.equal(r.cer,null);assert.equal(r.wer,null);assert.equal(r.humanApproved,false);assert.equal(r.groundTruth,null);assert.equal(r.route,'review');});
test('invalid characters flagged without transcription',()=>{const a=input();a.raw='\ufffd\u0001';assert(assess(a).risks.some(r=>r.rule==='invalid-codepoints'));assert.equal(a.raw,'\ufffd\u0001');});
test('tables and figures remain unverified',()=>{const a=input();a.page.layout.regions=['table','image'].map((type,i)=>({id:String(i),type,rect:{left:i*100,top:0,width:80,height:80}}));const r=assess(a);for(const c of ['table_structure','figures'])assert(r.risks.some(x=>x.category===c));});
test('symbols cause risk but never correction',()=>{const a=input();a.raw='Fe2+ CO2 α →';assert(assess(a).risks.some(r=>r.category==='formulas_terms'));});
test('wide same-line gap and uncontained tokens flagged',()=>{const a=input();a.tsv+=['5\t1\t1\t1\t1\t1\t10\t10\t10\t10\t90\t甲','5\t1\t1\t1\t1\t2\t600\t10\t10\t10\t90\t乙'].join('\n');const r=assess(a);for(const c of ['reading_order','text_missing'])assert(r.risks.some(x=>x.category===c));});
test('public synthetic 12-page integration: not a replay of private textbook OCR',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/ocr-quality-routing-synthetic.v1.json',import.meta.url),'utf8'));
 assert.equal(fixture.kind,'synthetic');assert.equal(fixture.notTextbookData,true);assert.equal(fixture.pages.length,12);
 for(const a of fixture.pages){const seq=a.page.seq;
  const r=assess(a);assert.equal(r.seq,seq);assert.equal(r.route,'review');assert.deepEqual(r,assess(a));
  assert.equal(r.status,'pending_human_review');assert(r.checks.some(c=>c.rule==='terminology-correctness'&&c.result==='not_evaluated'));
  for(const risk of r.risks){assert(risk.rule&&risk.action&&risk.evidence);assert.equal(risk.status,'pending_human_review');}
 }
});
