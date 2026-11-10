import JSZip from 'jszip';
import { db } from './db';

async function load(file: Blob): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { src: b, w: b.width, h: b.height, done: () => b.close() }; } catch { /* tartalék módszer */ }
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}
function scaled(src: CanvasImageSource, w: number, h: number, max: number, q: number) {
  const k = Math.min(1, max / Math.max(w, h)); const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
  return { url: c.toDataURL('image/jpeg', q), w: c.width, h: c.height };
}
// A képet legfeljebb 1600 px-esre kicsinyítjük (JPEG), mellé 320 px-es előnézet készül.
export async function processImage(file: Blob) {
  const { src, w, h, done } = await load(file);
  try { const f = scaled(src, w, h, 1600, 0.8); const t = scaled(src, w, h, 320, 0.7); return { data: f.url, thumb: t.url, width: f.w, height: f.h }; } finally { done(); }
}

export async function exportPhotosZip(inspectionId: string) {
  const photos = await db.photos.where('inspectionId').equals(inspectionId).sortBy('seq');
  if (!photos.length) { alert('Ebben a felülvizsgálatban még nincs fénykép.'); return; }
  const zip = new JSZip();
  for (const p of photos) { const d = await db.photoData.get(p.id); if (d) zip.file(`${p.code}.jpg`, d.data.split(',')[1], { base64: true }); }
  const name = ((await db.inspections.get(inspectionId))?.name ?? 'projekt').replace(/[^\p{L}\p{N}]+/gu, '_');
  const a = document.createElement('a'); a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
  a.download = `VILL-NOVA_fenykepek_${name}_${new Date().toISOString().slice(0, 10)}.zip`; a.click(); URL.revokeObjectURL(a.href);
}
