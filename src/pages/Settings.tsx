import { useEffect, useState } from 'react';
import { usePwa } from '../pwa';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload } from 'lucide-react';
import { db, tracked } from '../db';
import { analyzeBackup, applyBackup, downloadBackup, parseBackup, type Backup } from '../backup';

const LABEL: Record<string, string> = { inspections: 'felülvizsgálat', rooms: 'helyiség', points: 'mérési pont', catalog: 'katalóguselem', boards: 'elosztó', circuits: 'áramkör', checks: 'ellenőrzési tétel', defects: 'hiba', photos: 'fénykép', instruments: 'mérőműszer', roomTemplates: 'helyiségjavaslat', settings: 'beállítás' };

function Storage() {
  const { installEvent, offlineReady } = usePwa();
  const [info, setInfo] = useState<{ persisted?: boolean; usage?: number; quota?: number }>({});
  const load = async () => { const e = await navigator.storage?.estimate?.(); setInfo({ persisted: await navigator.storage?.persisted?.(), usage: e?.usage, quota: e?.quota }); };
  useEffect(() => { void load(); }, []);
  const mb = (x?: number) => (x === undefined ? '?' : (x / 1048576).toFixed(0) + ' MB');
  const sw = 'serviceWorker' in navigator && location.protocol !== 'file:';
  return <section className="bg-white border border-line rounded-md p-4 space-y-2 text-sm">
    <h2 className="font-semibold text-base">Telepítés, offline használat és tárhely</h2>
    <p>Kapcsolat: {navigator.onLine ? 'online' : 'offline'} · Offline használat: {!sw ? 'ebben a megnyitási módban nem érhető el (telepíthető, hostolt változatban működik)' : offlineReady ? 'kész' : 'a betöltés után automatikusan elérhető'}</p>
    <p>Tartós tárhely: {info.persisted === undefined ? 'nem támogatott' : info.persisted ? 'igen' : 'nem (a böngésző szükség esetén törölhet adatot, ezért mentsd rendszeresen)'} · Foglalt hely: {mb(info.usage)} / {mb(info.quota)}</p>
    <div className="flex flex-wrap gap-2">
      {installEvent && <button className="btn btn-primary" onClick={() => installEvent.prompt()}>Alkalmazás telepítése</button>}
      {info.persisted === false && <button className="btn" onClick={async () => { await navigator.storage.persist(); await load(); }}>Tartós tárhely kérése</button>}
    </div>
    <p>iPhone/iPad: Safariban a Megosztás menü, majd „Főképernyőhöz adás”. Androidon és számítógépen a böngésző telepítési felajánlása vagy a fenti gomb használható.</p>
  </section>;
}

export default function Settings() {
  const saved = useLiveQuery(async () => ((await db.settings.get('defaultInspector'))?.value as string | undefined) ?? '', []);
  const [draft, setDraft] = useState<string | null>(null);
  const counts = useLiveQuery(async () => { const o: Record<string, number> = {}; for (const t of db.tables) o[t.name] = await t.count(); return o; }, []) ?? {};
  const [bk, setBk] = useState<{ b: Backup; info: Awaited<ReturnType<typeof analyzeBackup>> } | null>(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(''); setMsg(''); setBk(null);
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try { const b = parseBackup(await f.text()); setBk({ b, info: await analyzeBackup(b) }); } catch (x) { setErr((x as Error).message); }
  }
  async function restore() {
    if (!bk) return;
    const ov = bk.info.rows.inspections?.existing ?? 0;
    if (!confirm(`Visszaállítod a mentést?${ov ? `\n${ov} már létező felülvizsgálat adatai felülíródnak a mentés tartalmával.` : ''}\nA mentésben nem szereplő adataid megmaradnak. A művelet előtt a rendszer automatikusan letölt egy biztonsági mentést a jelenlegi állapotról.`)) return;
    try {
      await downloadBackup(undefined, 'biztonsagi_mentes_visszaallitas_elott');
      const r = await tracked(() => applyBackup(bk.b));
      setMsg(`Visszaállítva: ${r.result.inspections ?? 0} felülvizsgálat, ${r.result.points ?? 0} mérési pont.${r.merged ? ` ${r.merged} azonos nevű katalógus-/helyiségjavaslat a meglévővel lett egyesítve.` : ''}`);
      setBk(null);
    } catch (x) { setErr('A visszaállítás sikertelen, az adataid nem változtak: ' + (x as Error).message); }
  }

  return <div className="space-y-6 max-w-2xl">
    <h1 className="text-2xl font-bold">Beállítások</h1>
    <section className="bg-white border border-line rounded-md p-4 space-y-3">
      <h2 className="font-semibold">Alapértelmezett felülvizsgáló neve</h2>
      <div className="flex gap-2">
        <input className="inp" value={draft ?? saved ?? ''} onChange={e => setDraft(e.target.value)} />
        <button className="btn btn-primary" disabled={draft === null} onClick={async () => { await tracked(() => db.settings.put({ key: 'defaultInspector', value: (draft ?? '').trim() })); setDraft(null); }}>Mentés</button>
      </div>
    </section>

    <section className="bg-white border border-line rounded-md p-4 space-y-3">
      <h2 className="font-semibold">Adatmentés és visszaállítás</h2>
      <p className="text-sm">Az adataid csak ebben a böngészőben és ezen a címen vannak tárolva. Rendszeresen mentsd le őket, és minden frissítés előtt is.</p>
      <p className="text-sm">Jelenleg: {Object.entries(counts).filter(([n]) => LABEL[n] && n !== 'settings').map(([n, c]) => `${c} ${LABEL[n]}`).join(', ')}.</p>
      <button className="btn btn-primary" onClick={() => downloadBackup()}><Download size={18} />Összes adat mentése (.json)</button>
      <div className="border-t border-line pt-3 space-y-3">
        <label className="btn cursor-pointer"><Upload size={18} />Mentésfájl kiválasztása
          <input type="file" accept=".json,application/json" className="sr-only" onChange={pick} /></label>
        {err && <p className="text-bad font-semibold">{err}</p>}
        {msg && <p className="text-ok font-semibold">{msg}</p>}
        {bk && <div className="space-y-2">
          <p className="font-semibold">A fájl érvényes. Tartalma{bk.b.createdAt ? ` (${bk.b.createdAt.slice(0, 10)})` : ''}:</p>
          <ul className="text-sm list-disc pl-5">{Object.entries(bk.info.rows).filter(([n]) => LABEL[n] && n !== 'settings').map(([n, v]) =>
            <li key={n}>{v.total} {LABEL[n]}{v.existing ? `, ebből ${v.existing} már létezik (felülíródik)` : ''}</li>)}</ul>
          {bk.info.unknown.length > 0 && <p className="text-sm">Ismeretlen táblák kihagyva: {bk.info.unknown.join(', ')}.</p>}
          <button className="btn btn-primary" onClick={restore}>Visszaállítás (egyesítés a meglévő adatokkal)</button>
        </div>}
      </div>
    </section>

    <Storage />
    <section className="bg-white border border-line rounded-md p-4 text-sm space-y-1">
      <h2 className="font-semibold text-base">Alkalmazás információ</h2>
      <p>VILL-NOVA · adatbázis-verzió: {db.verno} · mentésformátum: v1</p>
    </section>
  </div>;
}
