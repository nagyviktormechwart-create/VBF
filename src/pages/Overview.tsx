import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Camera, ChevronDown, ChevronRight } from 'lucide-react';
import { db, RESULTS } from '../db';
import { EMPTY_FILTERS, filterPoints, filtersActive, isComplete, missingCount, NO_RESULT, stats, type Filters } from '../overview';

const COLOR: Record<string, string> = { 'Megfelelő': 'bg-ok text-white', 'Nem megfelelő': 'bg-bad text-white', 'Nem értékelhető': 'bg-slate-400 text-white', 'További vizsgálat szükséges': 'bg-amber-400 text-graphite', [NO_RESULT]: 'bg-steel text-ink border border-line' };
const PAGE = 100;

export default function Overview() {
  const { id = '' } = useParams(); const nav = useNavigate();
  const rooms = useLiveQuery(() => db.rooms.where('inspectionId').equals(id).sortBy('order'), [id]);
  const points = useLiveQuery(() => db.points.where('inspectionId').equals(id).toArray(), [id]);
  const boards = useLiveQuery(() => db.boards.where('inspectionId').equals(id).toArray(), [id]) ?? [];
  const circuits = useLiveQuery(() => db.circuits.where('inspectionId').equals(id).toArray(), [id]) ?? [];
  const defects = useLiveQuery(() => db.defects.where('inspectionId').equals(id).toArray(), [id]) ?? [];
  const photos = useLiveQuery(async () => { const m: Record<string, number> = {}; (await db.photos.where('inspectionId').equals(id).toArray()).forEach(x => { if (x.ownerType === 'point') m[x.ownerId] = (m[x.ownerId] ?? 0) + 1; }); return m; }, [id]) ?? {};
  const [f, setF] = useState<Filters>(EMPTY_FILTERS); const [open, setOpen] = useState<Record<string, boolean>>({}); const [shown, setShown] = useState<Record<string, number>>({});

  const all = useMemo(() => [...(points ?? [])].sort((a, b) => a.createdAt - b.createdAt), [points]);
  const filtered = useMemo(() => filterPoints(all, f), [all, f]);
  const st = useMemo(() => stats(all), [all]);
  const elements = useMemo(() => [...new Set(all.map(p => p.elementName))].sort((a, b) => a.localeCompare(b, 'hu')), [all]);
  const byRoom = useMemo(() => { const m = new Map<string, typeof all>(); filtered.forEach(p => m.set(p.roomId, [...(m.get(p.roomId) ?? []), p])); return m; }, [filtered]);
  const bm = new Map(boards.map(b => [b.id, b.identifier])); const cm = new Map(circuits.map(c => [c.id, c.identifier]));
  if (!rooms || !points) return <p>Betöltés...</p>;
  const active = filtersActive(f);
  const isOpen = (rid: string) => open[rid] ?? (active || all.length <= 300);
  const set = (p: Partial<Filters>) => setF({ ...f, ...p });
  const roomStat = (rid: string) => stats(all.filter(p => p.roomId === rid));

  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Áttekintés</h1>
      <Link to={`/felulvizsgalat/${id}/meres`} className="btn btn-primary">Mérés folytatása</Link></div>

    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
      {[['Mérési pont', st.total], ['Kitöltött', `${st.complete} (${st.pct}%)`], ['Hiányos', st.incomplete], ['Nem megfelelő', st.byResult['Nem megfelelő'] ?? 0], ['Nincs értékelve', st.byResult[NO_RESULT] ?? 0]]
        .map(([l, v]) => <div key={l} className="bg-surface border border-line rounded-md p-2"><div className="text-2xl font-bold">{v}</div>{l}</div>)}</div>
    <div className="h-3 bg-surface border border-line rounded-full overflow-hidden" aria-label={`${st.pct}% kitöltött`}><div className="h-full bg-ok" style={{ width: st.pct + '%' }} /></div>
    <p className="text-xs">Kitöltött: van minősítés, és nincs hiányzó mérési érték. A „nem végezhető” és „nem alkalmazható” mező nem számít hiányzónak.</p>

    <section className="bg-surface border border-line rounded-md p-3 grid sm:grid-cols-4 gap-2 items-end">
      <div><label className="lbl">Helyiség</label><select className="inp" value={f.room} onChange={e => set({ room: e.target.value })}><option value="">Mind</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      <div><label className="lbl">Elemtípus</label><select className="inp" value={f.element} onChange={e => set({ element: e.target.value })}><option value="">Mind</option>{elements.map(x => <option key={x}>{x}</option>)}</select></div>
      <div><label className="lbl">Minősítés</label><select className="inp" value={f.result} onChange={e => set({ result: e.target.value })}><option value="">Mind</option>{[...RESULTS, NO_RESULT].map(x => <option key={x}>{x}</option>)}</select></div>
      <div><label className="lbl">Keresés azonosítóra</label><input className="inp" value={f.q} onChange={e => set({ q: e.target.value })} /></div>
      <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
        <button className={`btn min-h-11 ${f.incomplete ? 'btn-primary' : ''}`} aria-pressed={f.incomplete} onClick={() => set({ incomplete: !f.incomplete })}>Csak hiányos rekordok</button>
        {active && <button className="btn min-h-11" onClick={() => setF(EMPTY_FILTERS)}>Szűrők törlése</button>}
        <span className="flex-1" /><span className="text-sm">{filtered.length} találat</span>
        <button className="btn min-h-11" onClick={() => setOpen(Object.fromEntries(rooms.map(r => [r.id, true])))}>Mind lenyit</button>
        <button className="btn min-h-11" onClick={() => setOpen(Object.fromEntries(rooms.map(r => [r.id, false])))}>Mind összezár</button></div>
    </section>

    {all.length === 0 && <p>Ebben a felülvizsgálatban még nincs mérési pont.</p>}
    {rooms.map(r => { const list = byRoom.get(r.id) ?? []; if (active && !list.length) return null; const rs = roomStat(r.id); const o = isOpen(r.id); const lim = shown[r.id] ?? PAGE;
      return <section key={r.id} className="bg-surface border border-line rounded-md">
        <button className="w-full text-left p-3 min-h-14 flex items-center gap-2" aria-expanded={o} onClick={() => setOpen({ ...open, [r.id]: !o })}>
          {o ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <span className="font-bold flex-1 min-w-0 truncate">{r.name}</span>
          <span className="text-sm">{active ? `${list.length} / ` : ''}{rs.total} pont · {rs.complete} kitöltött ({rs.pct}%)</span>
          <span className="hidden sm:block w-24 h-2 bg-steel rounded-full overflow-hidden"><span className="block h-full bg-ok" style={{ width: rs.pct + '%' }} /></span></button>
        {o && <ul className="divide-y divide-line border-t border-line">
          {list.slice(0, lim).map(p => { const miss = missingCount(p); const res = p.result || NO_RESULT; const dcs = defects.filter(d => d.pointId === p.id).map(d => d.code);
            const where = [bm.get(p.boardId ?? ''), cm.get(p.circuitId ?? '')].filter(Boolean).join(' / ');
            const vals = p.values.filter(v => v.value !== null).slice(0, 3).map(v => `${v.label}: ${v.value}${v.unit ? ' ' + v.unit : ''}`).join(' · ');
            return <li key={p.id}><button className="w-full text-left p-3 min-h-14 flex items-center gap-3 hover:bg-steel" onClick={() => nav(`/felulvizsgalat/${id}/meres?h=${p.roomId}&e=${p.id}`)}>
              <div className="flex-1 min-w-0"><div className="font-semibold truncate">{p.identifier}</div>
                <div className="text-xs truncate">{[p.elementName, where, vals].filter(Boolean).join(' · ') || 'Nincs mért érték'}</div>
                {(miss > 0 || dcs.length > 0 || photos[p.id]) && <div className="text-xs flex flex-wrap gap-2 mt-0.5">
                  {miss > 0 && <span className="text-warnfg font-semibold flex items-center gap-1"><AlertTriangle size={12} />{miss} hiányzó érték</span>}
                  {dcs.length > 0 && <span className="text-badfg font-semibold">{dcs.join(', ')}</span>}
                  {photos[p.id] > 0 && <span className="flex items-center gap-1"><Camera size={12} />{photos[p.id]}</span>}</div>}</div>
              {!isComplete(p) && <span className="text-xs text-warnfg hidden sm:block">hiányos</span>}
              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${COLOR[res]}`}>{res}</span></button></li>; })}
          {list.length > lim && <li className="p-2"><button className="btn w-full" onClick={() => setShown({ ...shown, [r.id]: lim + PAGE })}>További {Math.min(PAGE, list.length - lim)} megjelenítése ({list.length - lim} van hátra)</button></li>}
          {list.length === 0 && <li className="p-3 text-sm">Nincs mérési pont ebben a helyiségben.</li>}
        </ul>}
      </section>; })}
  </div>;
}
