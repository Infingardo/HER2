import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, ORGAN_NAMES, usesCluster, usesPercent } from '../src/lib/scoring.ts';
const base = { organ:'mammella', sampleType:'resezione', intensity:'forte', pattern:'completa', percent:80, cluster5:false, cytoplasmicOnly:false, controlsValid:true };
const run = patch => computeScore({...base, ...patch});
const cases = [
 ['mammella 3+', {}, '3+'],
 ['mammella limite 10%', {percent:10}, '2+'],
 ['mammella sopra 10%', {percent:10.1}, '3+'],
 ['forte incompleta focale', {pattern:'incompleta',percent:5}, '2+'],
 ['forte basolaterale diffusa', {pattern:'basolaterale'}, '2+'],
 ['debole-moderata completa', {intensity:'debole_moderata'}, '2+'],
 ['tenue incompleta 10%', {intensity:'debole',pattern:'incompleta',percent:10}, '0'],
 ['tenue incompleta >10%', {intensity:'debole',pattern:'incompleta',percent:10.1}, '1+'],
 ['assenza', {intensity:'assente',pattern:'assente',percent:0}, '0'],
 ['gastrico 10%', {organ:'stomaco',pattern:'basolaterale',percent:10}, '3+'],
 ['gastrico sotto 10%', {organ:'stomaco',percent:9.9}, '0'],
 ['gastrico cluster anche senza percentuale', {organ:'stomaco',sampleType:'biopsia',cluster5:true,percent:0}, '3+'],
 ['gastrico senza cluster', {organ:'stomaco',sampleType:'biopsia',cluster5:false}, '0'],
 ['CRC 50%', {organ:'colonretto',percent:50}, '3+'],
];
for (const [name, patch, score] of cases) test(name, () => assert.equal(run(patch).score, score));
test('Controlli invalidi bloccano tutti gli organi', () => {
 for (const organ of Object.keys(ORGAN_NAMES)) { const r=run({organ,controlsValid:false}); assert.equal(r.score,null); assert.equal(r.status,'invalid'); assert.equal(r.therapy,null); }
});
test('Membrana assente + intensità forte non genera score per alcun organo', () => {
 for (const organ of Object.keys(ORGAN_NAMES)) assert.equal(run({organ,pattern:'assente'}).status,'invalid');
});
test('Input invalidi', () => {
 for (const patch of [{percent:NaN},{percent:Infinity},{percent:-1},{percent:101},{percent:0},{organ:'__proto__'},{organ:'unknown'},{intensity:'x'},{controlsValid:'true'},{cytoplasmicOnly:true},{intensity:'assente',pattern:'assente',cluster5:true,percent:0}]) assert.equal(run(patch).status,'invalid');
});
test('Pattern ambiguo produce uno score dichiarato, mai un 0 silenzioso', () => {
 for (const patch of [{intensity:'debole_moderata',pattern:'incompleta'},{intensity:'debole',pattern:'completa'},{organ:'stomaco',pattern:'incompleta'},{organ:'colonretto',percent:10}]) {
  const r=run(patch);
  assert.equal(r.status,'scored','deve restituire uno score, non un vicolo cieco');
  assert.notEqual(r.score,null);
  if(r.score==='0') assert.match(String(r.modifier),/membrana/,'un 0 da pattern ambiguo deve dichiarare la colorazione di membrana');
  else assert.ok(r.notes.some(n=>/non testualmente inclusa|protocollo gastrico|HERACLES/.test(n)),'deve dichiarare il criterio applicato');
 }
});
test('Nessuna combinazione valida resta senza risposta negli organi supportati', () => {
 let senzaScore=0, totali=0;
 for (const organ of ['mammella','stomaco','colonretto','vescica']) for(const sampleType of ['biopsia','turb','resezione'])
  for(const intensity of ['debole','debole_moderata','forte']) for(const pattern of ['completa','incompleta','basolaterale'])
   for(const percent of [1,5,10,10.1,49.9,50,100]) for(const cluster5 of [true,false]) {
    if(sampleType==='turb' && organ!=='vescica') continue; // combinazione non producibile dall'interfaccia
    const r=run({organ,sampleType,intensity,pattern,percent,cluster5});
    totali++;
    if(r.score===null) senzaScore++;
   }
 assert.ok(totali>1000);
 assert.equal(senzaScore, 0, 'nessun vicolo cieco residuo negli organi supportati');
});
test('CRC intensità distinta dallo stato', () => {
 assert.equal(run({organ:'colonretto',percent:49.9}).category,'Equivoco');
 assert.equal(run({organ:'colonretto',percent:49.9}).ish,true);
 assert.equal(run({organ:'colonretto',percent:9}).category,'Negativo');
 assert.equal(run({organ:'colonretto',percent:10}).category,'Equivoco');
 assert.equal(run({organ:'colonretto',intensity:'debole_moderata',percent:50}).ish,true);
});
test('Nessuna estrapolazione gastrica', () => {
 for (const organ of ['endometrio','polmone','ovaio','biliari','pancreas','cervice','altri']) {
  assert.equal(run({organ}).status,'unsupported');assert.equal(run({organ}).score,null);
  assert.equal(usesCluster(organ,'biopsia'),false);assert.equal(usesPercent(organ,'resezione'),false);
 }
});
test('Nessuna indicazione terapeutica automatica, invarianti su tutte le combinazioni', () => {
 for (const organ of Object.keys(ORGAN_NAMES)) for(const sampleType of ['biopsia','turb','resezione']) for(const intensity of ['assente','debole','debole_moderata','forte']) for(const pattern of ['assente','completa','incompleta','basolaterale']) for(const percent of [0,5,10,10.1,49.9,50,100]) for(const cluster5 of [true,false]) {
 const r=run({organ,sampleType,intensity,pattern,percent,cluster5});assert.equal(r.therapy,null);
 if(r.status!=='scored'){assert.equal(r.score,null);assert.equal(r.ish,false);assert.notEqual(r.category,'Positivo');}
 }
});

