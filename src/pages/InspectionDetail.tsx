import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import PropertyForm from './PropertyForm';
import NetworkForm from './NetworkForm';
import ProtectionForm from './ProtectionForm';
import Photos from './Photos';
import { exportPhotosZip } from '../photos';
import ExportDialog from './ExportDialog';
import { addRoom, db, deleteRoom, moveRoom, renameRoom, setRoomArea, type Room } from '../db';

function AreaInput({ r, areas }: { r: Room; areas: string[] }) {
  const [v, setV] = useState(r.area ?? '');
  return <><input className="inp min-h-10 text-sm max-w-56" placeholder="Épület / terület" list="areas" value={v} onChange={e => setV(e.target.value)} onBlur={() => v.trim() !== (r.area ?? '') && setRoomArea(r.id, v)} />
    <datalist id="areas">{areas.map(a => <option key={a} value={a} />)}</datalist></>;
}

export default function InspectionDetail() {
  const { id = '' } = useParams();
  const insp = useLiveQuery(() => db.inspections.get(id), [id]);
  const rooms = useLiveQuery(() => db.rooms.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const templates = useLiveQuery(() => db.roomTemplates.orderBy('name').toArray(), []) ?? [];
  const counts = useLiveQuery(async () => { const m: Record<string, number> = {};
    (await db.points.where('inspectionId').equals(id).toArray()).forEach(p => { m[p.roomId] = (m[p.roomId] ?? 0) + 1; }); return m; }, [id]) ?? {};
  const [dlg, setDlg] = useState<'excel' | 'word' | 'check' | null>(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  if (!insp) return <p>Felülvizsgálat betöltése...</p>;

  async function add(n: string) {
    setErr('');
    try { await addRoom(id, n); setName(''); } catch (e) { setErr((e as Error).message); }
  }
  const used = new Set(rooms.map(r => r.name.toLowerCase()));
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">{insp.name}</h1>
      <p className="text-sm">{insp.address} · {insp.buildingType} · {insp.date} · {insp.type}</p></div>

    <div className="flex flex-wrap gap-2">
      <Link className="btn btn-primary" to={`/felulvizsgalat/${id}/meres`}>Mérés megkezdése</Link>
      <Link className="btn" to={`/felulvizsgalat/${id}/attekintes`}>Áttekintés</Link>
      <Link className="btn" to={`/felulvizsgalat/${id}/elosztok`}>Elosztók és áramkörök</Link>
      <Link className="btn" to={`/felulvizsgalat/${id}/szemrevetelezes`}>Szemrevételezés</Link>
      <Link className="btn" to={`/felulvizsgalat/${id}/hibak`}>Hibák és hiányosságok</Link>
      <Link className="btn" to={`/felulvizsgalat/${id}/muszerek`}>Mérőműszerek</Link>
      <button className="btn" onClick={() => setDlg('check')}>Projekt ellenőrzése</button>
      <button className="btn" onClick={() => setDlg('excel')}>Excel exportálás</button>
      <button className="btn" onClick={() => setDlg('word')}>Jegyzőkönyv (Word)</button>
      <button className="btn" onClick={() => exportPhotosZip(id)}>Fényképek exportja (ZIP)</button>
    </div>
    {dlg && <ExportDialog id={id} mode={dlg} onClose={() => setDlg(null)} />}
    <PropertyForm key={insp.id} insp={insp} />
    <NetworkForm key={'n' + insp.id} insp={insp} />
    <ProtectionForm key={'p' + insp.id} insp={insp} />
    <details className="bg-surface border border-line rounded-md"><summary className="p-4 min-h-14 cursor-pointer font-semibold">Mellékletek (pl. képesítési bizonylatok képe)</summary>
      <div className="p-4 pt-0 space-y-2"><p className="text-sm">A képek csak ezen a készüléken tárolódnak, az Excel nem tartalmazza őket (a fényképek ZIP-jébe bekerülnek). Személyes adatot tartalmazó bizonylatot csak a szükséges mértékben csatolj.</p>
        <Photos inspectionId={id} ownerType="inspection" ownerId={id} /></div></details>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Helyiségek</h2>
      <div className="flex flex-wrap gap-2">
        {templates.filter(t => !t.hidden && !used.has(t.name.toLowerCase())).map(t =>
          <button key={t.id} className="btn min-h-11" onClick={() => add(t.name)}><Plus size={16} />{t.name}</button>)}
      </div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add(name); }}>
        <input className="inp" placeholder="Egyéni helyiségnév" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary">Hozzáadás</button>
      </form>
      {err && <p className="text-badfg font-semibold">{err}</p>}
      {rooms.length === 0 && <p>Adj hozzá legalább egy helyiséget a fenti gombokkal.</p>}
      <ul className="divide-y divide-line bg-surface border border-line rounded-md">
        {rooms.map((r, i) => <li key={r.id} className="flex flex-wrap items-center gap-2 p-3">
          <Link to={`/felulvizsgalat/${id}/meres?h=${r.id}`} className="flex-1 font-semibold min-h-12 flex items-center gap-2">{r.name}<span className="font-normal text-sm">({counts[r.id] ?? 0} mérési pont)</span></Link>
          <AreaInput r={r} areas={[...new Set(rooms.map(x => x.area).filter(Boolean) as string[])]} />
          <button className="btn" aria-label="Fel" disabled={i === 0} onClick={() => moveRoom(rooms, i, -1)}><ArrowUp size={18} /></button>
          <button className="btn" aria-label="Le" disabled={i === rooms.length - 1} onClick={() => moveRoom(rooms, i, 1)}><ArrowDown size={18} /></button>
          <button className="btn" aria-label="Átnevezés" onClick={() => { const n = prompt('Új név:', r.name); if (n?.trim()) renameRoom(r.id, n); }}><Pencil size={18} /></button>
          <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd a(z) „${r.name}” helyiséget?`)) deleteRoom(r.id); }}><Trash2 size={18} /></button>
        </li>)}
      </ul>
    </section>
  </div>;
}
