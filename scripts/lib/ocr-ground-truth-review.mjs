// Ground Truth mode for the existing local review server, not another server.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {loadSources} from '../ocr-quality-gate/sources.mjs';
import {loadTextReviewCases} from './ocr-benchmark-text-review.mjs';
import {protectedRead,sha,verifySnapshot} from './ocr-quality-io.mjs';
import {stableStringify} from '../ocr-benchmark/core.mjs';
import {openGroundTruthStore} from './ocr-ground-truth-store.mjs';
import {candidatePanel} from './ocr-ground-truth-candidates.mjs';
import {riskHints} from './ocr-review-assistance.mjs';
export async function loadGroundTruth(project,outputDirectory){
 const loaded=await loadSources(project),originals=loadTextReviewCases(project);
 const file=path.join(project,'tmp-ocr-quality-gate-20261105-v1/report.json'),raw=protectedRead(file,loaded.snapshot),report=JSON.parse(raw.toString('utf8')),reportSHA=sha(raw);
 assert.equal(report.version,'quality-gate-prototype-1');
 const cases=loaded.regions.map(r=>{
  const c=originals.find(c=>c.id===r.region_id),q=report.regions.find(q=>q.region_id===c.id);assert(q&&q.source_gate==='PASS');
  assert.equal(q.source.image_sha256,r.source.image_sha256);assert.deepEqual(q.roi,r.roi);
  for(const e of r.engines){const prior=q.engine_inputs.find(x=>x.id===e.id);assert.deepEqual(prior.raw_ref,e.raw_ref);assert.deepEqual(prior.result_ref,e.result_ref);assert.deepEqual(prior.blocks,e.blocks);assert.deepEqual(prior.version,e.version);}
  const fingerprint=sha(Buffer.from(stableStringify({original:c.source_fingerprint,gate:reportSHA,engines:r.engines.map(e=>e.raw_ref)})));
  return {...c,fingerprint,engines:r.engines,quality:q,quality_sha256:reportSHA};
 });
 const verify=()=>verifySnapshot(loaded.snapshot),store=openGroundTruthStore(outputDirectory,cases,verify);
 return {store,cases,verify};
}
export function publicGroundTruthCase(c,store){
 return {id:c.id,seq:c.sample.scan_seq,file:c.sample.image_path,printedPage:c.sample.printed_page_label,pageVerification:c.sample.page_number_verification,
  image_sha256:c.sample.image_sha256,bounding_box:c.sample.bounding_box,fingerprint:c.fingerprint,engines:c.engines,
  quality:c.quality,ocr_candidates:candidatePanel(c),review:store.latest(c.id),simulation:c.kind!=='real'};
}
export async function groundTruthImage(c,mode,highlight=null){
 if(mode==='regions')return fs.readFileSync(c.cropPath);
 if(mode==='original')return fs.readFileSync(c.originalPath);
 assert.equal(mode,'roi','Unknown image mode');
 const source=fs.readFileSync(c.originalPath),meta=await sharp(source).metadata(),[x,y,w,h]=c.sample.bounding_box;
 let extra='';if(highlight){const hint=riskHints(c).find(h=>h.id===highlight);assert(hint,'Unknown risk highlight');const [a,b,d,e]=hint.bbox;assert([a,b,d,e].every(Number.isFinite)&&d>0&&e>0);extra=`<rect x="${a}" y="${b}" width="${d}" height="${e}" stroke="#ff9800" stroke-width="8" fill="none"/>`;}
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}"><rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="#e60046" stroke-width="6" fill="none"/>${extra}</svg>`);
 return sharp(source).composite([{input:svg}]).png().toBuffer();
}
