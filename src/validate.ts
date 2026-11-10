import { valueStatus, type Point } from './db';
import { categoryOf } from './fields';
import { loadBundle, type Bundle } from './data';

export interface Issue { level: 'Figyelmeztetés' | 'Információ'; code: string; type: string; objectId: string; label: string; message: string }
const BAD = ['Nem megfelelő', 'Nem értékelhető', 'További vizsgálat szükséges'];
const OPEN = ['Nyitott', 'Javítás alatt', 'Utóellenőrzés szükséges'];

// A mérési pont állapota: különválasztja a nem mért, a rögzített, a nem végezhető/alkalmazható és az értékelt eseteket.
export function pointState(p: Point): string {
  const st = p.values.map(valueStatus); const rec = st.filter(s => s === 'rögzítve').length; const na = st.filter(s => s !== 'rögzítve' && s !== 'hiányzik').length;
  if (st.length && na === st.length) return 'Mérés nem végezhető / nem alkalmazható';
  if (!p.result) return rec ? 'Rögzítve, nincs értékelve' : 'Nincs mérve, nincs értékelve';
  return rec ? 'Értékelve' : 'Értékelve, mért érték nélkül';
}

export function validateBundle(B: Bundle): Issue[] {
  const out: Issue[] = []; const { insp, rooms, points, boards, circuits, checks, defects, instruments } = B;
  const add = (level: Issue['level'], code: string, type: string, objectId: string, label: string, message: string) => out.push({ level, code, type, objectId, label, message });
  const rn = new Map(rooms.map(r => [r.id, r.name]));
  const W = 'Figyelmeztetés', I = 'Információ';

  if (!insp.inspector.trim()) add(W, 'NINCS_FELULVIZSGALO', 'Felülvizsgálat', insp.id, insp.name, 'A felülvizsgáló neve nincs megadva.');
  if (!insp.network?.system) add(W, 'HALOZATI_RENDSZER', 'Hálózati adatok', insp.id, insp.name, 'A hálózati rendszer nincs megadva.');
  if (points.length && !instruments.length) add(W, 'NINCS_MUSZER', 'Mérőműszer', insp.id, insp.name, 'Van mérési pont, de nincs mérőműszer megadva.');
  for (const m of instruments) if (!m.calDate) add(I, 'MUSZER_KALIBRALAS', 'Mérőműszer', m.id, [m.manufacturer, m.type].filter(Boolean).join(' '), 'Nincs kalibrálási / ellenőrzési dátum megadva.');

  for (const c of circuits) if (!c.protType.trim() || !c.current.trim())
    add(W, 'HIANYZO_VEDELMI_ADAT', 'Áramkör', c.id, `${boards.find(b => b.id === c.boardId)?.identifier ?? ''} / ${c.identifier}`, 'Hiányzik a védelmi készülék típusa vagy névleges árama.');

  const seen = new Map<string, Point>();
  for (const p of points) {
    const label = `${rn.get(p.roomId) ?? ''} – ${p.identifier}`; const st = p.values.map(valueStatus);
    const miss = p.values.filter((_, i) => st[i] === 'hiányzik').map(v => v.label); const rec = st.filter(s => s === 'rögzítve').length;
    const linked = defects.filter(d => d.pointId === p.id);
    if (p.result === 'Megfelelő' && miss.length) add(W, rec ? 'MEGFELELO_HIANYOS' : 'MEGFELELO_ERTEK_NELKUL', 'Mérési pont', p.id, label,
      rec ? `„Megfelelő” minősítés, de hiányzó mérési érték: ${miss.join(', ')}.` : '„Megfelelő” minősítés mért érték nélkül.');
    if (!p.result && rec) add(I, 'NINCS_ERTEKELVE', 'Mérési pont', p.id, label, 'A mérés rögzítve van, de még nincs minősítés.');
    if (!p.result && p.values.length && !rec && miss.length === st.length) add(I, 'NINCS_MERVE', 'Mérési pont', p.id, label, 'Még nincs mért érték és minősítés.');
    if (BAD.includes(p.result) && !linked.length) add(W, 'ELTERES_HIBA_NELKUL', 'Mérési pont', p.id, label, `„${p.result}” minősítés, de nincs hozzá hiba rögzítve.`);
    if (p.result === 'Megfelelő' && linked.some(d => OPEN.includes(d.status))) add(W, 'ELLENTMONDAS_NYITOTT_HIBA', 'Mérési pont', p.id, label, '„Megfelelő” minősítés, de nyitott hiba tartozik hozzá.');
    if (circuits.length && (!p.boardId || !p.circuitId)) add(I, 'NINCS_ARAMKOR', 'Mérési pont', p.id, label, `Nincs ${p.boardId ? 'áramkörhöz' : 'elosztóhoz és áramkörhöz'} rendelve.`);
    const k = `${p.roomId}|${p.identifier.trim().toLowerCase()}`;
    if (seen.has(k)) add(W, 'AZONOS_AZONOSITO', 'Mérési pont', p.id, label, 'Ugyanebben a helyiségben már van ilyen azonosítójú mérési pont.'); else seen.set(k, p);
    const avk = p.values.filter(v => categoryOf(v) === 'ÁVK-vizsgálatok');
    if (avk.some(v => /^ÁVK kioldási idő|^ÁVK kioldóáram/.test(v.label) && valueStatus(v) === 'rögzítve')) {
      const need = ['ÁVK típusa', 'ÁVK névleges hibaárama'].filter(n => { const v = p.values.find(x => x.label === n); return !v || valueStatus(v) !== 'rögzítve'; });
      if (need.length) add(W, 'HIANYZO_AVK_ADAT', 'Mérési pont', p.id, label, `ÁVK-mérés rögzítve, de hiányzik: ${need.join(', ')}.`);
    }
  }

  const unevaluated = new Map<string, number>();
  for (const c of checks) {
    const linked = defects.filter(d => d.checkId === c.id);
    if (!c.result) unevaluated.set(c.category, (unevaluated.get(c.category) ?? 0) + 1);
    if (c.result === 'Nem megfelelő' && !linked.length) add(W, 'SZEMREV_ELTERES_HIBA_NELKUL', 'Szemrevételezés', c.id, c.title, '„Nem megfelelő” eredmény, de nincs hozzá hiba rögzítve.');
    if (c.result === 'Megfelelő' && linked.some(d => OPEN.includes(d.status))) add(W, 'ELLENTMONDAS_NYITOTT_HIBA', 'Szemrevételezés', c.id, c.title, '„Megfelelő” eredmény, de nyitott hiba tartozik hozzá.');
    if (c.result === 'Nem vizsgálható') add(I, 'SZEMREV_NEM_VIZSGALHATO', 'Szemrevételezés', c.id, c.title, 'A tétel nem vizsgálható.');
  }
  for (const [cat, n] of unevaluated) add(W, 'SZEMREV_NINCS_ERTEKELVE', 'Szemrevételezés', '', cat, `${n} ellenőrzési tétel még nincs értékelve.`);

  for (const d of defects) {
    const l = `${d.code} – ${d.title}`;
    if (OPEN.includes(d.status)) add(I, 'NYITOTT_HIBA', 'Hiba', d.id, l, `Lezáratlan hiba (állapot: ${d.status}).`);
    if (OPEN.includes(d.status) && !d.action.trim()) add(I, 'HIBA_INTEZKEDES_NELKUL', 'Hiba', d.id, l, 'Nincs javasolt intézkedés megadva.');
    if ((d.status === 'Javítva' || d.status === 'Lezárva') && !d.repairDate) add(I, 'HIBA_DATUM_NELKUL', 'Hiba', d.id, l, 'Nincs javítási dátum megadva.');
  }
  return out;
}
export async function validateInspection(id: string) { const B = await loadBundle(id); return B ? validateBundle(B) : []; }
