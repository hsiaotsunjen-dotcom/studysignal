// Revalidates archived Agent observations. Does NOT re-inspect images or create Ground Truth.
import path from 'node:path';
import assert from 'node:assert/strict';
import {options,resolveProject,read,sha,protectedRead,verifySnapshot,writeNew,outputDir} from './lib/ocr-quality-io.mjs';
const args=options(process.argv.slice(2),['--cases','--routing','--out']);
const snapshot=new Map(),file=args['--cases']?path.resolve(args['--cases']):resolveProject('scripts/fixtures/ocr-risk-signal-cases.v1.json');
const packet=JSON.parse(protectedRead(file,snapshot).toString('utf8'));
assert.equal(packet.dataKind,'archived-agent-observations-not-ground-truth');assert.equal(packet.cases.length,12);
const categories=['agent_observed_ocr_error','suspected_error','possible_false_positive'];
const ids=new Set();
for(const c of packet.cases){
 assert(!ids.has(c.id));ids.add(c.id);assert(categories.includes(c.classification));
 assert.equal(c.reviewerType,'agent');assert.equal(c.humanConfirmed,false);assert.equal(c.status,'pending_human_review');assert.equal(c.groundTruth,null);
 assert(/^[a-f0-9]{64}$/.test(c.source.sha256));assert(/^[a-f0-9]{64}$/.test(c.ocr.rawSha256));assert(c.observation&&c.action&&c.risk.rule&&c.location.description);
}
let replay=null;
if(args['--routing']){
 const root=path.resolve(args['--routing']),s=JSON.parse(protectedRead(path.join(root,'summary.json'),snapshot).toString('utf8'));
 assert.equal(s.inputKind,'local-frozen-12','Synthetic routing cannot verify historical textbook claims');assert.equal(s.pages,12);
 const baseline=read(resolveProject('scripts/fixtures/ocr-quality-baseline.v1.json'));
 assert.deepEqual(s.counts,baseline.summary.counts);assert.deepEqual(s.riskCounts,baseline.summary.riskCounts);
 for(const c of packet.cases){const p=JSON.parse(protectedRead(path.join(root,`scan${String(c.seq).padStart(4,'0')}.json`),snapshot).toString('utf8'));assert.equal(p.provenance.source.sha256,c.source.sha256);assert(p.risks.some(r=>r.rule===c.risk.rule));}
 replay={kind:'local-frozen-12',routingSummarySha256:sha(protectedRead(path.join(root,'summary.json'),snapshot)),riskRulesPresent:true,imagesReinspected:false};
}
verifySnapshot(snapshot);
const summary={schemaVersion:1,mode:'archived-observation-integrity',cases:12,selectedPages:new Set(packet.cases.map(c=>c.seq)).size,counts:Object.fromEntries(categories.map(k=>[k,packet.cases.filter(c=>c.classification===k).length])),humanApprovals:0,groundTruthCount:0,cer:null,wer:null,precision:null,recall:null,ocrExecutions:0,caseFileSha256:snapshot.get(file),localReplay:replay};
const out=outputDir(args['--out'],'tmp-ocr-risk-signals-portable-');
writeNew(path.join(out,'summary.json'),summary);
writeNew(path.join(out,'report.md'),['# OCR 風險訊號紀錄完整性驗證','',`案例${summary.cases}；涉及${summary.selectedPages}頁。`,...Object.entries(summary.counts).map(([k,n])=>`- ${k}：${n}`),'','本命令只驗證既有Agent觀察紀錄，不是重新目視檢查，也不是獨立人工核准。',`本機分流重播：${replay?'已檢查原規則與數據一致':'未提供；未執行教材實測'}`,'CER/WER/precision/recall均為null。'].join('\n')+'\n');
console.log(JSON.stringify({outputDirectory:out,...summary},null,2));
