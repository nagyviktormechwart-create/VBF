import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Photos from './Photos';
import { AlertOctagon, Copy, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { addChecks, createDefect, CHECK_RESULTS, db, deleteCheck, updateCheck, type Check } from '../db';
import { CHECK_CATEGORIES, CHECK_TEMPLATE } from '../checklist';

const COLOR: Record<string, string> = { 'Megfelelő': 'bg-ok text-white', 'Nem megfelelő': 'bg-bad text-white', 'Nem alkalmazható': 'bg-slate-500 text-white', 'Nem vizsgálható': 'bg-amber-400 text-graphite' };

function Row({ c }: { c: Check }) {
  const rooms = useLiveQuery(() => db.rooms.where('inspectionId').equals(c.inspectionId).sortBy('order'), [c.inspectionId]) ?? [];
  const boards = useLiveQuery(() => db.boards.where('inspectionId').equals(c.inspectionId).sortBy('order'), [c.inspectionId]) ?? [];
  const [open, setOpen] = useState(false); const [note, setNote] = useState(c.note); const nav = useNavigate();
  const pn = useLiveQuery(() => db.photos.where('[ownerType+ownerId]').equals(['check', c.id]).count(), [c.id]) ?? 0;
  async function defect() {
    const ex = await db.defects.where('inspectionId').equals(c.inspectionId).filter(d => d.checkId === c.id).first();
    const did = ex?.id ?? await createDefect(c.inspectionId, { title: c.title, description: c.note, roomId: c.roomId, boardId: c.boardId, checkId: c.id });
    nav(`/felulvizsgalat/${c.inspectionId}/hibak?h=${did}`);
  }
  const where = [rooms.find(r => r.id === c.roomId)?.name, boards.find(b => b.id === c.boardId)?.identifier].filter(Boolean).join(' · ');
  return <li className="p-3 space-y-2">
    <div className="flex items-start gap-1">
      <div className="flex-1 min-w-0"><div className="font-semibold">{c.title}</div>
        <div className="text-xs">{where && `${where} · `}{c.result ? '' : 'Még nincs értékelve'}{pn > 0 && ` · ${pn} fénykép`}</div></div>
      <button className="btn min-h-10 px-2" aria-label="Hiba létrehozása vagy megnyitása" onClick={defect}><AlertOctagon size={16} /></button>
      <button className="btn min-h-10 px-2" aria-label="Megjegyzés és részletek" onClick={() => setOpen(!open)}><MessageSquare size={16} /></button>
      <button className="btn min-h-10 px-2" aria-label="Átnevezés" onClick={() => { const t = prompt('Tétel megnevezése:', c.title); if (t?.trim()) updateCheck(c.id, { title: t.trim() }); }}><Pencil size={16} /></button>
      <button className="btn min-h-10 px-2" aria-label="Másolat (pl. másik elosztóhoz)" onClick={() => addChecks(c.inspectionId, [{ category: c.category, title: c.title, custom: true }])}><Copy size={16} /></button>
      <button className="btn btn-danger min-h-10 px-2" aria-label="Törlés" onClick={() => { if (!(c.result || c.note) || confirm(`Törlöd a tételt az ellenőrzőlistáról?\n„${c.title}”`)) deleteCheck(c.id); }}><Trash2 size={16} /></button>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{CHECK_RESULTS.map(r => <button key={r} aria-pressed={c.result === r}
      className={`btn min-h-12 text-sm ${c.result === r ? COLOR[r] : ''}`} onClick={() => updateCheck(c.id, { result: c.result === r ? '' : r })}>{r}</button>)}</div>
    {(open || c.note) && <textarea className="inp py-2" rows={2} placeholder="Megjegyzés" value={note} onChange={e => setNote(e.target.value)} onBlur={() => note.trim() !== c.note && updateCheck(c.id, { note: note.trim() })} />}
    {open && <Photos inspectionId={c.inspectionId} ownerType="check" ownerId={c.id} />}
    {open && <div className="grid sm:grid-cols-2 gap-2">
      <div><label className="lbl">Helyiség</label><select className="inp" value={c.roomId ?? ''} onChange={e => updateCheck(c.id, { roomId: e.target.value || undefined })}>
        <option value="">Nincs megadva</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      <div><label className="lbl">Elosztó</label><select className="inp" value={c.boardId ?? ''} onChange={e => updateCheck(c.id, { boardId: e.target.value || undefined })}>
        <option value="">Nincs megadva</option>{boards.map(b => <option key={b.id} value={b.id}>{b.identifier}{b.name && ` – ${b.name}`}</option>)}</select></div>
    </div>}
  </li>;
}

export default function Visual() {
  const { id = '' } = useParams();
  const checks = useLiveQuery(() => db.checks.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const [filter, setFilter] = useState<'mind' | 'nyitott' | 'nem'>('mind'); const [adding, setAdding] = useState(false);
  const [cc, setCc] = useState(CHECK_CATEGORIES[0]); const [ct, setCt] = useState('');
  const n = (f: (c: Check) => boolean) => checks.filter(f).length;
  const shown = checks.filter(c => filter === 'mind' || (filter === 'nyitott' ? !c.result : c.result === 'Nem megfelelő'));
  const cats = [...CHECK_CATEGORIES, ...new Set(checks.map(c => c.category).filter(x => !CHECK_CATEGORIES.includes(x)))];
  const have = new Set(checks.map(c => `${c.category}|${c.title}`.toLowerCase()));

  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Szemrevételezés</h1>
      <button className="btn btn-primary" onClick={() => setAdding(!adding)}><Plus size={18} />Tételek hozzáadása</button></div>
    <p className="text-sm">Az alap tételek csak javaslatok: egyik sem kötelező, és a lista szakmai felülvizsgálata a te feladatod. Csak azt add hozzá, ami az adott berendezésre vonatkozik.</p>

    {adding && <section className="bg-surface border border-line rounded-md p-4 space-y-4">
      {CHECK_TEMPLATE.map(g => <div key={g.category}>
        <div className="flex items-center justify-between gap-2 mb-1"><h3 className="font-semibold">{g.category}</h3>
          <button className="btn min-h-10" onClick={() => addChecks(id, g.items.map(title => ({ category: g.category, title })))}>Mind hozzáadása</button></div>
        <div className="flex flex-wrap gap-2">{g.items.map(t => <button key={t} disabled={have.has(`${g.category}|${t}`.toLowerCase())} className="btn min-h-11 text-sm disabled:opacity-40"
          onClick={() => addChecks(id, [{ category: g.category, title: t }])}>{t}</button>)}</div></div>)}
      <form className="border-t border-line pt-3 grid sm:grid-cols-[14rem_1fr_auto] gap-2 items-end" onSubmit={async e => { e.preventDefault(); if (!ct.trim()) return; await addChecks(id, [{ category: cc, title: ct, custom: true }]); setCt(''); }}>
        <div><label className="lbl">Kategória</label><select className="inp" value={cc} onChange={e => setCc(e.target.value)}>{CHECK_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></div>
        <div><label className="lbl">Saját ellenőrzési tétel</label><input className="inp" value={ct} onChange={e => setCt(e.target.value)} /></div>
        <button className="btn">Hozzáadás</button></form>
    </section>}

    {checks.length > 0 && <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
        {[['Tétel összesen', checks.length], ['Értékelve', n(c => !!c.result)], ['Még nincs értékelve', n(c => !c.result)], ['Nem megfelelő', n(c => c.result === 'Nem megfelelő')],
          ['Nem alkalmazható / nem vizsgálható', n(c => c.result === 'Nem alkalmazható' || c.result === 'Nem vizsgálható')]].map(([l, v]) =>
          <div key={l} className="bg-surface border border-line rounded-md p-2"><div className="text-2xl font-bold">{v}</div>{l}</div>)}</div>
      <div className="flex gap-2 flex-wrap">{([['mind', 'Mind'], ['nyitott', 'Még nincs értékelve'], ['nem', 'Nem megfelelő']] as const).map(([k, l]) =>
        <button key={k} className={`btn min-h-11 ${filter === k ? 'btn-primary' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div>
    </>}
    {checks.length === 0 && !adding && <p>Még nincs ellenőrzési tétel. Add hozzá a szükséges alap tételeket, vagy vegyél fel sajátot.</p>}

    {cats.map(cat => { const all = checks.filter(c => c.category === cat), list = shown.filter(c => c.category === cat); if (!list.length) return null;
      const open = all.filter(c => !c.result);
      return <details key={cat} open className="bg-surface border border-line rounded-md">
        <summary className="p-3 min-h-12 flex flex-wrap items-center justify-between gap-2 cursor-pointer font-semibold">
          <span>{cat} <span className="font-normal text-sm">({all.length - open.length}/{all.length} értékelve)</span></span>
          {open.length > 0 && <button className="btn min-h-10 text-sm" onClick={e => { e.preventDefault(); if (confirm(`A(z) „${cat}” kategória ${open.length} még nem értékelt tételét megfelelőnek jelölöd?`)) open.forEach(c => updateCheck(c.id, { result: 'Megfelelő' })); }}>Nem értékeltek: Megfelelő</button>}
        </summary>
        <ul className="divide-y divide-line border-t border-line">{list.map(c => <Row key={c.id} c={c} />)}</ul></details>; })}
  </div>;
}
