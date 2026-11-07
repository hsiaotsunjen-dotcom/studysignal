// Fixed approved two-region adapter; all original artifacts are read-only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {loadTextReviewCases,verifyTextSource,TEXT_REGIONS,openTextReviewStore} from '../lib/ocr-benchmark-text-review.mjs';
import {sha,protectedRead,verifySnapshot,inside} from '../lib/ocr-quality-io.mjs';
import {buildSourceAlignment} from '../lib/ocr-ai-source-evidence.mjs';
const close=(a,b)=>Math.abs(a-b)<1e-6;
export async function loadSources(project){
 const root=inside(project,'tmp-ocr-dual-engine-20261105'),paddleRoot=inside(root,'recheck-01'),snapshot=new Map();
 const bytes=f=>protectedRead(f,snapshot),json=f=>JSON.parse(bytes(f).toString('utf8'));
 const cases=loadTextReviewCases(project),inputs=json(path.join(root,'inputs.json')).regions;
 assert.deepEqual(inputs.map(r=>r.id),[...TEXT_REGIONS]);
 const modelsPath=path.join(root,'model-downloads.json'),models=json(modelsPath);
 assert.deepEqual(models.models.map(m=>m.repository),['PaddlePaddle/PP-OCRv5_server_det','PaddlePaddle/PP-OCRv5_server_rec']);
 for(const m of models.models){assert(/^[a-f0-9]{40}$/.test(m.revision));for(const f of m.files){const b=bytes(inside(root,`models/${m.repository.split('/')[1]}/${f.file}`));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}}
 const reviewRoot=path.join(project,'tmp-ocr-benchmark-v11-human-corrections');
 const store=fs.existsSync(reviewRoot)?openTextReviewStore(reviewRoot,cases):null;
 const regions=[];
 for(const c of cases){
  verifyTextSource(c);for(const ref of c.refs)assert.equal(sha(bytes(ref.path)),ref.sha256);
  const latest=store?.latest(c.id); // Read and validate only; no .save or .benchmark call.
  if(fs.existsSync(reviewRoot))for(const d of [reviewRoot,path.join(reviewRoot,c.id)])if(fs.existsSync(d))for(const f of fs.readdirSync(d))if(f.endsWith('.json'))bytes(path.join(d,f));
  const r=inputs.find(x=>x.id===c.id);assert.equal(r.image_sha256,c.sample.image_sha256);assert.equal(r.crop_sha256,c.binding.crop_sha256);assert.deepEqual(r.original_bbox,c.sample.bounding_box);
  const input=bytes(inside(project,r.input));assert.equal(sha(input),r.input_sha256);
  const [left,top,width,height]=r.original_bbox,meta=await sharp(bytes(c.originalPath)).metadata();assert(left>=0&&top>=0&&left+width<=meta.width&&top+height<=meta.height);
  const crop=await sharp(bytes(c.originalPath)).extract({left,top,width,height}).png().toBuffer();assert.equal(sha(crop),r.crop_sha256);
  const prepared=await sharp(crop).resize({width:width*2}).grayscale().normalize({lower:1,upper:99}).sharpen({sigma:1}).png().toBuffer();assert.equal(sha(prepared),r.input_sha256);
  const ti=path.join(root,'tesseract-results',c.id),pi=path.join(paddleRoot,'paddle-results',c.id);
  const t=json(path.join(ti,'result.json')),p=json(path.join(pi,'result.json')),tr=bytes(path.join(ti,'raw.txt')),pr=bytes(path.join(pi,'raw.txt')),tsv=bytes(path.join(ti,'layout.tsv')).toString('utf8');
  const payload=json(path.join(pi,'raw-output.json')).res;
  assert.equal(t.region_id,c.id);assert.equal(p.region_id,c.id);assert.equal(sha(tr),t.raw_sha256);assert.equal(sha(pr),p.raw_text_sha256);
  assert.equal(p.versions.paddleocr,'3.7.0');assert.equal(p.versions.paddlepaddle,'3.3.0');assert.equal(p.versions.paddlex,'3.7.0');assert.equal(t.version,'7.0.0');
  assert.equal(t.input_sha256,r.input_sha256);assert.equal(p.input_sha256,r.input_sha256);assert.equal(r.input_width,width*2);assert.equal(r.input_height,height*2);
  const align=buildSourceAlignment({raw:tr.toString('utf8'),tsv,width:r.input_width,height:r.input_height});assert.equal(align.status,'exact_nonwhitespace_sequence');assert.equal(align.invalidWordIds.length,0);assert.equal(align.words.length,t.words.length);
  const tb=t.words.map((w,i)=>{
   const a=align.words[i];assert.equal(a.text,w.text);assert.deepEqual(w.input_bbox,[a.rect.left,a.rect.top,a.rect.width,a.rect.height]);
   const expected=[a.rect.left/2+left,a.rect.top/2+top,a.rect.width/2,a.rect.height/2];assert(w.original_bbox.every((v,j)=>close(v,expected[j])));
   return {id:`t${i}`,text:w.text,bbox:expected};
  });
  assert.deepEqual(payload.rec_texts,p.lines);assert.deepEqual(payload.rec_polys,p.input_polygons);assert.equal(pr.toString('utf8'),p.lines.join('\n'));assert.equal(p.lines.length,p.original_image_polygons.length);
  const pb=p.lines.map((text,i)=>{
   const poly=p.input_polygons[i];assert(poly.length>=4&&poly.every(q=>q.length===2&&q.every(Number.isFinite)&&q[0]>=0&&q[1]>=0&&q[0]<=r.input_width&&q[1]<=r.input_height));
   const original=poly.map(([x,y])=>[x/2+left,y/2+top]);assert.deepEqual(original,p.original_image_polygons[i]);
   const x=Math.min(...original.map(v=>v[0])),y=Math.min(...original.map(v=>v[1]));
   return {id:`p${i}`,text,bbox:[x,y,Math.max(...original.map(v=>v[0]))-x,Math.max(...original.map(v=>v[1]))-y],polygon:original};
  });
  const ref=file=>({path:path.relative(project,file).replaceAll('\\','/'),sha256:snapshot.get(file)});
  regions.push({region_id:c.id,region_type:c.sample.region_type,roi:r.original_bbox,
   source:{integrity_verified:true,material_id:c.sample.material_id??null,page_id:c.sample.page_id,scan_seq:c.sample.scan_seq,
    printed_page:c.sample.printed_page,page_number_verification:c.sample.page_number_verification,image_sha256:c.sample.image_sha256,
    image_path:c.originalPath,crop_sha256:r.crop_sha256,input_sha256:r.input_sha256,source_fingerprint:c.source_fingerprint,
    model_manifest:ref(modelsPath),human_annotation_status:latest?.annotation_status??'pending_human_review',human_reference_used:false},
   engines:[{id:'tesseract',version:t.version,config:t.config,text:tr.toString('utf8'),blocks:tb,raw_ref:ref(path.join(ti,'raw.txt')),result_ref:ref(path.join(ti,'result.json')),layout_ref:ref(path.join(ti,'layout.tsv'))},
    {id:'paddle',version:p.versions,config:{models:models.models.map(m=>({repository:m.repository,revision:m.revision})),cpu_threads:4,mkldnn:false},text:pr.toString('utf8'),blocks:pb,raw_ref:ref(path.join(pi,'raw.txt')),result_ref:ref(path.join(pi,'result.json')),layout_ref:ref(path.join(pi,'raw-output.json'))}]});
 }
 verifySnapshot(snapshot);return {regions,snapshot,verify:()=>verifySnapshot(snapshot)};
}
