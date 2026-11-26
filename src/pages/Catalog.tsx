import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Building2, PlugZap, Star, Trash2 } from 'lucide-react';
import { addCatalogItem, catalogTable, CATEGORIES, db, PORTABLE_CATEGORIES, tracked, type FieldDef, type InspectionKind } from '../db';

import FieldPicker from './FieldPicker';

// A katalógus két külön listából áll: az épületek villamos felülvizsgálatához és a hordozható eszközökhöz.
// Az első képernyő a két lista közül választ, a választás a címben (?l=) is megjelenik, így a Vissza gomb is működik.
export default function Catalog() {
  const [sp] = useSearchParams();
  const l = sp.get('l') ?? (sp.get('q') ? 'ingatlan' : '');          // a régi, ?q= hivatkozások az épület-listát nyitják meg
  if (l === 'ingatlan') return <CatalogList kind="ingatlan" />;
  if (l === 'hordozhato') return <CatalogList kind="hordozható" />;
  return <Chooser />;
}

function Chooser() {
  const nB = useLiveQuery(() => db.catalog.count(), []); const nP = useLiveQuery(() => db.portableCatalog.count(), []);
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Mérési elem katalógus</h1>
    <p className="text-sm">Melyik listát szeretnéd módosítani?</p>
    <div className="vn-choices">
      <Link to="/katalogus?l=ingatlan" className="vn-choice">
        <span className="vn-choice-ic"><Building2 size={26} /></span>
        <span className="vn-choice-t">Épületek villamos felülvizsgálata</span>
        <span className="vn-choice-d">Dugaljak, kapcsolók, világítás, elosztók, földelés és más, ingatlanokhoz kapcsolódó mérési elemek.</span>
        <span className="vn-choice-n">{nB ?? '…'} elem</span>
      </Link>
      <Link to="/katalogus?l=hordozhato" className="vn-choice">
        <span className="vn-choice-ic"><PlugZap size={26} /></span>
        <span className="vn-choice-t">Hordozható eszközök és kéziszerszámok</span>
        <span className="vn-choice-d">Irodai és egyéb hordozható villamos eszközök időszakos érintésvédelmi felülvizsgálatához.</span>
        <span className="vn-choice-n">{nP ?? '…'} elem</span>
      </Link>
    </div>
  </div>;
}

function CatalogList({ kind }: { kind: InspectionKind }) {
  const portable = kind === 'hordozható'; const T = catalogTable(kind); const cats = portable ? PORTABLE_CATEGORIES : CATEGORIES;
  const [sp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') ?? ''); const [cat, setCat] = useState('');
  const [name, setName] = useState(''); const [ncat, setNcat] = useState(cats[cats.length - 1]); const [nf, setNf] = useState<FieldDef[]>([]); const [err, setErr] = useState(''); const [fe, setFe] = useState<string | null>(null);
  const items = (useLiveQuery(() => catalogTable(kind).toArray(), [kind]) ?? [])
    .filter(i => i.name.toLowerCase().includes(q.toLowerCase()) && (!cat || i.category === cat))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'hu'));
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    try { await tracked(() => addCatalogItem(name, ncat, nf, true, kind)); setName(''); setNf([]); } catch (x) { setErr((x as Error).message); }
  }
  return <div className="space-y-4">
    <Link to="/katalogus" className="underline text-sm">← Másik lista választása</Link>
    <div><h1 className="text-2xl font-bold">Mérési elem katalógus</h1>
      <p className="text-sm">{portable ? 'Hordozható eszközök és kéziszerszámok listája' : 'Épületek villamos felülvizsgálatának listája'}</p></div>
    <form onSubmit={add} className="bg-surface border border-line rounded-md p-4 space-y-3">
      <h2 className="font-semibold">Új elem felvétele</h2>
      <input className="inp" placeholder="Elem neve" value={name} onChange={e => setName(e.target.value)} />
      <select className="inp" value={ncat} onChange={e => setNcat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select>
      <FieldPicker value={nf} onChange={setNf} kind={kind} />
      {err && <p className="text-badfg font-semibold">{err}</p>}
      <button className="btn btn-primary">Mentés a mérési elem katalógusba</button>
    </form>
    <div className="flex gap-2">
      <input className="inp" placeholder="Keresés névre" value={q} onChange={e => setQ(e.target.value)} />
      <select className="inp max-w-60" value={cat} onChange={e => setCat(e.target.value)}><option value="">Minden kategória</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
    </div>
    <ul className="divide-y divide-line bg-surface border border-line rounded-md">
      {items.map(i => <li key={i.id} className={`flex flex-wrap items-center gap-2 p-3 ${i.enabled ? '' : 'opacity-50'}`}>
        <button className="btn" aria-label="Kedvenc" onClick={() => T.update(i.id, { favorite: !i.favorite })}><Star size={18} fill={i.favorite ? '#f2b600' : 'none'} /></button>
        <div className="flex-1 min-w-0"><div className="font-semibold">{i.name}</div>
          <div className="text-sm">{i.category}{i.fields.length ? ` · ${i.fields.length} mérési mező` : ''}{i.custom ? ' · egyéni' : ''}</div></div>
        <button className="btn" onClick={() => setFe(fe === i.id ? null : i.id)}>Mezők</button>
        <button className="btn" onClick={() => T.update(i.id, { enabled: !i.enabled })}>{i.enabled ? 'Letiltás' : 'Engedélyezés'}</button>
        {i.custom && <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd a(z) „${i.name}” elemet a katalógusból? A korábbi mérések megmaradnak.`)) T.delete(i.id); }}><Trash2 size={18} /></button>}
        {fe === i.id && <div className="basis-full space-y-2"><FieldPicker value={i.fields} onChange={fs => tracked(() => T.update(i.id, { fields: fs }))} kind={kind} />
          <p className="text-sm">A módosítás csak az új mérési pontokra vonatkozik, a korábbi mérések adatai változatlanok maradnak.</p></div>}
      </li>)}
    </ul>
  </div>;
}
