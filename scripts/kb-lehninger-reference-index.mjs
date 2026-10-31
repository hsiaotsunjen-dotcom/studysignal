// Local reference metadata only. Never writes PDF, extracted book text, OCR or existing KB data.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {validateSchema,writeExclusive} from './kb-review.mjs';
const args=process.argv.slice(2);
const option=k=>args[args.indexOf(k)+1];
assert(args.includes('--pdf'),'Supply --pdf <local PDF path>. No default private path is embedded.');
const pdfPath=path.resolve(option('--pdf'));
const planPath='content/knowledge-base/derived/biology/lehninger-reference-plan.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fileHash=p=>hash(fs.readFileSync(p));
const clean=s=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
const p=read(planPath),map=read(p.mapPath),before=fileHash(pdfPath);
assert.equal(fileHash(p.mapPath),p.mapSha256,'classification baseline changed; do not silently follow Phase 2F');
assert.equal(map.questions.length,500);
assert.equal(map.subject,'biology');
assert.equal(new Set(map.questions.map(q=>q.id)).size,500);
assert.equal(p.chapters.length,28);
const task=getDocument({data:new Uint8Array(fs.readFileSync(pdfPath)),useSystemFonts:false,
  cMapUrl:path.resolve('node_modules/pdfjs-dist/cmaps').replaceAll('\\','/')+'/',cMapPacked:true,
  standardFontDataUrl:path.resolve('node_modules/pdfjs-dist/standard_fonts').replaceAll('\\','/')+'/'});
