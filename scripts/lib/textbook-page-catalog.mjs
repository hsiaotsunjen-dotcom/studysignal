// Subject-neutral catalog. This is a processing index, not the formal KB schema.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha,read,inside} from './ocr-quality-io.mjs';
import {verifyArtifacts} from './kb-ocr-batch.mjs';
import {buildSourceAlignment} from './ocr-ai-source-evidence.mjs';
import {openReviewStore} from './ocr-ai-review-store-v22.mjs';

export const ref=(file)=>({path:path.resolve(file),sha256:sha(fs.readFileSync(file))});
export function selectPages(spec,pages){
  assert(typeof spec==='string'&&spec.length,'Explicit scan selection required');
  const ids=[];
  for(const part of spec.split(',')){
    const m=/^(\d+)(?:-(\d+))?$/.exec(part.trim());assert(m,'Invalid scan selection');
    const first=Number(m[1]),last=Number(m[2]??m[1]);
    assert(first>0&&last>=first&&last-first<pages.length,'Invalid scan range');
    for(let i=first;i<=last;i++)ids.push(i);
  }
  assert.equal(new Set(ids).size,ids.length,'Duplicate scan selection');
  assert(ids.every(i=>pages.some(p=>p.scanSeq===i)),'Unknown scan sequence');
  return ids;
}

export function verifyOcr(root,resultFile,page){
  const r=read(resultFile);
  assert.equal(r.seq,page.scanSeq,'OCR scan mismatch');
  assert.equal(r.sourceSha256,page.image.sha256,'OCR source hash mismatch');
  assert.equal(r.file,page.originalFileName,'OCR filename mismatch');
  for(const k of ['printedPage','label'])assert.deepEqual(r[k]??null,page[k]??null,'OCR pagination mismatch');
  assert.equal(r.verification,page.pageNumberVerification,'OCR page verification mismatch');
  verifyArtifacts(root,r);
  const dir=path.dirname(resultFile),files={};
  for(const name of ['raw.txt','normalized.txt','layout.tsv','blocks.json']){
    const file=path.join(dir,name),relative=path.relative(root,file).replaceAll('\\','/');
    assert.equal(r.artifacts[relative],sha(fs.readFileSync(file)),'Required OCR layer missing/hash mismatch');
    files[name]=ref(file);
  }
  JSON.parse(fs.readFileSync(files['blocks.json'].path,'utf8'));
  assert(Number.isInteger(r.image?.width)&&r.image.width>0&&Number.isInteger(r.image.height)&&r.image.height>0);
  const raw=fs.readFileSync(files['raw.txt'].path,'utf8'),tsv=fs.readFileSync(files['layout.tsv'].path,'utf8');
  const a=buildSourceAlignment({raw,tsv,...r.image});
  const integrity=a.invalidWordIds.length||raw.trim()&&a.status!=='exact_nonwhitespace_sequence'?'FAIL':'PASS';
  return {result:ref(resultFile),files,image:r.image,attempt:r.attempt,engineConfidence:r.engineConfidence,
    elapsedMs:r.elapsedMs,ocrMs:r.ocrMs,status:'completed',
    integrity:{status:integrity,alignment:a.status,words:a.words.length,invalidBoxes:a.invalidWordIds.length,empty:!raw.trim(),scope:'same-source consistency; not image accuracy'},
    checks:{text:{status:'pending_human_review'},formulas:{status:'pending_human_review',signal:/[A-Za-z]\d|[₀-₉⁰-⁹→⇌±]/u.test(raw)},
      scripts:{status:'pending_human_review',reason:'word boxes do not prove glyph baseline'},
      diagrams:{status:'pending_human_review',reason:'OCR blocks do not preserve graph edges'},
      tables:{status:'pending_human_review',reason:'cell structure not validated'},
      mixedLanguage:{status:'pending_human_review',signal:/[A-Za-z]/.test(raw)&&/[\u3400-\u9fff]/u.test(raw)}},
    independentHumanApproval:false,formalCER:null,formalWER:null};
}

