import Dexie, { type Table } from 'dexie';
import { create } from 'zustand';

export type Status = 'folyamatban' | 'befejezett' | 'archivált';
// 2. fázis: hálózati adatok a felülvizsgálat rekordján belül (opcionális, a régi projekteknél hiányzik). Minden érték szövegként tárolt.
export interface NetworkData { system?: string; phases?: string; voltage?: string; frequency?: string; feedMode?: string; feedName?: string;
  mainFuseType?: string; mainFuseCurrent?: string; mainFusePoles?: string; mainEarthTerminal?: string; earthingNote?: string; networkNote?: string }
export interface Inspection {
  id: string; name: string; property: string; address: string; buildingType: string;
  client: string; inspector: string; date: string; type: string; notes: string;
  status: Status; createdAt: number; updatedAt: number; network?: NetworkData;
  // 3. fázis: kiegészítő ingatlan-/felülvizsgálati adatok (opcionálisak)
  inspectorQualification?: string; inspectorLicense?: string; inspectorContact?: string; signaturePlace?: string; signatureDate?: string;
  clientAddress?: string; clientContact?: string; location?: string; legalBasis?: string; usage?: string; assetId?: string; scope?: string;
}
// 5. fázis: szemrevételezési ellenőrzőlista tételei (felülvizsgálatonként; az üres eredmény = még nincs értékelve)
export type CheckResult = '' | 'Megfelelő' | 'Nem megfelelő' | 'Nem alkalmazható' | 'Nem vizsgálható';
export const CHECK_RESULTS: Exclude<CheckResult, ''>[] = ['Megfelelő', 'Nem megfelelő', 'Nem alkalmazható', 'Nem vizsgálható'];
export interface Check { id: string; inspectionId: string; category: string; title: string; result: CheckResult; note: string;
  roomId?: string; boardId?: string; custom: boolean; order: number; createdAt: number; updatedAt: number }
// 6. fázis: hibák, fényképek, mérőműszerek
export const DEFECT_STATUSES = ['Nyitott', 'Javítás alatt', 'Javítva', 'Utóellenőrzés szükséges', 'Lezárva'] as const;
export type DefectStatus = typeof DEFECT_STATUSES[number];
export interface Defect { id: string; inspectionId: string; seq: number; code: string; title: string; description: string; category: string; severity: string;
  roomId?: string; boardId?: string; circuitId?: string; pointId?: string; checkId?: string; action: string; repairNeeded: '' | 'Igen' | 'Nem';
  status: DefectStatus; repairDate: string; recheck: string; note: string; createdAt: number; updatedAt: number }
export type PhotoOwner = 'point' | 'check' | 'defect';
// A kép adatai külön táblában (photoData) vannak, így a listák és az export gyors; a képek JPEG data URL-ként tárolódnak (a JSON-mentés is tartalmazza őket).
export interface Photo { id: string; inspectionId: string; ownerType: PhotoOwner; ownerId: string; seq: number; code: string; name: string; mime: string;
  width: number; height: number; size: number; thumb: string; caption: string; createdAt: number }
export interface Instrument { id: string; inspectionId: string; manufacturer: string; type: string; serial: string; deviceId: string; calDoc: string; calDate: string; note: string; createdAt: number }
export interface Board { id: string; inspectionId: string; identifier: string; name: string; location: string; feed: string; voltage: string;
  mainSwitch: string; mainProtection: string; note: string; order: number; createdAt: number }
export interface Circuit { id: string; inspectionId: string; boardId: string; identifier: string; name: string; function: string; protType: string;
  characteristic: string; current: string; poles: string; breaking: string; cableMaterial: string; crossSection: string; phases: string;
  note: string; order: number; createdAt: number }
