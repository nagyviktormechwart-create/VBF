import { useEffect, useState } from 'react';
import { exportInspection } from '../export';
import { generateReport } from '../report';
import { validateInspection, type Issue } from '../validate';

// Ellenőrzési összefoglaló az exportálás előtt. A figyelmeztetések nem akadályozzák a mentést vagy az exportot.
export default function ExportDialog({ id, mode, onClose }: { id: string; mode: 'excel' | 'word' | 'check'; onClose: () => void }) {
  const exporting = mode !== 'check'; const [photos, setPhotos] = useState(true); const [attach, setAttach] = useState(true); const [err, setErr] = useState('');
  const [issues, setIssues] = useState<Issue[] | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { validateInspection(id).then(setIssues); }, [id]);
  const w = issues?.filter(i => i.level === 'Figyelmeztetés') ?? []; const inf = issues?.filter(i => i.level === 'Információ') ?? [];
  const list = (title: string, l: Issue[]) => l.length > 0 && <section><h3 className="font-semibold mb-1">{title} ({l.length})</h3>
    <ul className="text-sm space-y-1">{l.map((i, k) => <li key={k} className="border-l-4 border-line pl-2"><span className="font-semibold">{i.type}: {i.label}</span> – {i.message}</li>)}</ul></section>;
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" role="dialog">
    <div className="bg-surface rounded-md max-w-2xl w-full max-h-[90vh] flex flex-col">
      <div className="p-4 border-b border-line font-bold text-lg">{mode === 'word' ? 'Jegyzőkönyv generálása előtti ellenőrzés' : exporting ? 'Exportálás előtti ellenőrzés' : 'Projekt ellenőrzése'}</div>
      <div className="p-4 overflow-auto space-y-4">
        {!issues && <p>Ellenőrzés folyamatban...</p>}
        {issues && issues.length === 0 && <p className="font-semibold text-okfg">Nem találtam hiányzó vagy ellentmondó adatot.</p>}
        {issues && issues.length > 0 && <p>{w.length} figyelmeztetés és {inf.length} információ. A figyelmeztetések nem akadályozzák a mentést, de az exportált dokumentáció előtt érdemes átnézni őket.</p>}
        {list('Figyelmeztetések', w)}{list('Információk', inf)}
        {mode === 'word' && <div className="space-y-1 border-t border-line pt-3"><p className="text-sm">A Word-jegyzőkönyv a felülvizsgálat adataiból és a Szövegsablonokból készül. A hiányzó adatok sárgával kiemelt „[… nincs megadva]” jelzést kapnak, a szöveget Wordben még átnézheted és szerkesztheted.</p>
          <label className="flex items-center gap-2 min-h-11"><input type="checkbox" className="size-6" checked={photos} onChange={e => setPhotos(e.target.checked)} />Fényképes melléklet a hibákhoz</label>
          <label className="flex items-center gap-2 min-h-11"><input type="checkbox" className="size-6" checked={attach} onChange={e => setAttach(e.target.checked)} />Bizonylatok (képesítés, műszer-kalibrálás) beillesztése</label>
          {err && <p className="text-badfg font-semibold text-sm">{err}</p>}</div>}
        {mode === 'excel' && issues && issues.length > 0 && <p className="text-sm">Az ellenőrzés eredménye az Excel „EXPORT ELLENŐRZÉS” munkalapján is szerepel.</p>}
      </div>
      <div className="p-3 border-t border-line flex gap-2 justify-end">
        <button className="btn" onClick={onClose}>{exporting ? 'Mégse' : 'Bezár'}</button>
        {exporting && <button className="btn btn-primary" disabled={!issues || busy} onClick={async () => { setBusy(true); await new Promise(r => setTimeout(r, 60)); try { if (mode === 'word') await generateReport(id, { photos, attachments: attach }); else await exportInspection(id); onClose(); } catch (e) { setErr('A generálás nem sikerült: ' + (e as Error).message); } finally { setBusy(false); } }}>{busy ? 'Folyamatban...' : mode === 'word' ? 'Jegyzőkönyv letöltése (.docx)' : 'Exportálás Excelbe'}</button>}
      </div></div></div>;
}
