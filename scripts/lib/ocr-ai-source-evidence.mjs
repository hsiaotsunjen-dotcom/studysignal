// Deterministic links to existing OCR coordinates, never image transcription.
import {parseTSV,intersection,area} from './ocr-layout-prototype.mjs';
function compact(text){
  const offsets=[],units=[];
  for(let i=0;i<text.length;i++)if(!/\s/u.test(text[i])){offsets.push(i);units.push(text[i]);}
  return {text:units.join(''),offsets};
}
const validRect=(r,width,height)=>[r.left,r.top,r.width,r.height].every(Number.isFinite)&&r.left>=0&&r.top>=0&&r.width>0&&r.height>0&&r.left+r.width<=width&&r.top+r.height<=height;
const union=rects=>{
  const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top));
  return {left,top,width:Math.max(...rects.map(r=>r.left+r.width))-left,height:Math.max(...rects.map(r=>r.top+r.height))-top};
};
export function buildSourceAlignment({raw,tsv,width,height}){
  // Existing parseTSV skips its first row as a header. Supply an empty header
  // for headerless TSVs so a first word row is never silently discarded.
  const first=tsv.split(/\r?\n/,1)[0];
  const words=parseTSV(/^\d+\t/.test(first)?'\n'+tsv:tsv).map((w,i)=>({...w,id:'word-'+String(i+1).padStart(5,'0')}));
  const a=compact(raw),units=[],owners=[];
  words.forEach((w,i)=>{for(const ch of compact(w.text).text.split('')){units.push(ch);owners.push(i);}});
  const b=units.join('');let mismatch=0;while(mismatch<Math.min(a.text.length,b.length)&&a.text[mismatch]===b[mismatch])mismatch++;
  const aligned=a.text.length>0&&a.text===b;
  return {status:aligned?'exact_nonwhitespace_sequence':'unresolved',scope:'same OCR source agreement; not image truth',width,height,rawLength:raw.length,words,
    rawOffsets:a.offsets,owners,nonWhitespaceUnits:a.text.length,tsvUnits:b.length,firstMismatch:aligned?null:mismatch,
    invalidWordIds:words.filter(w=>!validRect(w.rect,width,height)).map(w=>w.id)};
}
export function sourceGeometry(alignment,span,aiBBox){
  const pending={status:'unresolved',imageContentVerified:false,autoApplyAllowed:false};
  if(alignment.status!=='exact_nonwhitespace_sequence'||!span||!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.start<0||span.end<=span.start||span.end>alignment.rawLength)return pending;
  const indexes=[];
  alignment.rawOffsets.forEach((offset,i)=>{if(offset>=span.start&&offset<span.end)indexes.push(i);});
  if(!indexes.length)return pending;
  const ids=[...new Set(indexes.map(i=>alignment.owners[i]))],words=ids.map(i=>alignment.words[i]);
  if(words.some(w=>alignment.invalidWordIds.includes(w.id)))return {...pending,reason:'invalid_source_word_box'};
  const selected=new Set(indexes),partialTokenIds=ids.filter(id=>alignment.owners.some((owner,i)=>owner===id&&!selected.has(i))).map(i=>alignment.words[i].id);
  const lines=new Map();for(const w of words){if(!lines.has(w.line))lines.set(w.line,[]);lines.get(w.line).push(w);}
  const rect=Array.isArray(aiBBox)&&aiBBox.length===4?{left:aiBBox[0],top:aiBBox[1],width:aiBBox[2],height:aiBBox[3]}:null;
  const aiValid=rect&&validRect(rect,alignment.width,alignment.height);
  const total=words.reduce((s,w)=>s+area(w.rect),0),covered=aiValid?words.reduce((s,w)=>s+intersection(w.rect,rect),0):null;
  const envelope=union(words.map(w=>w.rect));
  return {status:'linked_to_existing_ocr',scope:'source word boxes; not confirmed image glyph boundaries',span,
    coordinateSpace:'original_image_pixels',bboxFormat:'xywh',sourceBBox:[envelope.left,envelope.top,envelope.width,envelope.height],
    wordIds:words.map(w=>w.id),partialTokenIds,sourceEnvelope:envelope,
    sourceLineBoxes:[...lines].map(([line,ws])=>({line,wordIds:ws.map(w=>w.id),rect:union(ws.map(w=>w.rect))})),
    aiBoxRelationship:!aiValid?'invalid_or_missing':covered===0?'disjoint_from_source_tokens':covered/total<0.98?'partial_overlap':'covers_source_tokens',
    aiTokenAreaCoverage:aiValid?covered/total:null,coverageMeaning:'sum of token-box intersections / summed token-box areas; not OCR accuracy',
    imageContentVerified:false,autoApplyAllowed:false};
}
// Code-point diff with UTF-16 spans. Tie-breaks are deterministic; alternative
// alignments can exist and are not proof of linguistic edit boundaries.
export function textEdits(before,after,{maxUnits=1200}={}){
  const a=Array.from(before),b=Array.from(after);
  if(a.length>maxUnits||b.length>maxUnits)return {status:'size_limit',edits:null};
  const rows=a.length+1,cols=b.length+1,d=new Uint32Array(rows*cols);
  for(let i=0;i<rows;i++)d[i*cols]=i;for(let j=0;j<cols;j++)d[j]=j;
  for(let i=1;i<rows;i++)for(let j=1;j<cols;j++)d[i*cols+j]=Math.min(d[(i-1)*cols+j]+1,d[i*cols+j-1]+1,d[(i-1)*cols+j-1]+(a[i-1]===b[j-1]?0:1));
  let i=a.length,j=b.length;const ops=[];
  while(i||j){
    if(i&&j&&d[i*cols+j]===d[(i-1)*cols+j-1]+(a[i-1]===b[j-1]?0:1)){ops.push({same:a[i-1]===b[j-1],before:a[--i],after:b[--j]});}
    else if(i&&d[i*cols+j]===d[(i-1)*cols+j]+1)ops.push({same:false,before:a[--i],after:''});
    else ops.push({same:false,before:'',after:b[--j]});
  }
  ops.reverse();let x=0,y=0;const edits=[];
  for(const op of ops){
    if(!op.same){const last=edits.at(-1);if(last&&last.beforeEnd===x&&last.afterEnd===y){last.before+=op.before;last.after+=op.after;last.beforeEnd+=op.before.length;last.afterEnd+=op.after.length;}
      else edits.push({beforeStart:x,beforeEnd:x+op.before.length,afterStart:y,afterEnd:y+op.after.length,before:op.before,after:op.after});}
    x+=op.before.length;y+=op.after.length;
  }
  return {status:'computed',distance:d[a.length*cols+b.length],unit:'code_point_distance; UTF-16 spans',edits,scope:'difference only; not correctness'};
}
