import test from 'node:test';
import assert from 'node:assert/strict';
import {editDistance,approvedMetric,textHash,chineseTokens,englishTokens} from './lib/ocr-quality-metrics.mjs';
test('edit distance handles substitutions, insertions, deletions and empty input',()=>{assert.equal(editDistance([... 'kitten'],[...'sitting']),3);assert.equal(editDistance([],['x']),1);assert.equal(editDistance(['x'],[]),1);});
test('without a matching human reference formal metrics stay null',()=>{
  const region={id:'synthetic',imageSha256:'imagehash'};
  assert.equal(approvedMetric({region,hypothesis:'x',kind:'CER'}).value,null);
  const approval={reviewerType:'agent',confirmed:true,reviewer:'synthetic test',confirmedAt:'test',regionId:region.id,imageSha256:region.imageSha256,referenceText:'abc',referenceTextSha256:textHash('abc')};
  assert.equal(approvedMetric({region,approval,hypothesis:'abc',kind:'CER'}).value,null);
  assert.equal(approvedMetric({region,approval:{...approval,reviewerType:'human',imageSha256:'different'},hypothesis:'abc',kind:'CER'}).value,null);
});
test('synthetic approved fixtures measure errors, not engine confidence',()=>{
  const region={id:'synthetic',imageSha256:'imagehash'},approval={reviewerType:'human',confirmed:true,reviewer:'synthetic fixture only; no real person approval',confirmedAt:'test',regionId:'synthetic',imageSha256:'imagehash',referenceText:'one two',referenceTextSha256:textHash('one two')};
  assert.equal(approvedMetric({region,approval,hypothesis:'one three',kind:'WER'}).value,0.5);
  assert.equal(approvedMetric({region,approval:{...approval,referenceTextSha256:'wrong'},hypothesis:'one two',kind:'WER'}).value,null);
});
test('tokenization retains chemical symbols and does not silently repair words',()=>{assert.deepEqual(chineseTokens('氧 氣。'),['氧','氣','。']);assert.deepEqual(englishTokens('(Transcription)'),['transcription']);assert.notDeepEqual(englishTokens('Transeription'),englishTokens('Transcription'));});
