import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { db, getDefaultUnits, type FieldDef, type FieldType } from '../db';
import { FIELD_GROUPS, LIBRARY, categoryOf } from '../fields';

export const fieldKey = (f: { label: string; unit: string }) => `${f.label}|${f.unit}`;
const TYPE_L: Record<FieldType, string> = { decimal: 'Szám', text: 'Szöveg', date: 'Dátum', bool: 'Igen/nem', select: 'Választólista' };
const EMPTY = { label: '', unit: '', type: 'decimal' as FieldType, category: FIELD_GROUPS[7] as string, def: '', opts: '', req: false, note: '' };

// Mérési mezők kiválasztása csoportokba rendezett listából, sorrendezéssel és egyéni mező létrehozásával.
// locked: ezek a mezők nem vehetők ki (pl. már rögzített értékű mezők szerkesztésekor).
export default function FieldPicker({ value, onChange, locked }: { value: FieldDef[]; onChange: (v: FieldDef[]) => void; locked?: Set<string> }) {
  const cat = useLiveQuery(() => db.catalog.toArray(), []) ?? [];
  const units = useLiveQuery(getDefaultUnits, []) ?? {};
  const [extra, setExtra] = useState<FieldDef[]>([]);
  const [c, setC] = useState(EMPTY); const [cerr, setCerr] = useState('');
  const opts = new Map<string, FieldDef>();
  [...value, ...cat.flatMap(x => x.fields), ...LIBRARY, ...extra].forEach(f => { if (!opts.has(fieldKey(f))) opts.set(fieldKey(f), f); });
  const sel = new Set(value.map(fieldKey));
  const list = [...opts.values()].sort((a, b) => a.label.localeCompare(b.label, 'hu'));
  const toggle = (f: FieldDef) => {
    if (sel.has(fieldKey(f))) { if (!locked?.has(fieldKey(f))) onChange(value.filter(x => fieldKey(x) !== fieldKey(f))); }
    else onChange([...value, { ...f, id: crypto.randomUUID() }]);
  };
  const move = (i: number, d: -1 | 1) => { const n = [...value]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };

  function addCustom() {
    const label = c.label.trim(); if (!label) return setCerr('Add meg a mező nevét.');
    const options = c.opts.split(',').map(x => x.trim()).filter(Boolean);
    if (c.type === 'select' && options.length < 2) return setCerr('A választólistához legalább két elemet adj meg, vesszővel elválasztva.');
    if (c.type === 'decimal' && c.def.trim() && Number.isNaN(Number(c.def.replace(',', '.')))) return setCerr('Az alapértelmezett érték nem szám.');
    const f: FieldDef = { id: crypto.randomUUID(), label, unit: c.unit.trim(), type: c.type, category: c.category,
      ...(options.length ? { options } : {}), ...(c.def.trim() ? { defaultValue: c.def.trim() } : {}), ...(c.req ? { required: true } : {}), ...(c.note.trim() ? { note: c.note.trim() } : {}) };
    setCerr('');
    if (!opts.has(fieldKey(f))) setExtra([...extra, f]);
    if (!sel.has(fieldKey(f))) onChange([...value, opts.get(fieldKey(f)) ? { ...opts.get(fieldKey(f))!, id: crypto.randomUUID() } : f]);
    setC({ ...c, label: '', unit: '', def: '', opts: '', req: false, note: '' });
  }
  const chip = (f: FieldDef) => <button type="button" key={fieldKey(f)} onClick={() => toggle(f)} aria-pressed={sel.has(fieldKey(f))}
    className={`btn min-h-11 ${sel.has(fieldKey(f)) ? 'btn-primary' : ''}`}>{f.label}{f.unit && ` (${f.unit})`}{f.type !== 'decimal' && f.type !== 'text' && ` – ${TYPE_L[f.type].toLowerCase()}`}</button>;

  return <div className="space-y-3 border border-line rounded-md p-3">
    <div className="font-semibold">Mérési mezők ({value.length} kiválasztva)</div>
    {value.length > 0 && <ol className="space-y-1">{value.map((f, i) => <li key={f.id} className="flex items-center gap-1 text-sm">
      <span className="flex-1 min-w-0 truncate">{i + 1}. {f.label}{f.unit && ` (${f.unit})`}</span>
      <button type="button" className="btn min-h-10 px-2" aria-label="Feljebb" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
      <button type="button" className="btn min-h-10 px-2" aria-label="Lejjebb" disabled={i === value.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
      <button type="button" className="btn min-h-10 px-2" aria-label="Eltávolítás" disabled={locked?.has(fieldKey(f))} onClick={() => toggle(f)}><X size={16} /></button></li>)}</ol>}
    {FIELD_GROUPS.map(g => { const l = list.filter(f => categoryOf(f) === g); return l.length ? <div key={g}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1">{g}</div><div className="flex flex-wrap gap-2">{l.map(chip)}</div></div> : null; })}
    <details className="border-t border-line pt-3"><summary className="font-semibold cursor-pointer min-h-10 flex items-center">Egyéni mező létrehozása</summary>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <div><label className="lbl">Mező neve</label><input className="inp" value={c.label} onChange={e => { const l = e.target.value; const u = Object.entries(units).find(([k]) => k.toLowerCase() === l.trim().toLowerCase())?.[1]; setC({ ...c, label: l, unit: c.unit || u || '' }); }} /></div>
        <div><label className="lbl">Adattípus</label><select className="inp" value={c.type} onChange={e => setC({ ...c, type: e.target.value as FieldType })}>
          {(Object.keys(TYPE_L) as FieldType[]).map(t => <option key={t} value={t}>{TYPE_L[t]}</option>)}</select></div>
        <div><label className="lbl">Mértékegység</label><input className="inp" value={c.unit} onChange={e => setC({ ...c, unit: e.target.value })} /></div>
        <div><label className="lbl">Kategória</label><select className="inp" value={c.category} onChange={e => setC({ ...c, category: e.target.value })}>
          {FIELD_GROUPS.map(g => <option key={g}>{g}</option>)}</select></div>
        {c.type === 'select' && <div className="sm:col-span-2"><label className="lbl">Lista elemei (vesszővel elválasztva)</label><input className="inp" value={c.opts} onChange={e => setC({ ...c, opts: e.target.value })} /></div>}
        <div><label className="lbl">Alapértelmezett érték</label><input className="inp" value={c.def} onChange={e => setC({ ...c, def: e.target.value })} /></div>
        <div><label className="lbl">Megjegyzés a mezőhöz</label><input className="inp" value={c.note} onChange={e => setC({ ...c, note: e.target.value })} /></div>
        <label className="flex items-center gap-2 min-h-12"><input type="checkbox" className="size-6" checked={c.req} onChange={e => setC({ ...c, req: e.target.checked })} />Kötelező kitölteni</label>
      </div>
      {cerr && <p className="text-badfg font-semibold mt-2">{cerr}</p>}
      <button type="button" className="btn mt-2" onClick={addCustom}><Plus size={18} />Mező hozzáadása</button>
    </details>
  </div>;
}
