import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Default: read-only validation. --write-new only creates the two named outputs;
// exclusive writes refuse to replace an existing version. --refresh-derived may
// update only this script's two v3 outputs after their expected hashes are checked.
// No OCR/import/network.
const root = 'content/knowledge-base/';
const dir = `${root}derived/biology/`;
const decisionPath = `${dir}phase-2c-classification-decisions.json`;
const outputPath = `${dir}exam-topic-map-roc106-115.v3.json`;
const markdownPath = `${dir}exam-topic-map-roc106-115.v3.md`;
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const clone = x => structuredClone(x);
const decisions = read(decisionPath);
const baseline = read(decisions.baselinePath);
const tocPath = `${root}sources/biology/shinedoc-toc-20260902/toc.json`;
const toc = read(tocPath);
const textbookRoot = `${root}sources/biology/shinedoc-textbook-20260930-1001/`;
const manifestPath = `${textbookRoot}scans/manifest.json`;
const indexPath = `${textbookRoot}page-index.json`;
const manifest = read(manifestPath);
const index = read(indexPath);
const counts = items => items.reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {});
const questionId = (y, n) => `ROC${y}-Q${String(n).padStart(2, '0')}`;
const sectionUnits = new Map(toc.chapters.flatMap(c => c.entries.filter(e => e.kind === 'section').map(e => [e.number, c.number])));
const sections = baseline.units.flatMap(u => u.topics);
assert.equal(sectionUnits.size, 31);
const sourceQuestions = new Map();
const questionSources = {};
const exams = [];
const protectedPaths = new Set([decisions.baselinePath, tocPath, manifestPath, indexPath]);
for (let year = 106; year <= 115; year++) {
  const sourceDir = `${root}sources/biology/tve-ut-health-nursing-bio-roc${year}/`;
  const path = `${sourceDir}paper.md`;
  const metadata = read(`${sourceDir}paper.json`);
  const text = fs.readFileSync(path, 'utf8');
  const matches = [...text.matchAll(/^\s*(\d{1,2})\s*[.．、]\s*/gm)].slice(-50);
  assert.equal(matches.length, 50, `${year}: question count`);
  assert(matches.every((m, i) => Number(m[1]) === i + 1), `${year}: question sequence`);
  exams.push({ year, path, sha256: hash(text), sourceId: metadata.sourceId, documentId: metadata.documentId, questionCount: 50 });
  protectedPaths.add(path);
  protectedPaths.add(`${sourceDir}paper.json`);
  for (const original of metadata.originals) protectedPaths.add(original.path);
  for (const file of fs.readdirSync(sourceDir)) {
    const path = sourceDir + file;
    if (fs.statSync(path).isFile()) protectedPaths.add(path);
  }
  for (const [i, match] of matches.entries()) {
    const start = match.index + match[0].length;
    const end = i < 49 ? matches[i + 1].index : text.length;
    const block = text.slice(start, end);
    const id = questionId(year, i + 1);
    sourceQuestions.set(id, { year, number: i + 1, block });
    questionSources[id] = { path, startOffset: start, endOffset: end, startLine: text.slice(0, start).split('\n').length, spanSha256: hash(block), reviewStatus: metadata.reviewStatus };
  }
}

