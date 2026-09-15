import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
  RotateCcw,
  FlaskConical,
  ScanSearch,
  ClipboardList,
  Award,
} from 'lucide-react';
import {
  computeScore,
  usesPercent,
  usesCluster,
} from '../lib/scoring';
import type { OrganCode, SampleType, Intensity, MembranePattern, ScoringResult } from '../lib/scoring';
import { fetchOrgans, saveEvaluation } from '../lib/api';
import type { Organ } from '../lib/api';
import ResultCard from './ResultCard';
import { criteria as allCriteria } from '../lib/catalog';

const INTENSITIES: { value: Intensity; label: string; desc: string; swatch: string }[] = [
  { value: 'assente', label: 'Assente', desc: 'Nessuna colorazione di membrana', swatch: 'bg-slate-100 border-slate-300' },
  { value: 'debole', label: 'Tenue / appena percettibile', desc: 'Si vede solo a 40x (faint / barely perceptible)', swatch: 'bg-amber-100 border-amber-300' },
  { value: 'debole_moderata', label: 'Debole-moderata', desc: 'Chiaramente visibile a 10-20x (weak to moderate)', swatch: 'bg-orange-200 border-orange-400' },
  { value: 'forte', label: 'Intensa', desc: 'Evidente a piccolo ingrandimento (strong / intense)', swatch: 'bg-orange-800 border-orange-900' },
];

const PATTERNS: { value: MembranePattern; label: string; desc: string }[] = [
  { value: 'completa', label: 'Completa e circonferenziale', desc: 'Intera membrana (chicken-wire). Requisito di 2+ e 3+ in mammella' },
  { value: 'incompleta', label: 'Incompleta, non laterale', desc: 'Tratti di membrana senza polarita definita. Non qualificante per 2+ e 3+' },
  { value: 'basolaterale', label: 'Basolaterale / laterale', desc: 'Polarita ghiandolare. Valido per 2+ e 3+ nei protocolli gastrico e HERACLES' },
  { value: 'assente', label: 'Assente', desc: 'Nessuna reattivita di membrana' },
];

const STEPS = [
  { n: 1, label: 'Organo', icon: ScanSearch },
  { n: 2, label: 'Campione', icon: FlaskConical },
  { n: 3, label: 'Reperto', icon: ClipboardList },
  { n: 4, label: 'Risultato', icon: Award },
];

