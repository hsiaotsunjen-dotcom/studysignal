import crypto from 'node:crypto';
export const textHash=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
export function editDistance(reference,hypothesis){
  let row=Array.from({length:hypothesis.length+1},(_,i)=>i);
  for(let i=1;i<=reference.length;i++){const next=[i];for(let j=1;j<=hypothesis.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(reference[i-1]===hypothesis[j-1]?0:1));row=next;}
  return row[hypothesis.length];
}
export const chineseTokens=s=>Array.from(s.normalize('NFC').replace(/\s/gu,''));
export const englishTokens=s=>s.normalize('NFC').toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g)||[];
export function approvedMetric({region,approval,hypothesis,kind}){
  if(!approval||approval.reviewerType!=='human'||approval.confirmed!==true||!approval.reviewer?.trim()||!approval.confirmedAt||approval.regionId!==region.id||approval.imageSha256!==region.imageSha256||approval.referenceTextSha256!==textHash(approval.referenceText??''))return {status:'pending_human_review',value:null,errors:null,referenceUnits:null};
  const tokenize=kind==='CER'?chineseTokens:kind==='WER'?englishTokens:null;if(!tokenize)throw Error('Unknown metric');
  const ref=tokenize(approval.referenceText),hyp=tokenize(hypothesis),errors=editDistance(ref,hyp);
  return {status:'human-reference-confirmed; OCR-output-not-verified',value:ref.length?errors/ref.length:null,errors,referenceUnits:ref.length,emptyReference:ref.length===0};
}
