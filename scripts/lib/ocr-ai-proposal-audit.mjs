// Offline evidence adapter. Never applies replacements or validates semantics.
import assert from 'node:assert/strict';
import {inspectBBox} from './ocr-ai-proposal-contract.mjs';
export function locateExact(raw,before){
  assert(typeof raw==='string'&&typeof before==='string');
  if(!before)return {status:'empty_anchor',matches:[],span:null};
  const matches=[];
  for(let i=raw.indexOf(before);i!==-1;i=raw.indexOf(before,i+1))matches.push(i);
  const splitsSurrogate=i=>i>0&&i<raw.length&&/[\uD800-\uDBFF]/.test(raw[i-1])&&/[\uDC00-\uDFFF]/.test(raw[i]);
  const valid=matches.length===1&&!splitsSurrogate(matches[0])&&!splitsSurrogate(matches[0]+before.length);
  return {status:matches.length===1?(valid?'unique_exact_match':'invalid_unicode_boundary'):matches.length?'ambiguous':'not_found',matches,span:valid?{start:matches[0],end:matches[0]+before.length,unit:'utf16_code_units',endExclusive:true}:null};
}
export function auditProposal(c,raw,image){
  const a=locateExact(raw,c.before);
  const box=inspectBBox(c,image);
  const originalOffsetsValid=Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=0&&c.end>c.start&&c.end<=raw.length&&raw.slice(c.start,c.end)===c.before;
  return {originalProposal:c,originalOffsetsValid,textLocator:a,sourceLines:a.span?{start:raw.slice(0,a.span.start).split('\n').length,end:raw.slice(0,a.span.end-1).split('\n').length}:null,
    imageLocator:{coordinateSpace:'original_image_pixels',imageWidth:image.width,imageHeight:image.height,...box,visualAlignmentVerified:false},
    validation:{textAnchorResolved:a.status==='unique_exact_match',geometryOnly:box.boundsValid,semanticVerified:false},status:'pending_human_review',autoApplyAllowed:false};
}
