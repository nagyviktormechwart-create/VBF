import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Copy, Archive, Trash2 } from 'lucide-react';
import { downloadBackup } from '../backup';
import { db, deleteInspection, duplicateInspection, updateInspection } from '../db';

export default function Inspections() {
  const [q, setQ] = useState(''); const [show, setShow] = useState<'aktív' | 'archivált'>('aktív');
  const list = useLiveQuery(() => db.inspections.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const shown = list.filter(i => (show === 'archivált') === (i.status === 'archivált') &&
    (i.name + i.address + i.property).toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Felülvizsgálataim</h1>
    <div className="flex gap-2">
      <input className="inp" placeholder="Keresés névre vagy címre" value={q} onChange={e => setQ(e.target.value)} />
      <button className="btn" onClick={() => setShow(show === 'aktív' ? 'archivált' : 'aktív')}>{show === 'aktív' ? 'Archívum' : 'Aktívak'}</button>
    </div>
    {shown.length === 0 && <p>Nincs megjeleníthető felülvizsgálat.</p>}
    {shown.map(i => <div key={i.id} className="bg-white border border-line rounded-md p-4 flex flex-wrap items-center gap-3 justify-between">
      <Link to={`/felulvizsgalat/${i.id}`} className="min-w-0 flex-1">
        <div className="font-semibold">{i.name}</div><div className="text-sm">{i.address} – {i.status}</div></Link>
      <div className="flex gap-2">
        <label className="flex items-center gap-2 min-h-12 px-1 cursor-pointer">
          <input type="checkbox" role="switch" className="sr-only peer" checked={i.status === 'befejezett'}
            onChange={e => updateInspection(i.id, { status: e.target.checked ? 'befejezett' : 'folyamatban' })} />
          <span className="w-12 h-7 rounded-full bg-line peer-checked:bg-ok relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 peer-focus-visible:outline-2" />
          <span className="text-sm font-semibold">Befejezett</span>
        </label>
        <button className="btn" title="Projekt mentése (.json)" onClick={() => downloadBackup(i.id, 'projekt')}><Download size={18} /></button>
        <button className="btn" title="Duplikálás" onClick={() => duplicateInspection(i.id)}><Copy size={18} /></button>
        <button className="btn" title={i.status === 'archivált' ? 'Visszaállítás' : 'Archiválás'}
          onClick={() => updateInspection(i.id, { status: i.status === 'archivált' ? 'folyamatban' : 'archivált' })}><Archive size={18} /></button>
        <button className="btn btn-danger" title="Törlés" onClick={() => {
          if (confirm(`Biztosan törlöd a(z) „${i.name}” felülvizsgálatot és minden helyiségét? Ez nem vonható vissza.`)) deleteInspection(i.id);
        }}><Trash2 size={18} /></button>
      </div></div>)}
  </div>;
}
