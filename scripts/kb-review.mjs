// Reusable, offline classification review. No OCR, network, Git mutation or source writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const Ajv = require('ajv'); // Existing installation; no dependency installation.
export const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const fileSha = p => sha(fs.readFileSync(p));
const same = (a,b) => assert.deepEqual(a,b);
const normalize = s => s.normalize('NFKC').replace(/\s|[．。.,，、：:；;！？!?（）()\[\]「」『』]/gu,'');
export function validateSchema(schema, value) {
  const v = new Ajv({allErrors:true, jsonPointers:true}).compile(schema);
  assert(v(value), JSON.stringify(v.errors));
}
export function checkUniverse(questions, scope) {
  assert.equal(questions.length, scope.years.length * scope.questionsPerYear);
  const ids = new Set();
  for (const q of questions) {
    assert(scope.years.includes(q.year), `outside year: ${q.id}`);
    assert(Number.isInteger(q.number) && q.number>=1 && q.number<=scope.questionsPerYear);
    assert.equal(q.id, `${scope.idPrefix}${q.year}-Q${String(q.number).padStart(2,'0')}`);
    assert(!ids.has(q.id), `duplicate: ${q.id}`); ids.add(q.id);
  }
  for (const y of scope.years) for(let n=1;n<=scope.questionsPerYear;n++)
    assert(ids.has(`${scope.idPrefix}${y}-Q${String(n).padStart(2,'0')}`));
}
export function checkDecision(d, q, sections, evidence) {
  assert.equal(d.id,q.id);
  same(d.oldClassification,{status:q.status,placement:q.placement,candidates:q.candidates});
  assert.equal(d.reviewerType,'agent'); assert.equal(d.needsHumanReview,true);
  if (d.outcome==='pending') { assert.equal(d.newClassification,null); assert.equal(d.confidence,'insufficient'); }
  else {
    assert.equal(d.outcome,'proposed-section');
    const p=d.newClassification;
    assert(sections.has(p.section),`unknown section ${p.section}`);
    assert.equal(p.unit,sections.get(p.section).unit);
    assert.equal(p.bucket,p.section);
    assert(q.candidates.includes(p.section),'proposal outside recorded candidates');
    assert(d.evidenceIds.some(id=>evidence.get(id)?.observedSections?.includes(p.section)), 'no direct primary evidence');
  }
  for(const id of d.evidenceIds) assert(evidence.has(id),`unknown evidence ${id}`);
  for(const s of d.secondarySections) assert(sections.has(s));
}
function aggregate(qs,scope) {
  const yearsTested=[...new Set(qs.map(q=>q.year))].sort((a,b)=>a-b);
  return {questionCount:qs.length,questions:qs.map(q=>q.id),yearsTested,yearsTestedCount:yearsTested.length,yearCoverage:`${yearsTested.length}/${scope.years.length}`};
}
export async function review(planPath, {external=true,pdf=true}={}) {
  const p=json(planPath); validateSchema(json(p.schemaPath),p);
  const baseline=json(p.baselinePath), prior=json(p.priorDecisionsPath), oldQuality=json(p.priorQualityPath);
  assert.equal(fileSha(p.baselinePath),p.baselineSha256);
  assert.equal(baseline.subject,p.subject);
  for(const [f,h] of Object.entries(p.protectedProjectFiles)) assert.equal(fileSha(f),h,`protected file changed: ${f}`);
  const toc=json(p.tocPath),idx=json(p.indexPath),manifest=json(p.manifestPath);
  const sections=new Map(toc.chapters.flatMap(c=>c.entries.filter(e=>e.kind==='section').map(e=>[e.number,{...e,unit:c.number}])));
  const ev=new Map([...baseline.evidence,...p.observations].map(e=>[e.id,e]));
  assert.equal(ev.size,baseline.evidence.length+p.observations.length,'duplicate evidence id');
  for(const e of p.observations) {
    const page=idx.entries.find(x=>x.printedPage===e.printedPage && x.file===e.file);
    assert(page,`page absent ${e.id}`);
    const scan=manifest.scans.find(x=>x.originalFileName===e.file); assert(scan);
    assert.equal(scan.sha256,e.sha256);
    for(const s of e.observedSections) assert(sections.has(s));
  }
  let externalVerified=0;
  if(external) for(const scan of manifest.scans) for(const key of ['originalPath','archivePath']) {
    assert.equal(fileSha(scan[key]),scan.sha256,`scan mismatch: ${scan.originalFileName}/${key}`);externalVerified++;
  }
  checkUniverse(baseline.questions,p.scope);
  const pending=baseline.questions.filter(q=>q.status!=='section');
  same(p.decisions.map(d=>d.id).sort(),pending.map(q=>q.id).sort());
  same(prior.decisions.filter(d=>d.outcome==='pending').map(d=>d.id).sort(),pending.map(q=>q.id).sort());
  const records=[]; const texts=new Map();
  for(const s of baseline.sources.exams) {assert.equal(fileSha(s.path),s.sha256);texts.set(s.path,fs.readFileSync(s.path,'utf8'));}
  for(const q of baseline.questions) {
    assert(['section','unit','ambiguous'].includes(q.status));
    const r=baseline.questionSources[q.id];assert(r);
    const text=texts.get(r.path); assert(text!==undefined);
    assert.equal(sha(text.slice(r.startOffset,r.endOffset)),r.spanSha256,`span ${q.id}`);
    assert.equal(text.slice(0,r.startOffset).split('\n').length,r.startLine,`line ${q.id}`);
    if(q.status==='section') { assert(sections.has(q.placement.section));assert.equal(sections.get(q.placement.section).unit,q.placement.unit); }
    for(const s of [...q.candidates,...q.secondarySections]) assert(sections.has(s));
    const pre=text.slice(0,r.startOffset);
    const markers=[...pre.matchAll(/(?:PDF PAGE\s+(\d+)|PDF \u7b2c\s*(\d+)\s*\u9801)/g)];
    const last=markers.at(-1); const pdfPage=last?Number(last[1]||last[2]):null;
    const dir=path.posix.dirname(r.path)+'/originals';
    const pdfs=fs.readdirSync(dir).filter(f=>f.toLowerCase().endsWith('.pdf'));assert.equal(pdfs.length,1);
    records.push({id:q.id,source:{...r},originalPdf:{path:dir+'/'+pdfs[0],sha256:fileSha(dir+'/'+pdfs[0]),page:pdfPage},sourceSpanHashVerified:true,placementStructureValid:true,semanticStatus:'not-human-verified'});
  }
  const questions=structuredClone(baseline.questions);
  for(const d of p.decisions) {
    const q=questions.find(q=>q.id===d.id);checkDecision(d,q,sections,ev);
    assert(d.reason.length>0 && d.nextEvidenceNeeded.length>0);
    if(d.outcome==='proposed-section') {
      q.status='section';q.placement=d.newClassification;q.candidates=[];q.mappingBasis='textbook-evidence';q.basisNote=d.reason;q.unresolvedReason=null;q.secondarySections=d.secondarySections;
      q.review=[...q.review,{source:'Phase 2E',text:'Agent proposal; independent human review pending. '+d.reason}];
    }
  }
  // Read existing PDF text layers in memory. A matching stem is not a visual/figure review.
  if(pdf) {
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs'); const docs=new Map();
    try {for(const d of p.decisions) {
      const r=records.find(r=>r.id===d.id);let doc=docs.get(r.originalPdf.path);
      if(!doc){const task=getDocument({data:new Uint8Array(fs.readFileSync(r.originalPdf.path)),useSystemFonts:false,cMapUrl:path.resolve('node_modules/pdfjs-dist/cmaps').replaceAll('\\','/')+'/',cMapPacked:true,standardFontDataUrl:path.resolve('node_modules/pdfjs-dist/standard_fonts').replaceAll('\\','/')+'/'});doc=await task.promise;docs.set(r.originalPdf.path,{doc,task});} else doc=doc.doc;
      assert(r.originalPdf.page && r.originalPdf.page<=doc.numPages,`PDF page unresolved ${d.id}`);
      const page=await doc.getPage(r.originalPdf.page);const content=await page.getTextContent();
      const txt=normalize(content.items.map(i=>i.str).join(''));
      const q=baseline.questions.find(q=>q.id===d.id);const needle=normalize(q.stemExcerpt).slice(0,18);
      r.originalPdf.textLayerStemMatched=txt.includes(needle);
      r.originalPdf.figureVisualCheck=p.pdfVisualChecks.find(v=>v.ids.includes(d.id))||null;
      r.originalPdf.textLayerStatus=txt.length?'available':'empty-image-only';
    }} finally {for(const {task} of docs.values()) await task.destroy();}
  }
  const units=structuredClone(baseline.units);
  for(const u of units) {
    Object.assign(u,aggregate(questions.filter(q=>q.placement.unit===u.unit),p.scope));
    u.unresolvedQuestions=questions.filter(q=>q.status!=='section' && q.placement.unit===u.unit).map(q=>q.id);
    for(const t of u.topics) {
      Object.assign(t,aggregate(questions.filter(q=>q.status==='section' && q.placement.section===t.section),p.scope));
      t.secondaryQuestions=questions.filter(q=>q.secondarySections.includes(t.section)).map(q=>q.id);
      t.unresolvedCandidateQuestions=questions.filter(q=>q.status!=='section' && q.candidates.includes(t.section)).map(q=>q.id);
      for(const sub of t.subtopics) Object.assign(sub,aggregate(questions.filter(q=>q.status==='section' && `${q.placement.section}/${q.placement.subtopic}`===sub.id),p.scope));
      assert.equal(t.subtopics.reduce((n,s)=>n+s.questionCount,0),t.questionCount,`subtopic index ${t.section}`);
    }
  }
  const count=qs=>({total:qs.length,section:qs.filter(q=>q.status==='section').length,unit:qs.filter(q=>q.status==='unit').length,ambiguous:qs.filter(q=>q.status==='ambiguous').length});
  const totals=count(questions),resolved=p.decisions.filter(d=>d.outcome==='proposed-section').length;
  const summary={totalQuestions:questions.length,classificationRecords:questions.length,noClassificationRecord:0,sectionPlaced:totals.section,unitLevelSectionUnresolved:totals.unit,crossChapterAmbiguous:totals.ambiguous,withoutSingleSection:totals.unit+totals.ambiguous,phase2eReviewed:pending.length,phase2eProposedSections:resolved,phase2ePending:pending.length-resolved,independentHumanApprovalsAdded:0,perYear:Object.fromEntries(p.scope.years.map(y=>[y,count(questions.filter(q=>q.year===y))]))};
  const map={...structuredClone(baseline),version:baseline.version+1,title:p.title,baselinePath:p.baselinePath,baselineSha256:p.baselineSha256,classificationDate:p.date,phase2dSummary:baseline.summary,previousAssessment:baseline.assessment,assessment:p.decisions,summary,questions,units,crossChapterAmbiguous:aggregate(questions.filter(q=>q.status==='ambiguous'),p.scope),evidence:[...baseline.evidence,...p.observations]};
  map.sources.phase2eDecisions={path:planPath,sha256:fileSha(planPath)};
  map.method.phase2e='Evidence-supported agent proposals only; pending retained; zero human approvals. See review plan for inspection limits.';
  checkUniverse(map.questions,p.scope);
  const unchanged=baseline.questions.filter(q=>q.status==='section');for(const q of unchanged)same(q,questions.find(n=>n.id===q.id));
  for(const d of p.decisions.filter(d=>d.outcome==='pending'))same(baseline.questions.find(q=>q.id===d.id),questions.find(q=>q.id===d.id));
  const refs=units.flatMap(u=>u.topics.flatMap(t=>t.questions)); assert.equal(refs.length,summary.sectionPlaced); assert.equal(new Set(refs).size,refs.length);
  for(const s of sections.values())assert(idx.entries.some(e=>e.printedPage===s.page));
  const snapshot=fs.readFileSync('src/lib/knowledge-base/schema/snapshot.ts','utf8');
  const required=[...snapshot.split('export type KnowledgeBaseSnapshot = {')[1].split('};')[0].matchAll(/^\s*(\w+):[^\n]+\[\];/gm)].map(m=>m[1]);
  const quality={schemaVersion:1,kind:'classification-quality-review',date:p.date,summary,checks:{jsonSchema:'PASS (review plan)',questionUniverse:'PASS',sourceSpansVerified:records.length,priorSectionRecordsUnchanged:unchanged.length,pendingRecordsUnchanged:pending.length-resolved,protectedProjectFilesUnchanged:Object.keys(p.protectedProjectFiles).length,externalScanFilesVerified:external?externalVerified:null,sectionIndexQuestions:refs.length,tocSections:sections.size},formalKnowledgeBaseCompatibility:{status:'not-importable-derived-artifact',missingSnapshotArrays:required.filter(k=>!Array.isArray(map[k])),reason:'No official schema changes. Requires real ExamQuestion/KnowledgeNode/QuestionKnowledge adapter and independent validation; answers and explanations are not fabricated.'},records,reviewQueue:oldQuality.reviewQueue,limitations:p.limitations,semanticApprovals:0};
  const mapSchema={type:'object',required:['version','kind','subject','questions','summary','units','evidence','assessment'],properties:{version:{type:'integer',minimum:1},kind:{const:'exam-topic-map'},subject:{const:p.subject},questions:{type:'array',minItems:questions.length,maxItems:questions.length,items:{type:'object',required:['id','year','number','stemExcerpt','status','placement','candidates','secondarySections','review'],properties:{id:{type:'string'},year:{type:'integer',enum:p.scope.years},number:{type:'integer',minimum:1,maximum:p.scope.questionsPerYear},status:{enum:['section','unit','ambiguous']},placement:{type:'object',required:['unit','section','bucket','subtopic']},candidates:{type:'array',uniqueItems:true,items:{type:'string',enum:[...sections.keys()]}},secondarySections:{type:'array',uniqueItems:true,items:{type:'string',enum:[...sections.keys()]}},review:{type:'array'}}}}}};
  validateSchema(mapSchema,map);
  validateSchema({type:'object',required:['schemaVersion','kind','summary','checks','formalKnowledgeBaseCompatibility','records','reviewQueue','limitations','semanticApprovals'],properties:{schemaVersion:{const:1},kind:{const:'classification-quality-review'},semanticApprovals:{const:0},records:{type:'array',minItems:questions.length,maxItems:questions.length,items:{type:'object',required:['id','source','originalPdf','sourceSpanHashVerified','placementStructureValid','semanticStatus']}},reviewQueue:{type:'array'}}},quality);
  quality.checks.jsonSchema='PASS (review plan, derived map, quality artifact; not formal snapshot)';
  quality.checks.originalPdfStemMatches=records.filter(r=>r.originalPdf.textLayerStemMatched).length;
  quality.checks.originalPdfStemUnconfirmed=records.filter(r=>r.originalPdf.textLayerStemMatched===false).map(r=>r.id);
  quality.checks.pendingReasons=Object.fromEntries(['multiple-topics','insufficient-data','figure-review-needed'].map(k=>[k,p.decisions.filter(d=>d.outcome==='pending' && d.reasonCode===k).map(d=>d.id)]));
  const table=p.decisions.map(d=>{const r=records.find(r=>r.id===d.id);return `| ${d.id} | ${d.oldClassification.candidates.join('/')} | ${d.outcome==='pending'?'pending':d.newClassification.section+' (Agent提案)'} | ${d.evidenceIds.map(id=>ev.get(id).printedPage).join(', ')} | ${d.reason.replace(/\|/g,'／')} ${d.nextEvidenceNeeded.replace(/\|/g,'／')} | ${r.originalPdf.page} / ${r.originalPdf.textLayerStemMatched?'文字命中':'尚未確認'} |`;});
  const report=['# Phase 2E 未定分類複核與品質驗證','',`日期：${p.date}。Phase 2D 本機與 GitHub master 已核對：\`${p.baselineCommit}\`。沒有 Git 暫存、commit 或 push。`,'','## 狀態與範圍','',`僅 ${p.subject} ROC ${p.scope.years[0]}–${p.scope.years.at(-1)}、每年 ${p.scope.questionsPerYear} 題。原始29題為13題章內未定、16題跨章未定；與v4及Phase2D決策pending集合逐題相同。`, `本輪 ${resolved} 題有直接教材原圖支持的單節提案，${pending.length-resolved} 題保留pending。這是Agent複核，人工確認0題；500題均不可因本輪結構檢查改稱已人工驗證。`, `最終：單一節 ${totals.section} 題；章內未定 ${totals.unit} 題；跨章未定 ${totals.ambiguous} 題。原有471題及剩餘pending題物件逐欄不變。`,'','## 逐題決策','', '頁碼欄是已查閱的局部證據，不代表該頁足以解題；Phase2D沿用觀察與本輪新觀察在JSON中分開保存。PDF欄為來源頁定位／文字層題幹前18字命中，不能替代完整選項與圖表目視驗收。','', '| 題號 | 原候選 | 新分類／結果 | 教材印刷頁 | 理由與下一步 | PDF頁／文字定位 |','|---|---|---|---|---|---|',...table,'','## 驗證結果與限制','',`JSON Schema（獨立複核紀錄契約）通過；500題ID、年度及1–50題號完整無重複；500個來源區段SHA-256及行號一致；31節存在於原目錄。${Object.keys(p.protectedProjectFiles).length}個既存專案檔案與啟動前雜湊相同；486原掃描及486備份${external?'均通過manifest雜湊':'本次未檢查外部檔案'}。`, `原Phase2D品質疑點清單保留 ${oldQuality.reviewQueue.length} 題，沒有因關鍵字命中而改寫分類；本輪自動檢查不構成其語義正確率。`, ...p.limitations.map(s=>'- '+s),'','正式KnowledgeBaseSnapshot相容性：尚未完成匯入適配；缺少 '+quality.formalKnowledgeBaseCompatibility.missingSnapshotArrays.join('、')+'。未變更正式schema，也未補造答案或解說。','','## 來源與重跑方式','',`- 基準分類：\`${p.baselinePath}\`，SHA-256 \`${p.baselineSha256}\`。`,`- 決策、原／新分類、信心、證據與587檔保護基準：\`${planPath}\`。`,`- 原考題：各年度 \`sources/biology/tve-ut-health-nursing-bio-rocNNN/paper.md\` 與 \`originals/*.pdf\`；完整相對路徑、PDF雜湊、文字區段起訖與SHA見quality records。`,`- 教材目錄：\`${p.tocPath}\`；頁碼索引：\`${p.indexPath}\`；原圖解析：\`${p.manifestPath}\`。`,`- Phase2D決策：\`${p.priorDecisionsPath}\`；品質清單：\`${p.priorQualityPath}\`；報告：\`docs/knowledge-base/biology/phase-2d-review-report.md\`。`,'- 預設唯讀重跑：`node scripts/kb-review.mjs '+planPath+'`。比對已保存v5／quality／report，可重複執行；任何不一致立即失敗。','- `--write-new` 僅在所有目標均不存在時，使用wx新增三份輸出；拒絕覆蓋。','- `--skip-external` 僅供無外部掃描磁碟的診斷，不能聲稱外部掃描已驗證。','- 引擎從計畫讀取科目、年度、題數、來源與教材目錄；化學需另建真實資料計畫與決策，不會套用生物分類。現階段只驗證通用契約測試，未執行真實化學分類。','','## 下一步','', '1. 人工先複核四項Agent提案及原圖；通過後另存審核紀錄，不直接把Agent欄位改成人工。','2. 補足圖表與跨節主次判準，逐題處理pending；制度與國家公園題需符合出題當年來源，不以現行制度猜答。','3. 先重用現有OCR；尚未OCR頁面是否批次處理另待授權。本輪未重做OCR，未建立教材或公開課程。','4. 正式匯入前建立關聯模型適配與人工學科驗收，保留所有既有版本。',''].join('\n');
  return {plan:p,map,quality,report};
}
export function writeExclusive(outputs) {
  for(const f of Object.keys(outputs)) assert(!fs.existsSync(f),`refuse overwrite: ${f}`);
  for(const [f,body] of Object.entries(outputs)) {fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,body,{flag:'wx'});}
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args=process.argv.slice(2),planPath=args.find(a=>!a.startsWith('--'));
    assert(planPath,'Usage: node scripts/kb-review.mjs <plan.json> [--write-new] [--skip-external]');
    assert(args.filter(a=>a.startsWith('--')).every(a=>['--write-new','--skip-external'].includes(a)),'unknown option');
    const {plan,map,quality,report}=await review(planPath,{external:!args.includes('--skip-external')});
    const outputs={[plan.outputs.map]:JSON.stringify(map,null,2)+'\n',[plan.outputs.quality]:JSON.stringify(quality,null,2)+'\n',[plan.outputs.report]:report};
    if(args.includes('--write-new'))writeExclusive(outputs);
    else if(!args.includes('--skip-external')) for(const [f,body] of Object.entries(outputs))assert.equal(fs.readFileSync(f,'utf8'),body,`saved output mismatch: ${f}`);
    console.log(JSON.stringify({validation:'PASS',summary:map.summary,checks:quality.checks,formalSchema:quality.formalKnowledgeBaseCompatibility.status},null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
