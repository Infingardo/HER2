import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, BookOpen, Table2 } from 'lucide-react';
import { fetchOrgans, fetchCriteria, fetchGuidelines } from '../lib/api';
import type { Organ, Criterion, Guideline } from '../lib/api';
import { PANTUMOR_ORGANS } from '../lib/scoring';

const SCORE_ORDER = ['0', '1+', '2+', '3+'];

function guidelineVisible(g: Guideline, organCode: string): boolean {
  if (organCode === 'tutti') return true;
  if (g.organ_code === organCode) return true;
  if (g.organ_code === 'generale') return true;
  if (g.organ_code === 'pantumor' && (PANTUMOR_ORGANS as string[]).includes(organCode)) return true;
  return false;
}

function sampleLabel(s: string): string {
  if (s === 'biopsia') return 'Biopsia';
  if (s === 'resezione') return 'Pezzo chirurgico';
  return 'Biopsia e pezzo chirurgico';
}

export default function Guidelines() {
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('tutti');

  useEffect(() => {
    (async () => {
      try {
        const [o, c, g] = await Promise.all([fetchOrgans(), fetchCriteria(), fetchGuidelines()]);
        setOrgans(o);
        setCriteria(c);
        setGuidelines(g);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore di caricamento');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredCriteria = useMemo(() => {
    const list = selected === 'tutti' ? criteria : criteria.filter((c) => c.organ_code === selected);
    return [...list].sort((a, b) => SCORE_ORDER.indexOf(a.score) - SCORE_ORDER.indexOf(b.score));
  }, [criteria, selected]);

  const filteredGuidelines = useMemo(
    () => guidelines.filter((g) => guidelineVisible(g, selected)),
    [guidelines, selected]
  );

  const organName = (code: string) => organs.find((o) => o.code === code)?.name || code;

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          Caricamento linee guida...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">Impossibile caricare i dati: {error}</div>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setSelected('tutti')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${selected === 'tutti' ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-400'}`}
        >
          Tutti gli organi
        </button>
        {organs.map((o) => (
          <button
            key={o.code}
            onClick={() => setSelected(o.code)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${selected === o.code ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-400'}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.color }} />
            {o.name}
          </button>
        ))}
      </div>

      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <Table2 className="h-4 w-4 text-teal-700" />
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
            Criteri di score IHC {selected !== 'tutti' ? `— ${organName(selected)}` : ''}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Score</th>
                {selected === 'tutti' && <th className="px-3 py-3">Organo</th>}
                <th className="px-3 py-3">Campione</th>
                <th className="px-3 py-3">Definizione</th>
                <th className="px-3 py-3">Interpretazione</th>
                <th className="px-3 py-3">Azione</th>
              </tr>
            </thead>
            <tbody>
              {filteredCriteria.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 align-top hover:bg-teal-50/40">
                  <td className="px-5 py-3">
                    <span className="inline-block min-w-10 rounded-lg bg-slate-900 px-2.5 py-1 text-center text-sm font-black text-white">
                      {c.score}
                    </span>
                  </td>
                  {selected === 'tutti' && <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{organName(c.organ_code)}</td>}
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{sampleLabel(c.sample_type)}</td>
                  <td className="px-3 py-3 text-slate-700">{c.definition}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{c.interpretation}</td>
                  <td className="px-3 py-3 text-slate-600">{c.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-teal-700" />
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Raccomandazioni internazionali</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filteredGuidelines.map((g) => (
          <article key={g.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold text-teal-800">{g.organization}</span>
              {g.year && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{g.year}</span>
              )}
              {selected === 'tutti' && g.organ_code !== 'generale' && g.organ_code !== 'pantumor' && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">{organName(g.organ_code)}</span>
              )}
              {(g.organ_code === 'generale' || g.organ_code === 'pantumor') && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">Pan-tumor</span>
              )}
            </div>
            <h3 className="text-base font-extrabold leading-snug text-slate-900">{g.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{g.summary}</p>
            {g.key_points && g.key_points.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {g.key_points.map((k, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    {k}
                  </li>
                ))}
              </ul>
            )}
            <a
              href={g.reference_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-900"
            >
              Fonte ufficiale <ExternalLink className="h-4 w-4" />
            </a>
          </article>
        ))}
      </div>
      {filteredGuidelines.length === 0 && (
        <p className="rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-500">
          Nessuna scheda per questo filtro.
        </p>
      )}
    </div>
  );
}