export interface Room { id: string; inspectionId: string; name: string; order: number; createdAt: number }
export interface RoomTemplate { id: string; name: string; custom: boolean }
// A kategória, lista, alapérték, kötelező jelleg és megjegyzés opcionális: a régi mezők változatlanul működnek.
export type FieldType = 'decimal' | 'text' | 'date' | 'bool' | 'select';
export interface FieldDef { id: string; label: string; unit: string; type: FieldType;
  category?: string; options?: string[]; defaultValue?: string; required?: boolean; note?: string }
export type ValueStatus = 'rögzítve' | 'hiányzik' | 'nem végezhető' | 'nem alkalmazható';
export interface CatalogItem { id: string; name: string; category: string; enabled: boolean; favorite: boolean; custom: boolean; fields: FieldDef[] }
export interface PointValue { label: string; unit: string; type: FieldType; value: string | number | null; fieldId?: string; status?: ValueStatus }
// A régi rekordoknál nincs állapot: azt az érték alapján számoljuk. A 0 valódi mérési érték.
export const valueStatus = (v: PointValue): ValueStatus => v.status ?? (v.value === null || v.value === '' ? 'hiányzik' : 'rögzítve');
export interface Point { id: string; inspectionId: string; roomId: string; catalogId?: string; elementName: string; identifier: string;
  values: PointValue[]; boardId?: string; circuitId?: string; result: string; note: string; createdAt: number; updatedAt: number }
export const RESULTS = ['Megfelelő', 'Nem megfelelő', 'Nem értékelhető', 'További vizsgálat szükséges'];
export const CATEGORIES = ['Dugaljak és kapcsolók', 'Világítás', 'Elosztók és védelem', 'Földelés és EPH', 'Egyéb berendezés'];
export interface Setting { key: string; value: unknown }

class VbfDb extends Dexie {
  inspections!: Table<Inspection, string>;
  rooms!: Table<Room, string>;
  roomTemplates!: Table<RoomTemplate, string>;
  settings!: Table<Setting, string>;
  catalog!: Table<CatalogItem, string>;
  points!: Table<Point, string>;
  boards!: Table<Board, string>;
  circuits!: Table<Circuit, string>;
  checks!: Table<Check, string>;
  defects!: Table<Defect, string>;
  photos!: Table<Photo, string>;
  photoData!: Table<{ id: string; inspectionId: string; data: string }, string>;
  instruments!: Table<Instrument, string>;
  constructor() {
    super('vbf-master');
    // v1: 2. szakasz. A katalógus, mérési pontok és értékek táblái a következő szakaszokban új verzióként kerülnek be.
    this.version(1).stores({
      inspections: 'id, status, updatedAt, name',
      rooms: 'id, inspectionId, [inspectionId+order]',
      roomTemplates: 'id, &name',
      settings: 'key'
    });
    this.version(2).stores({ catalog: 'id, &name, category, favorite, enabled', points: 'id, inspectionId, roomId, updatedAt' });
    // v3: csak új táblák (additív), a meglévő adatok nem változnak.
    this.version(3).stores({ boards: 'id, inspectionId', circuits: 'id, inspectionId, boardId' });
    this.version(4).stores({ checks: 'id, inspectionId, category' });
    this.version(5).stores({ defects: 'id, inspectionId, status', photos: 'id, inspectionId, [ownerType+ownerId]', photoData: 'id, inspectionId', instruments: 'id, inspectionId' });
  }
}
export const db = new VbfDb();

export const DEFAULT_ROOMS = ['Előszoba','Nappali','Konyha','Étkező','Hálószoba','Gyerekszoba','Fürdőszoba','WC',
  'Kamra','Garázs','Pince','Padlás','Kazánház','Gépészeti helyiség','Folyosó','Lépcsőház','Terasz','Egyéb'];
export const BUILDING_TYPES = ['Családi ház','Társasházi lakás','Iroda','Üzlethelyiség','Ipari létesítmény','Egyéb'];