// Adapter for the existing manifest + page-index layout. A new subject may use
// the canonical-pages adapter without inheriting any biology filename/range.
export function loadPages(config,project){
  assert(/^[\w-]+$/.test(config.subject)&&/^[\w-]+$/.test(config.materialId));
  const resolve=p=>path.resolve(project,p);
  let inputs=[],rows;
  if(config.adapter==='manifest-page-index-v1'){
    const mp=resolve(config.manifest),ip=resolve(config.pageIndex),m=read(mp),index=read(ip);
    inputs=[ref(mp),ref(ip)];assert.equal(m.scans.length,index.entries.length);
    rows=index.entries.map(e=>{
      const s=m.scans[e.seq-1];assert(s&&s.originalFileName===e.file,'Manifest/index order mismatch');
      return {scanSeq:e.seq,originalFileName:e.file,printedPage:e.printedPage??null,label:e.label??null,
        pageNumberVerification:e.verification,section:e.section??null,
        image:{path:config.sourceRoot?inside(resolve(config.sourceRoot),e.file):path.resolve(s.originalPath),
          backupPath:s.archivePath?path.resolve(s.archivePath):null,sha256:s.sha256,bytes:s.bytes}};
    });
  }else{
    assert.equal(config.adapter,'canonical-pages-v1','Unsupported source adapter');
    const p=resolve(config.pagesFile);inputs=[ref(p)];rows=read(p).pages;
    rows=rows.map(r=>({...r,image:{...r.image,path:resolve(r.image.path),backupPath:r.image.backupPath?resolve(r.image.backupPath):null}}));
  }
  assert(rows.length>0&&new Set(rows.map(r=>r.scanSeq)).size===rows.length,'Duplicate/empty scan index');
  assert.equal(new Set(rows.map(r=>r.originalFileName)).size,rows.length,'Duplicate source filename');
  for(const r of rows){assert(Number.isInteger(r.scanSeq)&&r.scanSeq>0);assert(/^[a-f0-9]{64}$/.test(r.image.sha256));}
  return {inputs,pages:rows.map(r=>({...r,subject:config.subject,materialId:config.materialId,
    pageId:config.materialId+'/scan-'+String(r.scanSeq).padStart(4,'0')}))};
}

