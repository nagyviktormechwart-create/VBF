import { db, type CatalogItem, type Inspection, type Point, type Room } from './db';

// Kis-nagybetű és ékezet nélküli összehasonlítás (pl. „fürdoszoba” is megtalálja a „Fürdőszoba” helyiséget).
export const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export interface SearchResult {
  projects: Inspection[]; rooms: { room: Room; inspection?: Inspection }[]; points: { point: Point; room?: Room; inspection?: Inspection }[]; elements: CatalogItem[];
  more: { projects: boolean; rooms: boolean; points: boolean; elements: boolean };
}

// Több szóra is keres: minden szónak szerepelnie kell (projekt, cím, megrendelő, helyiség, mérési pont azonosítója, elem neve).
export async function searchAll(query: string, limit = 100): Promise<SearchResult | null> {
  const tokens = norm(query).split(/\s+/).filter(Boolean); if (!tokens.length) return null;
  const hit = (s: string) => { const h = norm(s); return tokens.every(t => h.includes(t)); };
  const inspections = await db.inspections.toArray(); const im = new Map(inspections.map(i => [i.id, i]));
  const rooms = await db.rooms.toArray(); const rm = new Map(rooms.map(r => [r.id, r]));
  const projects = inspections.filter(i => hit(`${i.name} ${i.property} ${i.address} ${i.client}`)).sort((a, b) => b.updatedAt - a.updatedAt);
  const roomHits = rooms.filter(r => hit(r.name)).sort((a, b) => (im.get(a.inspectionId)?.name ?? '').localeCompare(im.get(b.inspectionId)?.name ?? '', 'hu') || a.order - b.order);
  const points = await db.points.filter(p => hit(`${rm.get(p.roomId)?.name ?? ''} ${p.identifier} ${p.elementName}`)).limit(limit + 1).toArray();
  const elements = await db.catalog.filter(c => hit(c.name)).limit(limit + 1).toArray();
  return {
    projects: projects.slice(0, limit), rooms: roomHits.slice(0, limit).map(room => ({ room, inspection: im.get(room.inspectionId) })),
    points: points.slice(0, limit).map(point => ({ point, room: rm.get(point.roomId), inspection: im.get(point.inspectionId) })), elements: elements.slice(0, limit),
    more: { projects: projects.length > limit, rooms: roomHits.length > limit, points: points.length > limit, elements: elements.length > limit },
  };
}
