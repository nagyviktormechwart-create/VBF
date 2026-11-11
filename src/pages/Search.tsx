import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchAll, type SearchResult } from '../search';

const COLOR: Record<string, string> = { 'Megfelelő': 'bg-ok text-white', 'Nem megfelelő': 'bg-bad text-white', 'Nem értékelhető': 'bg-slate-400 text-white', 'További vizsgálat szükséges': 'bg-amber-400 text-graphite' };

export default function Search() {
  const [sp, setSp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') ?? '');
  const [res, setRes] = useState<SearchResult | null>(null); const [busy, setBusy] = useState(false); const seq = useRef(0);
  useEffect(() => {
    const t = setTimeout(async () => {
      const n = ++seq.current; setSp(q.trim() ? { q } : {}, { replace: true });
      if (!q.trim()) return setRes(null);
      setBusy(true); const r = await searchAll(q); if (n === seq.current) { setRes(r); setBusy(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);   // eslint-disable-line react-hooks/exhaustive-deps
  const total = res ? res.projects.length + res.rooms.length + res.points.length + res.elements.length : 0;
  const head = (t: string, n: number, more: boolean) => <h2 className="font-semibold mt-4 mb-1">{t} ({n}{more ? '+' : ''})</h2>;
  const box = 'divide-y divide-line bg-surface border border-line rounded-md';
  const row = 'block p-3 min-h-14 hover:bg-steel';

  return <div className="space-y-2">
    <h1 className="text-2xl font-bold">Keresés</h1>
    <input autoFocus className="inp" type="search" placeholder="Projekt, cím, helyiség, mérési pont vagy elem neve" value={q} onChange={e => setQ(e.target.value)} />
    <p className="text-xs">Több szóra is keres, kis-nagybetű és ékezet nélkül is (pl. „nappali dugalj 02”).</p>
    {busy && !res && <p>Keresés...</p>}
    {res && total === 0 && <p className="mt-3">Nincs találat a(z) „{q}” kifejezésre.</p>}
    {res && res.projects.length > 0 && <>{head('Projektek', res.projects.length, res.more.projects)}<ul className={box}>{res.projects.map(i => <li key={i.id}>
      <Link className={row} to={`/felulvizsgalat/${i.id}`}><div className="font-semibold">{i.name}{i.status === 'archivált' && ' (archivált)'}</div>
        <div className="text-sm">{[i.address, i.client, i.type, i.date].filter(Boolean).join(' · ')}</div></Link></li>)}</ul></>}
    {res && res.rooms.length > 0 && <>{head('Helyiségek', res.rooms.length, res.more.rooms)}<ul className={box}>{res.rooms.map(({ room, inspection }) => <li key={room.id}>
      <Link className={row} to={`/felulvizsgalat/${room.inspectionId}/meres?h=${room.id}`}><div className="font-semibold">{room.name}</div><div className="text-sm">{inspection?.name}</div></Link></li>)}</ul></>}
    {res && res.points.length > 0 && <>{head('Mérési pontok', res.points.length, res.more.points)}<ul className={box}>{res.points.map(({ point: p, room, inspection }) => <li key={p.id}>
      <Link className={`${row} flex items-center gap-2`} to={`/felulvizsgalat/${p.inspectionId}/meres?h=${p.roomId}&e=${p.id}`}>
        <div className="flex-1 min-w-0"><div className="font-semibold truncate">{p.identifier}</div><div className="text-sm truncate">{[p.elementName, room?.name, inspection?.name].filter(Boolean).join(' · ')}</div></div>
        {p.result && <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${COLOR[p.result] ?? 'bg-steel'}`}>{p.result}</span>}</Link></li>)}</ul></>}
    {res && res.elements.length > 0 && <>{head('Mérési elem katalógus', res.elements.length, res.more.elements)}<ul className={box}>{res.elements.map(c => <li key={c.id}>
      <Link className={row} to={`/katalogus?q=${encodeURIComponent(c.name)}`}><div className="font-semibold">{c.name}</div><div className="text-sm">{c.category}{c.fields.length ? ` · ${c.fields.length} mérési mező` : ''}</div></Link></li>)}</ul></>}
    {res && (res.more.projects || res.more.rooms || res.more.points || res.more.elements) && <p className="text-sm">Sok a találat, szűkítsd a keresést további szavakkal.</p>}
  </div>;
}