export function buildCatalog(config,project,{extraRuns=[],extraLayoutRoots=[]}={}){
  const {inputs,pages}=loadPages(config,project),problems=[];
  const runs=[...(config.ocrRuns||[]),...extraRuns];
  const evidence=config.evidenceMap?read(path.resolve(project,config.evidenceMap)).evidence:[];
  const baseline=config.layoutBaseline?read(path.resolve(project,config.layoutBaseline)):null;
  const reviews=[];
  for(const storeRef of config.reviewStores||[]){
    const storeRoot=path.resolve(project,storeRef),store=openReviewStore(storeRoot);
    for(const filename of fs.readdirSync(path.join(storeRoot,'pages')).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){
      const r=store.readState(filename.slice(0,-5));
      if(r.page.body.subject===config.subject&&r.page.body.sourceId===config.materialId)reviews.push({...r,snapshot:ref(path.join(storeRoot,'pages',filename))});
    }
  }
  for(const p of pages){
    p.image.status='unverified';p.image.backupStatus=p.image.backupPath?'unverified':'not_registered';
    for(const [field,status]of [['path','status'],['backupPath','backupStatus']]){
      if(!p.image[field])continue;
      try{const b=fs.readFileSync(p.image[field]);assert.equal(sha(b),p.image.sha256);assert.equal(b.length,p.image.bytes);p.image[status]='saved_hash_verified';}
      catch(e){p.image[status]='unverified';problems.push({pageId:p.pageId,layer:field,message:e.message});}
    }
    p.ocr={status:'not_found_in_registered_runs',versions:[],engine:null,raw:null};
    p.layout={status:'not_found',versions:[]};p.quality={status:'not_reviewed',formalCER:null,formalWER:null};
    p.humanReview={status:'pending_human_review',record:null};
    p.retryCount=0;p.errors=[];p.kb={status:'not_imported',documentId:null};
    p.evidence=evidence.filter(e=>e.seq===p.scanSeq&&e.sha256===p.image.sha256).map(e=>({id:e.id,method:e.method}));
    for(const run of runs){
      const root=path.resolve(project,run.root),parent=inside(root,'pages/'+String(p.scanSeq).padStart(4,'0'));
      if(!fs.existsSync(parent))continue;
      for(const d of fs.readdirSync(parent).filter(n=>/^attempt-\d+$/.test(n)).sort()){
        const dir=path.join(parent,d),error=path.join(dir,'error.json'),result=path.join(dir,'result.json');
        if(fs.existsSync(error))p.errors.push({run:run.root,attempt:d,...read(error)});
        if(!fs.existsSync(result)){if(!fs.existsSync(error))p.errors.push({run:run.root,attempt:d,status:'interrupted_attempt'});continue;}
        try{const v=verifyOcr(root,result,p);v.engine=read(path.join(root,'run.json')).config.engine;p.ocr.versions.push(v);}
        catch(e){problems.push({pageId:p.pageId,layer:'ocr',file:result,message:e.message});p.errors.push({status:'invalid_result',file:result,message:e.message});}
      }
    }
    p.retryCount=p.errors.length;
    if(p.ocr.versions.length){
      const v=p.ocr.versions.at(-1);p.ocr.status='completed';p.ocr.engine=v.engine;p.ocr.raw=v.files['raw.txt'];
      p.layout.status='ocr_word_boxes_available';
      p.quality={status:v.integrity.status==='FAIL'?'integrity_failed':'pending_human_review',integrity:v.integrity,checks:v.checks,formalCER:null,formalWER:null};
    }
    const review=reviews.find(r=>r.page.body.scanSeq===p.scanSeq&&r.page.body.imageSha256===p.image.sha256);
    if(review){
      assert.equal(review.page.body.rawSha256,p.ocr.raw?.sha256,'Review/OCR source mismatch');
      p.humanReview={status:'pending_human_review',record:review.snapshot,head:review.state.head,
        proposalCount:review.queue.length,reviewEvents:review.state.reviewEventCount,
        scope:'proposal decisions are not whole-page OCR approval'};
    }
    const frozen=baseline?.sources.find(x=>x.seq===p.scanSeq);
    if(frozen&&config.layoutRoot){const f=inside(path.resolve(project,config.layoutRoot),frozen.layout.file);
      if(fs.existsSync(f)&&ref(f).sha256===frozen.layout.sha256){p.layout.versions.push({...ref(f),status:'candidate_not_human_verified'});}}
    for(const layoutRoot of extraLayoutRoots){
      const f=inside(path.resolve(project,layoutRoot),'scan'+String(p.scanSeq).padStart(4,'0')+'/layout.json');
      if(!fs.existsSync(f))continue;const l=read(f);
      assert.equal(l.seq,p.scanSeq);assert.equal(l.sourceSha256,p.image.sha256);
      assert.equal(l.sourceResult.sha256,p.ocr.versions.at(-1)?.result.sha256,'Layout/OCR version mismatch');
      p.layout.versions.push({...ref(f),status:'candidate_not_human_verified'});
      const qualityFile=path.join(path.dirname(f),'quality.json');
      if(fs.existsSync(qualityFile)){const q=read(qualityFile);assert.equal(q.source.rawSha256,p.ocr.raw.sha256);p.quality.routing={...ref(qualityFile),route:q.route,status:q.status};}
    }
  }
  return {schemaVersion:1,kind:'textbook-page-catalog-v23',internalOnly:true,createdAt:new Date().toISOString(),
    subject:config.subject,materialId:config.materialId,inputs,registeredRuns:runs,pages,problems,
    summary:{pages:pages.length,imagesSaved:pages.filter(p=>p.image.status==='saved_hash_verified').length,
      backupsSaved:pages.filter(p=>p.image.backupStatus==='saved_hash_verified').length,
      ocrCompleted:pages.filter(p=>p.ocr.status==='completed').length,
      ocrNotFound:pages.filter(p=>p.ocr.status!=='completed').length,
      qualityReviewed:0,humanApproved:0,kbImported:0}};
}
