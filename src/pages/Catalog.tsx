import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Star, Trash2 } from 'lucide-react';
import { addCatalogItem, CATEGORIES, db, tracked, type FieldDef } from '../db';

import FieldPicker from './FieldPicker';

export default function Catalog() {
  const [sp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') ?? ''); const [cat, setCat] = useState('');
  const [name, setName] = useState(''); const [ncat, setNcat] = useState(CATEGORIES[4]); const [nf, setNf] = useState<FieldDef[]>([]); const [err, setErr] = useState(''); const [fe, setFe] = useState<string | null>(null);
  const items = (useLiveQuery(() => db.catalog.toArray(), []) ?? [])
    .filter(i => i.name.toLowerCase().includes(q.toLowerCase()) && (!cat || i.category === cat))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'hu'));
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    try { await tracked(() => addCatalogItem(name, ncat, nf)); setName(''); setNf([]); } catch (x) { setErr((x as Error).message); }
  }
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Mérési elem katalógus</h1>
    <form onSubmit={add} className="bg-white border border-line rounded-md p-4 space-y-3">
      <h2 className="font-semibold">Új elem felvétele</h2>
      <input className="inp" placeholder="Elem neve" value={name} onChange={e => setName(e.target.value)} />
      <select className="inp" value={ncat} onChange={e => setNcat(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
      <FieldPicker value={nf} onChange={setNf} />
      {err && <p className="text-bad font-semibold">{err}</p>}
      <button className="btn btn-primary">Mentés a mérési elem katalógusba</button>
    </form>
    <div className="flex gap-2">
      <input className="inp" placeholder="Keresés névre" value={q} onChange={e => setQ(e.target.value)} />
      <select className="inp max-w-60" value={cat} onChange={e => setCat(e.target.value)}><option value="">Minden kategória</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
    </div>
    <ul className="divide-y divide-line bg-white border border-line rounded-md">
      {items.map(i => <li key={i.id} className={`flex flex-wrap items-center gap-2 p-3 ${i.enabled ? '' : 'opacity-50'}`}>
        <button className="btn" aria-label="Kedvenc" onClick={() => db.catalog.update(i.id, { favorite: !i.favorite })}><Star size={18} fill={i.favorite ? '#f2b600' : 'none'} /></button>
        <div className="flex-1 min-w-0"><div className="font-semibold">{i.name}</div>
          <div className="text-sm">{i.category}{i.fields.length ? ` · ${i.fields.length} mérési mező` : ''}{i.custom ? ' · egyéni' : ''}</div></div>
        <button className="btn" onClick={() => setFe(fe === i.id ? null : i.id)}>Mezők</button>
        <button className="btn" onClick={() => db.catalog.update(i.id, { enabled: !i.enabled })}>{i.enabled ? 'Letiltás' : 'Engedélyezés'}</button>
        {i.custom && <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd a(z) „${i.name}” elemet a katalógusból? A korábbi mérések megmaradnak.`)) db.catalog.delete(i.id); }}><Trash2 size={18} /></button>}
        {fe === i.id && <div className="basis-full space-y-2"><FieldPicker value={i.fields} onChange={fs => tracked(() => db.catalog.update(i.id, { fields: fs }))} />
          <p className="text-sm">A módosítás csak az új mérési pontokra vonatkozik, a korábbi mérések adatai változatlanok maradnak.</p></div>}
      </li>)}
    </ul>
  </div>;
}
