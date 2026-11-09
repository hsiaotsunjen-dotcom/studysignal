// Common provider interface, local replay/mock only. No network implementation.
import assert from 'node:assert/strict';
import {PROVIDERS,assertSource} from './core.mjs';
import {estimateCost} from './budget.mjs';
import {normalizeResponse,NORMALIZER_VERSION} from './normalize.mjs';
export function replayReceipt(req,c,engineId='paddle'){
 assertSource(req,c);const engine=c.engines.find(e=>e.id===engineId);assert(engine,'Replay engine missing');
 const [x,y,w,h]=c.sample.bounding_box,toPoly=b=>{const [a,d,r,s]=b;return [[(a-x)/w,(d-y)/h],[(a+r-x)/w,(d-y)/h],[(a+r-x)/w,(d+s-y)/h],[(a-x)/w,(d+s-y)/h]];};
 // Ignore blocks outside the bound ROI by refusing replay, never clipping them.
 for(const b of engine.blocks)assert(b.bbox[0]>=x&&b.bbox[1]>=y&&b.bbox[0]+b.bbox[2]<=x+w+1e-8&&b.bbox[1]+b.bbox[3]<=y+h+1e-8,'Replay block outside ROI');
 let body;
 if(req.provider==='google')body={document:{text:engine.text,pages:[{pageNumber:1,dimension:{width:w,height:h,unit:'pixels'},lines:engine.blocks.map(b=>({layout:{textAnchor:{content:b.text},boundingPoly:{normalizedVertices:toPoly(b.bbox).map(([x,y])=>({x,y}))}}}))}]}};
 else if(req.provider==='azure')body={status:'succeeded',analyzeResult:{apiVersion:'2024-11-30',modelId:'prebuilt-layout',content:engine.text,pages:[{pageNumber:1,width:w,height:h,unit:'pixel',lines:engine.blocks.map(b=>({content:b.text,polygon:toPoly(b.bbox).flatMap(([a,d])=>[a*w,d*h])}))}]}};
 else if(req.provider==='openai')body={status:'completed',model:req.model_version,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({schema_version:'studysignal-ocr-content-v1',text:engine.text,coordinate_space:'crop_pixels',blocks:engine.blocks.map((b,i)=>({id:'replay:'+i,text:b.text,bbox:[b.bbox[0]-x,b.bbox[1]-y,b.bbox[2],b.bbox[3]]})),reading_order:engine.blocks.map((_,i)=>'replay:'+i)})}]}]};
 else throw Error('Unsupported provider');
 return {mode:'local-replay',provider:req.provider,model_version:req.model_version,request_key:req.cache_key,image_sha256:req.source.image_sha256,crop_sha256:req.source.crop_ref.sha256,
  replay_engine:engineId,replay_version:structuredClone(engine.version),replay_raw_ref:structuredClone(engine.raw_ref),elapsed_ms:null,raw_response:JSON.stringify(body)};
}
export function createOfflineProvider(provider,{fixture=null,fixtureId=null,replayEngine='paddle'}={}){
 assert(Object.hasOwn(PROVIDERS,provider),'Unknown provider');if(fixture)assert(typeof fixtureId==='string'&&fixtureId.trim(),'Explicit fixture version required for cache identity');let calls=0;
 return Object.freeze({id:provider,interface_version:'ocr-provider-offline-v2',normalizer_version:NORMALIZER_VERSION,execution_mode:fixture?'mock-native':'local-replay',
  strategy_id:fixture?'fixture:'+fixtureId:'local-replay:'+replayEngine,get calls(){return calls;},network_calls:0,actual_cost_usd:0,
  estimate(request,bounds){assert.equal(request.provider,provider);return estimateCost(request,bounds);},
  async recognize(request,c){assert.equal(request.provider,provider);assertSource(request,c);calls++;
   const receipt=fixture?await fixture(request,c):replayReceipt(request,c,replayEngine);try{return normalizeResponse(request,c,receipt);}catch(e){e.offline_receipt=receipt;throw e;}
  },
  async executeLive(){throw Error('B2-2 offline only: live execution unavailable');}
 });
}