const F = (label: string, unit = '', type: 'decimal' | 'text' = 'decimal'): FieldDef => ({ id: crypto.randomUUID(), label, unit, type });
const outletFields = () => [F('Hurokimpedancia', 'Ω'), F('Vonali impedancia', 'Ω'), F('PE-folytonosság', 'Ω'), F('Szigetelési ellenállás', 'MΩ'),
  F('Várható zárlati áram', 'A'), F('ÁVK kioldási idő', 'ms'), F('ÁVK kioldóáram', 'mA'), F('Névleges feszültség', 'V')];
const SEED: [string, string, () => FieldDef[]][] = [
  ...['Dugaszoló aljzat', 'Kettős dugaszoló aljzat'].map(n => [n, CATEGORIES[0], outletFields] as [string, string, () => FieldDef[]]),
  ...['Háromfázisú dugaszoló aljzat', 'Egypólusú kapcsoló', 'Kétpólusú kapcsoló', 'Váltókapcsoló', 'Keresztkapcsoló', 'Fényerőszabályzó'].map(n => [n, CATEGORIES[0], () => []] as [string, string, () => FieldDef[]]),
  ...['Lámpatest', 'Mennyezeti lámpa', 'Fali lámpa', 'LED világítás', 'Világítási áramkör'].map(n => [n, CATEGORIES[1], () => []] as [string, string, () => FieldDef[]]),
  ['Lakáselosztó', CATEGORIES[2], () => [F('Elosztó azonosítója', '', 'text'), F('Betáplálás', '', 'text'), F('Védelmi készülék típusa', '', 'text'),
    F('Névleges áram', 'A'), F('Névleges feszültség', 'V'), F('Szigetelési ellenállás', 'MΩ'), F('PE/N állapot', '', 'text')]],
  ...['Főelosztó', 'Kismegszakító', 'Áram-védőkapcsoló (ÁVK)', 'Túlfeszültség-védelmi eszköz', 'Főkapcsoló', 'Sorkapocs', 'PE sín', 'N sín'].map(n => [n, CATEGORIES[2], () => []] as [string, string, () => FieldDef[]]),
  ['EPH-csomópont', CATEGORIES[3], () => [F('EPH-folytonosság', 'Ω'), F('Vizsgált vezető vagy szerkezeti elem', '', 'text'), F('Vezető anyaga', '', 'text'), F('Vezető keresztmetszete', 'mm²')]],
  ['EPH-vezető', CATEGORIES[3], () => [F('EPH-folytonosság', 'Ω'), F('Vezető anyaga', '', 'text'), F('Vezető keresztmetszete', 'mm²')]],
  ...['Védővezető', 'Földelővezető', 'Földelési pont', 'Földelőszonda', 'Fő földelőkapocs', 'Fém vízvezeték', 'Fém gázvezeték', 'Fém fűtési csővezeték', 'Egyéb idegen vezetőképes rész'].map(n => [n, CATEGORIES[3], () => []] as [string, string, () => FieldDef[]]),
  ...['Villanybojler', 'Elektromos sütő', 'Főzőlap', 'Klímaberendezés', 'Kazán', 'Szivattyú', 'Elektromos motor', 'Gépészeti berendezés', 'Elektromos kéziszerszám', 'Egyéb villamos berendezés'].map(n => [n, CATEGORIES[4], () => []] as [string, string, () => FieldDef[]]),
];
export async function addCatalogItem(name: string, category: string, fields: FieldDef[], custom = true) {
  name = name.trim(); if (!name) throw new Error('Add meg az elem nevét.');
  if (await db.catalog.where('name').equalsIgnoreCase(name).first()) throw new Error('Ilyen nevű elem már szerepel a katalógusban.');
  const id = crypto.randomUUID();
  await db.catalog.add({ id, name, category, enabled: true, favorite: false, custom, fields });
  return id;
}
export async function savePoint(p: Omit<Point, 'createdAt' | 'updatedAt'> & { createdAt?: number }) {
  return tracked(async () => {
    const t = Date.now();
    await db.points.put({ ...p, createdAt: p.createdAt ?? t, updatedAt: t });
    await db.inspections.update(p.inspectionId, { updatedAt: t });
  });
}
export const deletePoint = (id: string) => tracked(() => db.transaction('rw', [db.points, db.photos, db.photoData, db.defects], async () => {
  const p = await db.points.get(id); if (!p) return;
  await removePhotosOf('point', [id]); await unlinkDefects(p.inspectionId, 'pointId', [id]); await db.points.delete(id);
}));

