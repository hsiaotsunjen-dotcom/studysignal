// Offline replay of the existing single-page response. Never imports fetch/OCR.
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {resolveProject,protectedRead,verifySnapshot,sha,writeNew,outputDir} from './lib/ocr-quality-io.mjs';
import {validateProposals} from './lib/ocr-ai-proposal-validation.mjs';
const started=performance.now(),snapshot=new Map();
const load=p=>protectedRead(resolveProject(p),snapshot);
const baselinePath='scripts/fixtures/ocr-quality-baseline.v1.json';
const b=JSON.parse(load(baselinePath)).sources.find(x=>x.seq===200);assert(b);
const manifest=JSON.parse(load(b.source.manifest)),scan=manifest.scans.find(x=>x.originalFileName===b.source.file);assert(scan);
assert.equal(sha(protectedRead(scan.originalPath,snapshot)),b.source.sha256);assert.equal(scan.sha256,b.source.sha256);
const rawBytes=load(b.ocr.raw);assert.equal(sha(rawBytes),b.ocr.rawSha256);const raw=rawBytes.toString('utf8');
const resultBytes=load(b.ocr.result);assert.equal(sha(resultBytes),b.ocr.sha256);const result=JSON.parse(resultBytes);
assert.equal(result.seq,200);assert.equal(result.file,b.source.file);assert.equal(result.sourceSha256,b.source.sha256);
const index=JSON.parse(load(b.pageIndex.path)).entries.find(p=>p.seq===200);assert.equal(index.file,b.source.file);assert.equal(index.printedPage,result.printedPage);
assert.equal(sha(load(b.ocr.tsv)),b.ocr.tsvSha256);
const responsePath='tmp-ocr-ai-correction-paid-firstpage-v1/response.json',responseBytes=load(responsePath),response=JSON.parse(responseBytes);
const summaryPath='tmp-ocr-ai-correction-paid-firstpage-v1/summary.json',previousSummary=JSON.parse(load(summaryPath));
assert.equal(response.status,'completed');assert.equal(response.model,previousSummary.model);assert.equal(previousSummary.seq,200);
const candidate=JSON.parse(response.output.flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));
const priorAuditPath='tmp-ocr-ai-proposal-audit-xhWuPU/proposal-audit.json';
const priorAudit=JSON.parse(load(priorAuditPath));
assert.equal(priorAudit.seq,200);assert.equal(priorAudit.source.image.sha256,b.source.sha256);
assert.equal(priorAudit.source.ocr.rawSha256,b.ocr.rawSha256);assert.equal(priorAudit.source.response.sha256,sha(responseBytes));
const context={raw,...result.image,priorObservations:priorAudit.records};
const evaluation=validateProposals(candidate.changes,context);
assert.equal(JSON.stringify(evaluation),JSON.stringify(validateProposals(candidate.changes,context)),'Non-reproducible evaluation');
const summary={proposals:evaluation.records.length,counts:evaluation.counts,exactAnchors:evaluation.records.filter(r=>r.textLocator?.span).length,originalOffsetFailures:evaluation.records.filter(r=>!r.originalOffsetsValid).length,canonicalBBoxInBounds:evaluation.records.filter(r=>r.imageLocator?.boundsValid).length,overlaps:evaluation.records.filter(r=>r.issues.some(x=>x.code==='overlapping_text_span')).length,riskCounts:{},cer:null,wer:null,correctRepairs:null,newErrors:null,acceptedChanges:0,paidCalls:0,reproducible:true};
for(const r of evaluation.records)for(const issue of r.issues)summary.riskCounts[issue.code]=(summary.riskCounts[issue.code]??0)+1;
verifySnapshot(snapshot);
const output=outputDir(undefined,'tmp-ocr-ai-proposal-validation-v2-');
const report={schemaVersion:2,createdAt:new Date().toISOString(),seq:200,printedPage:result.printedPage,model:response.model,
  source:{image:{manifest:b.source.manifest,file:b.source.file,sha256:b.source.sha256,width:result.image.width,height:result.image.height},ocr:b.ocr,pageIndex:b.pageIndex,response:{path:responsePath,sha256:sha(responseBytes)},priorAudit:{path:priorAuditPath,sha256:sha(load(priorAuditPath)),assessorType:'agent_visual_observation_not_human'}},
  evaluation,unresolvedRegions:candidate.unresolvedRegions,structuralObservations:candidate.structuralObservations,summary,protectedFiles:snapshot.size,protectedChanges:0,elapsedMs:performance.now()-started};
writeNew(path.join(output,'validation.json'),report);
const labels={auto_confirmable:'可自動確認（僅未改字與機械條件）',human_review:'需要人工審核',insufficient_evidence:'證據不足',potential_error:'可能錯誤'};
const md=['# 第 200 頁離線建議分類 v2','','僅重播既有回應；沒有接受任何文字修改。分類不是人工核准；CER／WER 維持 null。','',
  '|建議 ID|分類|風險代碼|','|---|---|---|',...evaluation.records.map(r=>`|${r.id}|${labels[r.classification]}|${r.issues.map(x=>x.code).join(', ')}|`),'',
  '逐項原文、候選、座標與證據在同目錄 validation.json；含教材文字，保留本機，不應直接公開提交。',''];
writeNew(path.join(output,'report.md'),md.join('\n'));
console.log(JSON.stringify({output,...summary,protectedFiles:snapshot.size,protectedChanges:0,elapsedMs:report.elapsedMs},null,2));
