// Same installed engine, models, preprocessing and normalization as the pilot.
// No API client, model download, or package installation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
import {normalizeOcrText} from '../../src/lib/knowledge-base/import/normalizeText.ts';
import {sha,writeNew} from './ocr-quality-io.mjs';
const require=createRequire(import.meta.url);
export function offlinePreflight(project){
  const models=Object.fromEntries(['eng','chi_tra'].map(lang=>{
    const file=path.resolve(project,lang+'.traineddata');assert(fs.existsSync(file),'STOP: local model absent; no download allowed');
    const b=fs.readFileSync(file);assert(b.length>100000,'STOP: local model is unexpectedly small');
    return [lang,{sha256:sha(b),bytes:b.length}];
  }));
  const workerPath=require.resolve('tesseract.js/src/worker-script/node/index.js'),corePath=path.dirname(require.resolve('tesseract.js-core/package.json'));
  assert(fs.existsSync(workerPath)&&fs.readdirSync(corePath).some(n=>n.endsWith('.wasm')),'STOP: local worker/core absent');
  return {name:'tesseract.js',version:require('tesseract.js/package.json').version,
    coreVersion:require('tesseract.js-core/package.json').version,sharpVersion:sharp.versions.sharp,
    languages:['eng','chi_tra'],oem:1,psm:PSM.AUTO,localOnly:true,models,
    preprocessing:'EXIF-auto-orient; grayscale; normalize-1-99; sharpen-1; PNG-memory',
    normalizationSha256:sha(fs.readFileSync(new URL('../../src/lib/knowledge-base/import/normalizeText.ts',import.meta.url))),
    adapterSha256:sha(fs.readFileSync(new URL('./textbook-local-ocr.mjs',import.meta.url)))};
}
async function timeout(operation,ms){let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Local OCR timeout')),ms);})]);}finally{clearTimeout(timer);}}
export function localPerformer(project,engine){
  let worker=null;const metrics={workerInitializationMs:0,peakRssBytes:process.memoryUsage().rss};
  const dispose=async()=>{if(worker){const w=worker;worker=null;await w.terminate();}};
  const sample=()=>{metrics.peakRssBytes=Math.max(metrics.peakRssBytes,process.memoryUsage().rss);};
  const memoryTimer=setInterval(sample,100);memoryTimer.unref();
  return {metrics,dispose:async()=>{clearInterval(memoryTimer);await dispose();},onFailure:dispose,
    perform:async({page,dir,attempt,root})=>{
      assert.deepEqual(offlinePreflight(project),engine,'Local engine/model changed');
      const t=performance.now(),b=fs.readFileSync(page.image.path);assert.equal(sha(b),page.image.sha256);
      const meta=await sharp(b).metadata(),orientation=meta.orientation??1;
      // Existing word-box consumers use original pixels. Fail closed for a
      // rotated EXIF source until a reversible transform adapter is provided.
      assert.equal(orientation,1,'EXIF transform needs an explicit coordinate mapping');
      const tp=performance.now(),png=await sharp(b,{failOn:'warning'}).rotate().grayscale().normalize({lower:1,upper:99}).sharpen({sigma:1}).png().toBuffer(),preprocessMs=performance.now()-tp;
      if(!worker){const ti=performance.now();
        const pending=createWorker(engine.languages,engine.oem,{workerPath:require.resolve('tesseract.js/src/worker-script/node/index.js'),
          corePath:path.dirname(require.resolve('tesseract.js-core/package.json')),langPath:path.resolve(project),cachePath:path.resolve(project),cacheMethod:'readOnly',gzip:false,errorHandler:()=>{}});
        let expired=false;pending.then(w=>{if(expired)void w.terminate();},()=>{});
        try{worker=await timeout(pending,180000);}catch(e){expired=true;throw e;}
        await worker.setParameters({tessedit_pageseg_mode:engine.psm,preserve_interword_spaces:'1'});metrics.workerInitializationMs+=performance.now()-ti;
      }
      const to=performance.now(),{data}=await timeout(worker.recognize(png,{}, {text:true,tsv:true,blocks:true}),180000),ocrMs=performance.now()-to;
      const raw=data.text||'',normalized=normalizeOcrText(raw),artifacts={};
      for(const [name,body]of Object.entries({'raw.txt':raw,'normalized.txt':normalized.normalizedText,'layout.tsv':data.tsv||'','blocks.json':JSON.stringify(data.blocks||[],null,2)+'\n'})){
        const file=path.join(dir,name);writeNew(file,body);artifacts[path.relative(root,file).replaceAll('\\','/')]=sha(Buffer.from(body));
      }
      sample();return {schemaVersion:1,seq:page.scanSeq,file:page.originalFileName,sourceSha256:page.image.sha256,sourceBytes:b.length,
        printedPage:page.printedPage,label:page.label,verification:page.pageNumberVerification,attempt,
        status:'ocr-completed; quality-review-pending',reviewerType:'machine',needsHumanReview:true,independentHumanApproval:false,
        engineConfidence:data.confidence,confidenceMeaning:'engine diagnostic; not accuracy',elapsedMs:performance.now()-t,ocrMs,preprocessMs,
        image:{width:meta.width,height:meta.height},coordinateSpace:'original_image_pixels',bboxFormat:'xywh',
        completedAt:new Date().toISOString(),normalizationReport:normalized.report,
        qualityFlags:['human-review-required','formulas-scripts-tables-diagrams-reading-order-not-verified'],artifacts};
    }};
}
