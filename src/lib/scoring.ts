// Motore di calcolo dello score HER2 immunoistochimico.
// Implementa: ASCO/CAP 2023 (mammella), criteri ToGA / gastrici (stomaco-GEJ),
// HERACLES (colon-retto). Nessuna estrapolazione automatica agli altri organi.
// Revisione software: 2026-09-15. Vedere README.md per limiti e integrazione.

export type OrganCode =
  | 'mammella'
  | 'stomaco'
  | 'colonretto'
  | 'vescica'
  | 'endometrio'
  | 'polmone'
  | 'ovaio'
  | 'biliari'
  | 'pancreas'
  | 'cervice'
  | 'altri';

export type SampleType = 'biopsia' | 'resezione';
export type Intensity = 'assente' | 'debole' | 'debole_moderata' | 'forte';
export type MembranePattern = 'completa' | 'incompleta' | 'basolaterale' | 'assente';

export interface ScoringInput {
  organ: OrganCode;
  sampleType: SampleType;
  intensity: Intensity;
  pattern: MembranePattern;
  percent: number;
  cluster5: boolean;
  cytoplasmicOnly: boolean;
  controlsValid: boolean;
}

export interface ScoringResult {
  score: '0' | '1+' | '2+' | '3+' | null;
  status: 'scored' | 'invalid' | 'review' | 'unsupported';
  protocol: string | null;
  modifier: string | null;
  observed: string;
  category: 'Negativo' | 'Equivoco' | 'Positivo' | 'Non valutabile' | 'Da revisionare' | 'Protocollo richiesto';
  her2Status: string | null;
  her2StatusDetail: string | null;
  interpretation: string;
  action: string;
  therapy: string | null;
  ish: boolean;
  technicalWarning: boolean;
  notes: string[];
}

export const ORGAN_NAMES: Record<OrganCode, string> = {
  mammella: 'Mammella',
  stomaco: 'Stomaco / GEJ',
  colonretto: 'Colon-retto',
  vescica: 'Vescica',
  endometrio: 'Endometrio',
  polmone: 'Polmone (NSCLC)',
  ovaio: 'Ovaio',
  biliari: 'Vie biliari',
  pancreas: 'Pancreas',
  cervice: 'Cervice uterina',
  altri: 'Altri tumori solidi',
};

export const PANTUMOR_ORGANS: OrganCode[] = [
  'vescica',
  'endometrio',
  'polmone',
  'ovaio',
  'biliari',
  'pancreas',
  'cervice',
  'altri',
];

export function usesPercent(organ: OrganCode, sampleType: SampleType): boolean {
  if (organ === 'mammella' || organ === 'colonretto') return true;
  return organ === 'stomaco' && sampleType === 'resezione';
}

export function usesCluster(organ: OrganCode, sampleType: SampleType): boolean {
  if (organ === 'mammella' || organ === 'colonretto') return false;
  return organ === 'stomaco' && sampleType === 'biopsia';
}

export function intensityLabel(i: Intensity): string {
  switch (i) {
    case 'assente':
      return 'assente';
    case 'debole':
      return 'debole / appena percettibile';
    case 'debole_moderata':
      return 'debole-moderata';
    case 'forte':
      return 'forte / intensa';
  }
}

export function patternLabel(p: MembranePattern): string {
  switch (p) {
    case 'completa':
      return 'completa e circonferenziale';
    case 'incompleta':
      return 'incompleta (estensione valutata separatamente)';
    case 'basolaterale':
      return 'basolaterale / laterale (ghiandolare)';
    case 'assente':
      return 'assente';
  }
}

function buildObserved(input: ScoringInput): string {
  const { organ, sampleType, intensity, pattern, percent, cluster5, cytoplasmicOnly } = input;
  let extent: string;
  if (!usesCluster(organ, sampleType)) {
    extent = `nel ${percent}% delle cellule tumorali`;
  } else {
    extent = cluster5
      ? 'in almeno un cluster di \u22655 cellule tumorali coesive'
      : 'senza cluster di \u22655 cellule tumorali coesive';
  }
  const cyto = cytoplasmicOnly ? ' (reattivita solo citoplasmatica, membrana non valutabile come positiva)' : '';
  return `Colorazione di membrana ${intensityLabel(intensity)}, pattern ${patternLabel(pattern)}, ${extent}${cyto}.`;
}

// Source versions are explicit; these are not claims of automatic guideline updates.
const PROTOCOLS: Partial<Record<OrganCode, string>> = {
  mammella: 'ASCO/CAP mammella 2023 (carcinoma invasivo)',
  stomaco: 'CAP/ASCP/ASCO gastroesofageo 2016–2017',
  colonretto: 'HERACLES; sintesi CAP 2024 (non algoritmo CRC universale)',
};