test('Uroteliale: criteri gastrici dichiarati solo su resezione',()=>{
 const r=run({organ:'vescica',intensity:'debole_moderata',pattern:'basolaterale',percent:30});
 assert.equal(r.score,'2+');assert.equal(r.category,'Equivoco');assert.equal(r.ish,false);assert.match(r.protocol,/uroteliale/);
 assert.equal(run({organ:'vescica',percent:10}).score,'3+');
 assert.equal(run({organ:'vescica',sampleType:'biopsia',cluster5:true}).score,'3+');
 assert.equal(usesCluster('vescica','biopsia'),true);
 assert.equal(usesPercent('vescica','biopsia'),false);
});

test('TURB uroteliale: criteri da campione resettivo, non da biopsia', () => {
 const turb = run({organ:'vescica',sampleType:'turb',intensity:'forte',pattern:'basolaterale',percent:15,cluster5:false});
 assert.equal(turb.score,'3+');
 assert.equal(usesPercent('vescica','turb'),true);
 assert.equal(usesCluster('vescica','turb'),false);
 assert.ok(turb.notes.some(n=>/TURB trattata come campione resettivo/.test(n)));
 // sotto soglia ma con componente intensa: va segnalata perche' il T-DXd agnostico e' ancorato al 3+
 const focale = run({organ:'vescica',sampleType:'turb',intensity:'forte',pattern:'basolaterale',percent:5,cluster5:false});
 assert.equal(focale.score,'0');
 assert.ok(focale.notes.some(n=>/<10% delle cellule/.test(n)));
 assert.ok(focale.notes.some(n=>/trastuzumab deruxtecan/.test(n)));
});

test('Biopsia uroteliale sbloccata con regola del cluster dichiarata', () => {
 const b = run({organ:'vescica',sampleType:'biopsia',intensity:'debole_moderata',pattern:'basolaterale',percent:0,cluster5:true});
 assert.equal(b.score,'2+');
 assert.ok(b.notes.some(n=>/regola gastrica del cluster/.test(n)));
 const senzaCluster = run({organ:'vescica',sampleType:'biopsia',intensity:'forte',pattern:'basolaterale',percent:0,cluster5:false});
 assert.equal(senzaCluster.score,'0');
 assert.ok(senzaCluster.notes.some(n=>/prelievo più ampio/.test(n)));
});

test('TURB accettata solo sull\u2019uroteliale', () => {
 for (const organ of ['mammella','stomaco','colonretto']) {
  const r = run({organ,sampleType:'turb'});
  assert.equal(r.status,'invalid');
  assert.equal(r.score,null);
  assert.match(r.interpretation,/TURB prevista solo/);
 }
 assert.equal(run({organ:'vescica',sampleType:'turb',pattern:'basolaterale',percent:15}).score,'3+');
});
