// Canonical proposal contract; no OCR, network, or source writes.
export const proposalContractVersion='ocr-ai-proposal-v2';
export function inspectBBox(c,image){
  const hasPrimary=Object.hasOwn(c,'bbox'),hasLegacy=Object.hasOwn(c,'original-pixel bbox');
  const conflict=hasPrimary&&hasLegacy&&JSON.stringify(c.bbox)!==JSON.stringify(c['original-pixel bbox']);
  const bbox=conflict?null:hasPrimary?c.bbox:hasLegacy?c['original-pixel bbox']:null;
  const valid=Array.isArray(bbox)&&bbox.length===4&&bbox.every(Number.isFinite)&&
    Number.isFinite(image.width)&&Number.isFinite(image.height)&&image.width>0&&image.height>0&&
    bbox[0]>=0&&bbox[1]>=0&&bbox[2]>0&&bbox[3]>0&&bbox[0]+bbox[2]<=image.width&&bbox[1]+bbox[3]<=image.height;
  return {bbox,aliasConflict:conflict,boundsValid:valid,originalField:hasPrimary?'bbox':hasLegacy?'original-pixel bbox':null};
}
export function sourceLines(raw){
  let offset=0;
  return raw.split('\n').map((text,i)=>{const start=offset;offset+=text.length+1;return {id:'line-'+String(i+1).padStart(4,'0'),start,end:start+text.length,text};});
}
const boxSchema={type:['array','null'],items:{type:'number'},minItems:4,maxItems:4};
const changeProperties={start:{type:['integer','null']},end:{type:['integer','null']},before:{type:'string'},after:{type:'string'},bbox:boxSchema,
  sourceLineIds:{type:'array',items:{type:'string'}},category:{type:'string'},reason:{type:'string'},confidence:{type:['number','null']}};
export const proposalResponseSchema={type:'object',additionalProperties:false,
  properties:{changes:{type:'array',items:{type:'object',additionalProperties:false,properties:changeProperties,required:Object.keys(changeProperties)}},
    structuralObservations:{type:'array',items:{type:'string'}},unresolvedRegions:{type:'array',items:{type:'object',additionalProperties:false,properties:{region:{type:'string'},bbox:boxSchema,issue:{type:'string'}},required:['region','bbox','issue']}}},
  required:['changes','structuralObservations','unresolvedRegions']};
