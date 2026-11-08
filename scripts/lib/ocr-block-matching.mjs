// Geometry candidates only. Text agreement never establishes correctness.
import assert from 'node:assert/strict';
export const MATCHING_VERSION='symmetric-overlap-v1';
export const MINIMUM_OVERLAP=.15;
const area=b=>b[2]*b[3];
export function matchBlocks(left,right){
 const all=[...left,...right],n=left.length,edges=all.map(()=>[]),candidates=[left.map(b=>({block_id:b.id,peer_candidates:[]})),right.map(b=>({block_id:b.id,peer_candidates:[]}))];
 for(const b of all)assert(Array.isArray(b.bbox)&&b.bbox.length===4&&b.bbox.every(Number.isFinite)&&b.bbox[2]>0&&b.bbox[3]>0,'Valid bbox required');
 for(const side of [left,right])assert.equal(new Set(side.map(b=>b.id)).size,side.length,'Duplicate source block');
 for(let i=0;i<left.length;i++)for(let j=0;j<right.length;j++){
  const a=left[i].bbox,b=right[j].bbox,intersection=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
  const overlap=intersection/Math.min(area(a),area(b));if(overlap<MINIMUM_OVERLAP)continue;
  edges[i].push(n+j);edges[n+j].push(i);
  candidates[0][i].peer_candidates.push({block_id:right[j].id,overlap_fraction:overlap,source_coverage:intersection/area(a),peer_coverage:intersection/area(b)});
  candidates[1][j].peer_candidates.push({block_id:left[i].id,overlap_fraction:overlap,source_coverage:intersection/area(b),peer_coverage:intersection/area(a)});
 }
 const seen=new Set(),components=[];
 for(let i=0;i<all.length;i++){if(seen.has(i))continue;const todo=[i],members=[];seen.add(i);while(todo.length){const k=todo.pop();members.push(k);for(const p of edges[k])if(!seen.has(p)){seen.add(p);todo.push(p);}}components.push(members);}
 assert.equal(components.flat().length,all.length);assert.equal(new Set(components.flat()).size,all.length);
 return {policy:MATCHING_VERSION,minimum_overlap:MINIMUM_OVERLAP,candidates,components};
}
// No inferred row-major rearrangement: preserve the supplied engine sequence.
export function sourceOrderedMembers(source,indexes){return [...indexes].sort((a,b)=>a-b).map(i=>source[i]);}
