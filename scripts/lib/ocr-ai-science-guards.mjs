// Risk heuristics, never a dictionary-based correction or truth reference.
const han=/\p{Script=Han}/u;
const latin=/[A-Za-z]/;
const scripts=/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉₊₋]/u;
// Formula-like strings only: not a chemical parser (Hb may also match).
const formula=/(?<![A-Za-z])(?:[A-Z][a-z]?(?:[0-9₀-₉]+)?)+(?:[0-9⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉₊₋+−-]+)?(?![A-Za-z])/gu;
const words=/[A-Za-z]{2,}(?:[-'][A-Za-z]+)*/g;
const defaultTerms=['血紅素','多肽鏈','血基質','碳酸酐酶','核糖體','染色體','蛋白質','核酸','酵素','細胞','氧氣','氮氣'];
export function scienceGuards(c,{protectedTerms=defaultTerms}={}){
  const before=c.before??'',after=c.after??'',changed=before!==after,risks=[];
  const add=(code,severity,evidence)=>risks.push({code,severity,evidence});
  const fb=before.match(formula)??[],fa=after.match(formula)??[];
  const eb=before.match(words)??[],ea=after.match(words)??[];
  if(changed&&(fb.length||fa.length))add('formula_or_symbol_change','review',{before:fb,after:fa});
  if(changed&&scripts.test(before+after))add('subscript_superscript_sensitive','review','Preserve original Unicode/script structure; no NFKC folding');
  if(changed&&/[Δα-ωΑ-Ω⇌↔→←±×÷=−]/u.test(before+after))add('scientific_special_symbols','review','Greek letters, operators, equilibrium and arrows require image evidence');
  if(changed&&fa.some(t=>/[A-Za-z][0-9]+[+-]?/.test(t)))add('plain_ascii_scientific_notation','review','ASCII notation cannot prove faithful subscript/superscript retention');
  if(changed&&JSON.stringify(eb)!==JSON.stringify(ea))add('latin_term_change','review',{before:eb,after:ea});
  if(changed&&han.test(before+after)&&latin.test(before+after))add('mixed_language_span','review','Whole-span replacements may alter Latin terms or adjacent Chinese');
  if(changed&&(c.category==='scientific_terms'||protectedTerms.some(t=>before.includes(t)||after.includes(t))))add('protected_terminology','review','Terminology changes need source-image confirmation; dictionary is not evidence');
  if(changed&&((before.includes('胺')&&after.includes('氨'))||(before.includes('氨')&&after.includes('胺'))))add('amine_ammonia_character_swap','potential_error','Related scientific characters are not interchangeable automatically');
  if(changed&&(c.category==='figure_text'||c.category==='table')){
    add('figure_or_table_structure','review','Text-only replacement cannot verify labels, branches, cell layout or reading order');
    if(after.replace(/\s/gu,'').length<before.replace(/\s/gu,'').length&&fb.some(t=>!fa.includes(t)))add('figure_scientific_content_removed','potential_error',{before:fb,after:fa});
  }
  if(changed&&before.split('\n').length!==after.split('\n').length)add('line_structure_changed','review','Check paragraph and reading order; line removal is not automatically wrong');
  if(changed&&(!after.trim()||after.replace(/\s/gu,'').length<before.replace(/\s/gu,'').length*0.5))add('large_content_deletion','potential_error','Potential deletion; may include OCR noise and requires visual review');
  return risks;
}
