import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { computeScore } from '../src/lib/scoring.ts';
await mkdir('node_modules/.cache/her2-tests',{recursive:true});
await build({entryPoints:['src/components/ResultCard.tsx','src/lib/api.ts'],outdir:'node_modules/.cache/her2-tests',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
const {default:ResultCard}=await import('../node_modules/.cache/her2-tests/components/ResultCard.js');
const api=await import('../node_modules/.cache/her2-tests/lib/api.js');
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const input={organ:'mammella',sampleType:'resezione',intensity:'forte',pattern:'completa',percent:80,cluster5:false,cytoplasmicOnly:false,controlsValid:false};
test('ResultCard mostra esito non valutabile senza falso zero',()=>{
 const html=renderToStaticMarkup(createElement(ResultCard,{result:computeScore(input),organName:'Mammella',sampleType:'resezione'}));
 assert.match(html,/Non valutabile/);assert.match(html,/Score non assegnato/);assert.doesNotMatch(html,/puramente indicativo|Implicazioni terapeutiche/);
});
test('Salvataggio, rilettura e cancellazione preservano score null e snapshot',async()=>{
 const result=computeScore(input);
 const saved=await api.saveEvaluation({case_code:'TEST',organ_code:'mammella',score:result.score,result_snapshot:result,algorithm_version:'0.2.0'});
 const rows=await api.fetchEvaluations();assert.equal(rows.length,1);assert.equal(rows[0].score,null);assert.deepEqual(rows[0].result_snapshot,result);
 await api.deleteEvaluation(saved.id);assert.equal((await api.fetchEvaluations()).length,0);
});
test('Catalogo disponibile senza rete e nessuna credenziale',async()=>{
 globalThis.fetch=()=>{throw new Error('Unexpected network request');};
 assert.equal((await api.fetchOrgans()).length,11);assert.equal((await api.fetchGuidelines()).length,3);assert.ok((await api.fetchCriteria('mammella')).length>0);
});
// HTML snapshot for non-browser inspection; not a screenshot or end-to-end UI test.
await writeFile('node_modules/.cache/her2-tests/result.html',renderToStaticMarkup(createElement(ResultCard,{result:computeScore(input),organName:'Mammella',sampleType:'resezione'})));
