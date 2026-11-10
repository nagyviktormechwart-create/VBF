import ExcelJS from 'exceljs';
import { valueStatus, type PointValue } from './db';
import { categoryOf } from './fields';
import { CHECK_CATEGORIES } from './checklist';
import { loadBundle } from './data';
import { pointState, validateBundle } from './validate';

const NA = 'Nincs megadva';
const FILL: Record<string, string> = { 'Megfelelő': 'FFC6EFCE', 'Nem megfelelő': 'FFFFC7CE', 'Nem értékelhető': 'FFD9D9D9', 'További vizsgálat szükséges': 'FFFFEB9C',
  'Nem alkalmazható': 'FFD9D9D9', 'Nem vizsgálható': 'FFFFEB9C', 'Nincs értékelve': 'FFEDEDED', 'Figyelmeztetés': 'FFFFEB9C' };
type Cell = string | number | Date | null;

function sheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: Cell[][], widths?: number[]) {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB7DFC8' } };
  rows.forEach(r => ws.addRow(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  headers.forEach((h, i) => { ws.getColumn(i + 1).width = widths?.[i] ?? Math.min(40, Math.max(12, h.length + 4)); });
  return ws;
}
// Kulcs-érték munkalap: Adat | Érték | Állapot (a hiányzó adat állapota is látszik)
const kv = (wb: ExcelJS.Workbook, name: string, rows: [string, Cell][]) => {
  const ws = sheet(wb, name, ['Adat', 'Érték', 'Állapot'], rows.map(([k, v]) => { const t = v instanceof Date ? v : typeof v === 'string' ? v.trim() : v;
    return [k, t === '' ? null : t, t === '' || t === null ? NA : 'Megadva']; }), [44, 50, 16]);
  ws.eachRow((row, n) => { if (n > 1 && row.getCell(2).value instanceof Date) row.getCell(2).numFmt = 'yyyy-mm-dd hh:mm'; });
  return ws;
};
const colour = (ws: ExcelJS.Worksheet, col: number) => ws.eachRow((row, n) => { if (n > 1) { const f = FILL[String(row.getCell(col).value)]; if (f) row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f } }; } });
const num = (t: string) => (t.trim() && !Number.isNaN(Number(t)) ? Number(t) : t.trim() || null);
const key = (v: { label: string; unit: string }) => (v.unit ? `${v.label} (${v.unit})` : v.label);
// Mért érték a táblázatban: a nem végezhető / nem alkalmazható állapot szövegesen látszik, a hiányzó érték üres, a 0 valódi érték.
const cellOf = (v: PointValue): Cell => { const s = valueStatus(v); return s === 'rögzítve' ? v.value : s === 'hiányzik' ? null : s === 'nem végezhető' ? 'Nem végezhető' : 'Nem alkalmazható'; };
const AVK_EXTRA = ['Névleges áram', 'Áramkör azonosítója', 'Mérési módszer', 'Mérési körülmények', 'Mérési megjegyzés'];
const AVK_ORDER = ['ÁVK típusa', 'ÁVK névleges hibaárama', 'ÁVK pólusszáma', 'Névleges áram', 'Áramkör azonosítója', 'ÁVK kioldási idő', 'ÁVK kioldási idő 1/2x 0°', 'ÁVK kioldási idő 1/2x 180°',
  'ÁVK kioldási idő 1x 0°', 'ÁVK kioldási idő 1x 180°', 'ÁVK kioldási idő 5x 0°', 'ÁVK kioldási idő 5x 180°', 'ÁVK kioldóáram', 'Mérési módszer', 'Mérési körülmények', 'Mérési megjegyzés'];

