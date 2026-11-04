import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {prepareDevelopment,readJSON,importExistingTesseract,evaluateImported,publicResult,markdownReport,readResultRecords,verifyImages,projectFile} from './io.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [command,...args]=process.argv.slice(2);const options={};
assert(args.length%2===0,'Use --option value pairs');
for(let i=0;i<args.length;i+=2){assert(args[i].startsWith('--')&&!Object.hasOwn(options,args[i]),'Invalid/repeated option');options[args[i]]=args[i+1];}
assert(['prepare','evaluate','compare'].includes(command),'Commands: prepare, evaluate, compare (no inference)');
for(const key of Object.keys(options))assert(['--out','--dataset','--results'].includes(key),'Unknown option');
assert(options['--out'],'Explicit new output path required');
const out=path.resolve(project,options['--out']),rel=path.relative(project,out);
assert(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel),'Output outside project');
const portable=rel.replaceAll('\\','/');
assert(command==='prepare'?portable.startsWith('scripts/ocr-benchmark/datasets/'): /^tmp-ocr-benchmark-[^/]+$/.test(portable),'Use isolated benchmark dataset/output paths');
assert(!fs.existsSync(out),'Output already exists; refusing overwrite');
const write=(file,data)=>fs.writeFileSync(file,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const start=performance.now();
if(command==='prepare') {
  assert(!options['--dataset']&&!options['--results']);
  const dataset=await prepareDevelopment({project,reportPath:'docs/knowledge-base/biology/ocr-v23-stage2-quality-validation-20261104.json',catalogPath:'tmp-ocr-v23-stage1-20261104/catalog.final.json'});
  fs.mkdirSync(path.dirname(out),{recursive:true});write(out,dataset);
  console.log(JSON.stringify({command,samples:dataset.samples.length,output:rel,elapsed_ms:performance.now()-start}));
} else {
  assert(options['--dataset']);
  const dataset=readJSON(projectFile(project,options['--dataset']));
  let outputs,integrity;
  if(command==='compare') {
    assert(options['--results'],'Existing results JSON required');
    integrity=await verifyImages(project,dataset);
    outputs=readResultRecords(project,dataset,readJSON(projectFile(project,options['--results'])));
  }else {assert(!options['--results']);({outputs,integrity}=await importExistingTesseract(project,dataset));}
  const evaluated=evaluateImported(dataset,outputs);
  fs.mkdirSync(out,{recursive:false});
  write(path.join(out,'source-verification.json'),integrity);
  write(path.join(out,'model-results.json'),evaluated.results.map(publicResult));
  write(path.join(out,'comparison.json'),evaluated.comparison);
  write(path.join(out,'comparison.md'),markdownReport(evaluated.comparison,integrity));
  const run={command,samples:outputs.length,model_configurations:evaluated.comparison.models.length,elapsed_ms:performance.now()-start,
    new_ocr_calls:0,paid_api_calls:0,actual_service_cost_usd:0,human_ground_truth_created:0};
  write(path.join(out,'run.json'),run);console.log(JSON.stringify(run));
}