function result(input: ScoringInput, score: ScoringResult['score'], interpretation: string,
  options: Partial<ScoringResult> = {}): ScoringResult {
  const equivocal = score === '2+';
  return {
    score, status: 'scored', protocol: PROTOCOLS[input.organ] ?? null,
    modifier: null, observed: buildObserved(input),
    category: score === '3+' ? 'Positivo' : equivocal ? 'Equivoco' : 'Negativo',
    her2Status: score === '3+' ? 'IHC positivo (3+)' : equivocal ? 'IHC equivoco; stato integrato da definire' : `IHC negativo (${score})`,
    her2StatusDetail: null, interpretation,
    action: equivocal ? 'Integrare con ISH secondo il protocollo applicabile e il reperto morfologico.' : 'Riportare score, pattern, estensione e protocollo utilizzato.',
    therapy: null, ish: equivocal, technicalWarning: false,
    notes: ['Il risultato descrive il reperto inserito: non determina da solo eleggibilità terapeutica né lo stato molecolare ERBB2.'],
    ...options,
  };
}
function blocked(input: ScoringInput, status: 'invalid' | 'review' | 'unsupported', reason: string): ScoringResult {
  return result(input, null, reason, {
    status, category: status === 'invalid' ? 'Non valutabile' : status === 'review' ? 'Da revisionare' : 'Protocollo richiesto',
    her2Status: null, ish: false, technicalWarning: status === 'invalid',
    action: status === 'unsupported' ? 'Specificare istotipo, finalità del test e protocollo prima di assegnare uno score.' :
      status === 'invalid' ? 'Correggere i dati o ripetere la valutazione tecnica prima dello scoring.' :
      'Rivedere il reperto al microscopio e precisare il pattern; non convertire questo esito in IHC 0.',
  });
}

function breast(input: ScoringInput): ScoringResult {
  const { intensity, pattern, percent } = input;
  const complete = pattern === 'completa';
  if (intensity === 'forte') {
    if (complete && percent > 10) return result(input, '3+', 'Reattività intensa e circonferenziale in >10% della componente invasiva.');
    return result(input, '2+', complete ? 'Reattività intensa completa in ≤10%: pattern focale equivoco.' :
      'Reattività intensa incompleta/basolaterale: pattern insolito da considerare equivoco, previa verifica morfologica.',
      { modifier: complete ? 'focale' : 'pattern insolito' });
  }
  if (intensity === 'debole_moderata') {
    if (complete && percent > 10) return result(input, '2+', 'Reattività debole-moderata completa in >10% della componente invasiva.');
    // Legacy UI groups weak and moderate: do not silently call a moderate incomplete pattern 1+.
    if (!complete) return blocked(input, 'review', 'La voce debole-moderata non distingue una reattività tenue da un pattern moderato incompleto potenzialmente equivoco. Precisare l’intensità prima dello score.');
    return result(input, '2+', 'Reattività debole-moderata completa in ≤10%: pattern non incluso nelle quattro definizioni standard; gestione come pattern insolito equivoco.', { modifier: 'pattern insolito; revisione morfologica' });
  }
  if (intensity === 'debole' && !complete) {
    if (percent > 10) return result(input, '1+', 'Reattività tenue/appena percettibile incompleta in >10% della componente invasiva.');
    return result(input, '0', 'Reattività tenue/appena percettibile incompleta in >0% e ≤10% della componente invasiva.', {
      modifier: 'con colorazione di membrana', her2StatusDetail: 'IHC 0 con membrana colorata; mantenere questa descrizione distinta dall’assenza completa di staining.',
    });
  }
  // The legacy label "debole / appena percettibile" cannot encode true weak complete staining reliably.
  return blocked(input, 'review', 'Reattività appena percettibile dichiarata completa: distinguere da debole completa e da tenue incompleta prima di applicare i criteri.');
}

function gastric(input: ScoringInput): ScoringResult {
  const threshold = input.sampleType === 'biopsia' ? input.cluster5 : input.percent >= 10;
  if (!threshold) return result(input, '0', input.sampleType === 'biopsia' ?
    'Reattività presente senza cluster di almeno 5 cellule tumorali coesive: sotto soglia per il protocollo gastrico.' :
    'Reattività presente in <10% sul pezzo chirurgico: sotto soglia per il protocollo gastrico.', { modifier: 'reattività sotto soglia' });
  if (input.intensity === 'debole') return result(input, '1+', 'Reattività tenue/appena percettibile sopra soglia; può essere parziale.');
  if (input.pattern === 'incompleta') return blocked(input, 'review', 'Precisare se la membrana incompleta è laterale/basolaterale: la sola dicitura incompleta non giustifica 2+ o 3+.');
  return result(input, input.intensity === 'forte' ? '3+' : '2+',
    'Reattività di membrana completa o laterale/basolaterale sopra la soglia specifica del campione.');
}

