import { z } from 'zod';
import { db } from './db';

export const FORMAT = 'vill-nova-backup';
export const BACKUP_VERSION = 1;
type Row = Record<string, unknown>;
export interface Backup { format: string; version: number; dbVersion?: number; createdAt?: string; tables: Record<string, Row[]> }

// Mentés: minden tábla (a későbbi fázisok új táblái automatikusan bekerülnek), vagy egyetlen felülvizsgálat adatai.
export async function makeBackup(inspectionId?: string): Promise<Backup> {
  const tables: Record<string, Row[]> = {};
  for (const t of db.tables) {
    const rows = (await t.toArray()) as Row[];
    tables[t.name] = inspectionId
      ? rows.filter(r => t.name === 'inspections' ? r.id === inspectionId : 'inspectionId' in r ? r.inspectionId === inspectionId : true)
      : rows;
  }
  return { format: FORMAT, version: BACKUP_VERSION, dbVersion: db.verno, createdAt: new Date().toISOString(), tables };
}

export async function downloadBackup(inspectionId?: string, label = 'mentes') {
  const b = await makeBackup(inspectionId);
  let part = '';
  if (inspectionId) part = '_' + ((await db.inspections.get(inspectionId))?.name ?? 'projekt').replace(/[^\p{L}\p{N}]+/gu, '_');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
  a.download = `VILL-NOVA_${label}${part}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}

const base = z.object({
  format: z.literal(FORMAT, { errorMap: () => ({ message: 'Ez nem VILL-NOVA mentésfájl.' }) }),
  version: z.number().int().min(1), dbVersion: z.number().optional(), createdAt: z.string().optional(),
  tables: z.record(z.array(z.record(z.unknown())))
});
const id = z.string().min(1);
const RULES: Record<string, z.ZodTypeAny> = {
  inspections: z.object({ id, name: z.string() }).passthrough(),
  rooms: z.object({ id, inspectionId: z.string(), name: z.string() }).passthrough(),
  points: z.object({ id, inspectionId: z.string(), roomId: z.string(), elementName: z.string(), identifier: z.string(), values: z.array(z.unknown()) }).passthrough(),
  catalog: z.object({ id, name: z.string(), fields: z.array(z.unknown()) }).passthrough(),
  roomTemplates: z.object({ id, name: z.string() }).passthrough(),
  boards: z.object({ id, inspectionId: z.string(), identifier: z.string() }).passthrough(),
  circuits: z.object({ id, inspectionId: z.string(), boardId: z.string(), identifier: z.string() }).passthrough(),
  checks: z.object({ id, inspectionId: z.string(), category: z.string(), title: z.string() }).passthrough(),
  defects: z.object({ id, inspectionId: z.string(), title: z.string() }).passthrough(),
  photos: z.object({ id, inspectionId: z.string(), ownerType: z.string(), ownerId: z.string() }).passthrough(),
  photoData: z.object({ id, inspectionId: z.string(), data: z.string() }).passthrough(),
  instruments: z.object({ id, inspectionId: z.string() }).passthrough(),
  settings: z.object({ key: z.string().min(1) }).passthrough(),
};

// Ellenőrzés: a meglévő adatokhoz hozzányúlás előtt.
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('A fájl nem olvasható: nem érvényes JSON.'); }
  const r = base.safeParse(raw);
  if (!r.success) throw new Error(r.error.issues[0].message.startsWith('Ez nem') ? r.error.issues[0].message : 'A fájl szerkezete hibás, nem VILL-NOVA mentés.');
  if (r.data.version > BACKUP_VERSION) throw new Error('A mentés újabb verzióból származik, frissítsd az alkalmazást.');
  for (const [name, rows] of Object.entries(r.data.tables)) {
    const rule = RULES[name]; if (!rule) continue;
    for (let i = 0; i < rows.length; i++) {
      const p = rule.safeParse(rows[i]);
      if (!p.success) throw new Error(`Hibás adat a(z) „${name}” táblában (${i + 1}. sor, mező: ${p.error.issues[0].path.join('.') || '-'}).`);
    }
  }
  return r.data as Backup;
}

export async function analyzeBackup(b: Backup) {
  const rows: Record<string, { total: number; existing: number }> = {};
  for (const t of db.tables) {
    const r = b.tables[t.name]; if (!r) continue;
    const kp = t.schema.primKey.keyPath as string;
    const ex = await t.bulkGet(r.map(x => x[kp] as string));
    rows[t.name] = { total: r.length, existing: ex.filter(Boolean).length };
  }
  return { rows, unknown: Object.keys(b.tables).filter(n => !db.tables.some(t => t.name === n)) };
}

// Visszaállítás = egyesítés egyetlen tranzakcióban: a mentésben nem szereplő adatok megmaradnak,
// az azonos azonosítójúak felülíródnak. Hiba esetén semmi sem változik.
export async function applyBackup(b: Backup) {
  const result: Record<string, number> = {}; let merged = 0;
  await db.transaction('rw', db.tables, async () => {
    const remap = new Map<string, string>();
    for (const t of [...db.tables].sort((a, c) => (a.name === 'catalog' ? -1 : 0) - (c.name === 'catalog' ? -1 : 0))) {
      let rows = b.tables[t.name]; if (!rows?.length) continue;
      if (t.name === 'catalog' || t.name === 'roomTemplates') {
        const ex = (await t.toArray()) as Row[];
        const byName = new Map(ex.map(e => [String(e.name).toLowerCase(), e]));
        rows = rows.filter(r => { const e = byName.get(String(r.name).toLowerCase());
          if (e && e.id !== r.id) { remap.set(String(r.id), String(e.id)); merged++; return false; } return true; });
      }
      if (t.name === 'points') rows = rows.map(r => r.catalogId && remap.has(String(r.catalogId)) ? { ...r, catalogId: remap.get(String(r.catalogId)) } : r);
      await t.bulkPut(rows); result[t.name] = rows.length;
    }
  });
  return { result, merged };
}
