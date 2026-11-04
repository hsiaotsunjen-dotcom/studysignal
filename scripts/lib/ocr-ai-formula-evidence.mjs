// Limited, syntax-only formula analysis. Never repairs source tokens or treats
// scientific plausibility as evidence of what was printed on the page.
const subs='₀₁₂₃₄₅₆₇₈₉',supers='⁰¹²³⁴⁵⁶⁷⁸⁹';
const elements=new Set(['H','C','N','O','P','S','Fe','Na','K','Ca','Cl','Mg','Cu','Zn','Co','Mn','F','I','Br','B','Si','Se']);
const digitMap=(text,alphabet)=>Array.from(text,ch=>alphabet.includes(ch)?String(alphabet.indexOf(ch)):ch).join('');
export function parseSimpleFormula(token){
  const original=token,unresolved=reason=>({original,status:'unresolved',reason,scientificCorrectnessVerified:false});
  if(/^Hb/.test(token))return unresolved('opaque_biochemical_abbreviation');
  if(/[()\[\]·.^]/.test(token))return unresolved('grouping_isotope_or_complex_notation_not_supported');
  let charge=0,chargeNotation='none';
  const superscript=token.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])$/u);
  if(superscript){const s=superscript[1],n=s.slice(0,-1);charge=(n?Number(digitMap(n,supers)):1)*(s.at(-1)==='⁺'?1:-1);token=token.slice(0,-s.length);chargeNotation='unicode_superscript';}
  else if(/[+−-]$/.test(token)){
    const sign=token.at(-1)==='+'?1:-1;token=token.slice(0,-1);charge=sign;chargeNotation='ascii_or_baseline_sign';
    // Fe2+ and SO42- do not carry enough typography to distinguish all intended
    // atom-count/charge interpretations. Do not guess from chemical knowledge.
    if(/^[A-Z][a-z]?\d+$/.test(token)||/\d{2,}$/.test(token))return unresolved('ambiguous_ascii_charge_or_atom_count');
  }
  if(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/u.test(token))return unresolved('unsupported_superscript_position');
  const typography=/[₀-₉]/u.test(token)?'unicode_subscript':/\d/.test(token)?'ascii_digits':'no_counts';
  token=digitMap(token,subs);
  const parts=[...token.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  if(!parts.length||parts.map(p=>p[0]).join('')!==token)return unresolved('invalid_or_incomplete_syntax');
  if(parts.some(p=>!elements.has(p[1])))return unresolved('symbol_outside_limited_vocabulary');
  if(parts.some(p=>p[2]&&(!/^[1-9]\d*$/.test(p[2])||!Number.isSafeInteger(Number(p[2])))))return unresolved('unsupported_atom_count');
  if(!Number.isSafeInteger(charge)||charge===0&&chargeNotation!=='none')return unresolved('invalid_charge');
  const atoms={};for(const p of parts)atoms[p[1]]=(atoms[p[1]]??0)+Number(p[2]||1);
  const signature=JSON.stringify({atoms:Object.fromEntries(Object.entries(atoms).sort(([a],[b])=>a.localeCompare(b))),charge});
  return {original,status:'parsed_limited_syntax',atoms,charge,typography,chargeNotation,signature,scientificCorrectnessVerified:false};
}
export function formulaTokens(text){
  const tokens=[];
  // Keep maximal ASCII/Unicode scientific runs. Never salvage a valid prefix
  // from an invalid whole token such as COa or HCO3-? when punctuation is noise.
  for(const m of text.matchAll(/[A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻()[\]·.;'+−?~^-]+/gu)){
    const literal=m[0];let t=literal;
    // Remove a single enclosing prose parenthesis only when it wraps the entire
    // run. Embedded formula grouping such as Ca(OH)2 remains unsupported.
    if(t.startsWith('(')&&t.endsWith(')')){
      let depth=0,whole=true;for(let i=0;i<t.length;i++){if(t[i]==='(')depth++;if(t[i]===')')depth--;if(depth===0&&i<t.length-1)whole=false;if(depth<0)whole=false;}if(whole&&depth===0)t=t.slice(1,-1);
    }
    if(!/[A-Za-z]/.test(t))continue;
    if(!/[0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻+−?~-]/u.test(t)&&!(/^(?:[A-Z][a-z]?){1,}$/.test(t.replace(/[()[\];']/g,''))))continue;
    const parsed=parseSimpleFormula(t);
    tokens.push({...parsed,start:m.index,end:m.index+literal.length,original:literal,analysisText:t,
      outerParenthesesRemovedForAnalysis:t!==literal,boundaryWarning:/[;?~]/.test(text[m.index+literal.length]??'')?'adjacent_ocr_noise_or_punctuation':null});
  }
  return tokens;
}
export function compareScientificText(before,after){
  const a=formulaTokens(before),b=formulaTokens(after),parsed=x=>x.every(t=>t.status==='parsed_limited_syntax'&&!t.boundaryWarning);
  const beforeLatin=[...before.matchAll(/[A-Za-z]+/g)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  const afterLatin=[...after.matchAll(/[A-Za-z]+/g)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  const caseChanges=beforeLatin.flatMap(x=>afterLatin.filter(y=>x.text!==y.text&&x.text.toLowerCase()===y.text.toLowerCase()).map(y=>({before:x,after:y,scope:'lexical risk; not an aligned replacement'})));
  const mixed=s=>/\p{Script=Han}/u.test(s)&&/[A-Za-z]/.test(s);
  const editsScientific=a.length||b.length;
  return {beforeTokens:a,afterTokens:b,
    structuralComparison:!editsScientific?'no_formula_candidates':!a.length||!b.length||!parsed(a)||!parsed(b)?'unresolved':a.length===b.length&&a.every((t,i)=>t.signature===b[i].signature)?'same_atom_counts_and_charge':'different_atom_counts_or_charge',
    typographyChanged:a.length===b.length&&a.some((t,i)=>t.original!==b[i].original),caseChanges,
    beforeLatin,afterLatin,mixedScriptSpan:mixed(before)||mixed(after),
    mixedScriptReviewRequired:before!==after&&(mixed(before)||mixed(after)),
    formulaSpellingVerified:false,sourceImageVerified:false,status:'pending_human_review',
    scope:'syntax comparison of OCR and proposal; neither is a truth reference'};
}
