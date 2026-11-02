// Pure, subject-independent advisory rules. Inputs are never mutated.
import {intersection,area,iou} from './ocr-layout-prototype.mjs';
export const RULE_VERSION='1.0.0';
const union=boxes=>{const left=Math.min(...boxes.map(b=>b.left)),top=Math.min(...boxes.map(b=>b.top));return {left,top,width:Math.max(...boxes.map(b=>b.left+b.width))-left,height:Math.max(...boxes.map(b=>b.top+b.height))-top};};
const valid=(b,w,h)=>[b.left,b.top,b.width,b.height].every(Number.isInteger)&&b.left>=0&&b.top>=0&&b.width>0&&b.height>0&&b.left+b.width<=w&&b.top+b.height<=h;
export function diagnose(page){
 const {regions,words}=page.layout,issues=[],suggestions=[];
 const issue=(category,rule,ids,evidence,certainty='heuristic')=>{const item={id:'issue-'+(issues.length+1),category,rule,regionIds:ids,evidence,certainty,status:'pending_human_review'};issues.push(item);return item;};
 const suggest=(problem,action,ids,rect,evidence)=>{suggestions.push({id:'suggestion-'+(suggestions.length+1),issueId:problem.id,category:problem.category,action,regionIds:ids,rect:rect||null,confidence:'high_for_stated_geometric_or_control_condition_only',evidence,status:'pending_human_review',applied:false,humanApproved:false});};
 const images=regions.filter(r=>r.type==='image');
 if(images.length>8){
  const pairs=[];for(let i=0;i<images.length;i++)for(let j=i+1;j<images.length;j++){const a=images[i].rect,b=images[j].rect;const gapX=Math.max(0,a.left-b.left-b.width,b.left-a.left-a.width),gapY=Math.max(0,a.top-b.top-b.height,b.top-a.top-a.height);if(gapX<=40&&gapY<=40)pairs.push([images[i].id,images[j].id]);}
  issue('image-oversegmentation','many-image-components',images.map(r=>r.id),{count:images.length,threshold:8,nearPairs:pairs,action:'Inspect adjacency; do not automatically merge across captions or tables'});
 }
 for(const r of regions){
  const b=r.rect;
  if(!valid(b,page.width,page.height))issue('other','out-of-bounds',[r.id],{rect:b},'deterministic');
  const cut=words.filter(w=>{const n=intersection(w.rect,b)/area(w.rect);return n>0&&n<.98;});
  if(cut.length){const p=issue('text-incomplete','partial-OCR-word-box',[r.id],{wordBoxes:cut.map(w=>w.rect),count:cut.length,caveat:'word-box geometry only; image boundaries may intentionally cut OCR noise'},'deterministic-geometry');
   // Only offer a small expansion if it cannot overlap any other proposed region more.
   if(['heading','paragraph','caption'].includes(r.type)&&cut.every(w=>valid(w.rect,page.width,page.height)&&intersection(w.rect,b)/area(w.rect)>=.85)){
    const expanded=union([b,...cut.map(w=>w.rect)]);const neighbors=regions.filter(x=>x.id!==r.id&&x.id!==r.parentId&&x.parentId!==r.id);
    const noNewOverlap=neighbors.every(x=>intersection(x.rect,expanded)<=intersection(x.rect,b));
    const parent=regions.find(x=>x.id===r.parentId);const parentSafe=!r.parentId||(parent&&intersection(parent.rect,expanded)===area(expanded));
    if(area(expanded)<=area(b)*1.15&&valid(expanded,page.width,page.height)&&noNewOverlap&&parentSafe)suggest(p,'expand-to-complete-existing-word-box',[r.id],expanded,{maxAreaGrowth:1.15,noIncreasedNeighborOverlap:true,noTextInferred:true});
   }
  }
  const contained=words.filter(w=>intersection(w.rect,b)/area(w.rect)>.5),low=contained.filter(w=>w.confidence<50).length;
  if(contained.length&&low/contained.length>.3)issue('other','low-OCR-confidence',[r.id],{low,contained:contained.length,threshold:50,caveat:'engine confidence is not accuracy'});
  if(r.type==='table'){
   const children=regions.filter(x=>x.parentId===r.id);
   if(!children.length)issue('table-misclassification','color-table-without-subregions',[r.id],{wordCount:contained.length,method:r.evidence,conclusion:'Could be a colored panel or missed rows; cannot decide'},'undetermined');
   else issue('table-misclassification','color-only-table-unverified',[r.id],{childCount:children.length,conclusion:'Table structure not independently verified; not a confirmed false positive'},'undetermined');
  }
 }
 for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++){
  const a=regions[i],b=regions[j];if(a.parentId===b.id||b.parentId===a.id)continue;const ratio=iou(a.rect,b.rect);
  if(ratio>.5){const p=issue('other','overlapping-proposals',[a.id,b.id],{iou:ratio,sameType:a.type===b.type},'deterministic-geometry');
   if(ratio>=.92&&a.type===b.type&&a.parentId===b.parentId)suggest(p,'review-near-duplicate-pair',[a.id,b.id],union([a.rect,b.rect]),{iou:ratio,deleteNothing:true,mergeNotAuthorized:true});
  }
 }
 const noWords=words.length===0;
 if(noWords&&regions.length){const known=page.diagnostics?.blankControl===true;const p=issue('blank-misclassification','no-OCR-words-with-regions',regions.map(r=>r.id),{ocrWords:0,proposalCount:regions.length,existingBlankControl:known,conclusion:known?'Existing blank-control contradiction':'Could be an image-only page; cannot decide'},known?'control-contradiction':'undetermined');
  if(known)suggest(p,'quarantine-for-blank-control-review',regions.map(r=>r.id),null,{existingControl:true,preserveEveryRegion:true,noAutomaticBlankGroundTruth:true});
 }
 const dispositions=regions.map(r=>{const related=issues.filter(p=>p.regionIds.includes(r.id)),proposed=suggestions.some(p=>p.regionIds.includes(r.id));return {regionId:r.id,automaticBoundaryCheck:valid(r.rect,page.width,page.height)?'pass':'fail',disposition:proposed||related.some(i=>i.certainty!=='undetermined')?'needs_human_review':related.length||r.heuristicScore<.5?'undetermined':'automatic_checks_passed',status:'pending_human_review',caveat:'automatic_checks_passed is not verified correctness'};});
 return {ruleVersion:RULE_VERSION,seq:page.seq,status:'pending_human_review',issues,suggestions,dispositions,accuracy:null,groundTruthCount:0};
}
export function advisoryRegions(page,diagnosis){
 const copy=structuredClone(page.layout.regions);
 for(const s of diagnosis.suggestions){if(s.action!=='expand-to-complete-existing-word-box')continue;const r=copy.find(r=>r.id===s.regionIds[0]);if(r&&s.rect)r.rect=structuredClone(s.rect);}
 return copy;
}
