// Offline evidence adapter. Never applies replacements or validates semantics.
import assert from 'node:assert/strict';
export function locateExact(raw,before){
  assert(typeof raw==='string'&&typeof before==='string');
  if(!before)return {status:'empty_anchor',matches:[],span:null};
  const matches=[];
  for(let i=raw.indexOf(before);i!==-1;i=raw.indexOf(before,i+1))matches.push(i);
  return {status:matches.length===1?'unique_exact_match':matches.length?'ambiguous':'not_found',matches,span:matches.length===1?{start:matches[0],end:matches[0]+before.length,unit:'utf16_code_units',endExclusive:true}:null};
}
export function auditProposal(c,raw,image){
  const a=locateExact(raw,c.before);
  const primary=c.bbox,legacy=c['original-pixel bbox'];
  const conflict=primary!==undefined&&legacy!==undefined&&JSON.stringify(primary)!==JSON.stringify(legacy);
  const bbox=conflict?null:(primary??legacy??null);
  const valid=Array.isArray(bbox)&&bbox.length===4&&bbox.every(Number.isFinite)&&bbox[0]>=0&&bbox[1]>=0&&bbox[2]>0&&bbox[3]>0&&bbox[0]+bbox[2]<=image.width&&bbox[1]+bbox[3]<=image.height;
  const originalOffsetsValid=Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=0&&c.end>c.start&&c.end<=raw.length&&raw.slice(c.start,c.end)===c.before;
  return {originalProposal:c,originalOffsetsValid,textLocator:a,sourceLines:a.span?{start:raw.slice(0,a.span.start).split('\n').length,end:raw.slice(0,a.span.end-1).split('\n').length}:null,
    imageLocator:{coordinateSpace:'original_image_pixels',imageWidth:image.width,imageHeight:image.height,originalField:primary!==undefined?'bbox':legacy!==undefined?'original-pixel bbox':null,bbox,aliasConflict:conflict,boundsValid:valid,visualAlignmentVerified:false},
    validation:{textAnchorResolved:a.status==='unique_exact_match',geometryOnly:valid,semanticVerified:false},status:'pending_human_review',autoApplyAllowed:false};
}
