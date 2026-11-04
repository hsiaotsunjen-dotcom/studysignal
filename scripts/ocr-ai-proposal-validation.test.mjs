import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProposals} from './lib/ocr-ai-proposal-validation.mjs';
import {scienceGuards} from './lib/ocr-ai-science-guards.mjs';
import {inspectBBox,sourceLines,proposalResponseSchema} from './lib/ocr-ai-proposal-contract.mjs';
import {prepareRequest,validateChanges} from './lib/ocr-ai-correction-trial.mjs';
const base={start:0,end:1,before:'x',after:'y',bbox:[1,1,10,10],reason:'Synthetic evidence only',category:'text',confidence:0.99};
const evaluate=(c,raw='x')=>validateProposals([c],{raw,width:100,height:100}).records[0];
const codes=c=>scienceGuards(c).map(x=>x.code);
test('legacy and canonical bbox produce same canonical box without changing source',()=>{
  const legacy={...base};delete legacy.bbox;legacy['original-pixel bbox']=base.bbox;
  const before=JSON.stringify(legacy),a=evaluate(legacy),b=evaluate(base);
  assert.deepEqual(a.canonicalProposal.bbox,b.canonicalProposal.bbox);assert.equal(JSON.stringify(legacy),before);
  assert.equal(a.imageLocator.originalField,'original-pixel bbox');
});
test('strict old validator accepts legacy alias while retaining offset checks',()=>{
  const legacy={...base};delete legacy.bbox;legacy['original-pixel bbox']=base.bbox;
  assert.equal(validateChanges([legacy],{raw:'x',width:100,height:100}).verified,false);
  assert.throws(()=>validateChanges([{...legacy,start:1,end:2}],{raw:'x',width:100,height:100}));
});
test('both present aliases must match, including explicit null',()=>{
  assert.equal(inspectBBox({...base,'original-pixel bbox':base.bbox},{width:100,height:100}).aliasConflict,false);
  assert.equal(evaluate({...base,'original-pixel bbox':null}).classification,'potential_error');
});
test('malformed and out of bounds rectangles never pass',()=>{
  for(const bbox of [[0,0,0,1],[-1,0,1,1],[99,0,10,1],[0,0,NaN,1],[1,2,3]])assert.equal(evaluate({...base,bbox}).classification,'potential_error');
});
test('missing image location is insufficient evidence',()=>assert.equal(evaluate({...base,bbox:null}).classification,'insufficient_evidence'));
test('exact unique match repairs only canonical location, not original offsets',()=>{
  const r=evaluate({...base,start:90,end:91},'abcx');assert.deepEqual(r.canonicalProposal.span,{start:3,end:4,unit:'utf16_code_units',endExclusive:true});
  assert.equal(r.originalProposal.start,90);assert.equal(r.originalOffsetsValid,false);assert.equal(r.classification,'human_review');
});
test('ambiguous and missing anchors cannot be silently chosen',()=>{
  assert.equal(evaluate(base,'xx').classification,'insufficient_evidence');assert.equal(evaluate(base,'abc').classification,'insufficient_evidence');
});
test('whitespace and line endings remain exact evidence',()=>assert.equal(evaluate({...base,before:'a\nb'},'a\r\nb').classification,'insufficient_evidence'));
test('surrogate halves are never valid text spans',()=>assert.equal(evaluate({...base,before:'\uDE00'},'😀').textLocator.span,null));
test('overlapping anchored replacements are both blocked',()=>{
  const r=validateProposals([{...base,before:'ab',end:2},{...base,before:'bc',start:1,end:3}],{raw:'abc',width:100,height:100});
  assert.equal(r.counts.potential_error,2);
});
test('identical text is mechanically confirmable, never verified or applied',()=>{
  const r=evaluate({...base,after:'x'});assert.equal(r.classification,'auto_confirmable');assert.equal(r.semanticVerified,false);assert.equal(r.autoApplyAllowed,false);assert.equal(r.status,'pending_human_review');
});
test('high model confidence cannot approve changed text',()=>assert.equal(evaluate({...base,confidence:1}).classification,'human_review'));
test('null confidence preserves uncertainty',()=>assert.equal(evaluate({...base,confidence:null,after:'x'}).classification,'insufficient_evidence'));
test('malformed proposals are recorded rather than crashing entire replay',()=>{
  const r=validateProposals([null,{},42],{raw:'x',width:100,height:100});assert.equal(r.counts.potential_error,3);
});
test('chemical charge and subscript changes require review',()=>{
  const r=codes({before:'Fe²⁺ HCO₃⁻',after:'Fe2+ HCO3-',category:'formula'});
  assert(r.includes('subscript_superscript_sensitive'));assert(r.includes('plain_ascii_scientific_notation'));assert(r.includes('formula_or_symbol_change'));
});
test('Greek symbols and arrows are protected',()=>assert(codes({before:'ΔG ⇌ α',after:'G → a'}).includes('scientific_special_symbols')));
test('Latin case changes are protected',()=>assert(codes({before:'Heme',after:'heme'}).includes('latin_term_change')));
test('mixed Chinese and English replacement is flagged',()=>assert(codes({before:'血基質(Heme)',after:'血基質(Hem)'}).includes('mixed_language_span')));
test('terminology guard does not auto-replace or guess correct scientific words',()=>assert(codes({before:'血紅素',after:'血清素'}).includes('protected_terminology')));
test('amine/ammonia character swap is possible error',()=>assert(codes({before:'碳胺血紅素',after:'碳氨血紅素'}).includes('amine_ammonia_character_swap')));
test('figure label deletion of formula-like content is possible error',()=>assert(codes({before:'細胞 CO, 圖',after:'細胞',category:'figure_text'}).includes('figure_scientific_content_removed')));
test('line merging is a review signal rather than automatic correction',()=>assert(codes({before:'a\nb',after:'ab'}).includes('line_structure_changed')));
test('caller can supply subject vocabulary without changing rules',()=>assert(scienceGuards({before:'自訂甲',after:'自訂乙'},{protectedTerms:['自訂甲']}).some(r=>r.code==='protected_terminology')));
test('line IDs are deterministic and source reference mismatches are blocked',()=>{
  assert.deepEqual(sourceLines('a\nb').map(x=>[x.id,x.start,x.end]),[['line-0001',0,1],['line-0002',2,3]]);
  assert.equal(evaluate({...base,sourceLineIds:['line-9999']}).classification,'insufficient_evidence');
});
test('request and schema consistently specify bbox with no legacy key',()=>{
  const r=prepareRequest({seq:200,raw:'x',imageBytes:Buffer.from('synthetic')});
  assert.equal(r.text.format.type,'json_schema');assert.equal(r.text.format.strict,true);
  const schema=proposalResponseSchema.properties.changes.items;
  assert(schema.required.includes('bbox'));assert(schema.required.includes('sourceLineIds'));assert.equal(schema.additionalProperties,false);
  assert(!Object.hasOwn(schema.properties,'original-pixel bbox'));assert(r.input[0].content[0].text.includes('exact field bbox'));
});
test('evaluation is reproducible and metrics stay null without human references',()=>{
  const source={raw:'x',width:100,height:100},a=validateProposals([base],source),b=validateProposals([base],source);
  assert.deepEqual(a,b);assert.equal(a.cer,null);assert.equal(a.wer,null);assert.equal(a.acceptedChanges,0);
});
test('earlier visual uncertainty is not erased by mechanical success',()=>{
  const r=validateProposals([base],{raw:'x',width:100,height:100,priorObservations:[{originalProposal:base,evidenceAssessment:{category:'insufficient_evidence',humanConfirmed:false}}]});
  assert.equal(r.counts.insufficient_evidence,1);assert.equal(r.records[0].semanticVerified,false);
});
test('previous observation for another proposal cannot affect classification',()=>{
  const r=validateProposals([base],{raw:'x',width:100,height:100,priorObservations:[{originalProposal:{...base,after:'z'},evidenceAssessment:{category:'potential_error'}}]});
  assert.equal(r.counts.human_review,1);
});
test('request carries original pixel dimensions, raw text and immutable line offsets',()=>{
  const r=prepareRequest({seq:200,raw:'x\ny',imageBytes:Buffer.from('synthetic'),imageSize:{width:100,height:200}});
  const text=JSON.parse(r.input[1].content[0].text);assert.deepEqual(text.imageSize,{width:100,height:200});assert.equal(text.raw,'x\ny');assert.equal(text.sourceLines[1].start,2);
});
