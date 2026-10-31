# Lehninger Reference Index 初版檢查報告

日期：2026-10-31。來源僅本機；不修改Phase 2F、試題分類、OCR、教材、網站或正式schema；未執行Git暫存、commit或push。

## PDF檢查

- Lehninger Principles of Biochemistry，Eighth Edition，2021；書名頁PDF第2頁確認三位作者：David L. Nelson、Michael M. Cox、Aaron A. Hoskins。
- 檔案：`ZY5468彩(A4)  Lehninger Principles of Biochemistry 8th.pdf`，254,016,900 bytes，2274頁；SHA-256：`50eac58fdd893be8e19fd383946069097f395824e7a99aed8630ac10f4798263`。
- 同資料夾兩個檔名變體：2份；雜湊完全相同。不複製任何PDF進專案。
- 前／中／後抽樣PDF頁：1、2、3、42、1137、1898、2274；第1頁沒有可擷取文字，其餘樣本均可擷取英文。只保存字數與雜湊，不保存原書段落。
- 目錄：簡目PDF第23頁、詳目PDF第24–39頁；28章逐章核對正文標題。只擷取214個不同頁面，沒有全書OCR或全文擷取。

## 頁碼與品質問題

本檔由EPUB轉成PDF，頁尾流水號與PDF頁碼不同，且不能認作原版紙本印刷頁碼。所有printed_page=null（尚未確認）。PDF頁碼從1開始；digital_folio僅記錄直接讀到的數字。
章節書籤有28個沒有指向真正章開頭；本索引使用逐章查到的CHAPTER標題頁，不直接使用書籤目的頁。
尾端原書索引含紙本頁碼，不能直接用來跳轉PDF。可擷取英文敘述，但圖表替代描述、重排與缺失公式符號可能影響文字忠實度。沒有發現已檢頁面解析損壞；全書缺頁、所有圖像與公式完整性尚未確認。

## 章節索引

中文章名是Agent撰寫的索引譯名，非出版社正式中文版。核心概念摘要為原創短語。參考用途僅為內部原理查證，不將整章列入考試範圍。

|章|英文章名|中文索引譯名|PDF起始頁|檔內流水號|紙本頁碼|本輪用途|
|---|---|---|---:|---:|---|---|
|1|The Foundations of Biochemistry|生物化學的基礎|40|42|尚未確認|候選補充參考|
|2|Water, The Solvent of Life|水：生命的溶劑|115|117|尚未確認|本輪不需要|
|3|Amino Acids, Peptides, and Proteins|胺基酸、胜肽與蛋白質|165|167|尚未確認|候選補充參考|
|4|The Three-Dimensional Structure of Proteins|蛋白質的三維結構|228|230|尚未確認|本輪不需要|
|5|Protein Function|蛋白質功能|295|297|尚未確認|候選補充參考|
|6|Enzymes|酵素|350|352|尚未確認|候選補充參考|
|7|Carbohydrates and Glycobiology|醣類與醣生物學|440|442|尚未確認|候選補充參考|
|8|Nucleotides and Nucleic Acids|核苷酸與核酸|504|506|尚未確認|候選補充參考|
|9|DNA-Based Information Technologies|以DNA為基礎的資訊技術|571|573|尚未確認|候選補充參考|
|10|Lipids|脂質|636|638|尚未確認|候選補充參考|
|11|Biological Membranes and Transport|生物膜與運輸|681|683|尚未確認|候選補充參考|
|12|Biochemical Signaling|生物化學訊息傳遞|753|755|尚未確認|候選補充參考|
|13|Introduction to Metabolism|代謝概論|849|851|尚未確認|候選補充參考|
|14|Glycolysis, Gluconeogenesis, and the Pentose Phosphate Pathway|糖解作用、糖質新生與磷酸戊糖途徑|926|928|尚未確認|候選補充參考|
|15|The Metabolism of Glycogen in Animals|動物的肝醣代謝|1014|1016|尚未確認|本輪不需要|
|16|The Citric Acid Cycle|檸檬酸循環|1044|1046|尚未確認|候選補充參考|
|17|Fatty Acid Catabolism|脂肪酸分解代謝|1094|1096|尚未確認|本輪不需要|
|18|Amino Acid Oxidation and the Production of Urea|胺基酸氧化與尿素的生成|1140|1142|尚未確認|本輪不需要|
|19|Oxidative Phosphorylation|氧化磷酸化|1196|1198|尚未確認|候選補充參考|
|20|Photosynthesis and Carbohydrate Synthesis in Plants|植物的光合作用與醣類合成|1271|1273|尚未確認|候選補充參考|
|21|Lipid Biosynthesis|脂質生合成|1351|1353|尚未確認|本輪不需要|
|22|Biosynthesis of Amino Acids, Nucleotides, and Related Molecules|胺基酸、核苷酸及相關分子的生合成|1438|1440|尚未確認|本輪不需要|
|23|Hormonal Regulation and Integration of Mammalian Metabolism|哺乳動物代謝的荷爾蒙調節與整合|1525|1527|尚未確認|候選補充參考|
|24|Genes and Chromosomes|基因與染色體|1603|1605|尚未確認|候選補充參考|
|25|DNA Metabolism|DNA代謝|1657|1659|尚未確認|候選補充參考|
|26|RNA Metabolism|RNA代謝|1734|1736|尚未確認|候選補充參考|
|27|Protein Metabolism|蛋白質代謝|1814|1816|尚未確認|候選補充參考|
|28|Regulation of Gene Expression|基因表現的調控|1894|1896|尚未確認|候選補充參考|

