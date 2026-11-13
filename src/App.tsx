import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, Route, Routes } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Boards from './pages/Boards';
import Visual from './pages/Visual';
import Defects from './pages/Defects';
import Instruments from './pages/Instruments';
import Overview from './pages/Overview';
import Search from './pages/Search';
import Templates from './pages/Templates';
import Measure from './pages/Measure';
import Settings from './pages/Settings';
import { Moon, Sun, Search as SearchIcon, Gauge, Boxes, Settings as Cog, PlusSquare, ClipboardList, Check, Loader2 } from 'lucide-react';
import logo from './logo.png';
import { usePwa } from './pwa';
import { useTheme } from './theme';
import { useSave } from './db';
import Dashboard from './pages/Dashboard';
import NewInspection from './pages/NewInspection';
import Inspections from './pages/Inspections';
import InspectionDetail from './pages/InspectionDetail';

const nav = [
  { to: '/', label: 'Irányítópult', icon: Gauge },
  { to: '/uj', label: 'Új felülvizsgálat', icon: PlusSquare },
  { to: '/felulvizsgalatok', label: 'Felülvizsgálataim', icon: ClipboardList },
  { to: '/katalogus', label: 'Mérési elem katalógus', icon: Boxes },
  { to: '/beallitasok', label: 'Beállítások', icon: Cog },
];

function SaveIndicator() {
  const s = useSave(x => x.s);
  const online = navigator.onLine;
  if (s === 'idle') return null;
  return <span className="flex items-center gap-1 text-sm">
    {s === 'saving' ? <><Loader2 size={16} className="animate-spin" />Mentés folyamatban...</>
      : <><Check size={16} />{online ? 'Mentve.' : 'Offline módban mentve.'}</>}</span>;
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => { const a = () => setOn(true), b = () => setOn(false); addEventListener('online', a); addEventListener('offline', b); return () => { removeEventListener('online', a); removeEventListener('offline', b); }; }, []);
  return on;
}

export default function App() {
  const { mode, set: setTheme } = useTheme(); const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const online = useOnline(); const go = useNavigate();
  useEffect(() => { const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); go('/kereses'); } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [go]); const { needRefresh, update } = usePwa();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex md:w-64 flex-col bg-chrome text-white p-3 gap-1 shrink-0">
        <div className="px-3 py-5 flex flex-col items-center gap-3">
          <img src={logo} alt="VILL-NOVA logó" className="w-28" />
          <span className="text-2xl font-bold tracking-wider text-white">VILL-NOVA</span>
        </div>
        {nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}
          className={({ isActive }) => `flex items-center gap-3 px-3 min-h-12 rounded-md ${isActive ? 'bg-signal text-white font-semibold' : 'hover:bg-white/10'}`}>
          <n.icon size={20} />{n.label}</NavLink>)}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-chrome text-white px-4 min-h-12 flex items-center justify-between md:justify-end">
          <span className="md:hidden flex items-center gap-2 font-bold tracking-wider"><img src={logo} alt="" className="h-8" />VILL-NOVA</span>
          <span className="flex items-center gap-3"><Link to="/kereses" aria-label="Keresés" title="Keresés (/)" className="flex items-center min-h-10 px-2"><SearchIcon size={20} /></Link><button aria-label={dark ? 'Világos téma' : 'Sötét téma'} title={dark ? 'Világos téma' : 'Sötét téma'} className="flex items-center min-h-10 px-2" onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={20} /> : <Moon size={20} />}</button>{!online && <span className="text-sm bg-amber-400 text-graphite rounded px-2">Offline</span>}<SaveIndicator /></span>
        </header>
        {needRefresh && <div className="bg-warnbg border-b border-warn px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="flex-1">Új verzió érhető el. Fejezd be a félbehagyott mérési pont mentését, majd frissíts.</span>
          <button className="btn btn-primary min-h-10" onClick={update}>Frissítés most</button></div>}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/uj" element={<NewInspection />} />
            <Route path="/felulvizsgalatok" element={<Inspections />} />
            <Route path="/beallitasok" element={<Settings />} />
            <Route path="/szovegsablonok" element={<Templates />} />
            <Route path="/kereses" element={<Search />} />
            <Route path="/katalogus" element={<Catalog />} />
            <Route path="/felulvizsgalat/:id/elosztok" element={<Boards />} />
            <Route path="/felulvizsgalat/:id/szemrevetelezes" element={<Visual />} />
            <Route path="/felulvizsgalat/:id/hibak" element={<Defects />} />
            <Route path="/felulvizsgalat/:id/muszerek" element={<Instruments />} />
            <Route path="/felulvizsgalat/:id/attekintes" element={<Overview />} />
            <Route path="/felulvizsgalat/:id/meres" element={<Measure />} />
            <Route path="/felulvizsgalat/:id" element={<InspectionDetail />} />
          </Routes>
        </main>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-chrome text-white grid grid-cols-5">
        {nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}
          className={({ isActive }) => `flex flex-col items-center py-2 text-xs gap-1 ${isActive ? 'text-mint' : ''}`}>
          <n.icon size={22} />{n.label}</NavLink>)}
      </nav>
    </div>
  );
}
