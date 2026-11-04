import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSourceEvidence} from './lib/ocr-ai-proposal-evidence.mjs';
const tsv='level\tpage\n5\t1\t1\t1\t1\t1\t10\t10\t30\t10\t90\tCO2';
const proposal={start:90,end:93,before:'CO2',after:'CO₂',bbox:[1,1,2,2],category:'formula',reason:'synthetic',confidence:1};
const context={raw:'CO2',tsv,width:100,height:100};
test('source mapping, differences and formula evidence compose without accepting text',()=>{
  const r=evaluateSourceEvidence([proposal],context),p=r.records[0];assert.equal(p.originalOffsetsValid,false);assert.equal(p.sourceGeometry.aiBoxRelationship,'disjoint_from_source_tokens');
  assert.equal(p.sourceGeometry.sourceEnvelope.left,10);assert.equal(p.scienceEvidence.structuralComparison,'same_atom_counts_and_charge');assert.equal(p.autoApplyAllowed,false);assert.equal(r.acceptedChanges,0);assert.equal(r.cer,null);
});
test('unique raw anchor does not imply available TSV evidence',()=>{
  const r=evaluateSourceEvidence([proposal],{...context,tsv:tsv.replace('CO2','Co2')});assert.equal(r.records[0].sourceGeometry.status,'unresolved');assert.equal(r.records[0].status,'pending_human_review');
});
test('earlier insufficient visual evidence remains unresolved after linking coordinates',()=>{
  const priorObservations=[{originalProposal:proposal,evidenceAssessment:{category:'insufficient_evidence',humanConfirmed:false}}];
  assert.equal(evaluateSourceEvidence([proposal],{...context,priorObservations}).counts.insufficient_evidence,1);
});
test('repeated evidence generation is deterministic and input objects remain intact',()=>{
  const before=JSON.stringify({proposal,context}),a=evaluateSourceEvidence([proposal],context);assert.deepEqual(a,evaluateSourceEvidence([proposal],context));assert.equal(JSON.stringify({proposal,context}),before);
});
test('diff evidence maps deletion/substitution spans and treats insertions cautiously',()=>{
  const r=evaluateSourceEvidence([{...proposal,after:'CO2+'}],context).records[0];assert.equal(r.textDifference.edits[0].sourceGeometry.reason,'insertion_has_no_original_glyph_span');
});
test('invalid proposals are preserved as diagnostics without speculative evidence',()=>{
  const r=evaluateSourceEvidence([null],context);assert.equal(r.records[0].evidenceStatus,'invalid_proposal');assert.equal(r.records[0].scienceEvidence,null);
});
