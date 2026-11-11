import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { db, deleteInstrument, saveInstrument, type Instrument } from '../db';
import RecordForm, { type RF } from './RecordForm';

const F: RF[] = [{ k: 'manufacturer', label: 'Gyártó' }, { k: 'type', label: 'Típus', required: true }, { k: 'serial', label: 'Gyári szám' }, { k: 'deviceId', label: 'Műszer azonosítója' },
  { k: 'calDoc', label: 'Kalibrálási vagy ellenőrzési dokumentum adatai' }, { k: 'calDate', label: 'Kalibrálás / ellenőrzés dátuma', kind: 'date' }, { k: 'note', label: 'Megjegyzés', kind: 'area' }];
const key = (i: Instrument) => [i.manufacturer, i.type, i.serial, i.deviceId].map(x => x.trim().toLowerCase()).join('|');
const vals = (i?: Instrument) => Object.fromEntries(F.map(f => [f.k, String((i as unknown as Record<string, unknown> | undefined)?.[f.k] ?? '')]));

export default function Instruments() {
  const { id = '' } = useParams();
  const list = (useLiveQuery(() => db.instruments.where('inspectionId').equals(id).toArray(), [id]) ?? []).sort((a, b) => a.createdAt - b.createdAt);
  const earlier = useLiveQuery(async () => { const mine = new Set((await db.instruments.where('inspectionId').equals(id).toArray()).map(key)); const seen = new Map<string, Instrument>();
    for (const i of (await db.instruments.toArray()).sort((a, b) => b.createdAt - a.createdAt)) if (i.inspectionId !== id && !mine.has(key(i)) && !seen.has(key(i))) seen.set(key(i), i);
    return [...seen.values()]; }, [id]) ?? [];
  const [edit, setEdit] = useState<string | null>(null);
  const form = (i?: Instrument) => <RecordForm fields={F} initial={vals(i)} onCancel={() => setEdit(null)}
    onSave={async v => { await saveInstrument({ ...(v as unknown as Instrument), id: i?.id ?? crypto.randomUUID(), inspectionId: id, createdAt: i?.createdAt }); setEdit(null); }} />;
  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Mérőműszerek</h1>
      <button className="btn btn-primary" onClick={() => setEdit('new')}><Plus size={18} />Új mérőműszer</button></div>
    {edit === 'new' && form()}
    {earlier.length > 0 && <section className="bg-surface border border-line rounded-md p-3 space-y-2"><h2 className="font-semibold">Korábban használt műszerek hozzáadása</h2>
      <div className="flex flex-wrap gap-2">{earlier.map(i => <button key={i.id} className="btn min-h-11 text-sm"
        onClick={() => saveInstrument({ ...i, id: crypto.randomUUID(), inspectionId: id, createdAt: undefined })}>{[i.manufacturer, i.type, i.serial && `(${i.serial})`].filter(Boolean).join(' ')}</button>)}</div>
      <p className="text-xs">A hozzáadott műszer adatai ehhez a felülvizsgálathoz másolódnak, a kalibrálási adatok itt külön módosíthatók.</p></section>}
    {list.length === 0 && edit !== 'new' && <p>Ehhez a felülvizsgálathoz még nincs mérőműszer megadva.</p>}
    <ul className="divide-y divide-line bg-surface border border-line rounded-md">{list.map(i => <li key={i.id} className="p-3">
      {edit === i.id ? form(i) : <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0"><div className="font-semibold">{[i.manufacturer, i.type].filter(Boolean).join(' ')}</div>
          <div className="text-sm">{[i.serial && `Gyári szám: ${i.serial}`, i.deviceId && `Azonosító: ${i.deviceId}`, i.calDate && `Kalibrálás/ellenőrzés: ${i.calDate}`, i.calDoc].filter(Boolean).join(' · ') || 'Nincs több adat megadva'}</div></div>
        <button className="btn" aria-label="Szerkesztés" onClick={() => setEdit(i.id)}><Pencil size={18} /></button>
        <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm('Törlöd a műszert ebből a felülvizsgálatból?')) deleteInstrument(i.id); }}><Trash2 size={18} /></button></div>}
    </li>)}</ul>
  </div>;
}