try {
  const doc=await task.promise,cache=new Map();
  async function page(n){
    assert(n>=1 && n<=doc.numPages);
    if(!cache.has(n)){
      const page=await doc.getPage(n),t=await page.getTextContent();
      const text=t.items.map(x=>x.str).join(' ');
      const numeric=t.items.find(x=>x.str.trim());
      cache.set(n,{text,characters:text.length,itemCount:t.items.length,textSha256:hash(text),digitalFolio:numeric && /^\d+$/.test(numeric.str)?Number(numeric.str):null,replacementCharacters:(text.match(/\uFFFD/g)||[]).length,privateUseCharacters:(text.match(/[\uE000-\uF8FF]/g)||[]).length});
    } return cache.get(n);
  }
  const metadata=await doc.getMetadata(),outline=await doc.getOutline(),labels=await doc.getPageLabels();
  assert(outline,'No outline; manual chapter review required.');
  const entries=outline.filter(e=>/^Chapter \d+ /.test(e.title));assert.equal(entries.length,28);
  const titlePage=(await page(2)).text;
  assert(/EIGHTH EDITION/.test(titlePage));
  for(const author of p.authors)assert(titlePage.includes(author));
  const copyright=(await page(3)).text;
  assert(copyright.includes('978-1-319-32234-2'));
  const tocPages=[];let brief=null,firstChapter=null;
  for(let n=21;n<=48;n++){
    const text=(await page(n)).text.replace(/^\d+\s*/,'');
    if(/^Contents in Brief\b/.test(text)) brief=n;
    if(/^CHAPTER 1\b/.test(text)){firstChapter=n;break;}
  }
  assert(brief && firstChapter && brief<firstChapter);
  for(let n=brief+1;n<firstChapter;n++)tocPages.push(n);
  const briefText=(await page(brief)).text,tocText=(await Promise.all(tocPages.map(page))).map(x=>x.text).join(' ');
  const chapters=[];
  for(const [i,e] of entries.entries()){
    const number=Number(e.title.match(/^Chapter (\d+)/)[1]);assert.equal(number,i+1);
    const english=e.title.replace(/^Chapter \d+ /,'');
    let dest=e.dest;if(typeof dest==='string')dest=await doc.getDestination(dest);
    assert(dest,'missing chapter destination');
    const bookmarkPage=await doc.getPageIndex(dest[0])+1;
    let start=null;
    // Inspect actual headings near each bookmark; bookmark destinations are NOT assumed chapter starts.
    for(let n=Math.max(firstChapter,bookmarkPage-8);n<=bookmarkPage;n++){
      const v=await page(n);
      if(new RegExp(`^\\s*\\d*\\s*CHAPTER\\s+${number}\\b`,'i').test(v.text)){start=n;break;}
    }
    assert(start,`chapter ${number} heading not found in bounded bookmark window`);
    const v=await page(start);
    assert(clean(v.text.slice(0,450)).includes(clean(english)),`chapter title mismatch ${number}`);
    assert(clean(briefText).includes(clean(english)),`brief TOC mismatch ${number}`);
    assert(clean(tocText).includes(clean(english)),`detailed TOC mismatch ${number}`);
    const meta=p.chapters.find(c=>c.chapter===number);assert(meta);
    chapters.push({...meta,title_en:english,title_zh_status:'agent-written index translation; not publisher official title',section:null,pdf_page:start,printed_page:null,digital_folio:v.digitalFolio,pdf_bookmark_page:bookmarkPage,verification_status:'pdf-heading-and-toc-text-verified; independent-human-review-pending',evidence:{source_sha256:before,toc_pdf_pages:tocPages,brief_toc_pdf_page:brief,chapter_heading_pdf_page:start,heading_page_text_sha256:v.textSha256,method:'actual chapter heading text + brief/detailed TOC; no inferred print pagination'},reference_use_status:'not-needed-for-current-map'});
  }
  assert(chapters.every((c,i)=>i===0||c.pdf_page>chapters[i-1].pdf_page));
  const topicMap=new Map(map.units.flatMap(u=>u.topics.flatMap(t=>t.subtopics.map(s=>[s.id,{unit:u.unit,unitTitle:u.title,section:t.section,sectionTitle:t.title,textbookTocPage:t.tocPage,subtopic:s}]))));
  const mappingRecords=p.mappings.map((r,i)=>{
    const t=topicMap.get(r.concept_id),c=chapters.find(c=>c.chapter===r.chapter);assert(t&&c);
    assert(t.subtopic.questionCount>0,'No exam evidence: would expand scope');
    assert.equal(t.subtopic.questions.length,t.subtopic.questionCount);
    for(const id of t.subtopic.questions)assert(map.questions.some(q=>q.id===id && `${q.placement.section}/${q.placement.subtopic}`===r.concept_id));
    c.reference_use_status='candidate-supporting-reference';
    return {id:`${p.reference_id}-map-${String(i+1).padStart(3,'0')}`,reference_id:p.reference_id,...r,studySignal:{unit:t.unit,unitTitle:t.unitTitle,section:t.section,sectionTitle:t.sectionTitle,conceptTitle:t.subtopic.title},chapter:c.chapter,section:null,pdf_page:c.pdf_page,printed_page:null,digital_folio:c.digital_folio,reference_page_status:'chapter-entry-only; exact-concept-page-pending',evidence:{classification_path:p.mapPath,classification_sha256:p.mapSha256,exam_question_ids:t.subtopic.questions,exam_question_count:t.subtopic.questionCount,textbook_toc_path:map.sources.toc.path,textbook_toc_section:t.section,textbook_toc_page:t.textbookTocPage,textbook_page_status:'section start locator only; not a verified per-question textbook page',reference_index_path:p.outputs.index,reference_chapter_heading_pdf_page:c.pdf_page,reference_heading_text_sha256:c.evidence.heading_page_text_sha256},needsHumanReview:true};
  });
  assert.equal(new Set(mappingRecords.map(r=>`${r.concept_id}/${r.chapter}`)).size,mappingRecords.length);
  const samplePages=[1,2,3,42,1137,1898,doc.numPages];
  const samples=[];for(const n of samplePages){const v=await page(n);samples.push({pdf_page:n,characters:v.characters,text_sha256:v.textSha256,replacement_characters:v.replacementCharacters,private_use_characters:v.privateUseCharacters,digital_folio:v.digitalFolio,text_layer_present:v.characters>0,review_status:n===1?'no extractable text; page may be graphical, not proof of damage':'agent-sampled; formula/figure fidelity not certified'});}
  const duplicates=fs.readdirSync(path.dirname(pdfPath)).filter(f=>f.endsWith('.pdf')).map(f=>({file_name:f,bytes:fs.statSync(path.join(path.dirname(pdfPath),f)).size,sha256:fileHash(path.join(path.dirname(pdfPath),f))}));
  const index={schemaVersion:1,kind:'reference-index',subject:'biology',reference_id:p.reference_id,title:p.title,edition:p.edition,authors:p.authors,publication_year:2021,isbn:{value:'978-1-319-32234-2',format:'epub',source_pdf_page:3},source:{file_name:path.basename(pdfPath),bytes:fs.statSync(pdfPath).size,sha256:before,pdf_page_count:doc.numPages,local_only:true,locate:'Supply the original local PDF via --pdf; absolute personal paths are deliberately excluded.',duplicates,pdf_metadata:{pdf_version:metadata.info.PDFFormatVersion,title:metadata.info.Title,creator:metadata.info.Creator,producer:metadata.info.Producer,encrypted:!!metadata.info.EncryptFilterName}},pagination:{pdf_page:'one-based physical PDF page',digital_folio:'number observed in extracted page footer; not original print pagination',printed_page:null,printed_page_status:'not verified for this EPUB-converted PDF; do not infer from digital folios or original print index',pdf_page_labels_present:!!labels,bookmark_warning:'Chapter bookmarks land after chapter openings; actual chapter headings were checked individually.'},scope:'Internal reference only; exams define scope, scanned biology textbook defines basic instruction; no classification edits.',copyright:{pdf_in_repository:false,fulltext_or_figures_in_outputs:false,chapter_titles_only_plus_original_summaries:true,rights_or_license_verified:false},chapters};
  const referenceMap={schemaVersion:1,kind:'reference-concept-map',subject:'biology',reference_id:p.reference_id,version:1,baseline:{path:p.mapPath,sha256:p.mapSha256,commit:p.mapCommit,status:'Phase 2E structurally checked derived map; not independently human-approved knowledge graph'},records:mappingRecords,sectionCoverage:map.units.flatMap(u=>u.topics.map(t=>({section:t.section,title:t.title,mapping_count:mappingRecords.filter(r=>r.studySignal.section===t.section).length,status:mappingRecords.some(r=>r.studySignal.section===t.section)?'candidate-reference-links':'not-needed-or-not-mapped; no relevance claim'}))),unusedChapters:chapters.filter(c=>c.reference_use_status==='not-needed-for-current-map').map(c=>({chapter:c.chapter,status:'not-needed-for-current-map',reason:'No necessary link established in this bounded pass. Not proof that every topic is irrelevant.'})),independentHumanApprovals:0};
  const quality={schemaVersion:1,kind:'reference-index-validation',reference_id:p.reference_id,date:p.date,sourceSha256:before,checks:{pdfParsed:true,pageCount:doc.numPages,chapterCount:chapters.length,chapterHeadingsMatchedToBriefAndDetailedToc:chapters.length,bookmarkDestinationsDifferingFromActualStart:chapters.filter(c=>c.pdf_bookmark_page!==c.pdf_page).length,uniqueConcepts:new Set(mappingRecords.map(r=>r.concept_id)).size,mappingRecords:mappingRecords.length,mappedStudySignalSections:new Set(mappingRecords.map(r=>r.studySignal.section)).size,usedReferenceChapters:new Set(mappingRecords.map(r=>r.chapter)).size,missingConceptIds:0,duplicateMappingPairs:0,referenceJsonSchema:'PASS',originalPdfUnchanged:false,baselineClassificationUnchanged:false,totalDistinctPagesExtracted:cache.size,wholeBookTextExtraction:false,ocrRun:false,printedPagesVerified:0,independentHumanApprovals:0},samples,limitations:['Title page has three authors, including Aaron A. Hoskins.','Metadata title is About this Book and does not identify the edition; title/copyright pages were used.','EPUB-converted PDF has digital folios, figure descriptions and reflow artifacts; original print pagination is unverified.','Index entries near the end cite original print pages; do not use them as physical PDF page numbers.','Page 1 has no extractable text; this is not proof of a missing page.','English prose is extractable in front/middle/back samples; formulas can lose symbols or be verbalized. Text extraction is not suitable for blindly copying equations.','Physical page count and sampled parse success do not certify all 2274 pages, images, formulas or completeness.','Mapping links are chapter-level agent candidates, not exact concept-page verification or independent human approval.','No complete human-verified production knowledge graph was found; committed Phase 2E v5 was used as a frozen derived baseline.','Only metadata, chapter titles, original short summaries and source locators are saved. No book body, figures or PDF copies are saved.','Full original PDF rights/license and provenance are unverified. No public textbook/course reuse is authorized.']};
  const chapterSchema={type:'object',required:['chapter','title_en','title_zh','pdf_page','printed_page','verification_status','evidence'],properties:{chapter:{type:'integer',minimum:1,maximum:28},pdf_page:{type:'integer',minimum:1,maximum:doc.numPages},printed_page:{type:'null'},evidence:{type:'object'}}};
  validateSchema({type:'object',required:['reference_id','edition','authors','source','chapters'],properties:{chapters:{type:'array',minItems:28,maxItems:28,items:chapterSchema}}},index);
  validateSchema({type:'object',required:['reference_id','baseline','records'],properties:{records:{type:'array',minItems:p.mappings.length,maxItems:p.mappings.length,items:{type:'object',required:['concept_id','chapter','pdf_page','printed_page','evidence','verification_status','needsHumanReview'],properties:{needsHumanReview:{const:true},printed_page:{type:'null'},verification_status:{const:'agent-proposed; independent-human-review-pending'}}}}}},referenceMap);
  assert.equal(fileHash(pdfPath),before);quality.checks.originalPdfUnchanged=true;
  assert.equal(fileHash(p.mapPath),p.mapSha256);quality.checks.baselineClassificationUnchanged=true;
  const lines=['# Lehninger Reference Index 初版檢查報告','',`日期：${p.date}。來源僅本機；不修改Phase 2F、試題分類、OCR、教材、網站或正式schema；未執行Git暫存、commit或push。`,'','## PDF檢查','',`- ${p.title}，${p.edition}，2021；書名頁PDF第2頁確認三位作者：${p.authors.join('、')}。` ,`- 檔案：\`${index.source.file_name}\`，${index.source.bytes.toLocaleString('en-US')} bytes，${doc.numPages}頁；SHA-256：\`${before}\`。`,`- 同資料夾兩個檔名變體：${duplicates.length}份；雜湊${new Set(duplicates.map(d=>d.sha256)).size===1?'完全相同':'不同，需另外檢查'}。不複製任何PDF進專案。`,`- 前／中／後抽樣PDF頁：${samplePages.join('、')}；第1頁沒有可擷取文字，其餘樣本均可擷取英文。只保存字數與雜湊，不保存原書段落。`,`- 目錄：簡目PDF第${brief}頁、詳目PDF第${tocPages[0]}–${tocPages.at(-1)}頁；28章逐章核對正文標題。只擷取${cache.size}個不同頁面，沒有全書OCR或全文擷取。`,'','## 頁碼與品質問題','', '本檔由EPUB轉成PDF，頁尾流水號與PDF頁碼不同，且不能認作原版紙本印刷頁碼。所有printed_page=null（尚未確認）。PDF頁碼從1開始；digital_folio僅記錄直接讀到的數字。',`章節書籤有${quality.checks.bookmarkDestinationsDifferingFromActualStart}個沒有指向真正章開頭；本索引使用逐章查到的CHAPTER標題頁，不直接使用書籤目的頁。`, '尾端原書索引含紙本頁碼，不能直接用來跳轉PDF。可擷取英文敘述，但圖表替代描述、重排與缺失公式符號可能影響文字忠實度。沒有發現已檢頁面解析損壞；全書缺頁、所有圖像與公式完整性尚未確認。','','## 章節索引','', '中文章名是Agent撰寫的索引譯名，非出版社正式中文版。核心概念摘要為原創短語。參考用途僅為內部原理查證，不將整章列入考試範圍。','', '|章|英文章名|中文索引譯名|PDF起始頁|檔內流水號|紙本頁碼|本輪用途|','|---|---|---|---:|---:|---|---|',...chapters.map(c=>`|${c.chapter}|${c.title_en}|${c.title_zh}|${c.pdf_page}|${c.digital_folio??'未確認'}|尚未確認|${c.reference_use_status==='candidate-supporting-reference'?'候選補充參考':'本輪不需要'}|`),'','## 與StudySignal對照','',`基準：\`${p.mapPath}\`，提交\`${p.mapCommit}\`。這是結構驗證過的Phase 2E衍生分類，不是全部已人工核准的正式知識圖譜；未讀取或改寫進行中的Phase 2F。`,`建立${mappingRecords.length}筆候選連結，涵蓋${quality.checks.uniqueConcepts}個既有核心概念、${quality.checks.mappedStudySignalSections}個既有節、${quality.checks.usedReferenceChapters}個參考書章。每個概念都有既有考題ID，沒有新增考試範圍。`, '本輪參考頁是章開頭定位，section=null，精確概念所在頁尚未核實。所有對照均needsHumanReview=true、人工核准0筆。原教材頁碼只引用既有目錄的節起始頁，不冒充題目專屬教材依據。','', '|StudySignal節／核心概念|Lehninger章|PDF章起始頁|用途界線|','|---|---:|---:|---|',...mappingRecords.map(r=>`|${r.studySignal.section}／${r.concept_id} ${r.studySignal.conceptTitle}|${r.chapter}|${r.pdf_page}|${r.scope_note}|`),'','## 保存檔案與重跑','',...Object.values(p.outputs).map(f=>'- `'+f+'`'),'- 計畫：`'+planPath+'`；工具：`scripts/kb-lehninger-reference-index.mjs`。','- 沿用sources/biology、derived/biology及docs/knowledge-base/biology分層。reference_id不是偽造的已入庫document/source ID；未修改source-registry或正式KnowledgeBaseSnapshot schema。', '- 唯讀驗證：`node scripts/kb-lehninger-reference-index.mjs --pdf "<本機原始PDF完整路徑>"`。','- 首次新增可用`--write-new`；已存在任一目標即拒絕覆蓋。工具不擷取全書、不做OCR、不執行Git。','','## 待確認與下一步','', '1. 人工核對書目與本機來源使用權；保留原PDF於本機，不上傳GitHub或公開課程。','2. 以考題及原教材需求挑選少數候選概念，定位其精確節與PDF頁，逐項人工確認科學原理；目前42筆均為候選。','3. 紙本頁碼需另有可核實的原版來源後才能補入，不以本PDF流水號換算。','4. 原書圖表不供學生直接使用；後續教材應自行撰寫與重新設計圖解。','5. 缺頁、公式及圖像完整性尚未全書驗收；本輪沒有以完整頁數宣稱完整。','6. 保持Phase 2F獨立進行；待使用者確認後再決定是否保存至GitHub。',''].join('\n');
  const outputs={[p.outputs.index]:JSON.stringify(index,null,2)+'\n',[p.outputs.map]:JSON.stringify(referenceMap,null,2)+'\n',[p.outputs.quality]:JSON.stringify(quality,null,2)+'\n',[p.outputs.report]:lines};
  if(args.includes('--write-new'))writeExclusive(outputs);
  else for(const [f,body] of Object.entries(outputs))assert.equal(fs.readFileSync(f,'utf8'),body,`saved output differs: ${f}`);
  console.log(JSON.stringify({validation:'PASS',...quality.checks,chapters:chapters.map(c=>({chapter:c.chapter,pdf_page:c.pdf_page,digital_folio:c.digital_folio,printed_page:c.printed_page})),outputs:Object.keys(outputs)},null,2));
}finally{await task.destroy();}
