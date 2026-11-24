import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, isAvkCircuit, RESULTS, saveAvkTest, type AvkTest as Test, type Board, type Circuit } from '../db';

type K = 'type' | 'nominalCurrent' | 'residual' | 'voltage' | 'poles' | 'i0' | 't1_0' | 't5_0' | 't05_0' | 'i180' | 't1_180' | 't5_180' | 't05_180';
type Kind = 'text' | 'num' | 'lim';   // lim: szám, vagy határérték-jellegű érték (pl. >999)
const GROUPS: { title: string; fields: { k: K; label: string; kind: Kind; list?: string[] }[] }[] = [
  { title: 'Az ÁVK adatai', fields: [{ k: 'type', label: 'Típus', kind: 'text', list: ['AC', 'A', 'F', 'B'] }, { k: 'nominalCurrent', label: 'In [A]', kind: 'num' }, { k: 'residual', label: 'IΔn [mA]', kind: 'num' },
    { k: 'voltage', label: 'Un [V]', kind: 'num' }, { k: 'poles', label: 'Pólusszám', kind: 'text', list: ['2', '4'] }] },
  { title: '0°', fields: [{ k: 'i0', label: 'IΔn [mA]', kind: 'num' }, { k: 't1_0', label: 't [ms] IΔn', kind: 'lim' }, { k: 't5_0', label: 't [ms] 5xIΔn', kind: 'lim' }, { k: 't05_0', label: 't [ms] 0.5xIΔn', kind: 'lim' }] },
  { title: '180°', fields: [{ k: 'i180', label: 'IΔn [mA]', kind: 'num' }, { k: 't1_180', label: 't [ms] IΔn', kind: 'lim' }, { k: 't5_180', label: 't [ms] 5xIΔn', kind: 'lim' }, { k: 't05_180', label: 't [ms] 0.5xIΔn', kind: 'lim' }] },
];
const ALL = GROUPS.flatMap(g => g.fields);
const NUM = /^-?\d+([.,]\d+)?$/, LIM = /^[<>]=?\s*\d+([.,]\d+)?$/;
const empty = (): Record<K, string> => Object.fromEntries(ALL.map(f => [f.k, ''])) as Record<K, string>;

function Card({ inspectionId, board, circuit, test }: { inspectionId: string; board?: Board; circuit: Circuit; test?: Test }) {
  const init = () => ({ ...empty(), ...(test ? Object.fromEntries(ALL.map(f => [f.k, test[f.k] ?? ''])) : {}) }) as Record<K, string>;
  const [v, setV] = useState<Record<K, string>>(init);
  const okRef = useRef<Record<K, string>>(init());   // az utoljára érvényesnek talált értékek: csak ezek mentődnek, hibás szöveg soha
  const idRef = useRef(test?.id ?? crypto.randomUUID());   // előre kiosztott azonosító: gyors egymás utáni mentés sem készít két rekordot
  const [err, setErr] = useState<Partial<Record<K, string>>>({}); const [res, setRes] = useState(test?.result ?? '');
  async function persist(result: string) {
    const vals = okRef.current;
    await saveAvkTest({ id: idRef.current, inspectionId, circuitId: circuit.id, createdAt: test?.createdAt, ...vals, result });
  }
  function blur(k: K, kind: Kind) {
    let t = v[k].trim();
    if (kind !== 'text' && t) {
      const x = t.replace(/\s+/g, '').replace(',', '.');
      if (!(NUM.test(x) || (kind === 'lim' && LIM.test(x)))) return setErr({ ...err, [k]: kind === 'lim' ? 'Számot adj meg (pl. 27.2 vagy >999).' : 'Számot adj meg.' });
      t = x;   // a beírt alak megmarad (pl. 24.0), csak a tizedesvessző lesz pont
    }
    setErr({ ...err, [k]: undefined }); setV({ ...v, [k]: t });
    if (t !== okRef.current[k]) { okRef.current = { ...okRef.current, [k]: t }; persist(res); }
  }
  return <section className="bg-surface border border-line rounded-md p-4 space-y-4">
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1"><h2 className="font-bold text-lg">Elosztó: {board?.identifier ?? '–'}</h2><span className="font-semibold">Áramkör: {circuit.identifier}</span>
      {circuit.name && <span className="text-sm">{circuit.name}</span>}{board?.location && <span className="text-sm">Helye: {board.location}</span>}</div>
    {GROUPS.map(g => <div key={g.title}><h3 className="text-sm font-semibold uppercase tracking-wide mb-2">{g.title}</h3>
      <div className={`grid gap-3 ${g.fields.length === 5 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>{g.fields.map(f => <div key={f.k}>
        <label className="lbl">{f.label}</label>
        <input className="inp" inputMode={f.kind === 'text' ? 'text' : 'text'} list={f.list ? `avk-${circuit.id}-${f.k}` : undefined} value={v[f.k]} onChange={e => setV({ ...v, [f.k]: e.target.value })} onBlur={() => blur(f.k, f.kind)} />
        {f.list && <datalist id={`avk-${circuit.id}-${f.k}`}>{f.list.map(o => <option key={o} value={o} />)}</datalist>}
        {err[f.k] && <p className="text-badfg text-sm font-semibold mt-1">{err[f.k]}</p>}</div>)}</div></div>)}
    <div className="max-w-xs"><label className="lbl">Minősítés</label><select className="inp" value={res} onChange={e => { setRes(e.target.value); persist(e.target.value); }}>
      <option value="">Nincs megadva</option>{RESULTS.map(r => <option key={r}>{r}</option>)}</select></div>
  </section>;
}

export default function AvkTest() {
  const { id = '' } = useParams();
  const boards = useLiveQuery(() => db.boards.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const circuits = useLiveQuery(() => db.circuits.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const tests = useLiveQuery(() => db.avkTests.where('inspectionId').equals(id).toArray(), [id]);
  if (!tests) return <p>Betöltés...</p>;
  const bIdx = new Map(boards.map((b, i) => [b.id, i]));
  const rows = circuits.filter(isAvkCircuit).sort((a, b) => (bIdx.get(a.boardId) ?? 0) - (bIdx.get(b.boardId) ?? 0) || a.order - b.order);
  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <h1 className="text-2xl font-bold">ÁVK teszt</h1>
    <p className="text-sm">Automatikusan azok az áramkörök jelennek meg, amelyeknél az „Elosztók és áramkörök” menüben a „Védelmi készülék típusa” ÁVK. A beírt adatok a jegyzőkönyv „Áram-védőkapcsolók működésének ellenőrzése” táblázatába kerülnek.</p>
    {rows.length === 0 && <div className="bg-surface border border-line rounded-md p-4 space-y-2"><p>Még nincs ÁVK típusú áramkör.</p>
      <p className="text-sm">Az Elosztók és áramkörök menüben az áramkör „Védelmi készülék típusa” mezőjébe írd be, hogy <b>ÁVK</b>, és az áramkör itt megjelenik.</p>
      <Link className="btn inline-flex" to={`/felulvizsgalat/${id}/elosztok`}>Elosztók és áramkörök megnyitása</Link></div>}
    {rows.map(c => <Card key={c.id} inspectionId={id} board={boards.find(b => b.id === c.boardId)} circuit={c} test={tests.find(t => t.circuitId === c.id)} />)}
  </div>;
}
