import { Printer, AlertTriangle, Syringe, ArrowRight, FileText, FlaskConical } from 'lucide-react';
import type { ScoringResult } from '../lib/scoring';
import type { SampleType } from '../lib/scoring';
import { sampleTypeLabel } from '../lib/api';

interface Props {
  result: ScoringResult;
  organName: string;
  sampleType: SampleType | string;
  caseCode?: string;
  createdAt?: string;
  operator?: string | null;
}

const CATEGORY_STYLES: Record<string, string> = {
  Positivo: 'bg-teal-600 text-white',
  Equivoco: 'bg-amber-500 text-white',
  Negativo: 'bg-slate-600 text-white',
};

export default function ResultCard({ result, organName, sampleType, caseCode, createdAt, operator }: Props) {
  return (
    <div id="print-report" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-teal-700 to-cyan-700 px-5 py-4 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal-100">Valutazione HER2 immunoistochimica</p>
            <h2 className="text-xl font-extrabold sm:text-2xl">
              {organName} · {sampleTypeLabel(sampleType)}
            </h2>
            <p className="mt-0.5 text-xs text-teal-100">
              {caseCode ? `Caso ${caseCode}` : 'Nuova valutazione'}
              {createdAt ? ` · ${new Date(createdAt).toLocaleString('it-IT')}` : ''}
              {operator ? ` · ${operator}` : ''}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25"
          >
            <Printer className="h-4 w-4" /> Stampa
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-8"><p className="mb-4 text-sm text-slate-600">Protocollo: {result.protocol ?? "Da specificare"} · versione 0.2.0</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg sm:h-28 sm:w-28">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score IHC</span>
            <span className="text-4xl font-black sm:text-5xl">{result.score ?? '—'}</span>
            {result.modifier && <span className="px-1 text-center text-[10px] font-semibold text-slate-300">{result.modifier}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide ${CATEGORY_STYLES[result.category] || 'bg-amber-100 text-amber-900'}`}>
              {result.category}
            </span>
            {result.her2Status && (
              <span className="ml-2 inline-block rounded-full bg-violet-100 px-4 py-1.5 text-sm font-extrabold text-violet-800 ring-1 ring-violet-200">
                {result.her2Status}
              </span>
            )}
            {result.her2StatusDetail && <p className="mt-2 text-sm text-slate-600">{result.her2StatusDetail}</p>}
          </div>
        </div>

        {result.technicalWarning && (
          <div className="mt-4 flex gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              Score non assegnato. Verificare i dati inseriti e la validità tecnica prima di procedere.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <FlaskConical className="h-4 w-4" /> Reperto osservato
          </p>
          <p>{result.observed}</p>
        </div>

        <div className="mt-4">
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <FileText className="h-4 w-4" /> Interpretazione
          </p>
          <p className="text-[15px] font-medium leading-relaxed text-slate-800">{result.interpretation}</p>
        </div>

        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-700">
            <ArrowRight className="h-4 w-4" /> Condotta raccomandata {result.ish && '· ISH riflessa'}
          </p>
          <p className="text-[15px] font-semibold leading-relaxed text-teal-950">{result.action}</p>
        </div>

        {result.therapy && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
              <Syringe className="h-4 w-4" /> Implicazioni terapeutiche
            </p>
            <p className="text-[15px] font-semibold leading-relaxed text-violet-950">{result.therapy}</p>
          </div>
        )}

        {result.notes.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Note metodologiche</p>
            <ul className="space-y-1.5">
              {result.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
          Supporto decisionale per patologi e oncologi — verificare sempre il testo originale delle linee guida e i
          protocolli del laboratorio. Il giudizio finale spetta al patologo refertante.
        </p>
      </div>
    </div>
  );
}
