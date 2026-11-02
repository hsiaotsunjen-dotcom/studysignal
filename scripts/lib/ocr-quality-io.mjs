// Node built-ins only: no OCR engine or image processing imports.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const resolveProject=p=>path.resolve(projectRoot,p);
export function options(args,allowed){const out={};for(let i=0;i<args.length;i+=2){assert(allowed.includes(args[i])&&args[i+1]&&!args[i+1].startsWith('--'),'Expected named option and value');assert(!out[args[i]],'Duplicate option');out[args[i]]=args[i+1];}return out;}
export function writeNew(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export function outputDir(value,prefix){if(!value)return fs.mkdtempSync(path.join(projectRoot,prefix));const p=path.resolve(value);assert(!fs.existsSync(p),'Output directory must not exist; refusing overwrite');fs.mkdirSync(p,{recursive:true});return p;}
export function protectedRead(file,snapshot){const bytes=fs.readFileSync(file);snapshot.set(file,sha(bytes));return bytes;}
export function verifySnapshot(snapshot){for(const [p,h] of snapshot)assert.equal(sha(fs.readFileSync(p)),h,'Input changed: '+p);}
export function inside(root,file){const p=path.resolve(root,file),r=path.relative(root,p);assert(!r.startsWith('..')&&!path.isAbsolute(r),'Path escapes artifact root');return p;}