function makeCaseCode(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HER2-${new Date().getFullYear()}-${rand}`;
}

export default function Calculator({ onSaved }: { onSaved: () => void }) {
  const [step, setStep] = useState(1);
  const [organs, setOrgans] = useState<Organ[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [organ, setOrgan] = useState<OrganCode | null>(null);
  const [sampleType, setSampleType] = useState<SampleType>('resezione');
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [pattern, setPattern] = useState<MembranePattern | null>(null);
  const [percent, setPercent] = useState(0);
  const [cluster5, setCluster5] = useState(false);
  const [cytoplasmicOnly, setCytoplasmicOnly] = useState(false);
  const [controlsValid, setControlsValid] = useState(true);

  const [caseCode, setCaseCode] = useState(makeCaseCode());
  const [operatorName, setOperatorName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOrgans();
        setOrgans(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Errore di caricamento');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const criteria = allCriteria.filter(c => c.organ_code === organ);

  const result: ScoringResult | null = useMemo(() => {
    if (!organ || !intensity || !pattern) return null;
    return computeScore({ organ, sampleType, intensity, pattern, percent, cluster5, cytoplasmicOnly, controlsValid });
  }, [organ, sampleType, intensity, pattern, percent, cluster5, cytoplasmicOnly, controlsValid]);

  const organObj = organs.find((o) => o.code === organ) || null;
  const showPercent = organ ? usesPercent(organ, sampleType) : false;
  const showCluster = organ ? usesCluster(organ, sampleType) : false;

  const canNext =
    step === 1 ? organ !== null : step === 2 ? true : step === 3 ? intensity !== null && pattern !== null : true;

  const resetAll = () => {
    setStep(1);
    setOrgan(null);
    setSampleType('resezione');
    setIntensity(null);
    setPattern(null);
    setPercent(0);
    setCluster5(false);
    setCytoplasmicOnly(false);
    setControlsValid(true);
    setCaseCode(makeCaseCode());
    setOperatorName('');
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!result || !organ || !organObj || !intensity || !pattern) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveEvaluation({
        case_code: caseCode.trim() || makeCaseCode(),
        organ_code: organ,
        organ_name: organObj.name,
        sample_type: sampleType,
        intensity,
        pattern,
        percent: showPercent ? percent : 0,
        cluster5: showCluster ? cluster5 : false,
        controls_valid: controlsValid,
        score: result.score,
        result_snapshot: result,
        algorithm_version: "0.2.1",
        cytoplasmic_only: cytoplasmicOnly,
        modifier: result.modifier,
        category: result.category,
        her2_status: result.her2Status,
        interpretation: result.interpretation,
        action_text: result.action,
        therapy: result.therapy,
        notes: result.notes,
        operator: operatorName.trim() || null,
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          Caricamento organi e criteri...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
        Impossibile caricare i dati: {loadError}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.n;
          const done = step > s.n;
          return (
            <button
              key={s.n}
              onClick={() => {if(done){setStep(s.n);setSaved(false);}}}
              className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-bold sm:text-sm ${
                active
                  ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-200'
                  : done
                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              <span className="hidden md:inline">
                {s.n}. {s.label}
              </span>
              <span className="md:hidden">{s.n}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-extrabold text-slate-900">1. Seleziona l&apos;organo / sede tumorale</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Quattro sedi implementate (uroteliale: criteri gastrici dichiarati, con TURB trattata come campione resettivo). Gli altri organi richiedono un algoritmo dedicato e non sono selezionabili.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {organs.map((o) => {
                const selected = organ === o.code;
                return (
                  <button
                    key={o.code}
                    disabled={!['mammella', 'stomaco', 'colonretto', 'vescica'].includes(o.code)}
                    onClick={() => { setOrgan(o.code as OrganCode); setSampleType('resezione'); setIntensity(null); setPattern(null); setPercent(0); setCluster5(false); setSaved(false); }}
                    className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? 'border-teal-600 bg-teal-50 shadow-md shadow-teal-100'
                        : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white"
                      style={{ backgroundColor: o.color }}
                    >
                      {o.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        {o.name}
                        {selected && <Check className="h-4 w-4 text-teal-600" />}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{o.histology}</span>
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {o.guideline}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 2 && organ && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-extrabold text-slate-900">2. Tipo di campione</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              {organObj?.name}: le soglie quantitative cambiano con la quantità di tumore valutabile. Il criterio del cluster nasce dall&apos;inaffidabilità del denominatore su pinza endoscopica, non dalla via di prelievo.
            </p>
            <div className={`grid gap-3 ${organ === 'vescica' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <button
                onClick={() => { setSampleType('biopsia'); setPercent(0); setCluster5(false); setSaved(false); }}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  sampleType === 'biopsia'
                    ? 'border-teal-600 bg-teal-50 shadow-md shadow-teal-100'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                  Biopsia / frustoli
                  {sampleType === 'biopsia' && <Check className="h-4 w-4 text-teal-600" />}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {organ === 'vescica' ? 'Pinza endoscopica / ureteroscopica: criterio del cluster di ≥5 cellule coesive, regola gastrica dichiarata.' : organ === 'mammella' || organ === 'colonretto'
                    ? 'Stesse soglie percentuali del pezzo chirurgico (>10% mammella; HERACLES nel colon).'
                    : 'Criterio del cluster: basta un cluster di ≥5 cellule coesive colorate (nessuna %).'}
                </span>
              </button>
              {organ === 'vescica' && (
                <button
                  onClick={() => { setSampleType('turb'); setPercent(0); setCluster5(false); setSaved(false); }}
                  className={`rounded-xl border-2 p-5 text-left transition ${
                    sampleType === 'turb'
                      ? 'border-teal-600 bg-teal-50 shadow-md shadow-teal-100'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                    TURB
                    {sampleType === 'turb' && <Check className="h-4 w-4 text-teal-600" />}
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Campione resettivo frammentato: soglia ≥10%, come il pezzo operatorio. Il tumore valutabile è abbondante e la percentuale è misurabile.
                  </span>
                </button>
              )}
              <button
                onClick={() => { setSampleType('resezione'); setPercent(0); setCluster5(false); setSaved(false); }}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  sampleType === 'resezione'
                    ? 'border-teal-600 bg-teal-50 shadow-md shadow-teal-100'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                  Pezzo chirurgico
                  {sampleType === 'resezione' && <Check className="h-4 w-4 text-teal-600" />}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {organ === 'mammella'
                    ? 'Soglia >10% delle cellule tumorali invasive.'
                    : organ === 'colonretto'
                      ? 'Soglie HERACLES: ≥50% / 10-50% / <10%.'
                      : 'Soglia ≥10% delle cellule tumorali.'}
                </span>
              </button>
            </div>
            {(organ === 'stomaco' || organ === 'vescica') && sampleType === 'biopsia' && (
              <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <Info className="h-5 w-5 shrink-0" />
                <p>
                  In biopsia conta solo la presenza di un cluster di ≥5 cellule coesive con reattività di membrana:
                  la percentuale non è richiesta. Valutare almeno 5 frustoli per l&apos;eterogeneità.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {step === 3 && organ && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 className="text-xl font-extrabold text-slate-900">3. Reperto microscopico</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Descrivi intensità, pattern di membrana ed estensione della colorazione nelle cellule tumorali. Intensità e pattern usano il vocabolario ASCO/CAP: se una combinazione non è testualmente prevista dalla guideline, lo score viene comunque assegnato e il criterio applicato è dichiarato nel risultato.
            </p>

            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Intensità di membrana</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTENSITIES.map((it) => (
                <button
                  key={it.value}
                  onClick={() => { setIntensity(it.value); setSaved(false); if (it.value === 'assente') {setPattern('assente');setPercent(0);setCluster5(false);} else {setCytoplasmicOnly(false);} }}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                    intensity === it.value ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <span className={`h-8 w-8 shrink-0 rounded-full border-2 ${it.swatch}`} />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{it.label}</span>
                    <span className="block text-xs text-slate-500">{it.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-600">
              Pattern di membrana
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {PATTERNS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPattern(p.value)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    pattern === p.value ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <span className="block text-sm font-bold text-slate-900">{p.label}</span>
                  <span className="block text-xs text-slate-500">{p.desc}</span>
                </button>
              ))}
            </div>

            {showPercent && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                    % cellule tumorali colorate
                  </h3>
                  <span className="rounded-lg bg-teal-600 px-3 py-1 text-lg font-extrabold text-white">{percent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="her2-range w-full"
                />
                <div className="relative mt-1 h-5 text-[11px] font-semibold text-slate-500">
                  <span className="absolute left-0">0</span>
                  <span className="absolute text-teal-700" style={{ left: '10%' }}>
                    ▲ 10%
                  </span>
                  <span className="absolute text-teal-700" style={{ left: '50%' }}>
                    ▲ 50%
                  </span>
                  <span className="absolute right-0">100</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[0, 5, 10, 30, 50, 80, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => setPercent(v)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        percent === v ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-400'
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCluster && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                  Cluster bioptico
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setCluster5(true)}
                    className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
                      cluster5 ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Sì — presente cluster di ≥5 cellule coesive colorate
                  </button>
                  <button
                    onClick={() => setCluster5(false)}
                    className={`rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
                      !cluster5 ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    No — nessun cluster ≥5 cellule / cellule isolate
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={cytoplasmicOnly}
                  onChange={(e) => {setCytoplasmicOnly(e.target.checked);setSaved(false);if(e.target.checked){setIntensity('assente');setPattern('assente');setPercent(0);setCluster5(false);}}}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <span>
                  <span className="font-bold text-slate-900">Solo colorazione citoplasmatica / aspecifica</span>
                  <span className="block text-slate-500">
                    Nessuna reattività di membrana: non valutabile come positiva in alcun algoritmo.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={controlsValid}
                  onChange={(e) => setControlsValid(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <span>
                  <span className="font-bold text-slate-900">Controlli tecnici validi</span>
                  <span className="block text-slate-500">
                    Fissazione adeguata, controlli positivi/negativi on-slide e controllo interno conformi.
                  </span>
                </span>
              </label>
            </div>
          </motion.div>
        )}

        {step === 4 && organ && result && organObj && (
          <motion.div key="s4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <ResultCard
              result={result}
              organName={organObj.name}
              sampleType={sampleType}
              caseCode={caseCode}
            />

            {criteria.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
                  Criteri applicati — {organObj.name}
                </h3>
                <div className="space-y-2">
                  {criteria
                    .filter(
                      (c) =>
                        c.sample_type === 'entrambi' ||
                        (sampleType === 'biopsia' && c.sample_type === 'biopsia') ||
                        (sampleType !== 'biopsia' && c.sample_type === 'resezione')
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-3 text-sm ${c.score === result.score ? 'border-teal-500 bg-teal-50' : 'border-slate-100 bg-slate-50'}`}
                      >
                        <span className="font-extrabold text-slate-900">Score {c.score}</span>
                        <span className="text-slate-600"> — {c.definition}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Archivia nel browser</h3><p className="mb-3 text-sm text-slate-500">I dati restano su questo dispositivo e possono andare persi cancellando i dati del browser. Usa codici di prova, senza dati identificativi.</p>
              <div className={`grid gap-3 ${organ === 'vescica' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Codice caso</span>
                  <input
                    value={caseCode}
                    onChange={(e) => setCaseCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Refertante (facoltativo)</span>
                  <input
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Es. Dott.ssa Rossi"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </label>
              </div>
              {saveError && (
                <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{saveError}</p>
              )}
              {saved ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                  <Check className="h-5 w-5" /> Valutazione archiviata nello storico di questo browser.
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-4 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-teal-200 transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? 'Salvataggio...' : 'Salva valutazione'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={() => {setStep(step - 1);setSaved(false);}}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-400"
            >
              <ChevronLeft className="h-4 w-4" /> Indietro
            </button>
          )}
          <button
            onClick={resetAll}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-500 hover:border-rose-300 hover:text-rose-600"
          >
            <RotateCcw className="h-4 w-4" /> Ricomincia
          </button>
        </div>
        {step < 4 && (
          <button
            onClick={() => canNext && setStep(step + 1)}
            disabled={!canNext}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Avanti <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
