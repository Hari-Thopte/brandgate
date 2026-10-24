import { getValidatedSampleFindings } from '../data/offlineFallback.js';
import analyses from '../data/demo/analyses.json' with {type:'json'};
import samples from '../data/demo/samples.json' with {type:'json'};

const validSources=new Set(['rule-superlative','rule-guarantee','rule-clinical','rule-slang','ledger-clinical','ledger-users','ledger-offer']);

const checks=[
  ['#1 best','rule-superlative','style','high','Superlative is not supported by an approved source.','Remove the superlative.'],
  ['guaranteed results','rule-guarantee','legal','high','A guaranteed outcome needs approved evidence.','Describe the product without promising an outcome.'],
  ['clinically proven','ledger-clinical','fact','high','This clinical claim is unregistered in the Facts Ledger.','Remove or substantiate the claim.'],
  ['10k users','ledger-users','fact','medium','The approved ledger says 8,500 registered users.','Use the supported figure: 8,500 registered users.'],
  ['2024-01-01','ledger-offer','fact','high','The offer date in the ledger has expired.','Confirm a current offer date before publishing.'],
  ['no cap','rule-slang','banned_term','medium','This term is listed as banned for the brand.','Replace with neutral brand language.']
];

export function analyzeLocalText(text, sampleText) {
  if(text===sampleText){
    const sample=samples.find(row=>row.text===text);
    const saved=analyses.find(row=>row.sample_id===sample?.id);
    if(saved?.findings_fixture)return getValidatedSampleFindings(text);
    return (saved?.findings||[]).filter(finding=>validSources.has(finding.source_id)&&text.slice(finding.span_start,finding.span_end)===finding.span_text)
      .map(finding=>({...finding,id:crypto.randomUUID(),reason:null}));
  }
  return checks.flatMap(([phrase,source_id,category,severity,message,suggestion])=>{
    const span_start=text.toLowerCase().indexOf(phrase.toLowerCase());
    if(span_start<0)return[];
    return [{id:crypto.randomUUID(),category,severity,confidence:1,span_start,span_end:span_start+phrase.length,span_text:text.slice(span_start,span_start+phrase.length),message,suggestion,source_type:source_id.startsWith('ledger-')?'ledger':'rule',source_id,status:'open',reason:null}];
  });
}
