// Genera il blocco di testo da incollare nel referto.
// Principio: lo score e la classificazione integrata restano voci separate.
// L'ambiguita' che si vuole evitare e' il "positivo (score 2+)", che nei protocolli
// gastroesofageo e HERACLES indica un equivoco, non una positivita'.
import type { ScoringResult } from './scoring';

export interface ReportContext {
  organName: string;
  sampleTypeLabel: string;
  caseCode?: string;
}

/** Riga "Classificazione": mai la parola positivo se il protocollo non la autorizza. */
function classification(result: ScoringResult): string {
  if (result.her2Status) return result.her2Status;
  return result.category;
}

// Conclusione descrittiva limitata al flusso uroteliale adottato: documenta IHC 3+,
// non eleggibilità terapeutica. Non generalizzare agli altri organi: l'assenza
// di IHC 3+ non definisce da sola lo stato HER2 integrato (es. gastrico 2+/ISH+).
// L'organo è un dato strutturale; il testo del protocollo è solo un'etichetta.
function urothelialConclusion(result: ScoringResult): string | null {
  if (result.organ !== 'vescica' || result.score === null) return null;
  if (result.score === '3+') return 'Nel campione è documentata espressione HER2 IHC 3+ secondo i criteri gastrici applicati.';
  return `Nel campione non si documenta espressione HER2 IHC 3+ secondo i criteri gastrici applicati (score IHC ${result.score}).`;
}

export function buildReportText(result: ScoringResult, ctx: ReportContext): string {
  const L: string[] = [];
  L.push('HER2 — valutazione immunoistochimica');
  L.push('');
  L.push(`Materiale: ${ctx.organName} · ${ctx.sampleTypeLabel}${ctx.caseCode ? ` · caso ${ctx.caseCode}` : ''}`);
  L.push(`Reperto: ${result.observed}`);

  if (result.score === null) {
    L.push('Score: non assegnato.');
    L.push(`Motivo: ${result.interpretation}`);
    L.push(`Condotta: ${result.action}`);
  } else {
    L.push(`Score IHC: ${result.score}${result.modifier ? ` (${result.modifier})` : ''}`);
    L.push(`Protocollo applicato: ${result.protocol ?? 'da specificare'}`);
    L.push(`Classificazione: ${classification(result)}`);
    if (result.her2StatusDetail) L.push(`  ${result.her2StatusDetail}`);
    L.push(`Interpretazione: ${result.interpretation}`);
    const conclusion = urothelialConclusion(result);
    if (conclusion) L.push(`Conclusione: ${conclusion}`);
    L.push(`Condotta: ${result.action}`);
  }

  if (result.notes.length) {
    L.push('');
    L.push('Note:');
    for (const n of result.notes) L.push(`- ${n}`);
  }
  return L.join('\n');
}