## 與StudySignal對照

基準：`content/knowledge-base/derived/biology/exam-topic-map-roc106-115.v5.json`，提交`5bd29c8aa029ffa6c54f687a296b1d7da8c0a3d1`。這是結構驗證過的Phase 2E衍生分類，不是全部已人工核准的正式知識圖譜；未讀取或改寫進行中的Phase 2F。
建立42筆候選連結，涵蓋32個既有核心概念、18個既有節、21個參考書章。每個概念都有既有考題ID，沒有新增考試範圍。
本輪參考頁是章開頭定位，section=null，精確概念所在頁尚未核實。所有對照均needsHumanReview=true、人工核准0筆。原教材頁碼只引用既有目錄的節起始頁，不冒充題目專屬教材依據。

|StudySignal節／核心概念|Lehninger章|PDF章起始頁|用途界線|
|---|---:|---:|---|
|1-1／1-1/metabolism 新陳代謝（同化與異化作用）|13|849|僅補充ATP及能量耦合，不要求熱力學推導。|
|1-2／1-2/animal-plant-cells 動物與植物細胞構造比較|1|40|補充細胞共同特徵；動植物差異仍以原教材為主。|
|1-2／1-2/biomolecules 細胞的化學組成（醣類、蛋白質、核酸）|3|165|胺基酸與蛋白質的組成。|
|1-2／1-2/biomolecules 細胞的化學組成（醣類、蛋白質、核酸）|7|440|醣類結構與儲能的基本原理。|
|1-2／1-2/biomolecules 細胞的化學組成（醣類、蛋白質、核酸）|8|504|核酸基本組成與功能。|
|1-2／1-2/biomolecules 細胞的化學組成（醣類、蛋白質、核酸）|10|636|脂質的組成與儲能。|
|1-2／1-2/enzymes 酵素催化與作用因子|6|350|限催化、專一性與活性因素，不引入大學動力學計算。|
|1-2／1-2/membrane 細胞膜構造與功能|11|681|膜組成與被動／主動運輸原理。|
|1-2／1-2/organelles 胞器構造與功能|1|40|胞器功能的細胞層級背景。|
|1-3／1-3/cell-cycle 細胞週期與染色體|12|753|細胞週期的調節背景，不要求訊息蛋白網路細節。|
|2-1／2-1/origin 生命起源（有機演化論）|1|40|化學演化與早期生命的科學背景。|
|2-3／2-3/systems 分類系統（五界、六界、三域、二名法）|1|40|僅三域的分子背景，不取代既有五界／六界教材。|
|3-2／3-2/photosynthesis 光合作用|20|1271|僅光反應、固碳與能量轉換基本原理。|
|3-2／3-2/transport 水分與養分的吸收與運輸|11|681|膜運輸的分子背景；不取代根莖葉與水勢教學。|
|4-1／4-1/nutrients 營養素（醣類、蛋白質、脂質、維生素）|3|165|蛋白質營養的組成背景。|
|4-1／4-1/nutrients 營養素（醣類、蛋白質、脂質、維生素）|7|440|醣類營養的組成背景。|
|4-1／4-1/nutrients 營養素（醣類、蛋白質、脂質、維生素）|10|636|脂質與部分維生素的化學背景。|
|4-1／4-1/digestion 消化系統構造與功能|6|350|消化酵素的催化背景，不取代消化器官教材。|
|4-2／4-2/blood 血液組成與血球|5|295|僅血紅素攜氧，不涵蓋全部血球分類。|
|4-3／4-3/resp-structure 呼吸系統構造與氣體交換|5|295|血紅素與氧結合，不取代呼吸器官與氣體交換。|
|4-3／4-3/resp-disorders 呼吸相關異常生理|5|295|CO與血紅素結合的原理，不能直接推定試題答案。|
|4-4／4-4/immune-response 先天性與後天性免疫、疫苗|5|295|抗原抗體辨識的分子背景，不涵蓋完整免疫學。|
|4-5／4-5/musculoskeletal 骨骼與肌肉|5|295|肌動蛋白與肌凝蛋白的基本作用。|
|4-5／4-5/neuron 神經元與神經傳遞|12|753|離子通道與訊號傳遞基本背景。|
|4-6／4-6/glands 內分泌腺與激素對應|23|1525|激素作用的一般原理，不以此補造腺體位置。|
|4-6／4-6/diabetes 糖尿病與胰島素|23|1525|胰島素與代謝調節原理。|
|4-6／4-6/glucose 胰臟、胰島與血糖相關激素|23|1525|血糖調節的原理背景。|
|4-7／4-7/glucose-homeostasis 血糖恆定與回饋調節|23|1525|血糖恆定與代謝整合。|
|6-2／6-2/dna-structure DNA 模板與鹼基互補|8|504|DNA核苷酸、互補與雙螺旋。|
|6-2／6-2/expression 遺傳訊息傳遞（轉錄、轉譯、密碼子）|26|1734|轉錄及RNA加工基本原理。|
|6-2／6-2/expression 遺傳訊息傳遞（轉錄、轉譯、密碼子）|27|1814|遺傳密碼與轉譯基本原理。|
|6-2／6-2/mutation 突變|25|1657|DNA損傷與修復背景，不推算遺傳比例。|
|6-3／6-3/chromosomes 人類染色體與性染色體|24|1603|染色體組織背景，不取代人類核型與性聯教材。|
|7-1／7-1/pcr PCR原理與引子|8|504|目錄列有PCR；確切節內頁碼仍待定位。|
|7-2／7-2/recombinant 重組 DNA 工具與流程（載體、限制酶、連接酶）|9|571|重組DNA工具與選殖原理。|
|7-2／7-2/transformation 轉形與篩選|9|571|載體與基因表現的背景，轉形個別流程待核對正文。|
|7-2／7-2/transgenic 基因轉殖|9|571|基因操作的科學背景，不新增未考應用。|
|7-3／7-3/pcr-diagnosis PCR病原檢測應用|8|504|僅PCR擴增原理，臨床判讀不在本索引授權範圍。|
|1-1／1-1/metabolism 新陳代謝（同化與異化作用）|14|926|葡萄糖分解原理，不要求逐一酵素與反應式。|
|1-1／1-1/metabolism 新陳代謝（同化與異化作用）|16|1044|細胞呼吸的代謝聯繫，不要求完整路徑背誦。|
|1-1／1-1/metabolism 新陳代謝（同化與異化作用）|19|1196|呼吸鏈與ATP合成的基本原理。|
|6-2／6-2/expression 遺傳訊息傳遞（轉錄、轉譯、密碼子）|28|1894|基因表現調節的必要背景，不擴充大學調控細節。|

