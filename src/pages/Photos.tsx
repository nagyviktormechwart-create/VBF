import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Image as Img, Trash2, X } from 'lucide-react';
import { db, deletePhoto, savePhoto, updatePhoto, type Photo, type PhotoOwner } from '../db';
import { processImage } from '../photos';

function Viewer({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const d = useLiveQuery(() => db.photoData.get(photo.id), [photo.id]);
  const [cap, setCap] = useState(photo.caption);
  return <div className="fixed inset-0 z-50 bg-black/85 flex flex-col p-3 gap-2" role="dialog">
    <div className="flex items-center justify-between text-white"><span className="font-semibold">{photo.code}</span>
      <button className="btn min-h-11" onClick={onClose}><X size={18} />Bezár</button></div>
    <div className="flex-1 min-h-0 flex items-center justify-center">{d ? <img src={d.data} alt={photo.code} className="max-w-full max-h-full object-contain" /> : <span className="text-white">Betöltés...</span>}</div>
    <div className="flex gap-2"><input className="inp" placeholder="Képaláírás / megjegyzés" value={cap} onChange={e => setCap(e.target.value)} onBlur={() => cap !== photo.caption && updatePhoto(photo.id, { caption: cap.trim() })} />
      <button className="btn btn-danger bg-white" onClick={async () => { if (confirm(`Törlöd a(z) ${photo.code} képet?`)) { await deletePhoto(photo.id); onClose(); } }}><Trash2 size={18} />Törlés</button></div>
  </div>;
}

// Fényképek egy mérési ponthoz, ellenőrzési tételhez vagy hibához (tableten a kamera közvetlenül elérhető).
export default function Photos({ inspectionId, ownerType, ownerId }: { inspectionId: string; ownerType: PhotoOwner; ownerId: string }) {
  const photos = useLiveQuery(() => db.photos.where('[ownerType+ownerId]').equals([ownerType, ownerId]).sortBy('seq'), [ownerType, ownerId]) ?? [];
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [view, setView] = useState<string | null>(null);
  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = ''; if (!files.length) return;
    setBusy(true); setErr('');
    try { for (const f of files) { const r = await processImage(f); await savePhoto({ inspectionId, ownerType, ownerId, name: f.name, ...r }); } }
    catch (x) { setErr('A kép feldolgozása nem sikerült: ' + (x as Error).message); } finally { setBusy(false); }
  }
  const shown = photos.find(p => p.id === view);
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{photos.map(p => <button key={p.id} className="relative" onClick={() => setView(p.id)} aria-label={p.code}>
      <img src={p.thumb} alt={p.code} className="h-20 w-20 object-cover rounded border border-line" /><span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center">{p.code}</span></button>)}
      {photos.length === 0 && <span className="text-sm self-center">Még nincs fénykép.</span>}</div>
    <div className="flex flex-wrap gap-2">
      <label className="btn min-h-11 cursor-pointer"><Camera size={18} />Fénykép készítése<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={add} /></label>
      <label className="btn min-h-11 cursor-pointer"><Img size={18} />Kép kiválasztása<input type="file" accept="image/*" multiple className="sr-only" onChange={add} /></label>
      {busy && <span className="self-center text-sm">Feldolgozás...</span>}</div>
    {err && <p className="text-bad font-semibold text-sm">{err}</p>}
    {shown && <Viewer photo={shown} onClose={() => setView(null)} />}
  </div>;
}
