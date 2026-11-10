import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { BUILDING_TYPES, createInspection, db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

const schema = z.object({
  name: z.string().trim().min(1, 'Add meg a felülvizsgálat nevét.'),
  property: z.string().trim(), address: z.string().trim().min(1, 'Add meg az ingatlan címét.'),
  buildingType: z.string(), client: z.string().trim(), inspector: z.string().trim(),
  date: z.string().min(1, 'Add meg a felülvizsgálat dátumát.'), type: z.string().trim().min(1, 'Add meg a felülvizsgálat típusát.'),
  notes: z.string()
});

export default function NewInspection() {
  const nav = useNavigate();
  const defInspector = useLiveQuery(async () => (await db.settings.get('defaultInspector'))?.value as string | undefined, []);
  const customTypes = useLiveQuery(async () => [...new Set((await db.inspections.toArray()).map(i => i.type))], []) ?? [];
  const [f, setF] = useState({ name: '', property: '', address: '', buildingType: BUILDING_TYPES[0], client: '', inspector: '',
    date: new Date().toISOString().slice(0, 10), type: 'Időszakos', notes: '' });
  const [err, setErr] = useState<string[]>([]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const types = [...new Set(['Első', 'Időszakos', 'Rendkívüli', ...customTypes])];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse({ ...f, inspector: f.inspector || defInspector || '' });
    if (!r.success) return setErr(r.error.issues.map(i => i.message));
    const id = await createInspection(r.data);
    nav(`/felulvizsgalat/${id}`);
  }
  const F = (label: string, k: keyof typeof f, extra: object = {}) =>
    <div><label className="lbl">{label}</label><input className="inp" value={f[k]} onChange={set(k)} {...extra} /></div>;

  return <form onSubmit={submit} className="space-y-4 max-w-2xl">
    <h1 className="text-2xl font-bold">Új felülvizsgálat</h1>
    {err.length > 0 && <ul className="border border-bad text-bad rounded-md p-3 bg-white">{err.map(m => <li key={m}>{m}</li>)}</ul>}
    {F('Projekt neve *', 'name')}{F('Ingatlan megnevezése', 'property')}{F('Ingatlan címe *', 'address')}
    <div><label className="lbl">Épülettípus</label>
      <select className="inp" value={f.buildingType} onChange={set('buildingType')}>{BUILDING_TYPES.map(b => <option key={b}>{b}</option>)}</select></div>
    {F('Megrendelő neve', 'client')}
    <div><label className="lbl">Felülvizsgáló neve</label>
      <input className="inp" value={f.inspector} placeholder={defInspector ?? ''} onChange={set('inspector')} /></div>
    {F('Felülvizsgálat dátuma *', 'date', { type: 'date' })}
    <div><label className="lbl">Felülvizsgálat típusa * (egyéni érték is megadható)</label>
      <input className="inp" list="types" value={f.type} onChange={set('type')} />
      <datalist id="types">{types.map(t => <option key={t} value={t} />)}</datalist></div>
    <div><label className="lbl">Általános megjegyzések</label>
      <textarea className="inp py-2" rows={3} value={f.notes} onChange={set('notes')} /></div>
    <button className="btn btn-primary w-full">Felülvizsgálat létrehozása</button>
  </form>;
}
