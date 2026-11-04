// Reusable page-level evidence pass; no filesystem, model or OCR execution.
import {validateProposals} from './ocr-ai-proposal-validation.mjs';
import {buildSourceAlignment,sourceGeometry,textEdits} from './ocr-ai-source-evidence.mjs';
import {compareScientificText} from './ocr-ai-formula-evidence.mjs';
export function evaluateSourceEvidence(changes,{raw,tsv,width,height,priorObservations=[]}){
  const baseline=validateProposals(changes,{raw,width,height,priorObservations});
  const alignment=buildSourceAlignment({raw,tsv,width,height});
  const records=baseline.records.map(r=>{
    if(!r.canonicalProposal)return {...r,evidenceStatus:'invalid_proposal',textDifference:null,scienceEvidence:null,sourceGeometry:null};
    const c=r.canonicalProposal,difference=textEdits(c.before,c.after),span=c.span;
    const edits=difference.edits?.map(e=>{
      const sourceSpan=span?{start:span.start+e.beforeStart,end:span.start+e.beforeEnd,unit:'utf16_code_units',endExclusive:true}:null;
      return {...e,sourceSpan,sourceGeometry:sourceSpan&&sourceSpan.end>sourceSpan.start?sourceGeometry(alignment,sourceSpan,c.bbox):{status:'unresolved',reason:'insertion_has_no_original_glyph_span',imageContentVerified:false,autoApplyAllowed:false}};
    })??null;
    return {...r,sourceGeometry:sourceGeometry(alignment,span,c.bbox),textDifference:{...difference,edits},scienceEvidence:compareScientificText(c.before,c.after),
      evidenceStatus:'advisory_source_links_not_accepted_correction',status:'pending_human_review',autoApplyAllowed:false,semanticVerified:false};
  });
  return {evidenceVersion:'source-evidence-v2.1',alignment:{status:alignment.status,scope:alignment.scope,words:alignment.words.length,nonWhitespaceUnits:alignment.nonWhitespaceUnits,tsvUnits:alignment.tsvUnits,firstMismatch:alignment.firstMismatch,invalidWordIds:alignment.invalidWordIds},
    counts:baseline.counts,records,acceptedChanges:0,cer:null,wer:null,correctRepairs:null,newErrors:null};
}
