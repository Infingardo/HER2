import { useEffect, useState } from 'react';
import Header from './components/Header';
import type { TabKey } from './components/Header';
import Calculator from './components/Calculator';
import Guidelines from './components/Guidelines';
import History from './components/History';
import { fetchOrgans, fetchCriteria, fetchGuidelines } from './lib/api';
import { ShieldAlert, Dna, Microscope, Scale } from 'lucide-react';

export default function App() {
  const [tab, setTab] = useState<TabKey>('calcolatore');
  const [historyKey, setHistoryKey] = useState(0);
  const [stats, setStats] = useState({ organs: 0, criteria: 0, guidelines: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [o, c, g] = await Promise.all([fetchOrgans(), fetchCriteria(), fetchGuidelines()]);
        setStats({ organs: o.filter(x => ["mammella","stomaco","colonretto"].includes(x.code)).length, criteria: c.length, guidelines: g.length });
      } catch {
        /* statistiche non critiche */
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Header tab={tab} onTab={setTab} />

      <section className="relative overflow-hidden bg-slate-900">
        <img
          src={`${import.meta.env.BASE_URL}images/hero.jpg`}
          alt="Laboratorio di anatomia patologica"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/95 via-teal-900/80 to-cyan-900/60" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-100 ring-1 ring-white/20">
              <Dna className="h-3.5 w-3.5" /> ASCO/CAP 2023 · ToGA · HERACLES
            </p>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              Score HER2 immunoistochimico
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-teal-50/90">
              Descrivi il reperto e applica un protocollo esplicito per mammella, stomaco o colon-retto. I risultati non valutabili e i pattern ambigui vengono segnalati senza assegnare uno score negativo.

            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setTab('calcolatore')}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-teal-800 shadow-lg transition hover:bg-teal-50"
              >
                <Microscope className="h-4 w-4" /> Avvia il calcolatore
              </button>
              <button
                onClick={() => setTab('linee-guida')}
                className="rounded-xl px-5 py-2.5 text-sm font-extrabold text-white ring-1 ring-white/40 transition hover:bg-white/10"
              >
                Consulta le linee guida
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-5 text-white">
              <div>
                <p className="text-2xl font-black">{stats.organs || '—'}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">Organi / algoritmi</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.criteria || '—'}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">Criteri di score</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.guidelines || '—'}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">Schede guideline</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'calcolatore' && <Calculator onSaved={() => setHistoryKey((k) => k + 1)} />}
        {tab === 'linee-guida' && <Guidelines />}
        {tab === 'storico' && <History refreshKey={historyKey} />}

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Scale className="mb-2 h-5 w-5 text-teal-700" />
            <p className="text-sm font-bold text-slate-900">Algoritmi dedicati</p>
            <p className="mt-1 text-sm text-slate-500">
              Mammella (ASCO/CAP 2023), stomaco (CAP/ASCP/ASCO), colon-retto (HERACLES). Altri organi: protocollo da implementare.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Dna className="mb-2 h-5 w-5 text-teal-700" />
            <p className="text-sm font-bold text-slate-900">Bassa espressione</p>
            <p className="mt-1 text-sm text-slate-500">
              Distinzione 0 vs 1+ e segnalazione dello staining in IHC 0 (DESTINY-Breast04 e Breast06).
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <ShieldAlert className="mb-2 h-5 w-5 text-teal-700" />
            <p className="text-sm font-bold text-slate-900">Uso professionale</p>
            <p className="mt-1 text-sm text-slate-500">
              Prototipo didattico: verifica software eseguita; validazione clinica ancora necessaria.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-slate-500">
          <p className="font-bold text-slate-700">HER2-Score IHC — calcolatore didattico e di supporto decisionale.</p>
          <p className="mt-1">
            Protocolli versionati, senza indicazioni farmacologiche automatiche. Non analizza immagini: interpreta i dati inseriti. Storico conservato soltanto nel browser corrente.

          </p>
        </div>
      </footer>
    </div>
  );
}
