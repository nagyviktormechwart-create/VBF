import { useState } from 'react';

export interface RF { k: string; label: string; kind?: 'text' | 'num' | 'area' | 'select' | 'date'; required?: boolean; list?: string[]; opts?: string[] }
type Vals = Record<string, string>;

// Általános szerkesztőűrlap (szöveg, szám, lista, hosszú szöveg); a számokat ellenőrzi, a kötelező mezőket kéri.
export default function RecordForm({ fields, initial, onSave, onCancel }: { fields: RF[]; initial: Vals; onSave: (v: Vals) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<Vals>(initial); const [err, setErr] = useState<Vals>({}); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); const out = { ...v }; const er: Vals = {};
    for (const f of fields) {
      let t = (out[f.k] ?? '').trim();
      if (f.required && !t) er[f.k] = 'Kötelező megadni.';
      if (f.kind === 'num' && t) { const x = Number(t.replace(',', '.')); if (Number.isNaN(x)) er[f.k] = 'Számot adj meg.'; else t = String(x); }
      out[f.k] = t;
    }
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true); try { await onSave(out); } catch { /* a hibát a mentés jelzi */ } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="bg-steel border border-line rounded-md p-3 space-y-3">
    <div className="grid sm:grid-cols-2 gap-3">{fields.map(f => <div key={f.k} className={f.kind === 'area' ? 'sm:col-span-2' : ''}>
      <label className="lbl">{f.label}{f.required && ' *'}</label>
      {f.kind === 'select' ? <select className="inp" value={v[f.k] ?? ''} onChange={e => setV({ ...v, [f.k]: e.target.value })}>
          <option value="">Nincs megadva</option>{f.opts!.map(o => <option key={o}>{o}</option>)}</select>
        : f.kind === 'area' ? <textarea className="inp py-2" rows={2} value={v[f.k] ?? ''} onChange={e => setV({ ...v, [f.k]: e.target.value })} />
        : <input className="inp" type={f.kind === 'date' ? 'date' : 'text'} inputMode={f.kind === 'num' ? 'decimal' : 'text'} list={f.list ? 'rf-' + f.k : undefined} value={v[f.k] ?? ''} onChange={e => setV({ ...v, [f.k]: e.target.value })} />}
      {f.list && <datalist id={'rf-' + f.k}>{f.list.map(o => <option key={o} value={o} />)}</datalist>}
      {err[f.k] && <p className="text-badfg text-sm font-semibold mt-1">{err[f.k]}</p>}
    </div>)}</div>
    <div className="flex gap-2"><button className="btn btn-primary" disabled={busy}>Mentés</button><button type="button" className="btn" onClick={onCancel}>Mégse</button></div>
  </form>;
}
