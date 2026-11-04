// Explicit commands only; inventory does not initialize an OCR worker.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRoot,options,read,writeNew} from './lib/ocr-quality-io.mjs';
import {buildCatalog,selectPages} from './lib/textbook-page-catalog.mjs';
import {runBatch} from './lib/textbook-ocr-runner.mjs';
import {offlinePreflight,localPerformer} from './lib/textbook-local-ocr.mjs';
import {inspectPage} from './lib/textbook-page-inspection.mjs';
const args=options(process.argv.slice(2),['--mode','--config','--out','--catalog','--pages','--batch-size','--stop-after','--resume','--recover-stale-lock','--run','--layout-run']);
assert(args['--config'],'Explicit --config required');const config=read(path.resolve(args['--config']));
assert(['preflight','catalog','execute','inspect'].includes(args['--mode']),'Choose preflight, catalog, execute or inspect');
if(args['--out']){
  const relative=path.relative(projectRoot,path.resolve(args['--out']));
  assert(!relative.startsWith('..')&&!path.isAbsolute(relative)&&/^tmp-ocr-v23-[^\\/]+[\\/]/.test(relative+path.sep),'Stage 1 outputs must be isolated under project tmp-ocr-v23-*');
}
if(args['--mode']==='preflight'){
  const engine=offlinePreflight(projectRoot);console.log(JSON.stringify({status:'PASS',engine,paidCalls:0,ocrCalls:0},null,2));
}else if(args['--mode']==='catalog'){
  assert(args['--out']);const catalog=buildCatalog(config,projectRoot,{extraRuns:args['--run']?[{root:args['--run']}]:[],extraLayoutRoots:args['--layout-run']?[args['--layout-run']]:[]});
  writeNew(path.resolve(args['--out']),catalog);console.log(JSON.stringify({out:args['--out'],...catalog.summary,problems:catalog.problems},null,2));
}else if(args['--mode']==='inspect'){
  assert(args['--catalog']&&args['--pages']&&args['--out']);const catalog=read(path.resolve(args['--catalog']));
  const ids=selectPages(args['--pages'],catalog.pages);assert(ids.length<=3,'Inspect at most 3 selected pages in stage 1');
  assert(!fs.existsSync(path.resolve(args['--out'])),'Inspection output must be new');
  for(const id of ids){const page=catalog.pages.find(p=>p.scanSeq===id),result=await inspectPage(page),dir=path.resolve(args['--out'],'scan'+String(id).padStart(4,'0'));
    writeNew(path.join(dir,'layout.json'),result.layout);writeNew(path.join(dir,'quality.json'),result.quality);
    console.log(JSON.stringify({seq:id,route:result.quality.route,risks:result.quality.risks.length,boundaryValid:result.layout.checks.boundaryValid,paidCalls:0,ocrCalls:0}));}
}else{
  assert(args['--out']&&args['--catalog']&&args['--pages'],'Explicit catalog, selection and new output required');
  const catalog=read(path.resolve(args['--catalog']));assert.equal(catalog.subject,config.subject);assert.equal(catalog.materialId,config.materialId);
  const ids=selectPages(args['--pages'],catalog.pages),engine=offlinePreflight(projectRoot);
  // This stage cannot be promoted to a whole-book run by changing CLI flags.
  assert(ids.filter(id=>catalog.pages.find(p=>p.scanSeq===id).ocr.status!=='completed').length<=3,'Stage 1 permits at most 3 new OCR pages');
  const performer=localPerformer(projectRoot,engine);let pause=false;
  const onSignal=()=>{pause=true;};process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
  try{
    const summary=await runBatch({catalog,root:path.resolve(args['--out']),ids,engine,perform:performer.perform,onFailure:performer.onFailure,
      batchSize:Number(args['--batch-size']??3),stopAfter:args['--stop-after']?Number(args['--stop-after']):Infinity,
      resume:args['--resume']==='true',recoverStaleLock:args['--recover-stale-lock']==='true',
      shouldPause:()=>pause||fs.existsSync(path.resolve(args['--out'],'PAUSE'))});
    writeNew(path.resolve(args['--out'],'resources-'+summary.session+'.json'),{...performer.metrics,scope:'Node process RSS including worker threads; OS sampling, not GPU/total system usage'});
    console.log(JSON.stringify(summary,null,2));if(summary.failed)process.exitCode=1;
  }finally{await performer.dispose();process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);}
}
