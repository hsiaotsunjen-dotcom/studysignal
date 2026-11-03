// Audit only scan 200 using an existing response. No network or OCR dependencies.
import path from 'node:path';
import assert from 'node:assert/strict';
import {read,resolveProject,protectedRead,verifySnapshot,sha,writeNew,outputDir} from './lib/ocr-quality-io.mjs';
import {auditProposal} from './lib/ocr-ai-proposal-audit.mjs';
const snapshot=new Map();
const load=p=>protectedRead(resolveProject(p),snapshot);
const baselinePath='scripts/fixtures/ocr-quality-baseline.v1.json';
const b=JSON.parse(load(baselinePath)).sources.find(x=>x.seq===200);
const m=JSON.parse(load(b.source.manifest)),scan=m.scans.find(x=>x.originalFileName===b.source.file);
assert.equal(sha(protectedRead(scan.originalPath,snapshot)),b.source.sha256);
const rawBytes=load(b.ocr.raw);assert.equal(sha(rawBytes),b.ocr.rawSha256);const raw=rawBytes.toString('utf8');
const resultBytes=load(b.ocr.result);assert.equal(sha(resultBytes),b.ocr.sha256);const result=JSON.parse(resultBytes);
assert.equal(sha(load(b.ocr.tsv)),b.ocr.tsvSha256);
const responsePath='tmp-ocr-ai-correction-paid-firstpage-v1/response.json',responseBytes=load(responsePath),response=JSON.parse(responseBytes);
const content=JSON.parse(response.output.flatMap(x=>x.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''));
assert.equal(content.changes.length,13,'Unexpected source version: stop and review');
// Prior visual inspection by Agent; never a human approval or Ground Truth.
// Classifications concern direction of edits, not acceptance of complete spans.
const supported=new Set([1,2,3,4,5,6,11,12,13]);
const records=content.changes.map((c,i)=>({id:'proposal-'+String(i+1).padStart(2,'0'),...auditProposal(c,raw,result.image),
  evidenceAssessment:{category:supported.has(i+1)?'image_supported_direction':i+1===9||i+1===10?'potential_error':'insufficient_evidence',assessorType:'agent_visual_observation',humanConfirmed:false,scope:'direction_only_not_full_span_acceptance'}}));
const out=outputDir(undefined,'tmp-ocr-ai-proposal-audit-');
const report={schemaVersion:1,seq:200,printedPage:result.printedPage,model:response.model,source:{image:{manifest:b.source.manifest,file:b.source.file,sha256:b.source.sha256},ocr:b.ocr,response:{path:responsePath,sha256:sha(responseBytes)}},coordinateConvention:'original-image pixel xywh; no inferred resize transform',offsetConvention:'UTF-16 code units; end exclusive; immutable raw text',records,structuralObservations:content.structuralObservations,unresolvedRegions:content.unresolvedRegions,summary:{proposals:records.length,originalOffsetFailures:records.filter(x=>!x.originalOffsetsValid).length,uniqueExactAnchors:records.filter(x=>x.textLocator.span).length,legacyBBoxFields:records.filter(x=>x.imageLocator.originalField==='original-pixel bbox').length,imageSupportedDirection:9,insufficientEvidence:2,potentialError:2,acceptedChanges:0,cer:null,wer:null,correctRepairs:null,newErrors:null,paidCalls:0}};
verifySnapshot(snapshot);report.protectedFiles=snapshot.size;report.protectedChanges=0;
writeNew(path.join(out,'proposal-audit.json'),report);
console.log(JSON.stringify({output:path.join(out,'proposal-audit.json'),...report.summary,protectedFiles:snapshot.size,protectedChanges:0},null,2));
