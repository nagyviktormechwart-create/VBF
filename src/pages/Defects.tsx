import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { createDefect, db, deleteDefect, updateDefect, DEFECT_STATUSES, type Defect } from '../db';
import Photos from './Photos';
import { DEFECT_SEVERITY_SUGGESTIONS } from '../doctemplates';

const SC: Record<string, string> = { 'Nyitott': 'bg-bad text-white', 'Javítás alatt': 'bg-amber-400 text-graphite', 'Javítva': 'bg-ok text-white', 'Utóellenőrzés szükséges': 'bg-amber-400 text-graphite', 'Lezárva': 'bg-slate-500 text-white' };

function Txt({ label, value, onCommit, area, date, list, req }: { label: string; value: string; onCommit: (v: string) => void; area?: boolean; date?: boolean; list?: string[]; req?: boolean }) {
  const [v, setV] = useState(value); const [e, setE] = useState(''); const lid = 'dl-' + label;
  const blur = () => { const t = v.trim(); if (req && !t) return setE('Kötelező megadni.'); setE(''); if (t !== value) onCommit(t); };
  return <div className={area ? 'sm:col-span-2' : ''}><label className="lbl">{label}{req && ' *'}</label>
    {area ? <textarea className="inp py-2" rows={2} value={v} onChange={x => setV(x.target.value)} onBlur={blur} />
      : <input className="inp" type={date ? 'date' : 'text'} list={list ? lid : undefined} value={v} onChange={x => setV(x.target.value)} onBlur={blur} />}
    {list && <datalist id={lid}>{list.map(o => <option key={o} value={o} />)}</datalist>}{e && <p className="text-badfg text-sm font-semibold mt-1">{e}</p>}</div>;
}
const Sel = ({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) =>
  <div><label className="lbl">{label}</label><select className="inp" value={value} onChange={e => onChange(e.target.value)}><option value="">Nincs megadva</option>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>;

export default function Defects() {
  const { id = '' } = useParams(); const [sp] = useSearchParams(); const focus = sp.get('h');
  const q = <T,>(f: () => Promise<T[]>) => useLiveQuery(f, [id]) ?? [];
  const defects = q(() => db.defects.where('inspectionId').equals(id).sortBy('seq'));
  const rooms = q(() => db.rooms.where('inspectionId').equals(id).sortBy('order'));
  const boards = q(() => db.boards.where('inspectionId').equals(id).sortBy('order'));
  const circuits = q(() => db.circuits.where('inspectionId').equals(id).sortBy('order'));
  const points = q(() => db.points.where('inspectionId').equals(id).toArray());
  const checks = q(() => db.checks.where('inspectionId').equals(id).sortBy('order'));
  const all = useLiveQuery(() => db.defects.toArray(), []) ?? [];
  const sugg = (k: 'severity' | 'category') => [...new Set([...(k === 'severity' ? DEFECT_SEVERITY_SUGGESTIONS : []), ...all.map(d => d[k]).filter(Boolean)])];
  const [st, setSt] = useState(''); const [newId, setNewId] = useState<string | null>(null);
  const rname = (rid?: string) => rooms.find(r => r.id === rid)?.name;
  const shown = defects.filter(d => !st || d.status === st);

  const card = (d: Defect) => { const set = (patch: Partial<Defect>) => updateDefect(d.id, patch);
    return <details key={d.id} open={d.id === (newId ?? focus)} className="bg-surface border border-line rounded-md">
      <summary className="p-3 min-h-14 flex items-center gap-2 cursor-pointer"><span className="font-bold">{d.code}</span><span className="flex-1 min-w-0 truncate">{d.title || 'Névtelen hiba'}</span>
        {rname(d.roomId) && <span className="text-sm hidden sm:inline">{rname(d.roomId)}</span>}<span className={`text-xs px-2 py-1 rounded ${SC[d.status]}`}>{d.status}</span></summary>
      <div className="p-3 pt-0 grid sm:grid-cols-2 gap-3">
        <Txt label="Hiba megnevezése" req value={d.title} onCommit={v => set({ title: v })} />
        <Txt label="Súlyosság / besorolás (a felülvizsgáló szakmai döntése)" value={d.severity} list={sugg('severity')} onCommit={v => set({ severity: v })} />
        <Txt area label="Részletes leírás" value={d.description} onCommit={v => set({ description: v })} />
        <Txt label="Kategória" value={d.category} list={sugg('category')} onCommit={v => set({ category: v })} />
        <Sel label="Helyiség" value={d.roomId ?? ''} onChange={v => set({ roomId: v || undefined })} opts={rooms.map(r => [r.id, r.name])} />
        <Sel label="Elosztó" value={d.boardId ?? ''} onChange={v => set({ boardId: v || undefined, circuitId: undefined })} opts={boards.map(b => [b.id, b.identifier + (b.name ? ` – ${b.name}` : '')])} />
        <Sel label="Áramkör" value={d.circuitId ?? ''} onChange={v => set({ circuitId: v || undefined })} opts={circuits.filter(c => !d.boardId || c.boardId === d.boardId).map(c => [c.id, c.identifier + (c.name ? ` – ${c.name}` : '')])} />
        <Sel label="Kapcsolódó mérési pont / eredmény" value={d.pointId ?? ''} onChange={v => set({ pointId: v || undefined })} opts={points.map(p => [p.id, `${rname(p.roomId) ?? ''} – ${p.identifier}`])} />
        <Sel label="Kapcsolódó szemrevételezési tétel" value={d.checkId ?? ''} onChange={v => set({ checkId: v || undefined })} opts={checks.map(c => [c.id, `${c.category}: ${c.title}`])} />
        <Txt area label="Javasolt intézkedés" value={d.action} onCommit={v => set({ action: v })} />
        <Sel label="Javítás szükséges" value={d.repairNeeded} onChange={v => set({ repairNeeded: v as Defect['repairNeeded'] })} opts={[['Igen', 'Igen'], ['Nem', 'Nem']]} />
        <div><label className="lbl">Javítás állapota</label><select className="inp" value={d.status} onChange={e => set({ status: e.target.value as Defect['status'] })}>{DEFECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        <Txt date label="Javítás dátuma" value={d.repairDate} onCommit={v => set({ repairDate: v })} />
        <Txt area label="Utóellenőrzés eredménye" value={d.recheck} onCommit={v => set({ recheck: v })} />
        <Txt area label="Megjegyzés" value={d.note} onCommit={v => set({ note: v })} />
        <div className="sm:col-span-2"><div className="lbl">Fényképek</div><Photos inspectionId={id} ownerType="defect" ownerId={d.id} /></div>
        <div className="sm:col-span-2"><button className="btn btn-danger" onClick={() => { if (confirm(`Törlöd a(z) ${d.code} hibát a fényképeivel együtt?`)) deleteDefect(d.id); }}><Trash2 size={18} />Hiba törlése</button></div>
      </div></details>; };

  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Hibák és hiányosságok</h1>
      <button className="btn btn-primary" onClick={async () => setNewId(await createDefect(id))}><Plus size={18} />Új hiba</button></div>
    <div className="flex gap-2 flex-wrap"><button className={`btn min-h-11 ${!st ? 'btn-primary' : ''}`} onClick={() => setSt('')}>Mind ({defects.length})</button>
      {DEFECT_STATUSES.map(s => <button key={s} className={`btn min-h-11 ${st === s ? 'btn-primary' : ''}`} onClick={() => setSt(s)}>{s} ({defects.filter(d => d.status === s).length})</button>)}</div>
    {defects.length === 0 && <p>Még nincs rögzített hiba. Hibát a mérési pontokból és a szemrevételezési tételekből is létrehozhatsz.</p>}
    <div className="space-y-2">{shown.map(card)}</div>
  </div>;
}
