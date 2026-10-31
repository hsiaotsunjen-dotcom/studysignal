import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Default is read-only. --write-new exclusively creates three derived reports.
// --refresh-derived requires the exact current hashes of these three outputs.
// No OCR, package install, import, Git mutation, or changes to existing files.
const dir = 'content/knowledge-base/derived/biology/';
const decisionPath = `${dir}phase-2d-review-decisions.json`;
const mapPath = `${dir}exam-topic-map-roc106-115.v4.json`;
const qualityPath = `${dir}phase-2d-quality-validation.json`;
const reportPath = 'docs/knowledge-base/biology/phase-2d-review-report.md';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const fileSha = p => sha(fs.readFileSync(p));
const d = read(decisionPath), b = read(d.baselinePath);
const toc = read(b.sources.toc.path), manifest = read(b.sources.manifest.path), index = read(b.sources.pageIndex.path);
const sectionEntries = toc.chapters.flatMap(c => c.entries.filter(e => e.kind === 'section').map(e => ({ ...e, unit: c.number })));
const sections = new Map(sectionEntries.map(e => [e.number, e]));
const count = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
const normalize = t => t.replace(/\s+/gu, '');
const protectedFiles = Object.entries(d.protectedProjectFiles);
for (const [p, expected] of protectedFiles) assert.equal(fileSha(p), expected, `Pre-existing file changed: ${p}`);
assert.equal(b.questions.length, 500);
assert.equal(sections.size, 31);
assert.equal(d.decisions.length, 37);
assert.equal(new Set(d.decisions.map(r => r.id)).size, 37);
assert.deepEqual(d.decisions.map(r => r.id).sort(), b.questions.filter(q => q.status !== 'section').map(q => q.id).sort());

