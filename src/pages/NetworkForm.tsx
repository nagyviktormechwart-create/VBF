import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { updateInspection, type Inspection, type NetworkData } from '../db';

type K = keyof NetworkData;
interface F { k: K; label: string; kind: 'text' | 'num' | 'area' | 'select'; opts?: string[]; list?: string[] }
const GROUPS: { title: string; fields: F[] }[] = [
  { title: 'Hálózati rendszer és paraméterek', fields: [
    { k: 'system', label: 'Hálózati rendszer', kind: 'select', opts: ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT', 'Egyéb', 'Nem ismert'] },
    { k: 'phases', label: 'Fázisok száma', kind: 'num' },
    { k: 'voltage', label: 'Névleges hálózati feszültség (V, pl. 400/230)', kind: 'text' },
    { k: 'frequency', label: 'Névleges frekvencia (Hz)', kind: 'num' }] },
  { title: 'Betáplálás', fields: [
    { k: 'feedMode', label: 'Betáplálás módja', kind: 'text' },
    { k: 'feedName', label: 'Betáplálás megnevezése', kind: 'text' }] },
  { title: 'Főbiztosító', fields: [
    { k: 'mainFuseType', label: 'Főbiztosító típusa', kind: 'text' },
    { k: 'mainFuseCurrent', label: 'Főbiztosító névleges árama (A)', kind: 'num' },
    { k: 'mainFusePoles', label: 'Főbiztosító pólusszáma', kind: 'text', list: ['1', '2', '3', '4'] }] },
  { title: 'Földelés és megjegyzések', fields: [
    { k: 'mainEarthTerminal', label: 'Fő földelőkapocs adatai', kind: 'area' },
    { k: 'earthingNote', label: 'Földelési rendszerre vonatkozó megjegyzés', kind: 'area' },
    { k: 'networkNote', label: 'Hálózati kialakítás megjegyzése', kind: 'area' }] },
];

// Csak az adott felülvizsgálat szempontjából releváns mezőket kell kitölteni; semmi nincs előre kitöltve.
export default function NetworkForm({ insp }: { insp: Inspection }) {
  const [n, setN] = useState<NetworkData>(insp.network ?? {});
  const [err, setErr] = useState<Partial<Record<K, string>>>({});
  const filled = Object.values(n).filter(v => v && v.trim()).length;
  const commit = (next: NetworkData) => updateInspection(insp.id, { network: next });

  function blur(f: F) {
    let v = (n[f.k] ?? '').trim();
    if (f.kind === 'num' && v) {
      const x = Number(v.replace(',', '.'));
      if (Number.isNaN(x)) return setErr({ ...err, [f.k]: 'Számot adj meg.' });
      v = String(x);
    }
    setErr({ ...err, [f.k]: undefined });
    if (v === (insp.network?.[f.k] ?? '') && v === (n[f.k] ?? '')) return;
    const next = { ...n, [f.k]: v }; setN(next); commit(next);
  }

  return <details className="bg-surface border border-line rounded-md group">
    <summary className="flex items-center justify-between p-4 min-h-14 cursor-pointer font-semibold list-none">
      <span>Hálózati adatok <span className="font-normal text-sm">({filled ? `${filled} adat megadva` : 'még nincs megadva'})</span></span>
      <ChevronDown size={20} className="group-open:rotate-180 transition-transform" />
    </summary>
    <div className="p-4 pt-0 space-y-5">
      {GROUPS.map(g => <div key={g.title} className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide">{g.title}</h3>
        <div className="grid sm:grid-cols-2 gap-3">{g.fields.map(f => <div key={f.k} className={f.kind === 'area' ? 'sm:col-span-2' : ''}>
          <label className="lbl">{f.label}</label>
          {f.kind === 'select'
            ? <select className="inp" value={n[f.k] ?? ''} onChange={e => { const next = { ...n, [f.k]: e.target.value }; setN(next); commit(next); }}>
                <option value="">Nincs megadva</option>{f.opts!.map(o => <option key={o}>{o}</option>)}</select>
            : f.kind === 'area'
              ? <textarea className="inp py-2" rows={2} value={n[f.k] ?? ''} onChange={e => setN({ ...n, [f.k]: e.target.value })} onBlur={() => blur(f)} />
              : <input className="inp" inputMode={f.kind === 'num' ? 'decimal' : 'text'} list={f.list ? 'dl-' + f.k : undefined}
                  value={n[f.k] ?? ''} onChange={e => setN({ ...n, [f.k]: e.target.value })} onBlur={() => blur(f)} />}
          {f.list && <datalist id={'dl-' + f.k}>{f.list.map(o => <option key={o} value={o} />)}</datalist>}
          {err[f.k] && <p className="text-badfg text-sm font-semibold mt-1">{err[f.k]}</p>}
        </div>)}</div>
      </div>)}
    </div>
  </details>;
}
