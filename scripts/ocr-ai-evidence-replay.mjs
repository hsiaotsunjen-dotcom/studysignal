// Intentionally fixed to scan 200. New output directory on every offline run.
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {resolveProject,protectedRead,verifySnapshot,sha,writeNew,outputDir} from './lib/ocr-quality-io.mjs';
import {evaluateSourceEvidence} from './lib/ocr-ai-proposal-evidence.mjs';
const started=performance.now(),snapshot=new Map();
const load=p=>protectedRead(resolveProject(p),snapshot);
const baseline=JSON.parse(load('scripts/fixtures/ocr-quality-baseline.v1.json')).sources.find(x=>x.seq===200);assert(baseline);
const manifest=JSON.parse(load(baseline.source.manifest)),scan=manifest.scans.find(s=>s.originalFileName===baseline.source.file);assert(scan);
assert.equal(sha(protectedRead(scan.originalPath,snapshot)),baseline.source.sha256);assert.equal(scan.sha256,baseline.source.sha256);
const rawBytes=load(baseline.ocr.raw);assert.equal(sha(rawBytes),baseline.ocr.rawSha256);
const tsvBytes=load(baseline.ocr.tsv);assert.equal(sha(tsvBytes),baseline.ocr.tsvSha256);
const resultBytes=load(baseline.ocr.result);assert.equal(sha(resultBytes),baseline.ocr.sha256);const result=JSON.parse(resultBytes);
assert.equal(result.seq,200);assert.equal(result.sourceSha256,baseline.source.sha256);
const index=JSON.parse(load(baseline.pageIndex.path)).entries.find(p=>p.seq===200);assert.equal(index.file,result.file);assert.equal(index.printedPage,result.printedPage);
const responsePath='tmp-ocr-ai-correction-paid-firstpage-v1/response.json',responseBytes=load(responsePath),response=JSON.parse(responseBytes);assert.equal(response.status,'completed');
const previousPath='tmp-ocr-ai-proposal-validation-v2-76P938/validation.json',previousBytes=load(previousPath),previous=JSON.parse(previousBytes);
assert.equal(previous.seq,200);assert.equal(previous.source.image.sha256,baseline.source.sha256);assert.equal(previous.source.ocr.rawSha256,sha(rawBytes));assert.equal(previous.source.response.sha256,sha(responseBytes));assert.equal(previous.model,response.model);
const changes=JSON.parse(response.output.flatMap(o=>o.content??[]).filter(o=>o.type==='output_text').map(o=>o.text).join('')).changes;
const context={raw:rawBytes.toString('utf8'),tsv:tsvBytes.toString('utf8'),...result.image,priorObservations:previous.evaluation.records.map(r=>({originalProposal:r.originalProposal,evidenceAssessment:r.priorEvidenceAssessment}))};
const evidence=evaluateSourceEvidence(changes,context);
assert.equal(JSON.stringify(evidence),JSON.stringify(evaluateSourceEvidence(changes,context)),'Evidence pass must be reproducible');
const summary={proposals:evidence.records.length,beforeCounts:previous.evaluation.counts,afterCounts:evidence.counts,
  sourceLinked:evidence.records.filter(r=>r.sourceGeometry?.status==='linked_to_existing_ocr').length,
  aiBoxesDisjoint:evidence.records.filter(r=>r.sourceGeometry?.aiBoxRelationship==='disjoint_from_source_tokens').length,
  aiBoxesPartial:evidence.records.filter(r=>r.sourceGeometry?.aiBoxRelationship==='partial_overlap').length,
  partialTokenProposals:evidence.records.filter(r=>r.sourceGeometry?.partialTokenIds?.length).length,
  diffHunks:evidence.records.reduce((n,r)=>n+(r.textDifference?.edits?.length??0),0),
  diffSourceLinked:evidence.records.reduce((n,r)=>n+(r.textDifference?.edits??[]).filter(e=>e.sourceGeometry?.status==='linked_to_existing_ocr').length,0),
  diffPartialTokenBoxes:evidence.records.reduce((n,r)=>n+(r.textDifference?.edits??[]).filter(e=>e.sourceGeometry?.partialTokenIds?.length).length,0),
  insertionEdits:evidence.records.reduce((n,r)=>n+(r.textDifference?.edits??[]).filter(e=>e.sourceSpan&&e.sourceSpan.start===e.sourceSpan.end).length,0),
  formulaComparisonCounts:Object.fromEntries(['no_formula_candidates','unresolved','same_atom_counts_and_charge','different_atom_counts_or_charge'].map(k=>[k,evidence.records.filter(r=>r.scienceEvidence?.structuralComparison===k).length])),
  unresolvedFormulaTokens:evidence.records.reduce((n,r)=>n+[...(r.scienceEvidence?.beforeTokens??[]),...(r.scienceEvidence?.afterTokens??[])].filter(t=>t.status==='unresolved').length,0),
  caseRiskProposals:evidence.records.filter(r=>r.scienceEvidence?.caseChanges.length).length,
  acceptedChanges:0,cer:null,wer:null,correctRepairs:null,newErrors:null,apiCalls:0,reproducible:true};
verifySnapshot(snapshot);
const out=outputDir(undefined,'tmp-ocr-ai-source-evidence-v21-');
const report={schemaVersion:1,seq:200,printedPage:result.printedPage,createdAt:new Date().toISOString(),
  source:{image:{manifest:baseline.source.manifest,file:baseline.source.file,sha256:baseline.source.sha256},ocr:baseline.ocr,pageIndex:baseline.pageIndex,response:{path:responsePath,sha256:sha(responseBytes)},previousValidation:{path:previousPath,sha256:sha(previousBytes)}},
  evidence,summary,elapsedMs:performance.now()-started,protectedFiles:snapshot.size,protectedChanges:0};
writeNew(path.join(out,'evidence.json'),report);
const lines=['# 掃描 200：來源定位與公式證據 v2.1','','此為離線來源對照，不是人工核准；未接受修改，CER／WER 為 null。','',
  '|建議|V2 分類|來源文字框|AI 框關係|差異片段數|公式分析|','|---|---|---|---|---:|---|',
  ...evidence.records.map(r=>`|${r.id}|${r.classification}|${r.sourceGeometry?.status}|${r.sourceGeometry?.aiBoxRelationship}|${r.textDifference?.edits?.length??0}|${r.scienceEvidence?.structuralComparison}|`),'',
  'evidence.json 含原文、候選與定位證據，僅保留本機。來源文字框為既有 OCR word boxes，不證明原圖全部內容。',''];
writeNew(path.join(out,'report.md'),lines.join('\n'));
console.log(JSON.stringify({output:out,alignment:evidence.alignment,...summary,elapsedMs:report.elapsedMs,protectedFiles:snapshot.size,protectedChanges:0},null,2));
