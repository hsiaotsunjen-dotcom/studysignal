import {auditProposal} from './ocr-ai-proposal-audit.mjs';
import {scienceGuards} from './ocr-ai-science-guards.mjs';
import {sourceLines} from './ocr-ai-proposal-contract.mjs';
export const validationRuleVersion='proposal-validation-v2';
export function validateProposals(changes,{raw,width,height,protectedTerms,priorObservations=[]}={}){
  if(!Array.isArray(changes)||typeof raw!=='string')throw Error('Expected changes array and immutable raw string');
  const records=changes.map((c,i)=>{
    const fieldsValid=c!==null&&typeof c==='object'&&!Array.isArray(c)&&typeof c.before==='string'&&typeof c.after==='string'&&typeof c.reason==='string'&&c.reason.trim().length>0&&typeof c.category==='string'&&c.category.length>0&&(c.confidence===null||(Number.isFinite(c.confidence)&&c.confidence>=0&&c.confidence<=1));
    if(!fieldsValid)return {id:'proposal-'+String(i+1).padStart(2,'0'),originalProposal:c,issues:[{code:'invalid_proposal_fields',severity:'potential_error'}],classification:'potential_error',status:'pending_human_review',autoApplyAllowed:false,semanticVerified:false};
    const audit=auditProposal(c,raw,{width,height}),issues=scienceGuards(c,{protectedTerms});
    // Caller must bind prior observations to image/raw/response hashes. Exact
    // proposal matching prevents applying a previous assessment to another edit.
    const observations=priorObservations.filter(o=>JSON.stringify(o.originalProposal)===JSON.stringify(c));
    const observation=observations.length===1?observations[0].evidenceAssessment:null;
    if(observation?.category==='insufficient_evidence')issues.push({code:'prior_visual_evidence_insufficient',severity:'insufficient_evidence'});
    if(observation?.category==='potential_error')issues.push({code:'prior_visual_possible_error',severity:'potential_error'});
    const span=audit.textLocator.span;
    const lineIds=span?sourceLines(raw).filter(l=>l.start<span.end&&l.end>span.start).map(l=>l.id):[];
    if(c.sourceLineIds!==undefined&&(!Array.isArray(c.sourceLineIds)||JSON.stringify([...c.sourceLineIds].sort())!==JSON.stringify([...lineIds].sort())))issues.push({code:'source_line_reference_mismatch',severity:'insufficient_evidence'});
    if(c.confidence===null)issues.push({code:'model_uncertainty',severity:'insufficient_evidence'});
    if(audit.textLocator.status!=='unique_exact_match')issues.push({code:'text_anchor_'+audit.textLocator.status,severity:'insufficient_evidence'});
    if(!audit.originalOffsetsValid)issues.push({code:'original_offset_mismatch',severity:'review'});
    if(audit.imageLocator.aliasConflict)issues.push({code:'bbox_alias_conflict',severity:'potential_error'});
    else if(audit.imageLocator.bbox===null)issues.push({code:'missing_bbox',severity:'insufficient_evidence'});
    else if(!audit.imageLocator.boundsValid)issues.push({code:'invalid_bbox',severity:'potential_error'});
    if(c.before!==c.after)issues.push({code:'source_image_confirmation_required',severity:'review'});
    return {id:'proposal-'+String(i+1).padStart(2,'0'),...audit,
      priorEvidenceAssessment:observation,
      canonicalProposal:{before:c.before,after:c.after,bbox:audit.imageLocator.bbox,span:audit.textLocator.span,sourceLineIds:lineIds,reason:c.reason,confidence:c.confidence,category:c.category},issues};
  });
  for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
    const a=records[i].textLocator?.span,b=records[j].textLocator?.span;
    if(a&&b&&a.start<b.end&&b.start<a.end){
      records[i].issues.push({code:'overlapping_text_span',severity:'potential_error',other:records[j].id});
      records[j].issues.push({code:'overlapping_text_span',severity:'potential_error',other:records[i].id});
    }
  }
  for(const r of records){
    const has=s=>r.issues.some(i=>i.severity===s);
    r.classification=has('potential_error')?'potential_error':has('insufficient_evidence')?'insufficient_evidence':has('review')?'human_review':'auto_confirmable';
    r.classificationScope=r.classification==='auto_confirmable'?'unchanged_text_and_mechanical_checks_only':'proposed_change_not_accepted';
    r.semanticVerified=false;r.status='pending_human_review';r.autoApplyAllowed=false;
  }
  return {ruleVersion:validationRuleVersion,records,counts:Object.fromEntries(['auto_confirmable','human_review','insufficient_evidence','potential_error'].map(k=>[k,records.filter(r=>r.classification===k).length])),cer:null,wer:null,acceptedChanges:0};
}