// Pages were visually inspected in this session. Store short observations and
// manifest references, not textbook images, body transcriptions or local paths.
const observations = {
  10: ['1-2', '本節研讀重點包含胞器、核酸組成及酵素特性。'],
  72: ['2-2', '多樣性定義及降低因素，包含外來種引進。'],
  73: ['2-3', '本頁開始2-3，分類圖含病毒與植物類群。'],
  124: ['3-1', '本頁開始3-1，根莖葉構造及根系類型。'],
  126: ['3-1', '根的功能、變態根及儲藏根例子。'],
  238: ['4-7', '本頁由4-6結尾轉入4-7；胸腺在前段4-6，後段為恆定性。'],
  322: ['6-2', '本頁開始6-2，研讀重點含核酸、DNA結構與複製及基因表現。'],
  323: ['6-2', '染色體遺傳學說及連鎖，並指向6-3的性聯說明。'],
  324: ['6-2', '連鎖、互換與基因重組。'],
  325: ['6-2', '核苷酸組成、DNA結構及鹼基比例與配對。'],
  331: ['6-3', '本頁開始6-3，單基因、多基因及性聯遺傳。'],
  332: ['6-3', 'ABO血型及以果蠅互交說明性聯遺傳。'],
  334: ['6-3', '人類X性聯疾病的說明。'],
  335: ['6-3', '多基因累加、植物性狀及人類身高受營養影響。'],
  368: ['7-1', '本頁開始7-1；研讀重點含PCR、微陣列、RNA干擾、單株抗體與SCNT。'],
  374: ['7-2', '本頁開始7-2；重組DNA、轉形、選殖與載體。'],
  378: ['7-3', '本頁開始7-3，PCR用於醫學診斷與病原篩檢。'],
  379: ['7-3', 'DNA指紋與電泳的原理及用途。'],
  380: ['7-3', '基因治療的病毒載體、基因編輯及農業應用。'],
  381: ['7-3', '基改作物及植物組織培養的應用。'],
  404: ['8-1', '捕食族群曲線、寄生與共生類型。'],
  405: ['8-1', '競爭、群集及生物防治。'],
  422: ['8-3', '資源保育與回收再利用。'],
  423: ['8-3', '人類行為、全球暖化及環境污染。'],
  424: ['8-3', '污染、生物放大及物種滅絕。'],
  425: ['8-3', '保育公約及污染影響。'],
};
const evidence = Object.entries(observations).map(([page, [section, observation]]) => {
  const entry = index.entries.find(e => e.printedPage === Number(page));
  assert(entry, `Missing indexed page ${page}`);
  const scan = manifest.scans.find(s => s.originalFileName === entry.file);
  assert(scan);
  return { id: `textbook-p${page}`, manifestPath, file: entry.file, sha256: scan.sha256, seq: entry.seq, printedPage: Number(page), observedSection: section, observation, method: 'agent-visual-inspection; independent-human-review-pending', locator: 'Resolve originalPath or archivePath by exact file in manifest; section labels in page-index are not trusted.' };
});
const evidenceIds = new Set(evidence.map(e => e.id));
const evidenceByConcept = {
  '1-2/enzymes': [10], '1-2/organelles': [10], '1-2/membrane': [10],
  '6-2/dna-structure': [322, 325], '6-2/expression': [322], '6-2/history': [324, 325],
  '6-3/sex-linked': [331, 332, 334], '6-3/blood-type': [331, 332],
  '7-1/pcr': [368], '7-1/microarray': [368], '7-1/modern': [368],
  '7-2/recombinant': [374], '7-2/transgenic': [374],
  '7-3/fingerprinting': [379], '7-3/tissue-culture': [381],
  '8-1/interactions': [404, 405], '2-2/invasive': [72],
  '8-3/conservation': [422, 425], '8-3/recycling': [422], '8-3/pollution': [423, 425],
};
const assessment = [];
const additions = [];
for (const [yearString, rows] of Object.entries(decisions.newYearRows)) {
  const year = Number(yearString);
  assert(year >= 106 && year <= 109);
  assert.equal(rows.length, 50);
  rows.forEach(([code, rationale], i) => {
    const id = questionId(year, i + 1);
    const { block } = sourceQuestions.get(id);
    const [target, subtopic] = code.split('/');
    const candidates = target.startsWith('?') ? target.slice(1).split(',') : [];
    const section = candidates.length ? null : target;
    const unitIds = [...new Set(candidates.map(s => sectionUnits.get(s)))];
    const unit = section ? sectionUnits.get(section) : unitIds.length === 1 ? unitIds[0] : null;
    const status = section ? 'section' : unit ? 'unit' : 'ambiguous';
    assert(section ? sectionUnits.has(section) : candidates.every(s => sectionUnits.has(s)), id);
    const pages = evidenceByConcept[code] || [];
    const review = [{ source: 'Phase 2C', text: 'Agent分類，未完成獨立人工覆核；不新增答案，不修正原題。' }];
    if ((year === 107 && i + 1 >= 12 && i + 1 <= 21) || (year === 108 && i + 1 >= 19 && i + 1 <= 34)) {
      review.push({ source: 'paper.json.transcriptionMethod', text: '本題來自OCR恢復頁面，題文與圖像尚待核對。' });
    }
    const figure = /圖\s*[（(]\s*[一二三四五六七八九十]/u.test(block) ? true : null;
    if (figure) review.push({ source: 'paper.md', text: '題目區段引用圖；僅定位概念，原PDF圖像尚待覆核。' });
    const q = { id, year, number: i + 1, stemExcerpt: block.split(/\(\s*A\s*\)/)[0].replace(/\s+/g, ' ').trim().slice(0, 80), status, placement: { unit, section, bucket: section || (unit ? `U${unit}` : 'X'), subtopic }, candidates, mappingBasis: section ? (pages.length ? 'textbook-evidence' : 'judgment') : null, basisNote: section ? rationale : null, unresolvedReason: section ? null : rationale, secondarySections: [], format: null, figure, table: null, readingGroup: null, review };
    additions.push(q);
    assessment.push({ id, action: section ? 'new-section-placement' : 'new-unresolved-record', previousStatus: 'no-record', status, rationale, evidenceRefs: pages.map(p => `textbook-p${p}`), tocSections: section ? [section] : candidates, questionSource: id, needsHumanReview: true });
  });
}
const revisions = new Map([...decisions.resolvedBaselineQuestions, ...(decisions.additionalResolutions || [])].map(r => [r.id, r]));
const inherited = baseline.questions.map(old => {
  if (old.status === 'section') {
    assert(!revisions.has(old.id), `Protected baseline placement ${old.id}`);
    return clone(old);
  }
  const revision = revisions.get(old.id);
  if (!revision) {
    assessment.push({ id: old.id, action: 'reviewed-unresolved-retained', previousStatus: old.status, status: old.status, rationale: old.unresolvedReason, nextEvidenceNeeded: '需核對更具體正文段落或由人工決定跨主題主次；不因只有章節標題便強制定節。', evidenceRefs: [], tocSections: old.candidates, questionSource: old.id, needsHumanReview: true });
    return clone(old);
  }
  const [section, subtopic] = revision.placement.split('/');
  const updated = { ...clone(old), status: 'section', placement: { unit: sectionUnits.get(section), section, bucket: section, subtopic }, candidates: [], mappingBasis: revision.pages.length ? 'textbook-evidence' : 'judgment', basisNote: revision.rationale, unresolvedReason: null, secondarySections: [...new Set([...old.secondarySections, ...revision.secondarySections])].filter(s => s !== section) };
  assessment.push({ id: old.id, action: 'resolved-baseline-unresolved', previousStatus: old.status, previousPlacement: old.placement, previousCandidates: old.candidates, previousReason: old.unresolvedReason, status: updated.status, rationale: revision.rationale, evidenceRefs: revision.pages.map(p => `textbook-p${p}`), tocSections: [section], questionSource: old.id, needsHumanReview: true });
  return updated;
});
const questions = [...additions, ...inherited].sort((a, b) => a.year - b.year || a.number - b.number);
assessment.sort((a, b) => a.id.localeCompare(b.id));
const newSubtopicTitles = {
  enzymes: '酵素催化與作用因子', plants: '植物類群特徵', microarray: '基因晶片與微陣列', peripheral: '周圍神經系統', interactions: '生物間交互作用', balance: '生態平衡與自我調節', recycling: '資源回收與再利用', conservation: '資源保育與永續經營', invasive: '外來種入侵', pcr: 'PCR原理與引子', 'pcr-diagnosis': 'PCR病原檢測應用', fingerprinting: 'DNA指紋及鑑定', 'tissue-culture': '植物組織培養', 'gene-silencing': 'RNA干擾與基因靜默', 'gene-therapy': '基因治療', cloning: 'SCNT與複製動物', linkage: '基因連鎖與互換', polygenic: '多基因遺傳與環境影響', electrophoresis: 'DNA電泳原理',
};
function aggregate(qs) {
  const years = [...new Set(qs.map(q => q.year))].sort((a, b) => a - b);
  return { questionCount: qs.length, questions: qs.map(q => q.id), yearsTested: years, yearsTestedCount: years.length, yearCoverage: `${years.length}/10` };
}
const units = baseline.units.map(u => ({ unit: u.unit, title: u.title, ...aggregate(questions.filter(q => q.placement.unit === u.unit)), topics: u.topics.map(t => {
  const qs = questions.filter(q => q.placement.section === t.section);
  const oldTitles = new Map(t.subtopics.map(s => [s.id, s.title]));
  return { section: t.section, title: t.title, tocPage: t.tocPage, ...aggregate(qs), secondaryQuestions: questions.filter(q => q.secondarySections.includes(t.section)).map(q => q.id), unresolvedCandidateQuestions: questions.filter(q => q.candidates.includes(t.section)).map(q => q.id), subtopics: [...new Set(qs.map(q => q.placement.subtopic))].sort().map(s => ({ id: `${t.section}/${s}`, title: oldTitles.get(`${t.section}/${s}`) || newSubtopicTitles[s] || s, ...aggregate(qs.filter(q => q.placement.subtopic === s)) })) };
}), unresolvedQuestions: questions.filter(q => q.status === 'unit' && q.placement.unit === u.unit).map(q => q.id) }));
const statusCounts = counts(questions.map(q => q.status));
const summary = { totalQuestions: questions.length, classificationRecords: questions.length, noClassificationRecord: 0, sectionPlaced: statusCounts.section || 0, unitLevelSectionUnresolved: statusCounts.unit || 0, crossChapterAmbiguous: statusCounts.ambiguous || 0, withoutSingleSection: questions.filter(q => q.status !== 'section').length, preservedBaselineSectionQuestions: baseline.questions.filter(q => q.status === 'section').length, addedYearRecords: additions.length, resolvedBaselineQuestions: revisions.size, reviewedRemainingBaselineQuestions: baseline.questions.filter(q => q.status !== 'section').length - revisions.size, batchReviewed: assessment.length, batchSectionPlacements: assessment.filter(a => a.status === 'section').length, perYear: Object.fromEntries(exams.map(e => [e.year, { total: 50, ...counts(questions.filter(q => q.year === e.year).map(q => q.status)) }])) };
const model = { version: 3, kind: 'exam-topic-map', subject: 'biology', title: 'ROC106–ROC115 生物考題主題對照（Phase 2C v3）', baselinePath: decisions.baselinePath, baselineSha256: hash(fs.readFileSync(decisions.baselinePath)), classificationDate: decisions.date, status: decisions.status, method: { primaryRule: decisions.policy.primaryRule, scope: '僅重用既有十年轉錄、目錄、分類及所列教材原圖樣本；不產生答案、不更動原題、不做批次OCR。', mappingBasis: { direct: baseline.method.mappingBasis.direct, judgment: 'Agent依題幹選項判斷主要概念；尚未逐題確認教材正文。', 'textbook-evidence': '有本次目視教材樣本與決策引用；仍是待獨立人工覆核的主要分類。' }, newQuestionMetadata: '新增200題未另做題型/圖表完整性盤點，未確認欄位設null；figure=true僅表示來源區段有圖引用。', noForcedPlacement: true, textbookScope: '頁面證據只證明該概念在該節出現，不證明唯一所在節；兩批目錄同版性仍未驗證。', frequency: '每題僅一個主要節；次要涉及不重複計入；年度覆蓋分母10。' }, sources: { exams, toc: { path: tocPath, sha256: hash(fs.readFileSync(tocPath)) }, decisions: { path: decisionPath, sha256: hash(fs.readFileSync(decisionPath)) }, manifest: { path: manifestPath, sha256: hash(fs.readFileSync(manifestPath)) }, pageIndex: { path: indexPath, sha256: hash(fs.readFileSync(indexPath)) } }, summary, units, crossChapterAmbiguous: aggregate(questions.filter(q => q.status === 'ambiguous')), questions, questionSources, evidence, assessment, protectedSourceChecksums: Object.fromEntries([...protectedPaths].sort().map(p => [p, hash(fs.readFileSync(p))])) };

function validate(actual) {
  assert.equal(actual.questions.length, 500);
  assert.equal(new Set(actual.questions.map(q => q.id)).size, 500);
  assert.equal(actual.assessment.length, 258);
  assert.equal(new Set(actual.assessment.map(a => a.id)).size, 258);
  assert.deepEqual(actual, model, 'Stored output differs from reproducible decisions/sources');
  for (const q of actual.questions) {
    assert(sourceQuestions.has(q.id));
    assert.equal(q.id, questionId(q.year, q.number));
    if (q.status === 'section') {
      assert(sectionUnits.has(q.placement.section));
      assert.equal(sectionUnits.get(q.placement.section), q.placement.unit);
      assert.equal(q.candidates.length, 0);
    } else {
      assert(q.candidates.length >= 2);
      assert.equal(q.placement.section, null);
      assert(q.unresolvedReason);
    }
    for (const section of [...q.candidates, ...q.secondarySections]) assert(sectionUnits.has(section));
  }
  for (const old of baseline.questions.filter(q => q.status === 'section')) assert.deepEqual(actual.questions.find(q => q.id === old.id), old, `Changed protected question ${old.id}`);
  const expectedBatch = [...additions.map(q => q.id), ...baseline.questions.filter(q => q.status !== 'section').map(q => q.id)].sort();
  assert.deepEqual(actual.assessment.map(a => a.id).sort(), expectedBatch);
  for (const a of actual.assessment) for (const id of a.evidenceRefs) assert(evidenceIds.has(id));
  assert.equal(actual.summary.sectionPlaced + actual.summary.unitLevelSectionUnresolved + actual.summary.crossChapterAmbiguous, 500);
  for (const [p, expected] of Object.entries(actual.protectedSourceChecksums)) assert.equal(hash(fs.readFileSync(p)), expected, `Source changed: ${p}`);
  for (const e of actual.evidence) {
    const scan = manifest.scans.find(s => s.originalFileName === e.file);
    assert.equal(e.sha256, scan.sha256);
    assert.equal(hash(fs.readFileSync(fs.existsSync(scan.originalPath) ? scan.originalPath : scan.archivePath)), e.sha256);
  }
  const sectionIds = actual.units.flatMap(u => u.topics.flatMap(t => t.questions));
  assert.equal(sectionIds.length, actual.summary.sectionPlaced);
  assert.equal(new Set(sectionIds).size, sectionIds.length);
  assert.deepEqual([...sectionIds].sort(), actual.questions.filter(q => q.status === 'section').map(q => q.id).sort());
}

const lines = ['# ROC106～ROC115 生物分類 v3', '', `分類日期：${decisions.date}。狀態：Agent 分類，待獨立人工覆核。`, '', '重用既有242題單一節分類；新增200題紀錄，逐題複查58題未定節。原始PDF、圖片、OCR、轉錄、來源登錄及舊版分類均未改動。', '', `500題均有紀錄；單一節 ${summary.sectionPlaced} 題，章內未定節 ${summary.unitLevelSectionUnresolved} 題，跨章未定 ${summary.crossChapterAmbiguous} 題。`, `本輪258題中 ${summary.batchSectionPlacements} 題新增或完成單一節分類；其餘 ${summary.withoutSingleSection} 題保留候選與原因。這不是人工驗收完成率。`, '', '完整來源、SHA-256、題目行號、目視證據及258筆決策紀錄見同名JSON；未附教材圖片或正文。', '', '| 年度 | 紀錄 | 單一節 | 章內未定 | 跨章未定 |', '|---|---:|---:|---:|---:|'];
for (const [y, s] of Object.entries(summary.perYear)) lines.push(`| ${y} | ${s.total} | ${s.section || 0} | ${s.unit || 0} | ${s.ambiguous || 0} |`);
lines.push('', '## 章節統計', '', '| 節 | 名稱 | 主要題數 | 年度覆蓋 |', '|---|---|---:|---|');
for (const u of units) for (const t of u.topics) lines.push(`| ${t.section} | ${t.title} | ${t.questionCount} | ${t.yearCoverage} |`);
lines.push('', '## 本輪258題決策', '', '| 題號 | 本輪動作 | 主要節／候選 | 分類依據／保留原因 |', '|---|---|---|---|');
for (const a of assessment) {
  const q = questions.find(q => q.id === a.id);
  const refs = a.evidenceRefs.length ? `；證據 ${a.evidenceRefs.join('、')}` : '';
  lines.push(`| ${q.id} | ${a.action} | ${q.placement.section || q.candidates.join('／')} | ${a.rationale.replace(/\|/g, '／')}${refs} |`);
}
lines.push('', '## 後續界線', '', '保留未定節不等於未處理：下一輪按JSON assessment的nextEvidenceNeeded查證。既有242題未重新分類，仍沿用原人工覆核待辦。分類版本未接入網站，也未完成全教材OCR、正式知識節點或學習優先級。', '新增200題的format、table及未確認figure欄位可為null，後續不得解讀為已驗證無圖表。', '十年題目轉錄仍為machine-extracted / needs-review。不得因分類有紀錄就宣稱原題圖文或答案已驗收。', '');
const markdown = lines.join('\n');
validate(model);
if (process.argv.includes('--refresh-derived')) {
  const expected = process.argv.slice(process.argv.indexOf('--refresh-derived') + 1);
  assert.equal(expected.length, 2, 'Provide the current JSON and Markdown SHA-256 before refreshing');
  assert.equal(hash(fs.readFileSync(outputPath)), expected[0]);
  assert.equal(hash(fs.readFileSync(markdownPath)), expected[1]);
  assert.equal(read(outputPath).kind, 'exam-topic-map');
  assert.equal(read(outputPath).version, 3);
  fs.writeFileSync(outputPath, JSON.stringify(model, null, 2) + '\n');
  fs.writeFileSync(markdownPath, markdown);
} else if (process.argv.includes('--write-new')) {
  assert(!fs.existsSync(outputPath) && !fs.existsSync(markdownPath), 'Refusing to overwrite existing outputs');
  fs.writeFileSync(outputPath, JSON.stringify(model, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(markdownPath, markdown, { flag: 'wx' });
} else {
  validate(read(outputPath));
  assert.equal(fs.readFileSync(markdownPath, 'utf8'), markdown);
}
console.log(JSON.stringify({ validation: 'PASS', ...summary }, null, 2));
