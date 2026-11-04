// Local workflow only. No OCR/API imports. The preparation command allows 200 only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {projectRoot,inside,options,protectedRead,verifySnapshot,sha,writeNew} from './lib/ocr-quality-io.mjs';
import {openReviewStore} from './lib/ocr-ai-review-store-v22.mjs';
const args=options(process.argv.slice(2),['--mode','--store','--page','--command']);
assert(['prepare','list','status','dispatch'].includes(args['--mode']),'Use --mode prepare|list|status|dispatch');
const root=args['--store']?inside(projectRoot,args['--store']):path.join(projectRoot,'tmp-ocr-ai-review-v22-'+crypto.randomUUID());
assert(path.basename(root).startsWith('tmp-ocr-ai-review-v22-'),'Use an isolated tmp-ocr-ai-review-v22-* store');
if(args['--mode']!=='prepare')assert(args['--store'],'Existing --store required');
if(args['--mode']==='prepare'){
  assert(!args['--page']||args['--page']==='200','This pilot prepares scan 200 only');
  assert(!args['--command'],'Preparation never dispatches human commands');
  const snapshot=new Map(),refs=[];
  const load=(file,role)=>{const bytes=protectedRead(inside(projectRoot,file),snapshot);refs.push({role,kind:'project-file',path:file,sha256:sha(bytes)});return bytes;};
  const b=JSON.parse(load('scripts/fixtures/ocr-quality-baseline.v1.json','baseline')).sources.find(x=>x.seq===200);assert(b);
  const manifest=JSON.parse(load(b.source.manifest,'manifest')),scan=manifest.scans.find(x=>x.originalFileName===b.source.file);assert(scan);
  assert.equal(sha(protectedRead(scan.originalPath,snapshot)),b.source.sha256);refs.push({role:'image',kind:'manifest-image',manifest:b.source.manifest,file:b.source.file,sha256:b.source.sha256});
  const rawBytes=load(b.ocr.raw,'raw');assert.equal(sha(rawBytes),b.ocr.rawSha256);
  assert.equal(sha(load(b.ocr.tsv,'tsv')),b.ocr.tsvSha256);assert.equal(sha(load(b.ocr.result,'ocr-result')),b.ocr.sha256);
  const index=JSON.parse(load(b.pageIndex.path,'page-index')).entries.find(p=>p.seq===200);assert.equal(index.file,b.source.file);
  const evidencePath='tmp-ocr-ai-source-evidence-v21-Za6Ve1/evidence.json',evidenceBytes=load(evidencePath,'evidence'),evidence=JSON.parse(evidenceBytes);
  assert.equal(evidence.seq,200);assert.equal(evidence.source.image.sha256,b.source.sha256);assert.equal(evidence.source.ocr.rawSha256,sha(rawBytes));
  assert.equal(sha(load(evidence.source.response.path,'response')),evidence.source.response.sha256);
  assert.equal(sha(load(evidence.source.previousValidation.path,'prior-validation')),evidence.source.previousValidation.sha256);
  assert.equal(index.printedPage,evidence.printedPage);
  const store=openReviewStore(root,{create:!fs.existsSync(root)});
  const imported=store.importPage({dataKind:'textbook',subject:'biology',sourceId:'shinedoc-textbook-20260930-1001',pageId:'scan-0200',scanSeq:200,
    printedPage:index.printedPage,pageNumberVerification:index.verification,imageSha256:b.source.sha256,rawSha256:sha(rawBytes),raw:rawBytes.toString('utf8'),sourceRefs:refs,
    proposals:evidence.evidence.records,evidenceVersion:evidence.evidence.evidenceVersion});
  const current=store.readState(imported.pageFingerprint);
  const packet=path.join(root,'review-packet-'+imported.pageFingerprint+'.md');
  if(!fs.existsSync(packet)){
    const lines=['# 掃描 200／印刷 205：人工審核工作包','','所有項目尚未獲得本輪人工確認。機械定位及公式分析不是原圖正確性證明。','',
      '原圖由 sources manifest 的 originalPath 開啟；本工作包不複製圖片。','',
      'pageFingerprint: `'+imported.pageFingerprint+'`','',
      ...current.page.body.proposals.flatMap(p=>['## '+p.id+' — '+current.queue.find(q=>q.id===p.id).label,'',
        '```json',JSON.stringify({proposalFingerprint:p.proposalFingerprint,originalProposal:p.originalProposal,canonicalProposal:p.canonicalProposal,sourceGeometry:p.sourceGeometry,scienceEvidence:p.scienceEvidence,textDifference:p.textDifference},null,2),'```',''])];
    writeNew(packet,lines.join('\n'));
  }
  const template=path.join(root,'review-command-template.json');
  if(!fs.existsSync(template))writeNew(template,{action:'review',pageFingerprint:imported.pageFingerprint,proposalFingerprint:current.page.body.proposals[0].proposalFingerprint,expectedHead:null,proposalId:current.page.body.proposals[0].id,reviewerType:'human',reviewerId:'',humanConfirmed:false,decision:'uncertain',approvedText:null,checks:{imageCompared:false,textPosition:false,scientificNotation:false,readingOrder:false},notes:''});
  verifySnapshot(snapshot);
  console.log(JSON.stringify({store:root,...imported,seq:200,head:current.state.head,queue:current.queue,protectedFiles:snapshot.size,protectedChanges:0,eventCount:current.state.sequence,humanReviewsRecorded:current.state.reviewEventCount,paidCalls:0,packet,template},null,2));
}else{
  const store=openReviewStore(root);
  if(args['--mode']==='list')console.log(JSON.stringify(store.list(),null,2));
  else if(args['--mode']==='status'){
    assert(args['--page'],'--page fingerprint required');const {page,state,queue}=store.readState(args['--page']);
    console.log(JSON.stringify({pageFingerprint:page.fingerprint,head:state.head,textRevision:state.textRevision,derivedTextSha256:sha(Buffer.from(state.text)),queue,isGroundTruth:false},null,2));
  }else{
    assert(args['--page']&&args['--command'],'Explicit --page and human command JSON required');
    const command=JSON.parse(fs.readFileSync(inside(root,args['--command']),'utf8'));
    const result=store.dispatch(args['--page'],command);
    console.log(JSON.stringify({eventHash:result.eventHash,textRevision:result.textRevision,status:'recorded_in_isolated_store_only',isGroundTruth:false},null,2));
  }
}
