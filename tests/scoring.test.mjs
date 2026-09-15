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
test('Pattern ambiguo non diventa 0', () => {
 for (const patch of [{intensity:'debole_moderata',pattern:'incompleta'},{intensity:'debole'},{organ:'stomaco',pattern:'incompleta'},{organ:'colonretto',percent:10}]) {const r=run(patch);assert.equal(r.status,'review');assert.equal(r.score,null);}
});
test('CRC intensità distinta dallo stato', () => {
 assert.equal(run({organ:'colonretto',percent:49.9}).category,'Equivoco');
 assert.equal(run({organ:'colonretto',percent:49.9}).ish,true);
 assert.equal(run({organ:'colonretto',percent:9}).category,'Negativo');
 assert.equal(run({organ:'colonretto',intensity:'debole_moderata',percent:50}).ish,true);
});
test('Nessuna estrapolazione gastrica', () => {
 for (const organ of ['endometrio','polmone','ovaio','biliari','pancreas','cervice','altri']) {
  assert.equal(run({organ}).status,'unsupported');assert.equal(run({organ}).score,null);
  assert.equal(usesCluster(organ,'biopsia'),false);assert.equal(usesPercent(organ,'resezione'),false);
 }
});
test('Nessuna indicazione terapeutica automatica, invarianti su tutte le combinazioni', () => {
 for (const organ of Object.keys(ORGAN_NAMES)) for(const sampleType of ['biopsia','resezione']) for(const intensity of ['assente','debole','debole_moderata','forte']) for(const pattern of ['assente','completa','incompleta','basolaterale']) for(const percent of [0,5,10,10.1,49.9,50,100]) for(const cluster5 of [true,false]) {
 const r=run({organ,sampleType,intensity,pattern,percent,cluster5});assert.equal(r.therapy,null);
 if(r.status!=='scored'){assert.equal(r.score,null);assert.equal(r.ish,false);assert.notEqual(r.category,'Positivo');}
 }
});

test('Uroteliale: criteri gastrici dichiarati solo su resezione',()=>{
 const r=run({organ:'vescica',intensity:'debole_moderata',pattern:'basolaterale',percent:30});
 assert.equal(r.score,'2+');assert.equal(r.category,'Equivoco');assert.equal(r.ish,false);assert.match(r.protocol,/uroteliale/);
 assert.equal(run({organ:'vescica',percent:10}).score,'3+');
 assert.equal(run({organ:'vescica',sampleType:'biopsia',cluster5:true}).score,null);
 assert.equal(usesCluster('vescica','biopsia'),false);
});
