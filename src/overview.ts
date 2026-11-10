import { valueStatus, type Point } from './db';

export const NO_RESULT = 'Nincs értékelve';
export interface Filters { room: string; element: string; result: string; incomplete: boolean; q: string }
export const EMPTY_FILTERS: Filters = { room: '', element: '', result: '', incomplete: false, q: '' };

export const missingCount = (p: Point) => p.values.filter(v => valueStatus(v) === 'hiányzik').length;
// Kitöltött: van minősítés, és nincs hiányzó mérési érték (a nem végezhető / nem alkalmazható mező nem hiányzó).
export const isComplete = (p: Point) => !!p.result && missingCount(p) === 0;
export const filtersActive = (f: Filters) => !!(f.room || f.element || f.result || f.incomplete || f.q.trim());

export function filterPoints(points: Point[], f: Filters): Point[] {
  const q = f.q.trim().toLowerCase();
  return points.filter(p => (!f.room || p.roomId === f.room) && (!f.element || p.elementName === f.element)
    && (!f.result || (f.result === NO_RESULT ? !p.result : p.result === f.result)) && (!f.incomplete || !isComplete(p))
    && (!q || `${p.identifier} ${p.elementName}`.toLowerCase().includes(q)));
}

export function stats(points: Point[]) {
  const byResult: Record<string, number> = {};
  for (const p of points) byResult[p.result || NO_RESULT] = (byResult[p.result || NO_RESULT] ?? 0) + 1;
  const complete = points.filter(isComplete).length;
  return { total: points.length, complete, incomplete: points.length - complete, withMissing: points.filter(p => missingCount(p) > 0).length, byResult,
    pct: points.length ? Math.round((complete / points.length) * 100) : 0 };
}
