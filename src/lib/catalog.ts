import type { Organ, Criterion, Guideline } from './api';
import { ORGAN_NAMES } from './scoring';
export const organs: Organ[] = Object.entries(ORGAN_NAMES).map(([code,name],i)=>({id:i+1,code,name,histology:code==='mammella'?'Carcinoma invasivo':code==='stomaco'||code==='colonretto'?'Adenocarcinoma':'Protocollo non implementato',guideline:code==='mammella'?'ASCO/CAP 2023':code==='stomaco'?'CAP/ASCP/ASCO 2016–2017':code==='colonretto'?'HERACLES':'Non disponibile',color:['mammella','stomaco','colonretto'].includes(code)?'#0f766e':'#94a3b8',initials:name.slice(0,2).toUpperCase(),sort:i}));
export const criteria: Criterion[] = [
 ['mammella','entrambi','0','Membrana assente, oppure tenue incompleta in ≤10%.','Distinguere assenza da staining sotto soglia.','Riportare il reperto.'],
 ['mammella','entrambi','1+','Membrana tenue/appena percettibile, incompleta, in >10%.','Negativo per sovraespressione.','Conservare lo score numerico.'],
 ['mammella','entrambi','2+','Debole-moderata completa in >10%; forte completa ≤10%; pattern insoliti da revisionare.','Equivoco.','Integrare con ISH secondo protocollo.'],
 ['mammella','entrambi','3+','Intensa, completa e circonferenziale in >10% della componente invasiva.','Positivo IHC.','Correlare con morfologia.'],
 ['stomaco','resezione','0','Membrana assente oppure reattività in <10%.','Sotto soglia sul pezzo.','Descrivere eventuale staining focale.'],
 ['stomaco','biopsia','0','Assenza di cluster reattivo di almeno 5 cellule coesive.','Sotto soglia bioptica.','Considerare adeguatezza del campione.'],
 ...['biopsia','resezione'].flatMap(sample=>[
 ['stomaco',sample,'1+',`Tenue/appena percettibile; ${sample==='biopsia'?'cluster ≥5 cellule coesive':'≥10% delle cellule'}.`,'Negativo IHC.','Riportare lo score.'],
 ['stomaco',sample,'2+',`Debole-moderata completa o laterale/basolaterale; ${sample==='biopsia'?'cluster ≥5 cellule':'≥10%'}.`,'Equivoco.','Integrare con ISH.'],
 ['stomaco',sample,'3+',`Forte completa o laterale/basolaterale; ${sample==='biopsia'?'cluster ≥5 cellule':'≥10%'}.`,'Positivo IHC.','Riportare pattern ed estensione.']]),
 ['colonretto','entrambi','3+','HERACLES: staining forte ≥50%; forte >10–<50% richiede integrazione.','Intensità e stato HERACLES sono distinti.','ISH per i casi equivoci; al 10% esatto verificare protocollo.'],
 ['colonretto','entrambi','2+','HERACLES: debole-moderata in ≥50% da integrare con ISH.','Non estendere ad altri protocolli CRC.','Verificare distribuzione e popolazione amplificata.'],
].map((row,i)=>({id:i+1,organ_code:row[0],sample_type:row[1],score:row[2],definition:row[3],interpretation:row[4],action:row[5]}));
export const guidelines: Guideline[] = [
 {id:1,organ_code:'mammella',title:'HER2 Testing in Breast Cancer — 2023 Update',organization:'ASCO/CAP',year:2023,summary:'Scoring della componente invasiva. I pattern insoliti richiedono revisione morfologica.',key_points:['Separare staining tenue incompleto da debole-moderato completo.','I controlli non validi impediscono l’assegnazione dello score.','Una sola popolazione descritta per volta: l’eterogeneità richiede valutazione integrata.'],reference_url:'https://www.cap.org/cap-guidelines/her2-testing-in-breast-cancer-2023-guideline-update/'},
 {id:2,organ_code:'stomaco',title:'HER2 nel carcinoma gastroesofageo',organization:'CAP/ASCP/ASCO',year:2016,summary:'Criteri distinti per biopsia e resezione. Non estesi automaticamente ad altri organi.',key_points:['Laterale/basolaterale non equivale a generica membrana incompleta.','Verificare campionamento ed eterogeneità.'],reference_url:'https://pubmed.ncbi.nlm.nih.gov/28077399/'},
 {id:3,organ_code:'colonretto',title:'HERACLES Diagnostic Criteria',organization:'Valtorta et al.',year:2015,summary:'Protocollo specifico; non rappresenta tutti i criteri utilizzati nel carcinoma colorettale.',key_points:['Separare intensità di staining e classificazione integrata HERACLES.','Il limite esatto del 10% richiede verifica del protocollo adottato.'],reference_url:'https://www.nature.com/articles/modpathol201598'},
];