export async function exportInspection(id: string) {
  const B = await loadBundle(id); if (!B) return;
  const { insp, rooms, points, boards, circuits, checks, defects, photos, instruments } = B;
  const rname = new Map(rooms.map(r => [r.id, r.name])); const bm = new Map(boards.map(b => [b.id, b])); const cm = new Map(circuits.map(c => [c.id, c]));
  const pm = new Map(points.map(p => [p.id, p])); const km = new Map(checks.map(c => [c.id, c])); const dm = new Map(defects.map(d => [d.id, d]));
  const bid = (x: { boardId?: string }) => (x.boardId && bm.get(x.boardId)?.identifier) || NA;
  const cid = (x: { circuitId?: string }) => (x.circuitId && cm.get(x.circuitId)?.identifier) || NA;
  const room = (rid?: string) => (rid && rname.get(rid)) || NA;
  const defOf = (pid: string) => defects.filter(d => d.pointId === pid).map(d => d.code).join(', ');
  const wb = new ExcelJS.Workbook();

  // 1–2. Ingatlan és felülvizsgálat
  kv(wb, 'INGATLAN ADATAI', [['Projekt neve', insp.name], ['Ingatlan megnevezése', insp.property], ['Ingatlan címe', insp.address], ['Épülettípus', insp.buildingType],
    ['Épület vagy berendezés azonosítója', insp.assetId ?? ''], ['Az ingatlan használatának jellege', insp.usage ?? ''], ['Megrendelő', insp.client], ['Megrendelő címe', insp.clientAddress ?? ''],
    ['Megrendelő elérhetősége', insp.clientContact ?? ''], ['Általános megjegyzések', insp.notes]]);
  kv(wb, 'FELÜLVIZSGÁLAT ADATAI', [['Felülvizsgálat ID', insp.id], ['Projekt állapota', insp.status], ['Felülvizsgálat dátuma', insp.date], ['Felülvizsgálat típusa', insp.type],
    ['Felülvizsgálat helyszíne', insp.location ?? ''], ['A vizsgálat megrendelésének / jogalapjának megjelölése', insp.legalBasis ?? ''], ['A felülvizsgálat terjedelme', insp.scope ?? ''],
    ['Felülvizsgáló neve', insp.inspector], ['Felülvizsgáló szakképesítése', insp.inspectorQualification ?? ''], ['Jogosultság vagy képesítés azonosítója', insp.inspectorLicense ?? ''],
    ['Felülvizsgáló elérhetősége', insp.inspectorContact ?? ''], ['Aláírás helye', insp.signaturePlace ?? ''], ['Aláírás dátuma', insp.signatureDate ?? ''],
    ['Projekt létrehozva', new Date(insp.createdAt)], ['Projekt utolsó módosítása', new Date(insp.updatedAt)], ['Exportálás időpontja', new Date()], ['Export szerkezetének verziója', '2']]);

  // 3–5. Hálózat, elosztók, áramkörök
  const nw = insp.network ?? {};
  const NW: [string, string | undefined, boolean][] = [['Hálózati rendszer', nw.system, false], ['Fázisok száma', nw.phases, true], ['Névleges hálózati feszültség (V)', nw.voltage, true],
    ['Névleges frekvencia (Hz)', nw.frequency, true], ['Betáplálás módja', nw.feedMode, false], ['Betáplálás megnevezése', nw.feedName, false], ['Főbiztosító típusa', nw.mainFuseType, false],
    ['Főbiztosító névleges árama (A)', nw.mainFuseCurrent, true], ['Főbiztosító pólusszáma', nw.mainFusePoles, false], ['Fő földelőkapocs adatai', nw.mainEarthTerminal, false],
    ['Földelési rendszerre vonatkozó megjegyzés', nw.earthingNote, false], ['Hálózati kialakítás megjegyzése', nw.networkNote, false]];
  kv(wb, 'HÁLÓZATI ADATOK', NW.map(([k, v, n]) => [k, n ? num(v ?? '') ?? '' : v ?? '']));
  sheet(wb, 'ELOSZTÓTÁBLÁK', ['Elosztó ID', 'Elosztó azonosítója', 'Elosztó megnevezése', 'Elhelyezkedése', 'Betáplálás megnevezése', 'Névleges feszültség (V)', 'Főkapcsoló adatai',
    'Fő védelmi készülék adatai', 'Megjegyzés', 'Áramkörök száma', 'Mérési pontok száma'],
    boards.map(b => [b.id, b.identifier, b.name, b.location, b.feed, num(b.voltage), b.mainSwitch, b.mainProtection, b.note,
      circuits.filter(c => c.boardId === b.id).length, points.filter(p => p.boardId === b.id).length]), [38, 18, 24, 22, 24, 14, 22, 24, 30, 12, 12]);
  sheet(wb, 'ÁRAMKÖRÖK', ['Áramkör ID', 'Elosztó ID', 'Elosztó azonosítója', 'Áramkör azonosítója', 'Áramkör megnevezése', 'Áramkör funkciója', 'Védelmi készülék típusa',
    'Védelmi készülék karakterisztikája', 'Névleges áram (A)', 'Pólusszám', 'Megszakítóképesség (kA)', 'Vezeték anyaga', 'Vezeték keresztmetszete (mm²)', 'Fázis(ok)', 'Megjegyzés', 'Mérési pontok száma'],
    circuits.map(c => [c.id, c.boardId, bm.get(c.boardId)?.identifier ?? NA, c.identifier, c.name, c.function, c.protType, c.characteristic, num(c.current), c.poles,
      num(c.breaking), c.cableMaterial, num(c.crossSection), c.phases, c.note, points.filter(p => p.circuitId === c.id).length]), [38, 38, 16, 16, 24, 22, 22, 18, 12, 10, 14, 12, 14, 12, 30, 12]);

  // 6. Helyiségek
  sheet(wb, 'HELYISÉGEK', ['Helyiség ID', 'Sorszám', 'Helyiség neve', 'Mérési pontok száma', 'Szemrevételezési tételek száma', 'Hibák száma'],
    rooms.map((r, i) => [r.id, i + 1, r.name, points.filter(p => p.roomId === r.id).length, checks.filter(c => c.roomId === r.id).length, defects.filter(d => d.roomId === r.id).length]), [38, 10, 28, 14, 18, 12]);

  // 7. Mérési pontok (egy sor pontonként)
  const pws = sheet(wb, 'MÉRÉSI PONTOK', ['Mérési pont ID', 'Sorszám', 'Helyiség ID', 'Helyiség', 'Mérési pont azonosítója', 'Mérési elem típusa', 'Katalógus elem ID', 'Elosztó ID', 'Elosztó',
    'Áramkör ID', 'Áramkör', 'Minősítés', 'Állapot', 'Mért mezők száma', 'Hiányzó értékek száma', 'Nem végezhető / nem alkalmazható mezők száma', 'Fényképek száma', 'Kapcsolódó hibák',
    'Megjegyzés', 'Létrehozva', 'Módosítva'],
    points.map((p, i) => { const st = p.values.map(valueStatus);
      return [p.id, i + 1, p.roomId, room(p.roomId), p.identifier, p.elementName, p.catalogId ?? NA, p.boardId ?? NA, bid(p), p.circuitId ?? NA, cid(p), p.result || 'Nincs értékelve', pointState(p),
        st.filter(s => s === 'rögzítve').length, st.filter(s => s === 'hiányzik').length, st.filter(s => s !== 'rögzítve' && s !== 'hiányzik').length,
        photos.filter(f => f.ownerType === 'point' && f.ownerId === p.id).length, defOf(p.id), p.note, new Date(p.createdAt), new Date(p.updatedAt)]; }),
    [38, 9, 38, 20, 28, 26, 38, 38, 14, 38, 14, 22, 34, 10, 12, 16, 10, 16, 36, 18, 18]);
  pws.getColumn(20).numFmt = 'yyyy-mm-dd hh:mm'; pws.getColumn(21).numFmt = 'yyyy-mm-dd hh:mm'; colour(pws, 12);

  // 8. Mérési eredmények (széles táblázat, dinamikus mezőoszlopokkal)
  const cols: string[] = []; points.forEach(p => p.values.forEach(v => { if (!cols.includes(key(v))) cols.push(key(v)); }));
  const head = ['Sorszám', 'Helyiség', 'Mérési pont azonosítója', 'Mérési elem típusa', 'Elosztó', 'Áramkör', ...cols, 'Minősítés', 'Megjegyzés', 'Mérési időpont',
    'Mérési pont ID', 'Helyiség ID', 'Elosztó ID', 'Áramkör ID'];
  const ws = sheet(wb, 'MÉRÉSI EREDMÉNYEK', head, points.map((p, i) => [i + 1, room(p.roomId), p.identifier, p.elementName, bid(p), cid(p),
    ...cols.map(c => { const v = p.values.find(x => key(x) === c); return v ? cellOf(v) : null; }), p.result, p.note, new Date(p.updatedAt), p.id, p.roomId, p.boardId ?? NA, p.circuitId ?? NA]));
  const rc = 7 + cols.length; ws.getColumn(rc + 1).width = 40; ws.getColumn(rc + 2).numFmt = 'yyyy-mm-dd hh:mm'; ws.getColumn(rc + 2).width = 18;
  cols.forEach((_, i) => { ws.getColumn(7 + i).numFmt = '0.0##'; }); colour(ws, rc);

  // 9. Mérési mezők (egy sor mezőnként, az érték állapotával)
  const det: Cell[][] = []; let n = 0;
  points.forEach(p => p.values.forEach(v => det.push([++n, room(p.roomId), p.identifier, p.elementName, bid(p), cid(p), v.label, cellOf(v), v.unit, p.result, categoryOf(v), valueStatus(v), p.id, v.fieldId ?? NA])));
  sheet(wb, 'MÉRÉSI MEZŐK', ['Sorszám', 'Helyiség', 'Mérési pont azonosítója', 'Mérési elem típusa', 'Elosztó', 'Áramkör', 'Mérési mező neve', 'Mért érték', 'Mértékegység', 'Minősítés',
    'Mezőcsoport', 'Érték állapota', 'Mérési pont ID', 'Mező ID'], det, [9, 20, 28, 26, 14, 14, 34, 14, 12, 18, 28, 18, 38, 38]);

  // 10. ÁVK-vizsgálatok: azok a pontok, ahol ÁVK-mezőt választottak ki
  const avkPts = points.filter(p => p.values.some(v => categoryOf(v) === 'ÁVK-vizsgálatok'));
  const acols = [...new Set(avkPts.flatMap(p => p.values.filter(v => categoryOf(v) === 'ÁVK-vizsgálatok' || AVK_EXTRA.includes(v.label)).map(key)))]
    .sort((a, b) => { const f = (x: string) => { const i = AVK_ORDER.indexOf(x.replace(/ \(.*\)$/, '')); return i < 0 ? 99 : i; }; return f(a) - f(b) || a.localeCompare(b, 'hu'); });
  const aws = sheet(wb, 'ÁVK VIZSGÁLATOK', ['Mérési pont ID', 'Helyiség', 'Mérési pont azonosítója', 'Mérési elem típusa', 'Elosztó', 'Áramkör', ...acols, 'Minősítés', 'Megjegyzés'],
    avkPts.map(p => [p.id, room(p.roomId), p.identifier, p.elementName, bid(p), cid(p), ...acols.map(c => { const v = p.values.find(x => key(x) === c); return v ? cellOf(v) : null; }), p.result, p.note]),
    [38, 20, 28, 26, 14, 14, ...acols.map(() => 16), 18, 36]);
  acols.forEach((_, i) => { aws.getColumn(7 + i).numFmt = '0.0##'; }); colour(aws, 7 + acols.length);

  // 11. Szemrevételezés
  const ci = (c: string) => { const i = CHECK_CATEGORIES.indexOf(c); return i < 0 ? 99 : i; };
  const cs = [...checks].sort((a, b) => ci(a.category) - ci(b.category) || a.order - b.order);
  colour(sheet(wb, 'SZEMREVÉTELEZÉS', ['Tétel ID', 'Sorszám', 'Kategória', 'Ellenőrzési tétel', 'Helyiség', 'Elosztó', 'Eredmény', 'Megjegyzés', 'Kapcsolódó hibák', 'Fényképek száma'],
    cs.map((c, i) => [c.id, i + 1, c.category, c.title, room(c.roomId), bid(c), c.result || 'Nincs értékelve', c.note, defects.filter(d => d.checkId === c.id).map(d => d.code).join(', '),
      photos.filter(f => f.ownerType === 'check' && f.ownerId === c.id).length]), [38, 9, 26, 52, 20, 16, 18, 40, 16, 10]), 7);

  // 12. Hibák és megjegyzések (hibajegyzék)
  sheet(wb, 'HIBÁK ÉS MEGJEGYZÉSEK', ['Hiba ID', 'Hiba azonosítója', 'Hiba megnevezése', 'Részletes leírás', 'Kategória', 'Súlyosság / besorolás', 'Helyiség', 'Elosztó', 'Áramkör',
    'Mérési pont azonosítója', 'Mérési pont ID', 'Szemrevételezési tétel', 'Tétel ID', 'Javasolt intézkedés', 'Javítás szükséges', 'Javítás állapota', 'Javítás dátuma',
    'Utóellenőrzés eredménye', 'Megjegyzés', 'Fényképek'],
    defects.map(d => { const pt = d.pointId ? pm.get(d.pointId) : undefined; const ck = d.checkId ? km.get(d.checkId) : undefined;
      return [d.id, d.code, d.title, d.description, d.category, d.severity, room(d.roomId), bid(d), cid(d), pt?.identifier ?? NA, pt?.id ?? NA, ck?.title ?? NA, ck?.id ?? NA, d.action,
        d.repairNeeded || 'Nincs eldöntve', d.status, d.repairDate, d.recheck, d.note, photos.filter(f => f.ownerType === 'defect' && f.ownerId === d.id).map(f => f.code).join(', ')]; }),
    [38, 12, 30, 40, 18, 18, 18, 14, 14, 24, 38, 30, 38, 34, 14, 22, 14, 30, 30, 20]);
  const bad = points.filter(p => ['Nem megfelelő', 'Nem értékelhető', 'További vizsgálat szükséges'].includes(p.result));
  colour(sheet(wb, 'ELTÉRŐ MÉRÉSI PONTOK', ['Mérési pont ID', 'Helyiség', 'Mérési pont azonosítója', 'Mérési elem típusa', 'Minősítés', 'Megjegyzés', 'Kapcsolódó hibák'],
    bad.map(p => [p.id, room(p.roomId), p.identifier, p.elementName, p.result, p.note, defOf(p.id) || NA]), [38, 20, 28, 28, 28, 50, 16]), 5);

  // 13–14. Fényképek, mérőműszerek
  const owner = (f: { ownerType: string; ownerId: string }): [string, string] => {
    if (f.ownerType === 'point') { const p = pm.get(f.ownerId); return ['Mérési pont', p ? `${room(p.roomId)} – ${p.identifier}` : NA]; }
    if (f.ownerType === 'check') return ['Szemrevételezési tétel', km.get(f.ownerId)?.title ?? NA];
    const d = dm.get(f.ownerId); return ['Hiba', d ? `${d.code} – ${d.title}` : NA];
  };
  sheet(wb, 'FÉNYKÉPEK ÉS MELLÉKLETEK', ['Fénykép ID', 'Fényképazonosító', 'Képfájl neve (ZIP-ben)', 'Tulajdonos típusa', 'Tulajdonos ID', 'Tulajdonos megnevezése', 'Képaláírás / megjegyzés',
    'Szélesség (px)', 'Magasság (px)', 'Méret (KB)', 'Készítés ideje'],
    photos.map(f => { const [t, nm] = owner(f); return [f.id, f.code, `${f.code}.jpg`, t, f.ownerId, nm, f.caption, f.width, f.height, Math.round(f.size / 1024), new Date(f.createdAt)]; }),
    [38, 16, 20, 22, 38, 40, 34, 12, 12, 10, 18]).getColumn(11).numFmt = 'yyyy-mm-dd hh:mm';
  sheet(wb, 'MÉRŐMŰSZEREK', ['Műszer ID', 'Gyártó', 'Típus', 'Gyári szám', 'Műszer azonosítója', 'Kalibrálási / ellenőrzési dokumentum', 'Kalibrálás / ellenőrzés dátuma', 'Megjegyzés'],
    instruments.map(i => [i.id, i.manufacturer, i.type, i.serial, i.deviceId, i.calDoc, i.calDate, i.note]), [38, 18, 24, 18, 18, 36, 18, 30]);

  // Az exportáláskori ellenőrzés eredménye (a dokumentumgenerálás számára is gépileg olvasható)
  const issues = validateBundle(B);
  colour(sheet(wb, 'EXPORT ELLENŐRZÉS', ['Sorszám', 'Szint', 'Kód', 'Tárgy típusa', 'Tárgy ID', 'Tárgy megnevezése', 'Megállapítás'],
    issues.map((s, i) => [i + 1, s.level, s.code, s.type, s.objectId || NA, s.label, s.message]), [9, 16, 30, 20, 38, 40, 80]), 2);

  const buf = await wb.xlsx.writeBuffer({ zip: { compression: 'DEFLATE', compressionOptions: { level: 1 } } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = `VBF_${insp.name.replace(/[^\p{L}\p{N}]+/gu, '_')}_${insp.date}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}
