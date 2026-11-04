import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSimpleFormula,formulaTokens,compareScientificText} from './lib/ocr-ai-formula-evidence.mjs';
test('subscript and plain digits may share atom counts without proving correctness',()=>{
  const r=compareScientificText('O₂','O2');assert.equal(r.structuralComparison,'same_atom_counts_and_charge');assert.equal(r.typographyChanged,true);assert.equal(r.formulaSpellingVerified,false);
});
test('bicarbonate Unicode and baseline charge are compared separately from typography',()=>{
  assert.deepEqual(parseSimpleFormula('HCO₃⁻').atoms,{H:1,C:1,O:3});assert.equal(compareScientificText('HCO₃⁻','HCO3-').structuralComparison,'same_atom_counts_and_charge');
});
test('explicit superscript iron charge is recognized, baseline Fe2+ remains ambiguous',()=>{
  const a=parseSimpleFormula('Fe²⁺');assert.equal(a.charge,2);assert.deepEqual(a.atoms,{Fe:1});assert.equal(parseSimpleFormula('Fe2+').status,'unresolved');
});
test('atom count and charge changes are detected',()=>{
  assert.equal(compareScientificText('CO','CO2').structuralComparison,'different_atom_counts_or_charge');assert.equal(compareScientificText('H','H+').structuralComparison,'different_atom_counts_or_charge');
});
test('malformed OCR is not salvaged by a valid prefix',()=>{
  for(const token of ['Fe?','COa','HCO3-?','HCO~'])assert.equal(parseSimpleFormula(token).status,'unresolved');
  assert.equal(formulaTokens('COa')[0].original,'COa');
});
test('protein abbreviations are opaque, not element formulas',()=>assert.equal(parseSimpleFormula('HbCO2').reason,'opaque_biochemical_abbreviation'));
test('complex notation and ambiguous ASCII charge are left unresolved',()=>{
  for(const token of ['Ca(OH)2','[Fe(CN)6]3-','CuSO4·5H2O','SO42-','13CO2'])assert.equal(parseSimpleFormula(token).status,'unresolved');
});
test('extractor preserves whole unsupported grouping instead of validating fragments',()=>{
  const r=formulaTokens('Ca(OH)2 [Fe(CN)6]3- CuSO4·5H2O');assert.equal(r.length,3);assert(r.every(t=>t.status==='unresolved'));
});
test('enclosing prose parentheses retain their source span and raw literal',()=>{
  const r=formulaTokens('碳酸氫根(HCO3-)')[0];assert.equal(r.original,'(HCO3-)');assert.equal(r.analysisText,'HCO3-');assert.equal(r.status,'parsed_limited_syntax');
});
test('uppercase and lowercase distinctions are never silently normalized',()=>{
  assert.equal(compareScientificText('CO','Co').structuralComparison,'different_atom_counts_or_charge');assert.equal(compareScientificText('Heme','heme').caseChanges.length,1);
});
test('mixed language replacements remain pending',()=>{
  const r=compareScientificText('血基質(Heme)','血基質(heme)');assert.equal(r.mixedScriptReviewRequired,true);assert.equal(r.status,'pending_human_review');
});
test('no formulas and removal of all formula candidates have different outcomes',()=>{
  assert.equal(compareScientificText('文字','文本').structuralComparison,'no_formula_candidates');assert.equal(compareScientificText('CO2','文字').structuralComparison,'unresolved');
});
test('unsupported vocabulary and invalid count or charge are not guessed',()=>{
  for(const token of ['Xx2','H0','O02','Fe⁰⁺'])assert.equal(parseSimpleFormula(token).status,'unresolved');
});
test('comparison never mutates input or claims image verification',()=>{
  const a='HCO₃⁻',b='HCO3-';assert.deepEqual(compareScientificText(a,b),compareScientificText(a,b));assert.equal(a,'HCO₃⁻');assert.equal(compareScientificText(a,b).sourceImageVerified,false);
});
test('OCR punctuation inside ionic notation remains unresolved as a whole run',()=>{
  const tokens=formulaTokens('(HCO;~) HH\'');assert.equal(tokens.length,2);assert(tokens.every(t=>t.status==='unresolved'));assert.equal(tokens[0].original,'(HCO;~)');
});