const scanChecks = { totalScans: manifest.scans.length, verifiedCopies: 0 };
for (const s of manifest.scans) for (const key of ['originalPath', 'archivePath']) {
  assert.equal(fileSha(s[key]), s.sha256, `Scan changed: ${s.originalFileName} (${key})`);
  scanChecks.verifiedCopies++;
}
const newEvidence = [...d.observations, ...(d.additionalObservations || [])].map(o => {
  const page = index.entries.find(e => e.printedPage === o.printedPage);
  assert(page, `Page missing: ${o.printedPage}`);
  const scan = manifest.scans.find(s => s.originalFileName === page.file);
  assert(scan);
  assert(o.observedSections.every(s => sections.has(s)));
  return { id: `phase2d-p${o.printedPage}`, ...o, file: scan.originalFileName, sha256: scan.sha256, seq: page.seq, manifestPath: b.sources.manifest.path, locator: 'Resolve exact file through manifest; index section estimates are not evidence.' };
});
const evidence = [...b.evidence, ...newEvidence];
const byEvidence = new Map(evidence.map(e => [e.id, e]));
const decisions = new Map(d.decisions.map(r => [r.id, r]));
const assessment = d.decisions.map(r => {
  const old = b.questions.find(q => q.id === r.id);
  assert(r.nextEvidenceNeeded && r.rationale && r.needsHumanReview === true && r.reviewerType === 'agent');
  for (const page of r.pages) assert(byEvidence.has(`phase2d-p${page}`));
  if (r.placement) {
    assert(r.outcome === 'section-supported');
    assert(old.candidates.includes(r.placement.split('/')[0]), `New primary outside previous candidates: ${r.id}`);
    assert(r.pages.length > 0);
  } else assert(r.outcome === 'pending');
  return { ...r, previousStatus: old.status, previousPlacement: old.placement, previousCandidates: old.candidates, previousReason: old.unresolvedReason, evidenceRefs: r.pages.map(p => `phase2d-p${p}`), questionSource: b.questionSources[r.id] };
});
const questions = b.questions.map(old => {
  const r = decisions.get(old.id);
  if (!r) return structuredClone(old);
  const q = structuredClone(old);
  q.review.push({ source: 'Phase 2D', text: `Agent複核；${r.rationale}；待獨立人工審核。` });
  if (r.placement) {
    const [section, subtopic] = r.placement.split('/');
    q.status = 'section';
    q.placement = { unit: sections.get(section).unit, section, bucket: section, subtopic };
    q.candidates = [];
    q.mappingBasis = 'textbook-evidence';
    q.basisNote = r.rationale;
    q.unresolvedReason = null;
    q.secondarySections = [...new Set([...old.secondarySections, ...r.secondarySections])].filter(s => s !== section);
  } else q.unresolvedReason = r.rationale;
  return q;
});
for (const old of b.questions.filter(q => q.status === 'section')) assert.deepEqual(questions.find(q => q.id === old.id), old);
for (let year = 106; year <= 115; year++) {
  const qs = questions.filter(q => q.year === year);
  assert.deepEqual(qs.map(q => q.number), Array.from({ length: 50 }, (_, i) => i + 1));
  for (const q of qs) assert.equal(q.id, `ROC${year}-Q${String(q.number).padStart(2, '0')}`);
}
assert.equal(new Set(questions.map(q => q.id)).size, 500);
for (const q of questions) {
  assert(['section', 'unit', 'ambiguous'].includes(q.status));
  if (q.status === 'section') {
    assert.equal(sections.get(q.placement.section)?.unit, q.placement.unit);
    assert.equal(q.candidates.length, 0);
    assert(q.placement.subtopic);
  } else {
    assert.equal(q.placement.section, null);
    assert(q.candidates.length >= 2 && q.unresolvedReason);
    const candidateUnits = [...new Set(q.candidates.map(s => sections.get(s)?.unit))];
    assert.equal(q.status, candidateUnits.length === 1 ? 'unit' : 'ambiguous');
    assert.equal(q.placement.unit, candidateUnits.length === 1 ? candidateUnits[0] : null);
  }
  for (const s of [...q.candidates, ...q.secondarySections]) assert(sections.has(s));
}
function aggregate(qs) {
  const years = [...new Set(qs.map(q => q.year))].sort((a, b) => a - b);
  return { questionCount: qs.length, questions: qs.map(q => q.id), yearsTested: years, yearsTestedCount: years.length, yearCoverage: `${years.length}/10` };
}
const names = { pancreas: '胰臟雙重腺體功能', diabetes: '糖尿病與胰島素', aquaponics: '魚菜共生', expression: '基因表現', viruses: '病毒與疾病', microarray: 'DNA微陣列', conservation: '保育措施', 'life-cycle': '植物世代交替' };
const units = b.units.map(u => ({ ...u, ...aggregate(questions.filter(q => q.placement.unit === u.unit)), unresolvedQuestions: questions.filter(q => q.status === 'unit' && q.placement.unit === u.unit).map(q => q.id), topics: u.topics.map(t => {
  const entry = sections.get(t.section);
  assert.equal(t.title, entry.title);
  assert.equal(t.tocPage, entry.page);
  assert(index.entries.some(e => e.printedPage === t.tocPage));
  const qs = questions.filter(q => q.placement.section === t.section);
  return { ...t, ...aggregate(qs), secondaryQuestions: questions.filter(q => q.secondarySections.includes(t.section)).map(q => q.id), unresolvedCandidateQuestions: questions.filter(q => q.candidates.includes(t.section)).map(q => q.id), subtopics: [...new Set(qs.map(q => q.placement.subtopic))].sort().map(s => ({ id: `${t.section}/${s}`, title: t.subtopics.find(x => x.id === `${t.section}/${s}`)?.title || names[s] || s, ...aggregate(qs.filter(q => q.placement.subtopic === s)) })) };
}) }));

