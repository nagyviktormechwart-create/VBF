import { db, type Board, type Check, type Circuit, type Defect, type Inspection, type Instrument, type Photo, type Point, type Room } from './db';

export interface Bundle { insp: Inspection; rooms: Room[]; points: Point[]; boards: Board[]; circuits: Circuit[]; checks: Check[]; defects: Defect[]; photos: Photo[]; instruments: Instrument[] }

// Egy felülvizsgálat összes adata egyben (a képek tartalma nélkül), az export és az ellenőrzés közös alapja.
export async function loadBundle(id: string): Promise<Bundle | undefined> {
  const insp = await db.inspections.get(id); if (!insp) return;
  const rooms = await db.rooms.where('inspectionId').equals(id).sortBy('order');
  const order = new Map(rooms.map((r, i) => [r.id, i]));
  const points = (await db.points.where('inspectionId').equals(id).toArray()).sort((a, b) => (order.get(a.roomId)! - order.get(b.roomId)!) || a.createdAt - b.createdAt);
  return { insp, rooms, points,
    boards: await db.boards.where('inspectionId').equals(id).sortBy('order'), circuits: await db.circuits.where('inspectionId').equals(id).sortBy('order'),
    checks: await db.checks.where('inspectionId').equals(id).sortBy('order'), defects: await db.defects.where('inspectionId').equals(id).sortBy('seq'),
    photos: await db.photos.where('inspectionId').equals(id).sortBy('seq'),
    instruments: (await db.instruments.where('inspectionId').equals(id).toArray()).sort((a, b) => a.createdAt - b.createdAt) };
}
