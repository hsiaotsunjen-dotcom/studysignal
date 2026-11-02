// Subject-independent heuristic proposal generator. No transcription or corrections.
export const area=r=>r.width*r.height;
export function intersection(a,b){return Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));}
export const iou=(a,b)=>intersection(a,b)/(area(a)+area(b)-intersection(a,b)||1);
export function runs(values,gap=2){const out=[];for(const n of values){const last=out.at(-1);if(last&&n-last[1]<=gap)last[1]=n;else out.push([n,n]);}return out;}
export function parseTSV(tsv){return tsv.split(/\r?\n/).slice(1).map(s=>s.split('\t')).filter(a=>a[0]==='5'&&a[11]?.trim()).map(a=>({key:a.slice(1,3).join('/'),line:a.slice(1,5).join('/'),rect:{left:+a[6],top:+a[7],width:+a[8],height:+a[9]},confidence:+a[10],text:a.slice(11).join('\t')}));}
function union(rows){const l=Math.min(...rows.map(r=>r.left)),t=Math.min(...rows.map(r=>r.top));return {left:l,top:t,width:Math.max(...rows.map(r=>r.left+r.width))-l,height:Math.max(...rows.map(r=>r.top+r.height))-t};}
export function detectLayout({pixels,width,height,sourceWidth,sourceHeight,words}){
  const sx=sourceWidth/width,sy=sourceHeight/height,regions=[];
  const add=(type,rect,score,evidence,parentId=null)=>{const r={id:`region-${String(regions.length+1).padStart(3,'0')}`,type,rect,heuristicScore:score,scoreMeaning:'uncalibrated heuristic; not probability of correctness',evidence,parentId,status:'pending_human_review',humanApproved:false};regions.push(r);return r;};
  const groups=new Map();for(const w of words){if(!groups.has(w.line))groups.set(w.line,[]);groups.get(w.line).push(w);}
  const lines=[...groups.values()].map(ws=>({rect:union(ws.map(w=>w.rect)),text:ws.map(w=>w.text).join(' '),confidence:ws.reduce((s,w)=>s+w.confidence,0)/ws.length,key:ws[0].key}));
  const median=lines.map(l=>l.rect.height).sort((a,b)=>a-b)[Math.floor(lines.length/2)]||1;
  for(const l of lines){if(/(?:圖\s*\d|Fig\.?\s*\d|表\s*\d|Table\s*\d)/i.test(l.text))add('caption',l.rect,.55,['OCR caption pattern; may include prose references']);else if(l.rect.height>median*1.25&&l.rect.width<sourceWidth*.85)add('heading',l.rect,.45,['line height exceeds page median; unverified heading']);}
  const blocks=new Map();for(const l of lines){if(!blocks.has(l.key))blocks.set(l.key,[]);blocks.get(l.key).push(l);}
  for(const ls of blocks.values())add('paragraph',union(ls.map(l=>l.rect)),.4,['existing OCR block grouping; includes possible image noise']);
  // Blue/pale-blue backgrounds are only table candidates, not a universal table detector.
  const blue=new Uint8Array(width*height),dark=new Uint8Array(width*height),ys=[];
  for(let y=0;y<height;y++){let count=0;for(let x=0;x<width;x++){const i=(y*width+x)*3,r=pixels[i],g=pixels[i+1],b=pixels[i+2];blue[y*width+x]=b-r>8&&g-r>4&&b>100?1:0;dark[y*width+x]=r+g+b<390?1:0;count+=blue[y*width+x];}if(count/width>.28)ys.push(y);}
  for(const [top,bottom] of runs(ys,8).filter(([t,b])=>b-t>8)){
    const xs=[];for(let x=0;x<width;x++){let n=0;for(let y=top;y<=bottom;y++)n+=blue[y*width+x];if(n/(bottom-top+1)>.25)xs.push(x);}if(!xs.length)continue;
    const left=xs[0],right=xs.at(-1);const rect={left:Math.floor(left*sx),top:Math.floor(top*sy),width:Math.ceil((right-left+1)*sx),height:Math.ceil((bottom-top+1)*sy)};
    const table=add('table',rect,.5,['blue-background image mask; may miss uncolored tables or mistake panels for tables']);
    const inside=lines.filter(l=>intersection(l.rect,rect)/area(l.rect)>.65).sort((a,b)=>a.rect.top-b.rect.top);
    const bands=[];for(const l of inside){const b=bands.at(-1);if(b&&l.rect.top-(b.at(-1).rect.top+b.at(-1).rect.height)<median*1.6)b.push(l);else bands.push([l]);}
    for(const band of bands){const b=union(band.map(l=>l.rect));add('table-subregion',b,.3,['OCR vertical-gap grouping; provisional row/cell; not reconstructed table'],table.id);}
  }
  // Raster component proposals: texture remaining after masking OCR words.
  const tile=20,cols=Math.ceil(width/tile),rows=Math.ceil(height/tile),active=new Set();
  for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){let n=0,total=0;for(let y=ty*tile;y<Math.min(height,(ty+1)*tile);y++)for(let x=tx*tile;x<Math.min(width,(tx+1)*tile);x++){n+=dark[y*width+x];total++;}const cx=(tx+.5)*tile*sx,cy=(ty+.5)*tile*sy;const inText=words.some(w=>cx>=w.rect.left&&cx<=w.rect.left+w.rect.width&&cy>=w.rect.top&&cy<=w.rect.top+w.rect.height);if(n/total>.1&&!inText)active.add(ty*cols+tx);}
  while(active.size){const first=active.values().next().value,stack=[first],cells=[];active.delete(first);while(stack.length){const id=stack.pop();cells.push(id);const x=id%cols,y=Math.floor(id/cols);for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const key=ny*cols+nx;if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&active.delete(key))stack.push(key);}}
    if(cells.length<4)continue;const xx=cells.map(n=>n%cols),yy=cells.map(n=>Math.floor(n/cols));const left=Math.floor(Math.min(...xx)*tile*sx),top=Math.floor(Math.min(...yy)*tile*sy);add('image',{left,top,width:Math.min(sourceWidth-left,Math.ceil((Math.max(...xx)-Math.min(...xx)+1)*tile*sx)),height:Math.min(sourceHeight-top,Math.ceil((Math.max(...yy)-Math.min(...yy)+1)*tile*sy))},.25,['dark texture connected tiles excluding OCR word centers; text/rules may be false positives']);
  }
  return {regions,lines,words};
}
export function checkLayout(layout,width,height){
 const issues=[];for(const r of layout.regions){const b=r.rect;if(b.left<0||b.top<0||b.width<=0||b.height<=0||b.left+b.width>width||b.top+b.height>height)issues.push({regionId:r.id,type:'out-of-bounds'});
  const cut=layout.words.filter(w=>{const n=intersection(w.rect,b)/area(w.rect);return n>0&&n<.98;});if(cut.length)issues.push({regionId:r.id,type:'word-box-cut-risk',count:cut.length});
  const words=layout.words.filter(w=>intersection(w.rect,b)/area(w.rect)>.5);if(words.length&&words.filter(w=>w.confidence<50).length/words.length>.3)issues.push({regionId:r.id,type:'low-confidence-ocr'});
 }
 for(let i=0;i<layout.regions.length;i++)for(let j=i+1;j<layout.regions.length;j++){const a=layout.regions[i],b=layout.regions[j];if(a.parentId===b.id||b.parentId===a.id)continue;if(iou(a.rect,b.rect)>.5)issues.push({regionId:a.id,otherId:b.id,type:'overlap-review'});}
 return {issues,boundaryValid:!issues.some(i=>i.type==='out-of-bounds'),textCompleteness:'not verified; word-box intersection only; missing OCR text cannot be detected reliably',falsePositiveRate:null,missRate:null};
}
