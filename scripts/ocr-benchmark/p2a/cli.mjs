// Local operations for existing review-store APIs; no OCR/model/API calls.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {prepareP2A,openP2A} from './workflow.mjs';import {writeNew} from '../../lib/ocr-quality-io.mjs';
const project=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
export async function main(args){const command=args[0],opts={};assert(['prepare','show','template','submit','evaluate'].includes(command),'Commands: prepare/show/template/submit/evaluate');for(let i=1;i<args.length;i+=2){assert(['--out','--dataset','--id','--input','--operation'].includes(args[i])&&args[i+1]&&!Object.hasOwn(opts,args[i]),'Invalid arguments');opts[args[i]]=args[i+1];}
 const local=file=>{assert(file,'Path required');const p=path.resolve(file);assert(p.startsWith(project+path.sep),'Path must stay inside project');return p;};
 if(command==='prepare')return prepareP2A(project,local(opts['--out']));
 const loaded=openP2A(local(opts['--dataset']));
 if(command==='show'){if(!opts['--id'])return loaded.progress();const c=loaded.store.selected(opts['--id']);return {case:c,latest:loaded.store.latest(c.id),editable_draft:loaded.template(c.id)};}
 if(command==='template'){const data=loaded.template(opts['--id']);writeNew(local(opts['--out']),data);return {status:'new_editable_template',file:opts['--out'],revision:data.expected_revision};}
 if(command==='submit'){const b=fs.readFileSync(local(opts['--input'])),text=b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):b.toString('utf8').replace(/^\ufeff/,'');const r=loaded.submit(opts['--id'],JSON.parse(text),opts['--operation']);return {status:r.review_status,revision:r.revision,previous_revision:r.previous_revision,is_ground_truth:r.is_ground_truth,annotation_digest:r.annotation_digest};}
 const report=loaded.evaluate();if(opts['--out'])writeNew(local(opts['--out']),report);return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(x=>{console.log(JSON.stringify(x,null,2));if(x?.status==='source_unresolved')process.exitCode=1;}).catch(e=>{console.error(JSON.stringify({status:'FAILED',error:e.message}));process.exitCode=1;});