function crc(input: ScoringInput): ScoringResult {
  // CAP 2024 summary: >=50% positive, >10 and <50% strong equivocal.
  // Exactly 10% differs between published summaries: require protocol review at that boundary.
  if (input.intensity !== 'debole' && input.pattern === 'incompleta') return blocked(input, 'review', 'Distinguere pattern laterale/basolaterale da generica incompletezza prima di applicare HERACLES.');
  if (input.intensity === 'forte' && input.percent === 10) return blocked(input, 'review', 'Reattività forte esattamente al 10%: verificare il limite nel protocollo HERACLES adottato; le sintesi pubblicate non sono uniformi.');
  const strong = input.intensity === 'forte';
  const score = strong ? '3+' : input.intensity === 'debole_moderata' ? '2+' : '1+';
  const positive = strong && input.percent >= 50;
  const equivocal = (strong && input.percent > 10 && input.percent < 50) || (!strong && score === '2+' && input.percent >= 50);
  return result(input, score, 'Intensità IHC e classificazione integrata sono riportate separatamente secondo il protocollo HERACLES selezionato.', {
    category: positive ? 'Positivo' : equivocal ? 'Equivoco' : 'Negativo',
    modifier: `${input.percent}% — HERACLES`, ish: equivocal,
    her2Status: positive ? 'Positivo secondo HERACLES' : equivocal ? 'Da integrare con ISH secondo HERACLES' : 'Non soddisfa i criteri HERACLES di positività',
    action: equivocal ? 'Integrare con ISH secondo HERACLES; verificare distribuzione della popolazione amplificata e area analizzata.' : 'Riportare intensità, percentuale e protocollo HERACLES; non estendere questa classificazione ad altri protocolli CRC.',
  });
}

/** One described staining population. Mixed patterns require integrated morphologic review. */
export function computeScore(input: ScoringInput): ScoringResult {
  if (!input || typeof input !== 'object') throw new TypeError('ScoringInput richiesto');
  const hasOwn = (obj: object, key: unknown) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
  if (!hasOwn(ORGAN_NAMES, input.organ) || !['biopsia', 'resezione'].includes(input.sampleType) ||
      !['assente', 'debole', 'debole_moderata', 'forte'].includes(input.intensity) ||
      !['assente', 'completa', 'incompleta', 'basolaterale'].includes(input.pattern) ||
      !Number.isFinite(input.percent) || input.percent < 0 || input.percent > 100 ||
      [input.cluster5, input.cytoplasmicOnly, input.controlsValid].some(v => typeof v !== 'boolean')) {
    return blocked(input, 'invalid', 'Dati mancanti, valori non ammessi o percentuale fuori dall’intervallo 0–100.');
  }
  if (!input.controlsValid) return blocked(input, 'invalid', 'Controlli tecnici non validi: score non assegnabile.');
  // Incoherent membrane data must never yield a confident score, including cytoplasmic-only cases.
  const absent = input.intensity === 'assente';
  if (absent !== (input.pattern === 'assente') || (input.cytoplasmicOnly && !absent))
    return blocked(input, 'invalid', 'Discordanza tra intensità, membrana e dichiarazione di sola reattività citoplasmatica.');
  if (absent && (input.percent !== 0 || input.cluster5))
    return blocked(input, 'invalid', 'Membrana assente incompatibile con percentuale positiva o cluster reattivo.');
  if (!absent && usesPercent(input.organ, input.sampleType) && input.percent === 0)
    return blocked(input, 'invalid', 'Reattività presente ma percentuale pari a zero.');
  if (!hasOwn(PROTOCOLS, input.organ)) return blocked(input, 'unsupported', 'Per questo organo il motore non dispone di un protocollo verificato. Non si applicano automaticamente i criteri gastrici.');
  if (absent) return result(input, '0', 'Assenza di reattività di membrana.', { modifier: input.cytoplasmicOnly ? 'sola reattività citoplasmatica' : null });
  if (input.organ === 'mammella') return breast(input);
  if (input.organ === 'stomaco') return gastric(input);
  return crc(input);
}
