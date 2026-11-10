import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BUILDING_TYPES, updateInspection, type Inspection } from '../db';

type R = Record<string, string | undefined>;
const FIELDS: { k: string; label: string; kind?: 'select' | 'date' | 'area'; req?: boolean }[] = [
  { k: 'name', label: 'Projekt neve', req: true }, { k: 'property', label: 'Ingatlan megnevezése' }, { k: 'address', label: 'Ingatlan címe', req: true },
  { k: 'buildingType', label: 'Épülettípus', kind: 'select' }, { k: 'assetId', label: 'Épület vagy berendezés azonosítója' }, { k: 'usage', label: 'Az ingatlan használatának jellege' },
  { k: 'client', label: 'Megrendelő neve' }, { k: 'clientAddress', label: 'Megrendelő címe' }, { k: 'clientContact', label: 'Megrendelő elérhetősége' },
  { k: 'inspector', label: 'Felülvizsgáló neve' }, { k: 'inspectorQualification', label: 'Felülvizsgáló szakképesítése' },
  { k: 'inspectorLicense', label: 'Jogosultság vagy képesítés azonosítója' }, { k: 'inspectorContact', label: 'Felülvizsgáló elérhetősége' },
  { k: 'signaturePlace', label: 'Aláírás helye' }, { k: 'signatureDate', label: 'Aláírás dátuma', kind: 'date' }, { k: 'date', label: 'Felülvizsgálat dátuma', kind: 'date', req: true }, { k: 'type', label: 'Felülvizsgálat típusa', req: true },
  { k: 'location', label: 'Felülvizsgálat helyszíne' }, { k: 'legalBasis', label: 'A vizsgálat megrendelésének vagy jogalapjának megjelölése' },
  { k: 'scope', label: 'A felülvizsgálat terjedelme', kind: 'area' }, { k: 'notes', label: 'Általános megjegyzések', kind: 'area' }];

// Az ingatlan- és felülvizsgálati adatok utólagos szerkesztése, mezőnként automatikus mentéssel.
export default function PropertyForm({ insp }: { insp: Inspection }) {
  const [v, setV] = useState<R>({ ...(insp as unknown as R) }); const [err, setErr] = useState<R>({});
  function commit(k: string, val: string, req?: boolean) {
    const t = val.trim();
    if (req && !t) return setErr({ ...err, [k]: 'Kötelező megadni.' });
    setErr({ ...err, [k]: undefined });
    if (t !== ((insp as unknown as R)[k] ?? '')) { setV({ ...v, [k]: t }); updateInspection(insp.id, { [k]: t } as Partial<Inspection>); }
  }
  return <details className="bg-white border border-line rounded-md group">
    <summary className="flex items-center justify-between p-4 min-h-14 cursor-pointer font-semibold list-none">Ingatlan és felülvizsgálat adatai
      <ChevronDown size={20} className="group-open:rotate-180 transition-transform" /></summary>
    <div className="p-4 pt-0 grid sm:grid-cols-2 gap-3">{FIELDS.map(f => <div key={f.k} className={f.kind === 'area' ? 'sm:col-span-2' : ''}>
      <label className="lbl">{f.label}{f.req && ' *'}</label>
      {f.kind === 'select'
        ? <select className="inp" value={v[f.k] ?? ''} onChange={e => { setV({ ...v, [f.k]: e.target.value }); commit(f.k, e.target.value, true); }}>
            {BUILDING_TYPES.map(b => <option key={b}>{b}</option>)}</select>
        : f.kind === 'area'
          ? <textarea className="inp py-2" rows={2} value={v[f.k] ?? ''} onChange={e => setV({ ...v, [f.k]: e.target.value })} onBlur={e => commit(f.k, e.target.value)} />
          : <input className="inp" type={f.kind === 'date' ? 'date' : 'text'} value={v[f.k] ?? ''} onChange={e => setV({ ...v, [f.k]: e.target.value })} onBlur={e => commit(f.k, e.target.value, f.req)} />}
      {err[f.k] && <p className="text-bad text-sm font-semibold mt-1">{err[f.k]}</p>}
    </div>)}</div>
  </details>;
}
