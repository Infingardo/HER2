import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, ORGAN_NAMES } from '../src/lib/scoring.ts';
import { buildReportText } from '../src/lib/report.ts';

const base = { organ:'mammella', sampleType:'resezione', intensity:'forte', pattern:'completa', percent:80, cluster5:false, cytoplasmicOnly:false, controlsValid:true };
const build = (patch, ctx={}) => buildReportText(computeScore({...base, ...patch}), {organName:'Mammella', sampleTypeLabel:'Pezzo chirurgico', ...ctx});

test('Il testo del referto riporta reperto, score, protocollo, classificazione e condotta', () => {
 const t = build({});
 for (const riga of ['Materiale:','Reperto:','Score IHC: 3+','Protocollo applicato:','Classificazione:','Interpretazione:','Condotta:']) {
  assert.ok(t.includes(riga), `manca la riga ${riga}`);
 }
 assert.ok(t.includes('ASCO/CAP mammella 2023'));
});

test('Score e classificazione restano righe distinte: nessun "positivo (score 2+)"', () => {
 const t = build({intensity:'debole_moderata'});
 assert.ok(t.includes('Score IHC: 2+'));
 assert.ok(/Classificazione: IHC equivoco/.test(t));
 assert.ok(!/positiv\w*\s*\(score 2\+\)/i.test(t), 'lo score non deve essere qualificato come positivo');
 const righe = t.split('\n');
 const score = righe.findIndex(r => r.startsWith('Score IHC:'));
 const clas = righe.findIndex(r => r.startsWith('Classificazione:'));
 assert.ok(score !== -1 && clas !== -1 && score < clas, 'devono essere due righe separate e ordinate');
});

test('Nessuna indicazione terapeutica finisce nel referto, per nessun organo', () => {
 for (const organ of Object.keys(ORGAN_NAMES)) for (const intensity of ['debole','debole_moderata','forte']) {
  const t = build({organ, intensity, pattern:'basolaterale', percent:30});
  assert.ok(!/somministra|prescriv|iniziare la terapia|eleggibile a trastuzumab\b/i.test(t));
 }
});

test('Score non assegnato: il testo lo dichiara invece di inventare un valore', () => {
 const t = build({controlsValid:false});
 assert.ok(t.includes('Score: non assegnato.'));
 assert.ok(t.includes('Motivo:'));
 assert.ok(!t.includes('Score IHC:'));
});

test('Il codice caso compare solo se fornito', () => {
 assert.ok(!build({}).includes('· caso '));
 assert.ok(build({}, {caseCode:'H-2026-0042'}).includes('· caso H-2026-0042'));
});

test('La componente 3+ sotto soglia arriva nel referto uroteliale', () => {
 const t = buildReportText(
  computeScore({...base, organ:'vescica', sampleType:'turb', intensity:'forte', pattern:'basolaterale', percent:5}),
  {organName:'Carcinoma uroteliale', sampleTypeLabel:'TURB'});
 assert.ok(t.includes('Score IHC: 0'));
 assert.ok(/<10% delle cellule/.test(t));
 assert.ok(/trastuzumab deruxtecan/.test(t), 'la ragione della segnalazione deve restare leggibile');
});
