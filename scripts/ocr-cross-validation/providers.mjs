// Provider-independent fixture envelope, NOT a live vendor API parser/SDK.
import assert from 'node:assert/strict';
import {validateResult} from '../ocr-benchmark/core.mjs';
import {assertSource,validateRequest} from './core.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';
export function toOriginalBox(box,space,source){
 assert(Array.isArray(box)&&box.length===4&&box.every(Number.isFinite),'Box must be xywh');const [x,y,w,h]=box,[ox,oy,rw,rh]=source.roi;
 assert(x>=0&&y>=0&&w>0&&h>0,'Invalid box');let value;
 if(space==='crop_pixels'){assert(x+w<=rw&&y+h<=rh,'Crop bounds exceeded');value=[ox+x,oy+y,w,h];}
 else if(space==='crop_normalized'){assert(x+w<=1+1e-12&&y+h<=1+1e-12,'Normalized bounds exceeded');value=[ox+x*rw,oy+y*rh,w*rw,h*rh];}
 else if(space==='original_image_pixels'){assert(x>=ox&&y>=oy&&x+w<=ox+rw&&y+h<=oy+rh,'Original box outside ROI');value=[...box];}
 else throw Error('Unsupported coordinates; inches/polygons require explicit future adapter');
 return value;
}
export function importFixture(req,c,rawText){
 validateRequest(req);assertSource(req,c);assert(typeof rawText==='string');const r=JSON.parse(rawText);
 assert.equal(r.format,'b2-1-provider-fixture');assert.equal(r.synthetic_test_only,true,'Only synthetic offline envelopes supported');
 assert.equal(c.kind,'synthetic_test_only','Do not disguise real OCR output as a fixture');assert.equal(r.provider,req.provider);assert.equal(r.model_version,req.model_version);assert.equal(r.request_key,req.cache_key);
 assert.equal(r.image_sha256,req.source.image_sha256);assert.equal(r.crop_sha256,req.source.crop_ref.sha256);assert(typeof r.text==='string'&&Array.isArray(r.blocks));
 const ids=new Set();const blocks=r.blocks.map(b=>{assert(typeof b.id==='string'&&b.id&&!ids.has(b.id),'Duplicate/invalid block ID');ids.add(b.id);assert(typeof b.text==='string');return {id:b.id,text:b.text,bbox:toOriginalBox(b.bbox,r.coordinate_space,req.source),native_bbox:[...b.bbox],native_space:r.coordinate_space,position_evidence:r.position_evidence??'fixture_native_not_real_measurement'};});
 assert(r.execution_time_ms===null||Number.isFinite(r.execution_time_ms)&&r.execution_time_ms>=0,'Invalid time');
 const model={result_id:req.cache_key,sample_id:c.id,image_sha256:c.sample.image_sha256,model_family:'commercial-vision',model_id:req.provider,model_version:r.model_version,model_config:req.config,execution_time:r.execution_time_ms,execution_time_unit:'ms',estimated_cost:null,actual_cost:0,currency:'USD',OCR_output:{text:r.text,structure:r.structure??null,structure_alignment:r.structure_alignment??null},benchmark_result:null};
 validateResult(model,c.sample);
 return {provider:req.provider,model_version:r.model_version,request_key:req.cache_key,sample_id:c.id,image_sha256:c.sample.image_sha256,source_fingerprint:c.fingerprint,roi:[...c.sample.bounding_box],raw_sha256:sha(Buffer.from(rawText)),raw_response:rawText,blocks,model,usage:r.usage??null,actual_cost_usd:0,cost_status:'synthetic_no_API',validation_state:'machine-generated',content_confidence:null,calibration_status:'not_calibrated',verified:false};
}
export function fixtureTransport(response){
 let calls=0;return {get calls(){return calls;},async execute(req,c){calls++;return importFixture(req,c,JSON.stringify(response(req,c)));},network_calls:0,api_cost_usd:0};
}
export function validateStoredCandidate(candidate,source){
 assert.equal(candidate.provider,candidate.model.model_id);assert.equal(candidate.sample_id,source.region_id);assert.equal(candidate.image_sha256,source.image_sha256);assert.equal(candidate.source_fingerprint,source.source_fingerprint);assert.deepEqual(candidate.roi,source.roi);
 assert.equal(candidate.raw_sha256,sha(Buffer.from(candidate.raw_response)),'Raw response hash mismatch');const raw=JSON.parse(candidate.raw_response);
 assert(raw.format==='b2-1-provider-fixture'&&raw.synthetic_test_only===true,'Only offline fixture records supported');
 assert.equal(raw.image_sha256,source.image_sha256);assert.equal(raw.crop_sha256,source.crop_ref.sha256);assert.equal(raw.provider,candidate.provider);assert.equal(raw.model_version,candidate.model_version);assert.equal(raw.request_key,candidate.request_key);
 assert.equal(candidate.model.OCR_output.text,raw.text,'Normalized text diverged from immutable raw');assert.deepEqual(candidate.model.OCR_output.structure,raw.structure??null);
 assert.deepEqual(candidate.blocks.map(b=>({id:b.id,text:b.text,bbox:b.bbox})),raw.blocks.map(b=>({id:b.id,text:b.text,bbox:toOriginalBox(b.bbox,raw.coordinate_space,source)})),'Normalized positions diverged from raw');
 assert(candidate.verified===false&&candidate.content_confidence===null,'Fixture cannot be verified');
}
