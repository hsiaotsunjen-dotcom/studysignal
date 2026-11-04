// Reuses the existing layout and quality rules; no OCR or text repair.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {sha} from './ocr-quality-io.mjs';
import {buildSourceAlignment} from './ocr-ai-source-evidence.mjs';
import {formulaTokens} from './ocr-ai-formula-evidence.mjs';
import {detectLayout,checkLayout} from './ocr-layout-prototype.mjs';
import {assess} from './ocr-quality-routing.mjs';
export async function inspectPage(page){
  assert.equal(page.ocr.status,'completed');const source=fs.readFileSync(page.image.path);
  assert.equal(sha(source),page.image.sha256);
  const v=page.ocr.versions.at(-1),rawBytes=fs.readFileSync(v.files['raw.txt'].path),tsvBytes=fs.readFileSync(v.files['layout.tsv'].path);
  assert.equal(sha(rawBytes),v.files['raw.txt'].sha256);assert.equal(sha(tsvBytes),v.files['layout.tsv'].sha256);
  const raw=rawBytes.toString('utf8'),tsv=tsvBytes.toString('utf8'),a=buildSourceAlignment({raw,tsv,...v.image});
  const {data,info}=await sharp(source).resize({width:700,withoutEnlargement:true}).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,3);
  const layout=detectLayout({pixels:data,width:info.width,height:info.height,sourceWidth:v.image.width,sourceHeight:v.image.height,words:a.words});
  const p={seq:page.scanSeq,file:page.originalFileName,sourceSha256:page.image.sha256,width:v.image.width,height:v.image.height,
    pageId:page.pageId,coordinateSpace:'original_image_pixels',status:'pending_human_review',humanApproved:false,
    sourceResult:v.result,layout,checks:checkLayout(layout,v.image.width,v.image.height)};
  const routing=assess({page:p,raw,tsv});
  return {layout:p,quality:{...routing,scientificTokens:formulaTokens(raw),
    source:{imageSha256:page.image.sha256,rawSha256:v.files['raw.txt'].sha256,tsvSha256:v.files['layout.tsv'].sha256},
    limitations:[...routing.limitations,'Formula syntax does not verify spelling or original superscript/subscript; terminology remains pending.']}};
}