export async function seed() {
  if ((await db.catalog.count()) === 0)
    await db.catalog.bulkAdd(SEED.map(([name, category, f], i) => ({ id: crypto.randomUUID(), name, category, enabled: true, favorite: i < 3, custom: false, fields: f() })));
  // Meglévő katalógus frissítése: Hurokimpedancia és Vonali impedancia legyen az első két mező
  for (const c of await db.catalog.filter(c => !c.custom && c.fields.some(f => f.label === 'Hurokimpedancia')).toArray()) {
    const hur = c.fields.find(f => f.label === 'Hurokimpedancia')!;
    const von = c.fields.find(f => f.label === 'Vonali impedancia') ?? F('Vonali impedancia', 'Ω');
    const next = [hur, von, ...c.fields.filter(f => f !== hur && f.label !== 'Vonali impedancia')];
    if (next.length !== c.fields.length || next.some((f, i) => f.id !== c.fields[i].id)) await db.catalog.update(c.id, { fields: next });
  }
  if ((await db.roomTemplates.count()) === 0)
    await db.roomTemplates.bulkAdd(DEFAULT_ROOMS.map(name => ({ id: crypto.randomUUID(), name, custom: false })));
}

// Mentési állapotjelző
type SaveState = 'idle' | 'saving' | 'saved';
export const useSave = create<{ s: SaveState; set: (s: SaveState) => void }>(set => ({ s: 'idle', set: s => set({ s }) }));
export async function tracked<T>(fn: () => Promise<T>): Promise<T> {
  useSave.getState().set('saving');
  try { const r = await fn(); useSave.getState().set('saved'); return r; }
  catch (e) { useSave.getState().set('idle'); alert('Mentési hiba: ' + (e as Error).message); throw e; }
}

