import assert from 'node:assert/strict';
import {inspectBBox,proposalContractVersion,proposalResponseSchema,sourceLines} from './ocr-ai-proposal-contract.mjs';
export const trialPages = Object.freeze([2,10,19,60,200,230,317,324,325,465,472,486]);
export const model = 'gpt-5.4-mini-2026-03-17';
export function reserveBudget({inputTokens,maxOutputTokens,spentUsd=0,limitUsd=0.25}) {
  assert([inputTokens,maxOutputTokens].every(v=>Number.isSafeInteger(v)&&v>=0),'Invalid token bounds');
  assert(Number.isFinite(spentUsd)&&spentUsd>=0&&limitUsd===0.25,'Budget must be exactly USD 0.25');
  // Uncached standard pricing; all output (including reasoning) reserved.
  const reservedUsd=(inputTokens*0.75+maxOutputTokens*4.5)/1e6;
  assert(spentUsd+reservedUsd<=limitUsd,'Budget exceeded: refusing inference');
  return {limitUsd,spentUsd,reservedUsd,maximumTotalUsd:spentUsd+reservedUsd};
}
// No network calls in this module. A request is only an offline preparation.
export function prepareRequest({seq,raw,imageBytes,imageSize=null}) {
  assert(trialPages.includes(seq), 'Page outside approved trial');
  assert(typeof raw === 'string' && Buffer.isBuffer(imageBytes) && imageBytes.length, 'Image and raw OCR required');
  if(imageSize)assert([imageSize.width,imageSize.height].every(v=>Number.isSafeInteger(v)&&v>0),'Invalid original image dimensions');
  return {model,store:false,max_output_tokens:8000,text:{format:{type:'json_schema',name:'ocr_ai_proposals_v2',strict:true,schema:proposalResponseSchema}},input:[
    {role:'developer',content:[{type:'input_text',text:'Compare the original scan with immutable raw OCR. Return JSON proposals only. Use the exact field bbox: original image pixels [x,y,width,height], or null when uncertain. Never use original-pixel bbox as a key. Cite sourceLineIds; copy before exactly including whitespace. start/end are UTF-16 code units, end exclusive; use null if unsure. Local code locates before without guessing. Do not reconstruct missing content from subject knowledge. Preserve scientific terms, uppercase/lowercase, formulas, subscripts, superscripts, tables, figure labels, branches and reading order. Put unresolvable material into unresolvedRegions instead of inventing corrections. All changes require source-image/human review; confidence is not accuracy. Never create Ground Truth or claim verified text.'}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify({seq,contractVersion:proposalContractVersion,imageSize,offsetConvention:'UTF-16 code units; end exclusive',raw,sourceLines:sourceLines(raw)})},{type:'input_image',image_url:'data:image/jpeg;base64,'+imageBytes.toString('base64'),detail:'high'}]}
  ]};
}
export function validateChanges(changes,{raw,width,height}) {
  assert(Array.isArray(changes));
  let lastEnd=-1;
  for (const c of [...changes].sort((a,b)=>a.start-b.start)) {
    assert(Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=0&&c.end>c.start&&c.end<=raw.length,'Invalid replacement offsets; insertions require separate human review');
    assert.equal(raw.slice(c.start,c.end),c.before,'Before text mismatch');
    assert(c.start>=lastEnd,'Overlapping changes'); lastEnd=c.end;
    assert(typeof c.after==='string'&&typeof c.reason==='string'&&c.reason.length>0,'Missing proposed text/reason');
    const box=inspectBBox(c,{width,height});
    assert(!box.aliasConflict,'Conflicting bbox aliases');
    assert(box.boundsValid,'Invalid bbox or out of image bounds');
    assert(Number.isFinite(c.confidence)&&c.confidence>=0&&c.confidence<=1,'Invalid confidence');
  }
  return {status:'pending_human_review',mechanicalChecksPassed:true,verified:false,cer:null,wer:null,correctRepairs:null,newErrors:null};
}
export function estimateMiniCost(usage) {
  if(!usage)return null;
  const input=usage.input_tokens,output=usage.output_tokens,cached=usage.input_tokens_details?.cached_tokens??0;
  assert([input,output,cached].every(v=>Number.isInteger(v)&&v>=0)&&cached<=input,'Invalid token usage');
  return {currency:'USD',estimatedFromReturnedUsage:((input-cached)*0.75+cached*0.075+output*4.5)/1e6,pricingDate:'2026-11-03',invoiceVerified:false};
}
