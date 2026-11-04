import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceAlignment,sourceGeometry,textEdits} from './lib/ocr-ai-source-evidence.mjs';
const word=(text,x,y=10,w=10)=>`5\t1\t1\t1\t1\t1\t${x}\t${y}\t${w}\t10\t90\t${text}`;
const context={width:100,height:100};
test('headerless TSV first word is preserved',()=>{
  const a=buildSourceAlignment({raw:'ab',tsv:word('a',10)+'\n'+word('b',30),...context});assert.equal(a.status,'exact_nonwhitespace_sequence');assert.equal(a.words.length,2);
});
test('TSV with header and whitespace differences retains raw positions',()=>{
  const a=buildSourceAlignment({raw:'a\n b',tsv:'level\tpage_num\n'+word('a',10)+'\n'+word('b',30),...context});
  assert.deepEqual(a.rawOffsets,[0,3]);assert.equal(sourceGeometry(a,{start:3,end:4},[30,10,10,10]).sourceEnvelope.left,30);
});
test('text mismatch cannot be fuzzily mapped',()=>{
  const a=buildSourceAlignment({raw:'aB',tsv:word('ab',10),...context});assert.equal(a.status,'unresolved');assert.equal(sourceGeometry(a,{start:0,end:1},[1,1,2,2]).status,'unresolved');
});
test('empty OCR agreement is not evidence of a blank image',()=>assert.equal(buildSourceAlignment({raw:'',tsv:'',...context}).status,'unresolved'));
test('source and AI boxes are kept separate, disjoint AI box detected',()=>{
  const a=buildSourceAlignment({raw:'ab',tsv:word('ab',30),...context}),r=sourceGeometry(a,{start:0,end:2},[0,0,5,5]);
  assert.equal(r.aiBoxRelationship,'disjoint_from_source_tokens');assert.equal(r.sourceEnvelope.left,30);assert.equal(r.imageContentVerified,false);assert.equal(r.autoApplyAllowed,false);
});
test('partial token evidence cannot claim character-sized box',()=>{
  const a=buildSourceAlignment({raw:'abcd',tsv:word('abcd',10,10,30),...context}),r=sourceGeometry(a,{start:1,end:2},[10,10,30,10]);
  assert.equal(r.partialTokenIds.length,1);assert.equal(r.sourceEnvelope.width,30);
});
test('invalid source geometry blocks that evidence',()=>{
  const a=buildSourceAlignment({raw:'x',tsv:word('x',99),...context});assert.equal(sourceGeometry(a,{start:0,end:1},[0,0,1,1]).reason,'invalid_source_word_box');
});
test('invalid spans, whitespace-only spans and absent AI boxes are handled',()=>{
  const a=buildSourceAlignment({raw:'x ',tsv:word('x',10),...context});
  assert.equal(sourceGeometry(a,{start:1,end:2},null).status,'unresolved');assert.equal(sourceGeometry(a,{start:0,end:4},null).status,'unresolved');
  assert.equal(sourceGeometry(a,{start:0,end:1},null).aiBoxRelationship,'invalid_or_missing');
});
test('partial overlap reports geometry, not an accuracy score',()=>{
  const a=buildSourceAlignment({raw:'x',tsv:word('x',10),...context}),r=sourceGeometry(a,{start:0,end:1},[15,10,5,10]);
  assert.equal(r.aiTokenAreaCoverage,0.5);assert.equal(r.aiBoxRelationship,'partial_overlap');
});
test('diff identifies the edited characters without changing original text',()=>{
  const r=textEdits('氮氣 Fe?','氧氣 Fe2+');assert.equal(r.status,'computed');assert.equal(r.edits.length,2);
  let reconstructed='氮氣 Fe?';for(const e of [...r.edits].reverse())reconstructed=reconstructed.slice(0,e.beforeStart)+e.after+reconstructed.slice(e.beforeEnd);
  assert.equal(reconstructed,'氧氣 Fe2+');assert.equal(r.edits[0].before,'氮');
});
test('diff supports insertions deletions and Unicode spans deterministically',()=>{
  for(const [a,b] of [['','abc'],['abc',''],['a\nb','ab'],['😀x','😀y'],['aaa','aa']]){
    const r=textEdits(a,b);let out=a;for(const e of [...r.edits].reverse()){assert.equal(a.slice(e.beforeStart,e.beforeEnd),e.before);out=out.slice(0,e.beforeStart)+e.after+out.slice(e.beforeEnd);}assert.equal(out,b);assert.deepEqual(textEdits(a,b),r);
  }
});
test('oversized diff stops rather than approximating an answer',()=>assert.equal(textEdits('abcd','x',{maxUnits:2}).status,'size_limit'));
test('source agreement cannot repair missing figure labels',()=>{
  const a=buildSourceAlignment({raw:'x',tsv:word('x',10),...context});assert.equal(a.status,'exact_nonwhitespace_sequence');assert.equal(sourceGeometry(a,{start:0,end:1},[10,10,10,10]).imageContentVerified,false);
});
