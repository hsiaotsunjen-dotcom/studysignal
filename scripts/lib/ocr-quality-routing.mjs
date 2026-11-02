// Advisory only. No OCR, transcription, corrections or human approvals.
import {diagnose} from './ocr-layout-diagnostics.mjs';
import {parseTSV, intersection, area} from './ocr-layout-prototype.mjs';
export const RULE_VERSION='quality-routing-mvp-1';
export const ROUTES={sample:'可進入人工抽樣驗證',review:'需要人工重點覆核',retry:'需要重新 OCR'};
export function assess({page,raw,tsv,executionFailed=false}){
 const risks=[],checks=[];const words=parseTSV(tsv);
 const add=(category,rule,evidence,action,certainty='heuristic')=>risks.push({id:`risk-${risks.length+1}`,category,rule,evidence,action,certainty,status:'pending_human_review'});
 if(executionFailed)add('execution','ocr-execution-failed',{executionFailed},'檢查引擎紀錄；另存新 attempt 重試。','deterministic');
 const diagnosis=diagnose(page);
 for(const i of diagnosis.issues){
  const category=i.category==='text-incomplete'?'text_missing':i.category==='table-misclassification'?'table_structure':i.category==='image-oversegmentation'||i.category==='blank-misclassification'?'figures':'layout';
  add(category,i.rule,{...i.evidence,regionIds:i.regionIds},'對照原圖與區域預覽；僅提出候選修正，不改寫原始資料。',i.certainty);
 }
 const invalid=[...raw].filter(c=>c==='\ufffd'||(/[\u0000-\u001f]/u.test(c)&&!/[\r\n\t]/u.test(c))).length;
 checks.push({rule:'invalid-codepoints',result:invalid?'warning':'pass',scope:'替代字元及非空白控制字元，不代表文字正確'});
 if(invalid)add('abnormal_characters','invalid-codepoints',{count:invalid},'回看對應原圖及編碼；確認後才提出局部重辨識。','deterministic');
 const latinRuns=[...raw.matchAll(/(?:[A-Za-z]{1,}\s+){7,}[A-Za-z]+/g)].map(m=>({offset:m.index,length:m[0].length}));
 if(latinRuns.length)add('abnormal_characters','long-latin-run',{spans:latinRuns},'人工區分正常英文段落與疑似假英文，不自動更字。');
 const unmapped=words.filter(w=>!page.layout.regions.some(r=>['paragraph','heading','caption','table-subregion'].includes(r.type)&&intersection(w.rect,r.rect)/area(w.rect)>.98));
 if(unmapped.length)add('text_missing','existing-word-without-full-text-container',{count:unmapped.length,boxes:unmapped.map(w=>w.rect)},'檢查文字框歸屬；這不是已證實原文漏字。');
 const lines=new Map();for(const w of words){if(!lines.has(w.line))lines.set(w.line,[]);lines.get(w.line).push(w);}
 const wide=[...lines].filter(([,ws])=>ws.length>1&&ws.some((w,i)=>i&&w.rect.left-(ws[i-1].rect.left+ws[i-1].rect.width)>page.width*.12)).map(([id])=>id);
 if(wide.length)add('reading_order','large-within-line-gap',{lineIds:wide,thresholdWidthFraction:.12},'檢查跨欄合併、表格或圖示標籤；保留原始 token 順序。');
 const tables=page.layout.regions.filter(r=>r.type==='table');
 if(tables.length)add('table_structure','table-cells-unverified',{regionIds:tables.map(r=>r.id)},'逐格確認列欄、合併格與文字歸屬；色塊候選不等同真表格。','undetermined');
 const figures=page.layout.regions.filter(r=>r.type==='image');
 if(figures.length)add('figures','figure-labels-and-topology-unverified',{regionIds:figures.map(r=>r.id)},'確認是否為圖示或裝飾；圖中文字、箭頭與分支另行覆核。','undetermined');
 const symbols=[...raw.matchAll(/[α-ωΑ-Ω⁰-⁹₀-₉⁺⁻→←⇌]|\b(?:[A-Z][a-z]?\d*){2,}\b/g)].map(m=>({offset:m.index,length:m[0].length}));
 if(symbols.length)add('formulas_terms','symbol-or-formula-candidate',{spans:symbols},'對照上下標、電荷與字母；規則不判定科學內容對錯。');
 checks.push(...['image-text-completeness','reading-order-semantic-correctness','uncolored-table-detection','terminology-correctness','formula-completeness'].map(rule=>({rule,result:'not_evaluated',reason:'無人工文字／結構參考；既有 OCR 與色塊候選不足以證明完整。'})));
 const route=executionFailed?'retry':risks.length||checks.some(c=>c.result==='not_evaluated')?'review':'sample';
 return {schemaVersion:1,ruleVersion:RULE_VERSION,seq:page.seq,route,routeLabel:ROUTES[route],status:'pending_human_review',humanApproved:false,groundTruth:null,cer:null,wer:null,accuracy:null,confidenceUsedForAccuracy:false,checks,risks,tokenCount:words.length,limitations:['未辨識文字無法僅從 TSV 證明不存在。','術語不作自動訂正；未確認版面不能當 Ground Truth。','所有檢查均為分流建議，未自動執行重新 OCR。']};
}
