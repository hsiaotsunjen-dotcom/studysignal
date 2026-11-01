import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parsePages,selection,attemptWithRetry,exclusive,sha,verifyArtifacts} from './lib/kb-ocr-batch.mjs';
test('bounded pages reject duplicates, invalid ids and full-book selections',()=>{
  assert.deepEqual(parsePages('2,10,472'),[2,10,472]);
  for(const value of ['2,2','0','487','1.5',Array.from({length:13},(_,n)=>n+1).join(',')])assert.throws(()=>parsePages(value));
});
test('selection uses filename/index and preserves estimated/null page states',()=>{
  const index=JSON.parse(fs.readFileSync('content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/page-index.json'));
  const manifest=JSON.parse(fs.readFileSync('content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json'));
  const rows=selection([10,472,486],index,manifest);
  assert.equal(rows[0].verification,'estimated');assert.equal(rows[1].label,'附-19');assert.equal(rows[1].printedPage,null);assert.equal(rows[2].verification,'unnumbered');
});
test('retry preserves failed attempt, resume skips successful OCR and refuses tampering',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studysignal-ocr-test-'));let calls=0;
  const perform=async({dir,attempt})=>{calls++;if(attempt===1)throw new Error('synthetic test failure, not real OCR');const f=path.join(dir,'raw.txt');exclusive(f,'synthetic fixture');return {seq:2,artifacts:{[path.relative(root,f).replaceAll('\\','/')]:sha(Buffer.from('synthetic fixture'))}};};
  const first=await attemptWithRetry({root,seq:2,perform});assert(first.record);assert.equal(calls,2);assert(fs.existsSync(path.join(root,'pages/0002/attempt-01/error.json')));
  const again=await attemptWithRetry({root,seq:2,perform});assert.equal(again.resumed,true);assert.equal(calls,2);
  const f=path.join(root,Object.keys(first.record.artifacts)[0]);fs.writeFileSync(f,'tampered synthetic test fixture');assert.throws(()=>verifyArtifacts(root,first.record));
  await assert.rejects(attemptWithRetry({root,seq:2,perform}));assert.equal(calls,2);
});
test('three failed attempts stop; repeated resume does not repeat exhausted attempts',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studysignal-ocr-test-'));let calls=0;
  const perform=async()=>{calls++;throw new Error('synthetic test failure');};
  assert.equal((await attemptWithRetry({root,seq:3,perform})).record,null);assert.equal(calls,3);
  assert.equal((await attemptWithRetry({root,seq:3,perform})).record,null);assert.equal(calls,3);
});
test('existing output cannot be overwritten',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studysignal-ocr-test-')),file=path.join(dir,'sample.txt');exclusive(file,'before');assert.throws(()=>exclusive(file,'after'));assert.equal(fs.readFileSync(file,'utf8'),'before');});