// Transparent lexical screening: flags are review leads, never semantic proof.
const keywords = {
  '1-1': '生命|代謝|同化|異化', '1-2': '細胞膜|胞器|酵素|核糖體|粒線體|細胞壁|核酸', '1-3': '有絲|減數|細胞分裂|細胞週期',
  '2-1': '演化|天擇|親緣|化石|突變', '2-2': '多樣性|外來種|入侵|物種豐富', '2-3': '分類|病毒|細菌|原核|真菌|菌物|五界|裸子|蕨|苔',
  '1-4': '顯微鏡|洋蔥|細胞觀察|染色|口腔皮膜', '2-4': '校園|樣區|多樣性觀察|調查',
  '3-1': '根|莖|葉|木質部|韌皮部|維管束', '3-2': '光合|蒸散|氣孔|吸收|運輸|質外體|植物激素|向光|生長素|吉貝素|乙烯|離層酸', '3-3': '花粉|胚珠|受精|孢子體|配子體|生殖|傳粉',
  '4-1': '消化|營養|胃|小腸|胰液|維生素|膽汁', '4-2': '血球|血紅素|血管|循環|心臟|血液|血壓', '4-3': '呼吸|排泄|氣體交換|肺|腎|尿', '4-4': '免疫|抗體|抗原|疫苗|淋巴|防禦|T細胞|B細胞', '4-5': '神經|腦|肌肉|運動|反射|感覺', '4-6': '激素|胰島|糖尿病|腺|內分泌', '4-7': '恆定|血糖|體溫|酸鹼|滲透壓',
  '5-1': '生殖|睪丸|卵巢|精子|輸卵管', '5-2': '月經|懷孕|避孕|胎盤|黃體|受孕',
  '6-1': '孟德爾|分離律|獨立分配|基因型|表現型|雜交', '6-2': 'DNA|RNA|轉錄|轉譯|複製|連鎖|基因表現|染色體', '6-3': '遺傳|血型|色盲|性聯|多基因|突變|唐氏|人類', '6-4': '粗萃取|萃取|洗碗精|酒精|電泳',
  '7-1': 'PCR|微陣列|基因晶片|SCNT|複製羊|幹細胞|RNA干擾|單株抗體|生物技術', '7-2': '重組|轉殖|質體|限制酶|連接酶|遺傳工程', '7-3': '生物科技|組織培養|基因治療|基改|指紋|電泳|基因編輯|PCR|農業',
  '8-1': '族群|群集|共生|競爭|捕食|寄生|生物防治', '8-2': '生態系|食物鏈|食物網|能量|碳循環|氮循環|生產者|分解者', '8-3': '資源|污染|保育|暖化|公約|國家公園|回收|永續', '8-4': '魚菜共生|建置|水族箱|實驗|觀察'
};
assert.equal(Object.keys(keywords).length, 31);
assert.deepEqual(Object.keys(keywords).sort(), [...sections.keys()].sort());
const qualityRecords = b.questions.filter(q => q.status === 'section').map(q => {
  const source = b.questionSources[q.id], raw = fs.readFileSync(source.path, 'utf8').slice(source.startOffset, source.endOffset);
  assert.equal(sha(raw), source.spanSha256);
  const text = normalize(raw.split(/▲閱讀下文|閱讀下文/u)[0]);
  const hits = Object.entries(keywords).flatMap(([section, expression]) => [...text.matchAll(new RegExp(expression, 'giu'))].map(m => ({ section, term: m[0] })));
  const matchedSections = [...new Set(hits.map(h => h.section))];
  const excerptAligned = normalize(raw).includes(normalize(q.stemExcerpt).replace(/(?:…|\.{3})+$/u, ''));
  const refs = b.assessment.find(a => a.id === q.id)?.evidenceRefs || [];
  const pageChecks = refs.map(id => {
    const e = byEvidence.get(id);
    assert(e && index.entries.some(p => p.file === e.file && p.printedPage === e.printedPage));
    const observedSections = e.observedSections || [e.observedSection];
    return { evidenceId: id, printedPage: e.printedPage, file: e.file, existsAndHashVerified: true, observationSectionMatchesPrimary: observedSections.includes(q.placement.section), observationMatchesSecondary: observedSections.some(s => q.secondarySections.includes(s)), contentCorrespondence: 'not-independently-verified' };
  });
  const flags = [];
  if (!q.basisNote) flags.push('missing-basis-note');
  if (!excerptAligned) flags.push('excerpt-source-mismatch');
  if (!matchedSections.includes(q.placement.section)) flags.push('no-primary-keyword-hit');
  if (matchedSections.some(s => s.split('-')[0] !== q.placement.section.split('-')[0])) flags.push('cross-chapter-keywords');
  if (q.secondarySections.some(s => s.split('-')[0] !== q.placement.section.split('-')[0])) flags.push('existing-cross-chapter-secondary');
  if (pageChecks.some(p => !p.observationSectionMatchesPrimary && !p.observationMatchesSecondary)) flags.push('evidence-section-mismatch');
  return { id: q.id, placement: q.placement, source, structuralStatus: 'pass', excerptAligned, matchedSections, keywordHits: hits, flags, pageChecks, pageEvidenceStatus: refs.length ? 'locator-verified; content-review-pending' : 'no-question-specific-page-citation', semanticStatus: 'pending-independent-review', needsHumanReview: true };
});
const statuses = count(questions.map(q => q.status));
const summary = { totalQuestions: 500, classificationRecords: 500, noClassificationRecord: 0, sectionPlaced: statuses.section || 0, unitLevelSectionUnresolved: statuses.unit || 0, crossChapterAmbiguous: statuses.ambiguous || 0, withoutSingleSection: questions.filter(q => q.status !== 'section').length, phase2dReviewed: 37, phase2dSectionSupported: assessment.filter(r => r.outcome === 'section-supported').length, phase2dPending: assessment.filter(r => r.outcome === 'pending').length, preservedPhase2cSectionRecords: 463, independentHumanApprovalsAdded: 0, perYear: Object.fromEntries(Array.from({ length: 10 }, (_, i) => { const year = 106 + i; return [year, { total: 50, ...count(questions.filter(q => q.year === year).map(q => q.status)) }]; })) };
const schemaPaths = ['src/lib/knowledge-base/schema/snapshot.ts', 'src/lib/knowledge-base/schema/entities.ts', 'src/lib/knowledge-base/schema/enums.ts', 'src/lib/knowledge-base/utils/validateSnapshot.ts'];
const snapshotText = fs.readFileSync(schemaPaths[0], 'utf8');
const requiredSnapshotArrays = [...snapshotText.split('export type KnowledgeBaseSnapshot = {')[1].split('};')[0].matchAll(/^\s*(\w+):[^\n]+\[\];/gm)].map(m => m[1]);
assert.equal(requiredSnapshotArrays.length, 11);
const schemaCompatibility = { status: 'blocked-for-direct-snapshot-import', derivedFormatValidation: 'pass', schemaChanged: false, sources: Object.fromEntries(schemaPaths.map(p => [p, fileSha(p)])), requiredSnapshotArrays, missingSnapshotArrays: requiredSnapshotArrays.filter(k => !(k in b)), examQuestionMissingFields: ['examSourceId', 'questionNumber', 'questionType', 'questionText', 'answer', 'explanation', 'difficulty'], questionKnowledgeMissing: ['knowledgeNodeId', 'questionId', 'relevance', 'role'], reviewStateRepresentableInFormalEntities: false, action: '保留exam-topic-map衍生格式；正式匯入前需經審核的節點／FK轉換與外部審核紀錄，不修改schema、不捏造答案或節點。', formalSnapshotValidatorExecuted: false, reason: '輸出不是KnowledgeBaseSnapshot，缺少必要陣列，不能傳入驗證器冒稱通過。' };
const qualitySummary = { inspectedSectionQuestions: qualityRecords.length, structuralPassed: qualityRecords.filter(q => q.structuralStatus === 'pass').length, excerptMismatches: qualityRecords.filter(q => !q.excerptAligned).length, flaggedQuestions: qualityRecords.filter(q => q.flags.length).length, crossChapterScreeningFlags: qualityRecords.filter(q => q.flags.includes('cross-chapter-keywords')).length, questionsWithSpecificPageCitations: qualityRecords.filter(q => q.pageChecks.length).length, questionsWithoutSpecificPageCitations: qualityRecords.filter(q => !q.pageChecks.length).length, evidenceSectionMismatchQuestions: qualityRecords.filter(q => q.flags.includes('evidence-section-mismatch')).length, semanticApprovals: 0, ruleFlagCounts: count(qualityRecords.flatMap(q => q.flags)) };
const map = { ...structuredClone(b), version: 4, title: 'ROC106–ROC115 生物考題主題對照（Phase 2D v4）', baselinePath: d.baselinePath, baselineSha256: fileSha(d.baselinePath), classificationDate: d.date, status: d.status, method: { ...b.method, phase2d: '37題逐題Agent複核；463題自動結構及關鍵字篩查；疑點只列清單。未完成人工審核或逐題教材內容驗收。' }, sources: { ...b.sources, phase2dDecisions: { path: decisionPath, sha256: fileSha(decisionPath) } }, phase2cSummary: b.summary, summary, questions, units, crossChapterAmbiguous: aggregate(questions.filter(q => q.status === 'ambiguous')), previousAssessment: b.assessment, assessment, evidence };
const quality = { schemaVersion: 1, kind: 'classification-quality-review', date: d.date, baseline: { path: d.baselinePath, sha256: fileSha(d.baselinePath), commit: d.baselineCommit }, summary: qualitySummary, finalClassification: summary, checks: { projectFilesVerified: protectedFiles.length, unchangedProjectFiles: Object.keys(d.protectedProjectFiles), duplicateQuestionIds: 0, missingQuestions: 0, yearsVerified: [106,107,108,109,110,111,112,113,114,115], tocSectionsVerified: 31, sectionStartPageLocatorsVerified: 31, priorSectionRecordsPreservedExactly: 463, ...scanChecks }, limitations: ['關鍵字規則不理解否定、選項正誤、圖表或主要考點；命中與未命中都不是正誤結論。', '題目區段依Phase2C來源邊界，篩查移除後續閱讀前言以減少汙染；仍非圖文邊界驗收。', '31個章節起始頁是目錄定位，不能當成463題的精確教材頁碼。', '未重新執行OCR。現有OCR試驗頁面不能代替未OCR教材；本輪以原圖查證。', '本輪分類有證據支持不等於人工批准，所有分類仍需獨立學科審核。'], schemaCompatibility, records: qualityRecords, reviewQueue: qualityRecords.filter(q => q.flags.length).map(q => ({ id: q.id, flags: q.flags, candidateSectionsFromRules: q.matchedSections, action: '覆核原題與教材；保留原分類，不依規則自動改寫。' })) };
assert.equal(qualityRecords.length, 463);
assert.equal(summary.sectionPlaced + summary.withoutSingleSection, 500);
assert.equal(units.flatMap(u => u.topics.flatMap(t => t.questions)).length, summary.sectionPlaced);
assert.equal(new Set(units.flatMap(u => u.topics.flatMap(t => t.questions))).size, summary.sectionPlaced);
assert.deepEqual(Object.keys(questions[0]).sort(), Object.keys(b.questions[0]).sort());
const lines = ['# Phase 2D 未定分類複核與品質驗證', '', `日期：${d.date}。基準 commit：${d.baselineCommit}。僅新增衍生資料；未改動Phase 2C、原題、OCR、教材、網站或正式schema；未執行Git暫存、commit或push。`, '', '## 判讀範圍與結果', '', `37題均讀取既有題幹與選項，並記錄候選、判斷、教材原圖依據及下一步。113-Q49、114-Q47/48、115-Q47另讀前題區段保存的共同前言。${summary.phase2dSectionSupported}題取得主要節的Agent證據支持；${summary.phase2dPending}題保留pending。新增獨立人工批准0題。`, '', `500題最終：單一節${summary.sectionPlaced}題；章內未定${summary.unitLevelSectionUnresolved}題；跨章未定${summary.crossChapterAmbiguous}題。原463題逐欄保留，原242題亦包含在其中。`, '', '| 題號 | 本輪結果／主要節 | 依據頁 | 判斷及下一步 |', '|---|---|---|---|'];
for (const a of assessment) lines.push(`| ${a.id} | ${a.placement || 'pending：'+a.previousCandidates.join('／')} | ${a.pages.join('、')} | ${a.rationale} 下一步：${a.nextEvidenceNeeded} |`);
lines.push('', '## 463題品質檢查', '', `結構通過${qualitySummary.structuralPassed}/463題；重複題號0、遺漏0。題目來源區段SHA-256全部一致；章與節的隸屬、31節目錄名稱及起始頁定位通過。`, '', `規則篩出${qualitySummary.flaggedQuestions}題複核線索，其中${qualitySummary.crossChapterScreeningFlags}題命中跨章關鍵字；清單並不代表錯分。全文逐題語意與選項正誤不能由此自動確認，語意驗收通過數不作推估。`, '', `原463題中${qualitySummary.questionsWithSpecificPageCitations}題有Phase2C逐題教材引用，${qualitySummary.questionsWithoutSpecificPageCitations}題沒有。引用的檔案、頁碼及雜湊已核對；內容是否充分對應仍待學科覆核。${qualitySummary.evidenceSectionMismatchQuestions}題的引用觀察節與主分類不同，詳見品質JSON。`, '', '完整463筆檢查與疑點清單保存在phase-2d-quality-validation.json的records及reviewQueue；每筆保留來源與規則命中，未直接改動原分類。', '', '## 來源與證據界線', '', `本輪保存${newEvidence.length}頁原圖的短觀察，不複製教材正文或圖片。圖檔以原manifest的檔名及SHA-256定位；頁碼索引的估計分類不作內容證據。掃描索引與目錄同版性仍未全面驗證。`, '', `已核對原有${protectedFiles.length}個專案檔案雜湊，以及486頁教材的原圖與備份共${scanChecks.verifiedCopies}份，均未變。全量保護清單位於判讀JSON的protectedProjectFiles；其中包含Phase2C五份成果、既有OCR試驗及schema。`, '', '考題依據為各年度sources/biology/tve-ut-health-nursing-bio-roc106～115/paper.md及paper.json，逐題位置沿用v3的questionSources。教材依據為sources/biology/shinedoc-textbook-20260930-1001/page-index.json與scans/manifest.json；章節規範為sources/biology/shinedoc-toc-20260902/toc.json。上述sources路徑均位於content/knowledge-base/內。', '', '## 格式相容性', '', 'JSON可解析、exam-topic-map衍生格式與逐題欄位驗證通過。正式KnowledgeBaseSnapshot直接匯入仍受阻：缺少11個正式陣列及KnowledgeNode／QuestionKnowledge關聯；分類紀錄也沒有完整ExamQuestion欄位。沒有捏造答案、難度或節點以湊出通過的snapshot，也沒有修改正式schema。', '', 'schemaCompatibility保存缺失欄位與四份正式規範檔雜湊。未對非snapshot資料執行validateKnowledgeBaseSnapshot；不能宣稱正式匯入驗證通過。人工審核與pending資訊須隨衍生資料保留，不能在轉換時遺失。', '', '## 檔案與重現方式', '', '- content/knowledge-base/derived/biology/phase-2d-review-decisions.json：37題判讀、28頁觀察、原檔保護雜湊。', '- content/knowledge-base/derived/biology/exam-topic-map-roc106-115.v4.json：維持既有逐題格式的500題分類及歷史紀錄。', '- content/knowledge-base/derived/biology/phase-2d-quality-validation.json：463題檢查、疑點清單及schema相容性。', '- scripts/kb-biology-review-phase2d.mjs：預設唯讀驗證；--write-new只建立不存在的三份輸出，拒絕覆蓋。', '- docs/knowledge-base/biology/phase-2d-review-report.md：本報告。', '', '```powershell', 'node --check scripts/kb-biology-review-phase2d.mjs', 'node scripts/kb-biology-review-phase2d.mjs', '```', '', '摘錄比對會去除尾端省略號；次要節的教材引用不當成主節錯誤。\n\n預設命令重建模型並與保存的三份輸出逐欄／逐字比對，確認判讀與來源一致；不會重新OCR、改寫輸出或執行Git。', '', '## 待辦', '', '先人工審核本輪8題主要節與29題pending，再按reviewQueue核對463題疑點。所有463題的原分類保持不變。缺少逐題教材引用者應補直接內容依據；圖表／OCR警示需回查原PDF。正式匯入須另做節點映射、外鍵及原題欄位轉換，保留審核狀態；此階段不撰寫教材。', '');
const outputs = new Map([[mapPath, JSON.stringify(map, null, 2)+'\n'], [qualityPath, JSON.stringify(quality, null, 2)+'\n'], [reportPath, lines.join('\n')]]);
if (process.argv.includes('--refresh-derived')) {
  const expected = process.argv.slice(3);
  assert.equal(expected.length, outputs.size);
  [...outputs.keys()].forEach((p, i) => assert.equal(fileSha(p), expected[i], `Output changed: ${p}`));
  for (const [p, text] of outputs) fs.writeFileSync(p, text);
} else if (process.argv.includes('--write-new')) {
  for (const p of outputs.keys()) assert(!fs.existsSync(p), `Refusing to overwrite: ${p}`);
  for (const [p, text] of outputs) fs.writeFileSync(p, text, { flag: 'wx' });
} else {
  assert.equal(process.argv.length, 2, 'Only --write-new or default read-only validation is supported');
  for (const [p, text] of outputs) assert.equal(fs.readFileSync(p, 'utf8'), text, `Stored output differs: ${p}`);
}
console.log(JSON.stringify({ validation: 'PASS', summary, qualitySummary, schemaCompatibility: schemaCompatibility.status, protectedProjectFiles: protectedFiles.length, scanChecks }, null, 2));
