import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import FieldPicker, { fieldKey } from './FieldPicker';
import Photos from './Photos';
import { categoryOf } from '../fields';
import { AlertOctagon, AlertTriangle, Camera, Copy, Pencil, Trash2 } from 'lucide-react';
import { addCatalogItem, createDefect, db, deletePoint, savePoint, RESULTS, valueStatus, type FieldDef, type ValueStatus, type Point, type PointValue } from '../db';

const COLOR: Record<string, string> = { 'Megfelelő': 'bg-ok text-white', 'Nem megfelelő': 'bg-bad text-white', 'Nem értékelhető': 'bg-slate-400 text-white', 'Nem alkalmazható': 'bg-slate-500 text-white', 'További vizsgálat szükséges': 'bg-amber-400 text-graphite' };
const nextIdent = (name: string, pts: Point[]) => {
  const n = Math.max(0, ...pts.filter(p => p.elementName.toLowerCase() === name.toLowerCase()).map(p => parseInt(p.identifier.match(/(\d+)\s*$/)?.[1] ?? '0')));
  return `${name} ${String(n + 1).padStart(2, '0')}`;
};

export default function Measure() {
  const { id = '' } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate();
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);
  const pc = useLiveQuery(async () => { const m: Record<string, number> = {}; (await db.photos.where('inspectionId').equals(id).toArray()).forEach(x => { if (x.ownerType === 'point') m[x.ownerId] = (m[x.ownerId] ?? 0) + 1; }); return m; }, [id]) ?? {};
  const rooms = useLiveQuery(() => db.rooms.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const boards = useLiveQuery(() => db.boards.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const circuits = useLiveQuery(() => db.circuits.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const catalog = useLiveQuery(() => db.catalog.toArray(), []) ?? [];
  const [roomId, setRoomId] = useState(sp.get('h') ?? '');
  const [elName, setElName] = useState(''); const [override, setOverride] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({}); const [result, setResult] = useState('Megfelelő'); const [note, setNote] = useState('');
  const [editing, setEditing] = useState<Point | null>(null); const [saveCat, setSaveCat] = useState(true); const [err, setErr] = useState(''); const [boardId, setBoardId] = useState(''); const [circuitId, setCircuitId] = useState(''); const [newFields, setNewFields] = useState<FieldDef[]>([]); const [fieldOv, setFieldOv] = useState<FieldDef[] | null>(null); const [fstat, setFstat] = useState<Record<string, ValueStatus | ''>>({});
  const room = rooms.find(r => r.id === roomId) ?? rooms[0];
  const points = useLiveQuery(() => room ? db.points.where('roomId').equals(room.id).sortBy('createdAt') : [], [room?.id]) ?? [];
  const name = elName.trim();
  const el = catalog.find(c => c.name.toLowerCase() === name.toLowerCase());
  const enabled = catalog.filter(c => c.enabled).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'hu'));
  const ident = override ?? (name && !editing ? nextIdent(name, points) : '');
  const baseFields: FieldDef[] = editing ? editing.values.map(v => ({ id: v.label, label: v.label, unit: v.unit, type: v.type })) : el ? el.fields : newFields;
  const fields = fieldOv ?? baseFields;
  const locked = editing ? new Set(baseFields.map(fieldKey)) : undefined;
  // Korábban beírt szöveges értékek mezőnként: javaslatként a listában.
  const sugg = useLiveQuery(async () => { const m: Record<string, Set<string>> = {};
    for (const p of await db.points.toArray()) for (const v of p.values) if (v.type === 'text' && typeof v.value === 'string' && v.value) (m[v.label] ??= new Set()).add(v.value);
    return m; }, []) ?? {};
  const cur = (f: FieldDef) => vals[f.id] ?? (editing ? '' : f.defaultValue ?? '');

  function reset(keepEl = true) { if (editing) setFieldOv(null); setVals({}); setFstat({}); setResult('Megfelelő'); setNote(''); setOverride(null); setEditing(null); setErr(''); if (!keepEl) { setElName(''); setNewFields([]); setFieldOv(null); } }
  function edit(p: Point) {
    setEditing(p); setFieldOv(null); setBoardId(p.boardId ?? ''); setCircuitId(p.circuitId ?? ''); setElName(p.elementName); setOverride(p.identifier); setResult(p.result); setNote(p.note); setErr('');
    setVals(Object.fromEntries(p.values.map(v => [v.label, v.value == null ? '' : String(v.value)])));
    setFstat(Object.fromEntries(p.values.filter(v => v.status === 'nem végezhető' || v.status === 'nem alkalmazható').map(v => [v.label, v.status!])));
  }
  function setVal(f: FieldDef, v: string) {
    const next = { ...vals, [f.id]: v };
    if (f.label === 'Vonali impedancia') {
      const target = fields.find(x => x.label === 'Várható zárlati áram');
      if (target) { const z = Number(v.replace(',', '.')); next[target.id] = v.trim() && z > 0 ? String(Math.round((230 / z) * 100) / 100) : ''; }
    }
    setVals(next);
  }
  const handled = useRef(false);
  useEffect(() => { const e = sp.get('e'); if (e && !handled.current) { const p = points.find(x => x.id === e); if (p) { handled.current = true; edit(p); scrollTo({ top: 0 }); } } });
  async function save() {
    if (!room) return setErr('Előbb adj hozzá helyiséget.');
    if (!name) return setErr('Válaszd ki vagy írd be a mérési elem nevét.');
    if (!ident.trim()) return setErr('A mérési pont azonosítója nem lehet üres.');
    const values: PointValue[] = [];
    for (const f of fields) {
      const fs = fstat[f.id];
      if (fs) { values.push({ label: f.label, unit: f.unit, type: f.type, value: null, status: fs, fieldId: editing ? editing.values.find(v => v.label === f.label)?.fieldId : f.id }); continue; }
      const raw = cur(f).trim(); let value: string | number | null = raw || null;
      if (f.required && !raw) return setErr(`A(z) „${f.label}” mező kitöltése kötelező.`);
      if (raw && f.type === 'decimal' && /^[<>]=?\s*\d/.test(raw)) value = raw.replace(',', '.').replace(/\s+/g, '');   // pl. „>999”: határérték-jellegű eredmény
      else if (raw && f.type === 'decimal') { value = Number(raw.replace(',', '.')); if (Number.isNaN(value)) return setErr(`A(z) „${f.label}” mezőbe számot adj meg.`); }
      values.push({ label: f.label, unit: f.unit, type: f.type, value, status: value === null ? 'hiányzik' : 'rögzítve', fieldId: editing ? editing.values.find(v => v.label === f.label)?.fieldId : f.id });
    }
    let catalogId = editing?.catalogId ?? el?.id;
    if (!el && !editing && saveCat) catalogId = await addCatalogItem(name, 'Egyéb berendezés', newFields);
    await savePoint({ id: editing?.id ?? crypto.randomUUID(), createdAt: editing?.createdAt, inspectionId: id, roomId: room.id, catalogId,
      elementName: name, identifier: ident.trim(), values, boardId: boardId || undefined, circuitId: circuitId || undefined, result, note });
    reset();
  }
  async function defect(p: Point) {
    const ex = await db.defects.where('inspectionId').equals(id).filter(d => d.pointId === p.id).first();
    const did = ex?.id ?? await createDefect(id, { title: p.identifier, roomId: p.roomId, boardId: p.boardId, circuitId: p.circuitId, pointId: p.id, note: p.note });
    nav(`/felulvizsgalat/${id}/hibak?h=${did}`);
  }
  async function duplicate(p: Point) {
    const keep = confirm('Átmásolod a mért értékeket is? (Mégse = csak üres sablon)');
    await savePoint({ ...p, id: crypto.randomUUID(), createdAt: undefined, identifier: nextIdent(p.elementName, points),
      values: p.values.map(v => ({ ...v, value: keep ? v.value : null, status: keep ? v.status : undefined })), result: keep ? p.result : 'Megfelelő' });
  }

  if (rooms.length === 0) return <p>Ehhez a felülvizsgálathoz még nincs helyiség. <Link className="underline" to={`/felulvizsgalat/${id}`}>Helyiségek hozzáadása</Link></p>;
  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <div className="flex gap-2 overflow-x-auto pb-1">{rooms.map(r => <button key={r.id} onClick={() => { setRoomId(r.id); reset(); }}
      className={`btn shrink-0 ${r.id === room?.id ? 'btn-primary' : ''}`}>{r.name}</button>)}</div>

    <section className="bg-surface border border-line rounded-md p-4 space-y-3">
      <h2 className="font-semibold">{editing ? 'Mérési pont szerkesztése' : 'Új mérési pont'} – {room?.name}</h2>
      <div className="flex flex-wrap gap-2">{enabled.filter(c => c.favorite).map(c => <button key={c.id} className="btn min-h-11" onClick={() => { setElName(c.name); setOverride(null); setNewFields([]); setFieldOv(null); }}>{c.name}</button>)}</div>
      <div><label className="lbl">Mérési elem (keresés vagy új név beírása)</label>
        <input className="inp" list="els" value={elName} disabled={!!editing} onChange={e => { setElName(e.target.value); setOverride(null); setNewFields([]); setFieldOv(null); }} />
        <datalist id="els">{enabled.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
      {name && !el && !editing && <label className="flex items-center gap-2 min-h-12"><input type="checkbox" className="size-6" checked={saveCat} onChange={e => setSaveCat(e.target.checked)} />Mentés a mérési elem katalógusba</label>}
      {name && !el && !editing && <FieldPicker value={newFields} onChange={setNewFields} />}
      <div><label className="lbl">Mérési pont azonosítója</label><input className="inp" value={ident} onChange={e => setOverride(e.target.value)} /></div>
      {boards.length > 0 && <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="lbl">Elosztó</label><select className="inp" value={boardId} onChange={e => { setBoardId(e.target.value); setCircuitId(''); }}>
          <option value="">Nincs megadva</option>{boards.map(b => <option key={b.id} value={b.id}>{b.identifier}{b.name && ` – ${b.name}`}</option>)}</select></div>
        <div><label className="lbl">Áramkör</label><select className="inp" value={circuitId} disabled={!boardId} onChange={e => setCircuitId(e.target.value)}>
          <option value="">Nincs megadva</option>{circuits.filter(c => c.boardId === boardId).map(c => <option key={c.id} value={c.id}>{c.identifier}{c.name && ` – ${c.name}`}</option>)}</select></div>
      </div>}
      {name && (el || editing) && <details className="border border-line rounded-md"><summary className="p-3 min-h-12 cursor-pointer font-semibold">Mérési mezők módosítása ehhez a ponthoz</summary>
        <div className="p-3 pt-0 space-y-2"><FieldPicker value={fields} onChange={setFieldOv} locked={locked} />
          {fieldOv && <button className="btn" onClick={() => setFieldOv(null)}>Vissza az alapmezőkhöz</button>}</div></details>}
      <div className="grid sm:grid-cols-2 gap-3">{fields.map(f => <div key={f.id}>
        <div className="flex items-center justify-between gap-2"><label className="lbl">{f.label}{f.unit && ` (${f.unit})`}</label>
          <select aria-label="Mező állapota" className="text-xs border border-line rounded bg-surface min-h-8 mb-1" value={fstat[f.id] ?? ''}
            onChange={e => { setFstat({ ...fstat, [f.id]: e.target.value as ValueStatus | '' }); if (e.target.value) setVals({ ...vals, [f.id]: '' }); }}>
            <option value="">Automatikus</option><option value="nem végezhető">Nem végezhető</option><option value="nem alkalmazható">Nem alkalmazható</option></select></div>
        {f.type === 'bool' || f.type === 'select'
          ? <select className="inp" disabled={!!fstat[f.id]} value={cur(f)} onChange={e => setVal(f, e.target.value)}><option value="">Nincs megadva</option>
              {(f.type === 'bool' ? ['Igen', 'Nem'] : f.options ?? []).map(o => <option key={o}>{o}</option>)}</select>
          : <input className="inp" disabled={!!fstat[f.id]} type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'decimal' && categoryOf(f) !== 'ÁVK-vizsgálatok' ? 'decimal' : 'text'} value={cur(f)}
              list={f.type === 'text' ? 'sg-' + f.id : undefined} onChange={e => setVal(f, e.target.value)} />}
        {f.type === 'text' && <datalist id={'sg-' + f.id}>{[...new Set([...(f.options ?? []), ...(sugg[f.label] ?? [])])].map(o => <option key={o} value={o} />)}</datalist>}
        {f.note && <p className="text-xs mt-1">{f.note}</p>}
        {f.label === 'Várható zárlati áram' && fields.some(x => x.label === 'Vonali impedancia') && <p className="text-xs mt-1">Automatikusan számolva: 230 V / vonali impedancia (kézzel is átírható).</p>}</div>)}</div>
      <div><label className="lbl">Minősítés</label><select className="inp" value={result} onChange={e => setResult(e.target.value)}>
        <option value="">Nincs megadva</option>{RESULTS.map(r => <option key={r}>{r}</option>)}</select></div>
      <div><label className="lbl">Megjegyzés</label><textarea className="inp py-2" rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
      {err && <p className="text-badfg font-semibold">{err}</p>}
      <div className="flex gap-2"><button className="btn btn-primary flex-1" onClick={save}>{editing ? 'Módosítás mentése' : 'Mérési pont mentése'}</button>
        {editing && <button className="btn" onClick={() => reset(false)}>Mégse</button>}</div>
    </section>

    <section>
      <h2 className="font-semibold mb-2">{room?.name}: {points.length} mérési pont</h2>
      <ul className="divide-y divide-line bg-surface border border-line rounded-md">{points.map(p => <li key={p.id} className="p-3 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-0"><div className="font-semibold">{p.identifier}</div>
          <div className="text-sm truncate">{p.values.filter(v => v.value !== null || v.status === 'nem végezhető' || v.status === 'nem alkalmazható').map(v => v.value !== null ? `${v.label}: ${v.value}${v.unit ? ' ' + v.unit : ''}` : `${v.label}: ${v.status}`).join(' · ') || 'Nincs mért érték'}</div>
          {(p.boardId || p.circuitId) && <div className="text-xs">{[boards.find(b => b.id === p.boardId)?.identifier && `Elosztó: ${boards.find(b => b.id === p.boardId)!.identifier}`, circuits.find(c => c.id === p.circuitId)?.identifier && `Áramkör: ${circuits.find(c => c.id === p.circuitId)!.identifier}`].filter(Boolean).join(' · ')}</div>}
          {p.result === 'Megfelelő' && p.values.some(v => valueStatus(v) === 'hiányzik') &&
            <div className="text-xs text-warnfg font-semibold flex items-center gap-1 mt-0.5"><AlertTriangle size={14} />{p.values.filter(v => valueStatus(v) === 'hiányzik').length} mérési érték hiányzik, a minősítés „Megfelelő”</div>}</div>
        {p.result && <span className={`text-xs px-2 py-1 rounded ${COLOR[p.result]}`}>{p.result}</span>}
        <button className="btn" aria-label="Fényképek" onClick={() => setPhotoOpen(photoOpen === p.id ? null : p.id)}><Camera size={18} />{pc[p.id] ? <span className="text-sm">{pc[p.id]}</span> : null}</button>
        <button className="btn" aria-label="Hiba létrehozása vagy megnyitása" onClick={() => defect(p)}><AlertOctagon size={18} /></button>
        <button className="btn" aria-label="Szerkesztés" onClick={() => { edit(p); scrollTo({ top: 0 }); }}><Pencil size={18} /></button>
        <button className="btn" aria-label="Duplikálás" onClick={() => duplicate(p)}><Copy size={18} /></button>
        <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd: ${p.identifier}?${pc[p.id] ? `\nA hozzá tartozó ${pc[p.id]} fénykép is törlődik.` : ''}`)) deletePoint(p.id); }}><Trash2 size={18} /></button>
        {photoOpen === p.id && <div className="basis-full"><Photos inspectionId={id} ownerType="point" ownerId={p.id} /></div>}
      </li>)}</ul>
    </section>
  </div>;
}