const now = () => Date.now();
export const createInspection = (d: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt' | 'status'>) =>
  tracked(async () => {
    const id = crypto.randomUUID();
    await db.inspections.add({ ...d, id, status: 'folyamatban', createdAt: now(), updatedAt: now() });
    return id;
  });
export const updateInspection = (id: string, p: Partial<Inspection>) =>
  tracked(() => db.inspections.update(id, { ...p, updatedAt: now() }));
export const deleteInspection = (id: string) =>
  tracked(() => db.transaction('rw', [db.inspections, db.rooms, db.points, db.boards, db.circuits, db.checks, db.defects, db.photos, db.photoData, db.instruments], async () => {
    for (const t of [db.photoData, db.photos, db.defects, db.instruments]) await (t as Dexie.Table).where('inspectionId').equals(id).delete();
    await db.checks.where('inspectionId').equals(id).delete();
    await db.circuits.where('inspectionId').equals(id).delete();
    await db.boards.where('inspectionId').equals(id).delete();
    await db.points.where('inspectionId').equals(id).delete();
    await db.rooms.where('inspectionId').equals(id).delete();
    await db.inspections.delete(id);
  }));
export const duplicateInspection = (id: string) =>
  tracked(() => db.transaction('rw', [db.inspections, db.rooms, db.boards, db.circuits, db.checks, db.instruments], async () => {
    const src = await db.inspections.get(id); if (!src) return;
    const nid = crypto.randomUUID();
    await db.inspections.add({ ...src, id: nid, name: src.name + ' (másolat)', status: 'folyamatban', createdAt: now(), updatedAt: now() });
    const rooms = await db.rooms.where('inspectionId').equals(id).toArray();
    const rmap = new Map<string, string>();
    await db.rooms.bulkAdd(rooms.map(r => { const x = crypto.randomUUID(); rmap.set(r.id, x); return { ...r, id: x, inspectionId: nid, createdAt: now() }; }));
    const bmap = new Map<string, string>();
    const boards = await db.boards.where('inspectionId').equals(id).toArray();
    await db.boards.bulkAdd(boards.map(b => { const x = crypto.randomUUID(); bmap.set(b.id, x); return { ...b, id: x, inspectionId: nid, createdAt: now() }; }));
    const circuits = await db.circuits.where('inspectionId').equals(id).toArray();
    await db.circuits.bulkAdd(circuits.map(c => ({ ...c, id: crypto.randomUUID(), inspectionId: nid, boardId: bmap.get(c.boardId) ?? c.boardId, createdAt: now() })));
    const ins = await db.instruments.where('inspectionId').equals(id).toArray();
    await db.instruments.bulkAdd(ins.map(i => ({ ...i, id: crypto.randomUUID(), inspectionId: nid, createdAt: now() })));
    // az ellenőrzőlista szerkezete másolódik, az értékelések és megjegyzések nem
    const checks = await db.checks.where('inspectionId').equals(id).toArray();
    await db.checks.bulkAdd(checks.map(c => ({ ...c, id: crypto.randomUUID(), inspectionId: nid, result: '' as CheckResult, note: '',
      roomId: c.roomId ? rmap.get(c.roomId) : undefined, boardId: c.boardId ? bmap.get(c.boardId) : undefined, createdAt: now(), updatedAt: now() })));
  }));

export const addRoom = (inspectionId: string, name: string) =>
  tracked(() => db.transaction('rw', db.rooms, db.roomTemplates, db.inspections, async () => {
    name = name.trim(); if (!name) throw new Error('A helyiség neve nem lehet üres.');
    const rooms = await db.rooms.where('inspectionId').equals(inspectionId).toArray();
    if (rooms.some(r => r.name.toLowerCase() === name.toLowerCase())) throw new Error('Ilyen nevű helyiség már van ebben a felülvizsgálatban.');
    await db.rooms.add({ id: crypto.randomUUID(), inspectionId, name, order: rooms.length, createdAt: now() });
    if (!(await db.roomTemplates.where('name').equalsIgnoreCase(name).first()))
      await db.roomTemplates.add({ id: crypto.randomUUID(), name, custom: true });
    await db.inspections.update(inspectionId, { updatedAt: now() });
  }));
export const renameRoom = (id: string, name: string) => tracked(() => db.rooms.update(id, { name: name.trim() }));
export const deleteRoom = (id: string) => tracked(() => db.transaction('rw', [db.rooms, db.points, db.checks, db.defects, db.photos, db.photoData], async () => {
  const r = await db.rooms.get(id);
  if (r) {
    for (const c of (await db.checks.where('inspectionId').equals(r.inspectionId).toArray()).filter(c => c.roomId === id)) await db.checks.update(c.id, { roomId: undefined });
    const pts = (await db.points.where('roomId').equals(id).primaryKeys()) as string[];
    await removePhotosOf('point', pts); await unlinkDefects(r.inspectionId, 'pointId', pts); await unlinkDefects(r.inspectionId, 'roomId', [id]);
  }
  await db.points.where('roomId').equals(id).delete(); await db.rooms.delete(id); }));
export const moveRoom = (list: Room[], i: number, dir: -1 | 1) =>
  tracked(() => db.transaction('rw', db.rooms, async () => {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    await db.rooms.update(list[i].id, { order: j });
    await db.rooms.update(list[j].id, { order: i });
  }));

// 3. fázis: elosztótáblák és áramkörök
export const saveBoard = (b: Omit<Board, 'order' | 'createdAt'> & { order?: number; createdAt?: number }) =>
  tracked(async () => {
    const sib = await db.boards.where('inspectionId').equals(b.inspectionId).toArray();
    const ident = b.identifier.trim(); if (!ident) throw new Error('Az elosztó azonosítója kötelező.');
    if (sib.some(x => x.id !== b.id && x.identifier.toLowerCase() === ident.toLowerCase())) throw new Error('Ilyen azonosítójú elosztó már van ebben a felülvizsgálatban.');
    await db.boards.put({ ...b, identifier: ident, order: b.order ?? sib.length, createdAt: b.createdAt ?? now() });
    await db.inspections.update(b.inspectionId, { updatedAt: now() });
  });
export const saveCircuit = (c: Omit<Circuit, 'order' | 'createdAt'> & { order?: number; createdAt?: number }) =>
  tracked(async () => {
    const sib = await db.circuits.where('boardId').equals(c.boardId).toArray();
    const ident = c.identifier.trim(); if (!ident) throw new Error('Az áramkör azonosítója kötelező.');
    if (sib.some(x => x.id !== c.id && x.identifier.toLowerCase() === ident.toLowerCase())) throw new Error('Ilyen azonosítójú áramkör már van ennél az elosztónál.');
    await db.circuits.put({ ...c, identifier: ident, order: c.order ?? sib.length, createdAt: c.createdAt ?? now() });
    await db.inspections.update(c.inspectionId, { updatedAt: now() });
  });
// Törléskor a hozzárendelt mérési pontok megmaradnak, csak az elosztó-/áramkör-összerendelésük törlődik.
export const deleteBoard = (id: string) => tracked(() => db.transaction('rw', [db.boards, db.circuits, db.points, db.checks, db.defects], async () => {
  const b = await db.boards.get(id); if (!b) return;
  const cids = new Set((await db.circuits.where('boardId').equals(id).toArray()).map(c => c.id));
  await unlinkDefects(b.inspectionId, 'boardId', [id]); await unlinkDefects(b.inspectionId, 'circuitId', [...cids]);
  for (const p of (await db.points.where('inspectionId').equals(b.inspectionId).toArray()).filter(p => p.boardId === id || (p.circuitId && cids.has(p.circuitId))))
    await db.points.update(p.id, { boardId: undefined, circuitId: undefined });
  for (const c of (await db.checks.where('inspectionId').equals(b.inspectionId).toArray()).filter(c => c.boardId === id)) await db.checks.update(c.id, { boardId: undefined });
  await db.circuits.where('boardId').equals(id).delete(); await db.boards.delete(id);
}));
export const deleteCircuit = (id: string) => tracked(() => db.transaction('rw', [db.circuits, db.points, db.defects], async () => {
  const c = await db.circuits.get(id); if (!c) return;
  await unlinkDefects(c.inspectionId, 'circuitId', [id]);
  for (const p of (await db.points.where('inspectionId').equals(c.inspectionId).toArray()).filter(p => p.circuitId === id))
    await db.points.update(p.id, { circuitId: undefined });
  await db.circuits.delete(id);
}));

// 5. fázis: ellenőrzőlista
export const addChecks = (inspectionId: string, items: { category: string; title: string; custom?: boolean }[]) => tracked(() => db.transaction('rw', db.checks, db.inspections, async () => {
  const ex = await db.checks.where('inspectionId').equals(inspectionId).toArray();
  const have = new Set(ex.map(c => `${c.category}|${c.title}`.toLowerCase()));
  let order = ex.length; const t = now();
  const rows: Check[] = [];
  for (const i of items) {
    const title = i.title.trim(); if (!title) continue;
    if (!i.custom && have.has(`${i.category}|${title}`.toLowerCase())) continue;   // sablontételből nem készül duplikátum
    rows.push({ id: crypto.randomUUID(), inspectionId, category: i.category, title, result: '', note: '', custom: !!i.custom, order: order++, createdAt: t, updatedAt: t });
  }
  await db.checks.bulkAdd(rows); await db.inspections.update(inspectionId, { updatedAt: t });
  return rows.length;
}));
export const updateCheck = (id: string, patch: Partial<Check>) => tracked(() => db.checks.update(id, { ...patch, updatedAt: now() }));
export const deleteCheck = (id: string) => tracked(() => db.transaction('rw', [db.checks, db.photos, db.photoData, db.defects], async () => {
  const c = await db.checks.get(id); if (!c) return;
  await removePhotosOf('check', [id]); await unlinkDefects(c.inspectionId, 'checkId', [id]); await db.checks.delete(id);
}));

// 6. fázis: hibák, fényképek, mérőműszerek
async function removePhotosOf(type: PhotoOwner, ownerIds: string[]) {
  for (const oid of ownerIds) { const ids = (await db.photos.where('[ownerType+ownerId]').equals([type, oid]).primaryKeys()) as string[]; await db.photoData.bulkDelete(ids); await db.photos.bulkDelete(ids); }
}
async function unlinkDefects(inspectionId: string, field: 'roomId' | 'boardId' | 'circuitId' | 'pointId' | 'checkId', ids: string[]) {
  if (!ids.length) return;
  for (const d of (await db.defects.where('inspectionId').equals(inspectionId).toArray()).filter(d => d[field] && ids.includes(d[field]!))) await db.defects.update(d.id, { [field]: undefined });
}
export const createDefect = (inspectionId: string, pre: Partial<Defect> = {}) => tracked(() => db.transaction('rw', [db.defects, db.inspections], async () => {
  const ex = await db.defects.where('inspectionId').equals(inspectionId).toArray();
  const seq = Math.max(0, ...ex.map(d => d.seq)) + 1; const t = now(); const id = crypto.randomUUID();
  await db.defects.add({ title: '', description: '', category: '', severity: '', action: '', repairNeeded: '', status: 'Nyitott', repairDate: '', recheck: '', note: '',
    ...pre, id, inspectionId, seq, code: `H-${String(seq).padStart(3, '0')}`, createdAt: t, updatedAt: t });
  await db.inspections.update(inspectionId, { updatedAt: t }); return id;
}));
export const updateDefect = (id: string, patch: Partial<Defect>) => tracked(() => db.defects.update(id, { ...patch, updatedAt: now() }));
export const deleteDefect = (id: string) => tracked(() => db.transaction('rw', [db.defects, db.photos, db.photoData], async () => { await removePhotosOf('defect', [id]); await db.defects.delete(id); }));

export const savePhoto = (p: { inspectionId: string; ownerType: PhotoOwner; ownerId: string; name: string; data: string; thumb: string; width: number; height: number; caption?: string }) =>
  tracked(() => db.transaction('rw', [db.photos, db.photoData, db.inspections], async () => {
    const ex = await db.photos.where('inspectionId').equals(p.inspectionId).toArray();
    const seq = Math.max(0, ...ex.map(x => x.seq)) + 1; const id = crypto.randomUUID(); const t = now();
    await db.photos.add({ id, inspectionId: p.inspectionId, ownerType: p.ownerType, ownerId: p.ownerId, seq, code: `FOTO-${String(seq).padStart(3, '0')}`, name: p.name,
      mime: 'image/jpeg', width: p.width, height: p.height, size: Math.round(p.data.length * 0.75), thumb: p.thumb, caption: p.caption ?? '', createdAt: t });
    await db.photoData.add({ id, inspectionId: p.inspectionId, data: p.data });
    await db.inspections.update(p.inspectionId, { updatedAt: t }); return id;
  }));
export const updatePhoto = (id: string, patch: Partial<Photo>) => tracked(() => db.photos.update(id, patch));
export const deletePhoto = (id: string) => tracked(() => db.transaction('rw', [db.photos, db.photoData], async () => { await db.photoData.delete(id); await db.photos.delete(id); }));

export const saveInstrument = (i: Omit<Instrument, 'createdAt'> & { createdAt?: number }) => tracked(() => db.instruments.put({ ...i, createdAt: i.createdAt ?? now() }));
export const deleteInstrument = (id: string) => tracked(() => db.instruments.delete(id));
