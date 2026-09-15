import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Download, X, Eye, Inbox } from 'lucide-react';
import { fetchEvaluations, deleteEvaluation, fetchOrgans, sampleTypeLabel } from '../lib/api';
import type { Evaluation, Organ } from '../lib/api';
import type { ScoringResult } from '../lib/scoring';
import ResultCard from './ResultCard';

function evaluationToResult(e: Evaluation): ScoringResult {
  return e.result_snapshot;

}

const CATEGORY_BADGE: Record<string, string> = {
  Positivo: 'bg-teal-100 text-teal-800 ring-teal-200',
  Equivoco: 'bg-amber-100 text-amber-800 ring-amber-200',
  Negativo: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function History({ refreshKey }: { refreshKey: number }) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOrgan, setFilterOrgan] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Evaluation | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evals, o] = await Promise.all([
        fetchEvaluations({
          organ: filterOrgan || undefined,
          category: filterCategory || undefined,
          q: query.trim() || undefined,
        }),
        fetchOrgans(),
      ]);
      setEvaluations(evals);
      setOrgans(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([fetchEvaluations(), fetchOrgans()]).then(([rows, o]) => {
      if(active){setEvaluations(rows);setOrgans(o);setLoading(false);}
    }).catch(e => {if(active){setError(String(e));setLoading(false);}});
    return () => {active = false;};
  }, [refreshKey]);

  const filtered = useMemo(() => evaluations, [evaluations]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminare definitivamente questa valutazione?')) return;
    setDeleting(id);
    try {
      await deleteEvaluation(id);
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Eliminazione non riuscita');
    } finally {
      setDeleting(null);
    }
  };

  const exportCSV = () => {
    const header = 'id;codice_caso;data;organo;campione;intensita;pattern;percentuale;cluster5;controlli;score;categoria;her2_status;refertante';
    const rows = filtered.map((e) =>
      [
        e.id,
        e.case_code,
        new Date(e.created_at).toLocaleString('it-IT'),
        e.organ_name,
        sampleTypeLabel(e.sample_type),
        e.intensity,
        e.pattern,
        e.percent,
        e.cluster5 ? 'si' : 'no',
        e.controls_valid ? 'validi' : 'non validi',
        `${e.score ?? '—'}${e.modifier ? ` ${e.modifier}` : ''}`,
        e.category,
        e.her2_status || '',
        e.operator || '',
      ]
        .map((v) => `"${String(v).replace(/^[=+@-]/, c => "'" + c).replace(/"/g, '""')}"`)
        .join(';')
    );
    const blob = new Blob(['\uFEFF' + header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `her2-valutazioni-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Cerca per codice caso..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <select
          value={filterOrgan}
          onChange={(e) => setFilterOrgan(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="">Tutti gli organi</option>
          {organs.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="">Tutte le categorie</option>
          <option value="Positivo">Positivo</option>
          <option value="Equivoco">Equivoco</option>
          <option value="Negativo">Negativo</option><option value="Non valutabile">Non valutabile</option><option value="Da revisionare">Da revisionare</option>
        </select>
        <button
          onClick={load}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
        >
          Filtra
        </button>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:border-teal-400 hover:text-teal-700 disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            Caricamento storico...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
          Impossibile caricare lo storico: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-bold text-slate-700">Nessuna valutazione archiviata</p>
          <p className="mt-1 text-sm text-slate-500">Completa il calcolatore e salva il primo caso.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Caso</th>
                  <th className="px-3 py-3">Organo</th>
                  <th className="px-3 py-3">Campione</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Categoria</th>
                  <th className="px-3 py-3">Stato HER2</th>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-teal-50/40">
                    <td className="px-4 py-3 font-bold text-slate-900">{e.case_code}</td>
                    <td className="px-3 py-3 text-slate-700">{e.organ_name}</td>
                    <td className="px-3 py-3 text-slate-500">{sampleTypeLabel(e.sample_type)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block min-w-10 rounded-lg bg-slate-900 px-2 py-0.5 text-center text-sm font-black text-white">
                        {e.score ?? '—'}
                      </span>
                      {e.modifier && <span className="ml-1 text-xs text-slate-500">{e.modifier}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${CATEGORY_BADGE[e.category] || CATEGORY_BADGE.Negativo}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{e.her2_status || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                      {new Date(e.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSelected(e)}
                          title="Visualizza referto"
                          className="rounded-lg p-2 text-teal-700 hover:bg-teal-100"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deleting === e.id}
                          title="Elimina"
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl">
            <div className="no-print mb-3 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow hover:text-slate-900"
              >
                <X className="h-4 w-4" /> Chiudi
              </button>
            </div>
            <ResultCard
              result={evaluationToResult(selected)}
              organName={selected.organ_name}
              sampleType={selected.sample_type}
              caseCode={selected.case_code}
              createdAt={selected.created_at}
              operator={selected.operator}
            />
          </div>
        </div>
      )}
    </div>
  );
}
