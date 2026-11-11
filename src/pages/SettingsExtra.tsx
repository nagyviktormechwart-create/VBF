import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { addRoomTemplate, db, deleteRoomTemplate, removeDefaultUnit, renameRoomTemplate, setDefaultUnit, setRoomTemplateHidden, wipeAll, getDefaultUnits } from '../db';
import { downloadBackup } from '../backup';

const card = 'bg-surface border border-line rounded-md p-4 space-y-3';

export function RoomSuggestions() {
  const list = (useLiveQuery(() => db.roomTemplates.toArray(), []) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  const [name, setName] = useState('');
  return <section className={card}>
    <h2 className="font-semibold">Helyiségjavaslatok</h2>
    <p className="text-sm">Ezek jelennek meg gyorsgombként egy felülvizsgálat helyiségeinél. Az alap javaslatok elrejthetők, az egyéniek átnevezhetők és törölhetők. A már felvett helyiségeket ez nem érinti.</p>
    <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); try { await addRoomTemplate(name); setName(''); } catch { /* a hibát a mentés jelzi */ } }}>
      <input className="inp" placeholder="Új helyiségjavaslat" value={name} onChange={e => setName(e.target.value)} /><button className="btn btn-primary">Hozzáadás</button></form>
    <ul className="divide-y divide-line border border-line rounded-md">{list.map(t => <li key={t.id} className={`flex items-center gap-2 p-2 ${t.hidden ? 'opacity-50' : ''}`}>
      <span className="flex-1">{t.name}{t.custom && <span className="text-xs ml-2">egyéni</span>}{t.hidden && <span className="text-xs ml-2">elrejtve</span>}</span>
      {t.custom ? <>
        <button className="btn min-h-10 px-2" aria-label="Átnevezés" onClick={() => { const n = prompt('Új név:', t.name); if (n?.trim()) renameRoomTemplate(t.id, n).catch(() => {}); }}><Pencil size={16} /></button>
        <button className="btn btn-danger min-h-10 px-2" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd a(z) „${t.name}” javaslatot?`)) deleteRoomTemplate(t.id); }}><Trash2 size={16} /></button></>
        : <button className="btn min-h-10 px-2" aria-label={t.hidden ? 'Megjelenítés' : 'Elrejtés'} onClick={() => setRoomTemplateHidden(t.id, !t.hidden)}>{t.hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>}
    </li>)}</ul>
  </section>;
}

export function DefaultUnits() {
  const units = useLiveQuery(getDefaultUnits, []) ?? {};
  const [label, setLabel] = useState(''); const [unit, setUnit] = useState('');
  return <section className={card}>
    <h2 className="font-semibold">Alapértelmezett mértékegységek</h2>
    <p className="text-sm">Ha egyéni mérési mezőt hozol létre, és a neve szerepel itt, a mértékegység automatikusan kitöltődik. A meglévő mezők és mérések nem változnak.</p>
    <form className="grid grid-cols-[1fr_7rem_auto] gap-2" onSubmit={async e => { e.preventDefault(); try { await setDefaultUnit(label, unit); setLabel(''); setUnit(''); } catch { /* a hibát a mentés jelzi */ } }}>
      <input className="inp" placeholder="Mező neve (pl. Hurokimpedancia)" value={label} onChange={e => setLabel(e.target.value)} />
      <input className="inp" placeholder="Egység" value={unit} onChange={e => setUnit(e.target.value)} /><button className="btn btn-primary">Mentés</button></form>
    {Object.keys(units).length > 0 && <ul className="divide-y divide-line border border-line rounded-md">{Object.entries(units).sort(([a], [b]) => a.localeCompare(b, 'hu')).map(([k, u]) =>
      <li key={k} className="flex items-center gap-2 p-2"><span className="flex-1">{k}</span><span className="font-semibold">{u}</span>
        <button className="btn btn-danger min-h-10 px-2" aria-label="Törlés" onClick={() => removeDefaultUnit(k)}><Trash2 size={16} /></button></li>)}</ul>}
  </section>;
}

export function CatalogInfo() {
  const c = useLiveQuery(() => db.catalog.toArray(), []) ?? [];
  return <section className={card}>
    <h2 className="font-semibold">Mérési elemek és mezők</h2>
    <p className="text-sm">{c.length} elem · {c.filter(x => x.custom).length} egyéni · {c.filter(x => x.favorite).length} kedvenc · {c.filter(x => !x.enabled).length} letiltott</p>
    <p className="text-sm">Az elemek, a kedvencek és az elemenkénti mérési mezők (sorrend, egyéni mezők) a katalógusban kezelhetők.</p>
    <Link to="/katalogus" className="btn inline-flex">Megnyitás: Mérési elem katalógus</Link>
  </section>;
}

export function DataManagement() {
  const [msg, setMsg] = useState('');
  async function wipe() {
    if (prompt('Ez minden felülvizsgálatot, mérést, fényképet és katalógus-módosítást töröl ebből a böngészőből.\nA művelet előtt automatikusan mentést töltünk le.\n\nA megerősítéshez gépeld be: TÖRLÉS') !== 'TÖRLÉS') return;
    await downloadBackup(undefined, 'biztonsagi_mentes_torles_elott');
    await wipeAll(); setMsg('Az adatok törölve lettek, az alap katalógus újra betöltődött. A törlés előtti mentésfájl letöltődött.');
  }
  return <section className={card}>
    <h2 className="font-semibold">Adatkezelés</h2>
    <p className="text-sm">A minden adat törlése végleges. Csak akkor használd, ha a mentésfájl már biztonságban van.</p>
    <button className="btn btn-danger" onClick={wipe}><Trash2 size={18} />Összes adat törlése</button>
    {msg && <p className="text-okfg font-semibold text-sm">{msg}</p>}
  </section>;
}
