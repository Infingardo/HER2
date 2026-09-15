import { Microscope, Calculator, BookOpen, History } from 'lucide-react';

export type TabKey = 'calcolatore' | 'linee-guida' | 'storico';

interface Props {
  tab: TabKey;
  onTab: (t: TabKey) => void;
}

const ITEMS: { key: TabKey; label: string; icon: typeof Calculator }[] = [
  { key: 'calcolatore', label: 'Calcolatore', icon: Calculator },
  { key: 'linee-guida', label: 'Linee guida', icon: BookOpen },
  { key: 'storico', label: 'Storico valutazioni', icon: History },
];

export default function Header({ tab, onTab }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-teal-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={() => onTab('calcolatore')} className="flex items-center gap-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-200">
            <Microscope className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-tight tracking-tight text-slate-900">
              HER2-Score <span className="text-teal-600">IHC</span>
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-widest text-slate-500">
              Calcolatore immunoistochimico
            </span>
          </span>
        </button>
        <nav className="ml-auto flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = tab === it.key;
            return (
              <button
                key={it.key}
                onClick={() => onTab(it.key)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                  active ? 'bg-white text-teal-700 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{it.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