## 保存檔案與重跑

- `content/knowledge-base/sources/biology/lehninger-principles-biochemistry-8e/reference-index.json`
- `content/knowledge-base/derived/biology/lehninger-reference-map.v1.json`
- `content/knowledge-base/derived/biology/lehninger-reference-validation.json`
- `docs/knowledge-base/biology/lehninger-reference-index-report.md`
- 計畫：`content/knowledge-base/derived/biology/lehninger-reference-plan.json`；工具：`scripts/kb-lehninger-reference-index.mjs`。
- 沿用sources/biology、derived/biology及docs/knowledge-base/biology分層。reference_id不是偽造的已入庫document/source ID；未修改source-registry或正式KnowledgeBaseSnapshot schema。
- 唯讀驗證：`node scripts/kb-lehninger-reference-index.mjs --pdf "<本機原始PDF完整路徑>"`。
- 首次新增可用`--write-new`；已存在任一目標即拒絕覆蓋。工具不擷取全書、不做OCR、不執行Git。

## 待確認與下一步

1. 人工核對書目與本機來源使用權；保留原PDF於本機，不上傳GitHub或公開課程。
2. 以考題及原教材需求挑選少數候選概念，定位其精確節與PDF頁，逐項人工確認科學原理；目前42筆均為候選。
3. 紙本頁碼需另有可核實的原版來源後才能補入，不以本PDF流水號換算。
4. 原書圖表不供學生直接使用；後續教材應自行撰寫與重新設計圖解。
5. 缺頁、公式及圖像完整性尚未全書驗收；本輪沒有以完整頁數宣稱完整。
6. 保持Phase 2F獨立進行；待使用者確認後再決定是否保存至GitHub。
