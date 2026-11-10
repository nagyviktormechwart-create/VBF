import { useEffect, useState } from 'react';
import { exportInspection } from '../export';
import { validateInspection, type Issue } from '../validate';

// Ellenőrzési összefoglaló az exportálás előtt. A figyelmeztetések nem akadályozzák a mentést vagy az exportot.
export default function ExportDialog({ id, exporting, onClose }: { id: string; exporting: boolean; onClose: () => void }) {
  const [issues, setIssues] = useState<Issue[] | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { validateInspection(id).then(setIssues); }, [id]);
  const w = issues?.filter(i => i.level === 'Figyelmeztetés') ?? []; const inf = issues?.filter(i => i.level === 'Információ') ?? [];
  const list = (title: string, l: Issue[]) => l.length > 0 && <section><h3 className="font-semibold mb-1">{title} ({l.length})</h3>
    <ul className="text-sm space-y-1">{l.map((i, k) => <li key={k} className="border-l-4 border-line pl-2"><span className="font-semibold">{i.type}: {i.label}</span> – {i.message}</li>)}</ul></section>;
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" role="dialog">
    <div className="bg-white rounded-md max-w-2xl w-full max-h-[90vh] flex flex-col">
      <div className="p-4 border-b border-line font-bold text-lg">{exporting ? 'Exportálás előtti ellenőrzés' : 'Projekt ellenőrzése'}</div>
      <div className="p-4 overflow-auto space-y-4">
        {!issues && <p>Ellenőrzés folyamatban...</p>}
        {issues && issues.length === 0 && <p className="font-semibold text-ok">Nem találtam hiányzó vagy ellentmondó adatot.</p>}
        {issues && issues.length > 0 && <p>{w.length} figyelmeztetés és {inf.length} információ. A figyelmeztetések nem akadályozzák a mentést, de az exportált dokumentáció előtt érdemes átnézni őket.</p>}
        {list('Figyelmeztetések', w)}{list('Információk', inf)}
        {exporting && issues && issues.length > 0 && <p className="text-sm">Az ellenőrzés eredménye az Excel „EXPORT ELLENŐRZÉS” munkalapján is szerepel.</p>}
      </div>
      <div className="p-3 border-t border-line flex gap-2 justify-end">
        <button className="btn" onClick={onClose}>{exporting ? 'Mégse' : 'Bezár'}</button>
        {exporting && <button className="btn btn-primary" disabled={!issues || busy} onClick={async () => { setBusy(true); await new Promise(r => setTimeout(r, 60)); try { await exportInspection(id); onClose(); } finally { setBusy(false); } }}>{busy ? 'Exportálás folyamatban...' : 'Exportálás Excelbe'}</button>}
      </div></div></div>;
}
