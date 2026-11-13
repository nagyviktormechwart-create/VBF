import { AlignmentType, Document, Footer, Header, ImageRun, Packer, PageNumber, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import { db, getDocTemplateOverrides, valueStatus, type Photo, type Point, type PointValue } from './db';
import { loadBundle, type Bundle } from './data';
import { DOC_TEMPLATES } from './doctemplates';
import { PROTECTION_GROUPS } from './protections';
import { CHECK_CATEGORIES } from './checklist';
import { categoryOf } from './fields';

export interface ReportOptions { photos: boolean; attachments: boolean }
type Img = { data: Uint8Array; width: number; height: number };
export type PhotoLoader = (p: Photo) => Promise<Img | undefined>;

const FONT = 'Arial';
const GREEN = 'D9EAD3', GREY = 'EDEDED', DARK = '1F2933';
const run = (text: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean; hl?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics, color: o.color, highlight: o.hl ? 'yellow' : undefined });
const miss = (what: string) => run(`[${what} nincs megadva]`, { hl: true });
const hd = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.replace(/-/g, '.') + '.' : d || '');
const par = (c: TextRun[] | string, o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number; size?: number; bold?: boolean; indent?: number; hang?: number; brk?: boolean; keep?: boolean } = {}) =>
  new Paragraph({ children: typeof c === 'string' ? [run(c, { size: o.size, bold: o.bold })] : c, alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 80 },
    indent: o.indent ? { left: o.indent, hanging: o.hang } : undefined, pageBreakBefore: o.brk, keepNext: o.keep });
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
const bullet = (s: string, size = 19) => par([run('• ' + s, { size })], { indent: 360, hang: 240, after: 40 });
const fit = (w: number[], total: number) => { const k = total / w.reduce((a, b) => a + b, 0); const r = w.map(x => Math.round(x * k)); r[r.length - 1] += total - r.reduce((a, b) => a + b, 0); return r; };

type Cell = string | { t?: string; runs?: TextRun[]; bold?: boolean; span?: number; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string };
interface Row { cells: Cell[]; header?: boolean; fill?: string }
function table(widths: number[], rows: Row[], size = 17) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: rows.map(r => { let col = 0;
      return new TableRow({ tableHeader: r.header, cantSplit: true, children: r.cells.map(c => {
        const o = typeof c === 'string' ? { t: c } : c; const span = o.span ?? 1; const w = widths.slice(col, col + span).reduce((a, b) => a + b, 0); col += span;
        return new TableCell({ width: { size: w, type: WidthType.DXA }, columnSpan: span > 1 ? span : undefined, verticalAlign: VerticalAlign.CENTER,
          shading: o.fill || r.fill || (r.header ? GREEN : undefined) ? { type: ShadingType.CLEAR, fill: o.fill ?? r.fill ?? GREEN, color: 'auto' } : undefined,
          margins: { top: 30, bottom: 30, left: 50, right: 50 },
          children: [new Paragraph({ alignment: o.align, spacing: { after: 0 }, children: o.runs ?? [run(o.t ?? '', { size, bold: o.bold ?? r.header, color: o.color })] })] }); }) }); }) });
}

const RES: Record<string, string> = { 'Megfelelő': 'MF', 'Nem megfelelő': 'NEM', 'Nem alkalmazható': 'NA', 'Nem vizsgálható': 'Nem vizsgálható', 'Nem értékelhető': 'Nem értékelhető', 'További vizsgálat szükséges': 'További vizsgálat' };
const resCell = (r: string, size = 17): Cell => r ? { t: RES[r] ?? r, bold: true, align: AlignmentType.CENTER } : { runs: [run('Nincs értékelve', { size: size - 2, hl: true })] };
const HEADINGS: Record<string, string> = { 'Szerkezetek szemrevételezése': 'A rögzített villamos berendezés szerkezetei szemrevételezése alapján:',
  'Szemrevételezés során történt ellenőrzések': 'Szemrevételezés során történt ellenőrzések:', 'Műszeres, méréses vizsgálatok': 'Műszeres, méréses vizsgálatok az MSZ HD 60364-6:2017 szakaszai szerint:' };

// Érték a mérési jegyzőkönyv táblázatába: „-” ha a mező nincs kiválasztva, „N.M.” ha nem végezhető, „?” ha hiányzik.
function show(v: PointValue | undefined, size = 16): Cell {
  if (!v) return { t: '-', align: AlignmentType.CENTER };
  const s = valueStatus(v);
  if (s === 'rögzítve' && v.value !== null && v.value !== '') return { t: String(v.value), align: AlignmentType.CENTER };
  if (s === 'nem végezhető') return { t: 'N.M.', align: AlignmentType.CENTER };
  if (s === 'nem alkalmazható') return { t: '-', align: AlignmentType.CENTER };
  return { runs: [run('?', { size, bold: true, color: 'C00000' })], align: AlignmentType.CENTER };
}
const get = (p: Point, label: string) => p.values.find(v => v.label === label);

export async function buildReport(B: Bundle, tx: (k: string) => string, loadPhoto: PhotoLoader, opt: ReportOptions): Promise<Document> {
  const { insp, rooms, points, circuits, boards, checks, defects, photos, instruments } = B;
  const nw = insp.network ?? {}; const sel = insp.protections ?? {};
  const rname = new Map(rooms.map(r => [r.id, r])); const cm = new Map(circuits.map(c => [c.id, c])); const bm = new Map(boards.map(b => [b.id, b]));
  const field = (label: string, v: string | undefined, what: string) => par([run(label + ' ', { bold: true }), v?.trim() ? run(v.trim()) : miss(what)], { after: 60 });
  const title = (t: string, brk = true) => par([run(t, { bold: true, size: 26 })], { align: AlignmentType.CENTER, after: 160, brk });
  const hdr = (first: boolean) => new Header({ children: first ? [par('')] : [par([run(tx('reportTitle'), { bold: true, size: 17 })], { after: 0 }), par([run(tx('standardTitle'), { size: 16 }), run('     Munkaszám: ', { size: 16 }), insp.workNumber ? run(insp.workNumber, { size: 16 }) : miss('munkaszám')], { after: 0 })] });
  const ftr = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`${insp.workNumber ?? ''}  ·  Oldal `, { size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 }), run(' / ', { size: 16 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16 })] })] });
  const A4 = { width: 11906, height: 16838 };
  const portrait = { page: { size: { ...A4, orientation: PageOrientation.PORTRAIT }, margin: { top: 1300, bottom: 1000, left: 1134, right: 1134, header: 500, footer: 450 } }, titlePage: true };
  const landscape = { page: { size: { ...A4, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1100, bottom: 900, left: 850, right: 850, header: 450, footer: 400 } } };
  const PW = 9638, LW = 15138;
  const hf = (first = false) => ({ headers: { default: hdr(false), first: hdr(first) }, footers: { default: ftr(), first: ftr() } });

  // 1. Címlap
  const cover: (Paragraph | Table)[] = [
    par([run('Munkaszám: ', { bold: true }), insp.workNumber ? run(insp.workNumber) : miss('munkaszám')], { after: 200 }),
    par([run(tx('reportTitle'), { bold: true, size: 32 })], { align: AlignmentType.CENTER, before: 300, after: 120 }),
    par([run(tx('standardTitle'), { bold: true, size: 26 })], { align: AlignmentType.CENTER, after: 320 }),
    field('A felülvizsgálat helye:', [insp.address, insp.parcelNumber ? `hrsz.: ${insp.parcelNumber}` : ''].filter(Boolean).join(', '), 'helyszín'),
    field('Megrendelő:', insp.client, 'megrendelő'),
    field('Az üzemi kísérő(k), vagy a megbízó részéről kijelölt kapcsolattartó(k) neve:', insp.contactPerson, 'kapcsolattartó'),
    field('A felülvizsgálat időtartama:', insp.duration, 'időtartam'),
    par('Felelős felülvizsgáló:', { before: 200, bold: true }),
    table(fit([3000, 3300, 3338], PW), [{ header: true, cells: ['Neve:', 'VBF bizonyítvány száma:', 'Tűzvédelmi szakvizsga bizonyítvány száma:'] },
      { cells: [insp.inspector || { runs: [miss('név')] }, insp.inspectorLicense || { runs: [miss('bizonyítványszám')] }, insp.inspectorFireCert || { runs: [miss('bizonyítványszám')] }] }], 18),
    par('Vizsgálat során használt műszerek:', { before: 200, bold: true }),
    table(fit([4000, 2900, 2738], PW), [{ header: true, cells: ['Típusa:', 'Gyári száma:', 'Kalibrálás ideje:'] },
      ...(instruments.length ? instruments.map(i => ({ cells: [[i.manufacturer, i.type].filter(Boolean).join(' '), i.serial, hd(i.calDate)] as Cell[] })) : [{ cells: [{ runs: [miss('mérőműszer')], span: 3 }] as Cell[] }])], 18),
    par('A jegyzőkönyvben használt rövidítések:', { before: 200, bold: true }),
    table(fit([1400, 8238], PW), lines(tx('abbreviations')).map(l => ({ cells: l.split('\t').map((x, i) => ({ t: x, bold: i === 0 })) as Cell[] })), 18),
    par('Tartalom:', { before: 200, bold: true }), ...lines(tx('contents')).map(l => par(l, { after: 30, size: 19 })),
  ];

  // 2. Minősítő irat
  const q: (Paragraph | Table)[] = [title('MINŐSÍTŐ IRAT'), par(tx('qualIntro'), { after: 120 }), par(tx('qualPrefix'), { after: 60 }),
    par(insp.overallResult ? [run(insp.overallResult, { bold: true, size: 32 })] : [miss('összesített minősítés')], { align: AlignmentType.CENTER, before: 80, after: 160 }),
    par(tx('qualNote'), { after: 160 }),
    par('A MINŐSÍTETT – VIZSGÁLT – TERÜLET PONTOS MEGHATÁROZÁSA:', { bold: true, after: 60 }), par(tx('qualScope'), { after: 160 }),
    par('Megjegyzések az üzemeltető, felelős vezető, tulajdonos, felhasználó részére:', { bold: true, after: 60 }), ...lines(tx('operatorNotes')).map(l => bullet(l)),
    par('A következő áramütés elleni védelem ellenőrzésével kapcsolatos vizsgálat elvégzésének legkésőbbi időpontja és módja:', { bold: true, before: 160, after: 60 }),
    table(fit([3000, 6638], PW), [{ cells: [{ t: 'Általános előírás(ok):', bold: true }, insp.generalRegulation || { runs: [miss('előírás')] }] },
      { cells: [{ t: 'Vizsgálat módja:', bold: true }, insp.inspectionMode || { runs: [miss('vizsgálat módja')] }] },
      { cells: [{ t: 'Legközelebbi vizsgálat időpontja:', bold: true }, insp.nextInspectionDate ? hd(insp.nextInspectionDate) : { runs: [miss('időpont')] }] }], 19),
    par(tx('periodic'), { before: 100, after: 80, size: 19 }), ...lines(tx('footnotes')).map(l => par(l, { size: 15, after: 20 }))];

  // 3. Minősítési alapadatok
  const volt = [nw.voltage?.trim() && `${nw.voltage.trim()} V`, nw.frequency?.trim() && `${nw.frequency.trim()} Hz`].filter(Boolean).join(' ');
  const base: (Paragraph | Table)[] = [title('MINŐSÍTÉSI ALAPADATOK'), field('A villamos berendezés névleges feszültsége:', volt, 'feszültség'), field('A villamos hálózat rendszere:', nw.system, 'hálózati rendszer'),
    field('Alapvető érintésvédelmi mód:', insp.basicProtection, 'érintésvédelmi mód'),
    par('A felülvizsgálattal kapcsolatos előírások:', { bold: true, before: 160, after: 60 }), ...lines(tx('regulations')).map(l => par(l, { after: 40, size: 19 })),
    par('A felülvizsgálattal kapcsolatos főbb szabványok:', { bold: true, before: 160, after: 60 }), ...lines(tx('standards')).map(l => par(l, { after: 40, size: 19 })),
    par('A felülvizsgált rendszerek, védelmi módok és érintésvédelmi osztályok (☒ = felülvizsgálva):', { bold: true, before: 160, after: 60 }),
    ...PROTECTION_GROUPS.flatMap(g => [par(g.title, { bold: true, size: 18, before: 80, after: 30, keep: true }), ...g.items.map(i => par([run(((sel[g.key] ?? []).includes(i) ? '☒ ' : '☐ ') + i, { size: 18, bold: (sel[g.key] ?? []).includes(i) })], { indent: 300, hang: 0, after: 20 }))])];

  // 4. Vizsgálati eredmények összefoglalása
  const ci = (c: string) => { const i = CHECK_CATEGORIES.indexOf(c); return i < 0 ? 99 : i; };
  const cats = [...new Set([...checks].sort((a, b) => ci(a.category) - ci(b.category)).map(c => c.category))];
  const defOf = (pred: (d: Bundle['defects'][number]) => boolean) => defects.filter(pred).map(d => `Hiba ${d.seq}.`).join(', ');
  const sum: (Paragraph | Table)[] = [title('VIZSGÁLATI EREDMÉNYEK ÖSSZEFOGLALÁSA'), par('Jelmagyarázat: MF – megfelelő; NEM – nem felel meg; NA – a vizsgálat nem alkalmazható.', { size: 18 }),
    ...(cats.length ? cats.flatMap(cat => [par('', { after: 80 }), table(fit([6300, 1200, 2138], PW), [
      { header: true, cells: [HEADINGS[cat] ?? cat + ':', { t: 'Minősítés', align: AlignmentType.CENTER }, 'Megjegyzés'] },
      ...[...checks].filter(c => c.category === cat).sort((a, b) => a.order - b.order).map(c => ({ cells: [c.title, resCell(c.result),
        c.result === 'Nem megfelelő' ? ['Hibajegyzék', defOf(d => d.checkId === c.id)].filter(Boolean).join(' – ') : c.note || '-'] as Cell[] }))], 17)])
      : [par('Nincs rögzített szemrevételezési vagy műszeres vizsgálati tétel.', { before: 120 })]),
    par([run('Kelt: ', { bold: true }), insp.signaturePlace || insp.signatureDate ? run([insp.signaturePlace, hd(insp.signatureDate)].filter(Boolean).join(', ')) : miss('kelt'), run('          Felelős felülvizsgáló: ', { bold: true }), insp.inspector ? run(insp.inspector) : miss('név')], { before: 300 })];

  // 5. Útmutató
  const guide: (Paragraph | Table)[] = [title('ÚTMUTATÓ A MEGRENDELŐNEK'), par(tx('guideTitle'), { after: 100 }), ...lines(tx('guide')).map(l => par(l, { after: 80, size: 19 }))];

  // 6. Mérési jegyzőkönyv (fekvő)
  const W1 = fit([700, 3500, 650, 650, 850, 850, 1050, 650, 750, 850, 950, 3700], LW);
  const inRoomOrder = rooms.flatMap(r => points.filter(p => p.roomId === r.id));
  const rows1: Row[] = [
    { header: true, cells: ['', '', { t: 'Biztosító', span: 2, align: AlignmentType.CENTER }, { t: 'Impedancia [Ω]', span: 2, align: AlignmentType.CENTER }, '', '', '', '', '', ''] },
    { header: true, cells: ['Sorszám', 'Az elektromos készülék megnevezése', 'Kar.', 'In [A]', 'Hurok', 'Vonali', 'Feszültség [V]', 'É.v.', 'V.v.F.', 'Állapot', 'Minősítés', 'Megjegyzés'].map(t => ({ t, align: AlignmentType.CENTER })) }];
  let n = 0, lastArea: string | undefined = undefined;
  for (const r of rooms) {
    const pts = points.filter(p => p.roomId === r.id); if (!pts.length) continue;
    if ((r.area ?? '') !== lastArea && r.area) rows1.push({ fill: '9FC5A8', cells: [{ t: r.area, span: 12, bold: true }] });
    lastArea = r.area ?? ''; rows1.push({ fill: GREY, cells: [{ t: r.name, span: 12, bold: true }] });
    for (const p of pts) {
      const c = p.circuitId ? cm.get(p.circuitId) : undefined; const dn = defOf(d => d.pointId === p.id);
      const kar = get(p, 'Védelmi készülék karakterisztikája'), inn = get(p, 'Névleges áram');
      rows1.push({ cells: [{ t: `${++n}.`, align: AlignmentType.CENTER }, p.identifier,
        kar || !c?.characteristic ? show(kar) : { t: c.characteristic, align: AlignmentType.CENTER }, inn || !c?.current ? show(inn) : { t: c.current, align: AlignmentType.CENTER },
        show(get(p, 'Hurokimpedancia')), show(get(p, 'Vonali impedancia')), show(get(p, 'Mért feszültség')), show(get(p, 'Érintésvédelmi osztály')), show(get(p, 'V.v.F. (védővezető folytonos)')),
        show(get(p, 'Állapot (szemrevételezés)')), resCell(p.result), [dn, p.note].filter(Boolean).join(' – ') || '-'] as Cell[] });
    }
  }
  const meas: (Paragraph | Table)[] = [par('MÉRÉSI JEGYZŐKÖNYV', { bold: true, size: 26, after: 120 }),
    inRoomOrder.length ? table(W1, rows1, 15) : par('Nincs rögzített mérési pont.')];

  // 7. ÁVK-vizsgálatok (fekvő)
  const avkPts = inRoomOrder.filter(p => p.values.some(v => categoryOf(v) === 'ÁVK-vizsgálatok'));
  const W2 = fit([700, 1500, 1600, 650, 650, 700, 700, 850, 700, 700, 700, 700, 950, 700, 700, 700, 700], LW);
  const a4 = (p: Point, ang: string): Cell[] => [show(get(p, `ÁVK kioldóáram ${ang}`)), show(get(p, `ÁVK kioldási idő 1x ${ang}`)), show(get(p, `ÁVK kioldási idő 5x ${ang}`)), show(get(p, `ÁVK kioldási idő 1/2x ${ang}`))];
  const rows2: Row[] = [{ header: true, cells: ['', '', '', '', '', '', '', '', { t: '0°', span: 4, align: AlignmentType.CENTER }, '', { t: '180°', span: 4, align: AlignmentType.CENTER }] },
    { header: true, cells: ['Sorszám', 'Helye', 'Jele', 'Típus', 'In [A]', 'IΔn [mA]', 'Un [V]', 'Pólusszám', 'IΔn [mA]', 't [ms] IΔn', 't [ms] 5xIΔn', 't [ms] 0.5xIΔn', 'Minősítés', 'IΔn [mA]', 't [ms] IΔn', 't [ms] 5xIΔn', 't [ms] 0.5xIΔn'].map(t => ({ t, align: AlignmentType.CENTER })) }];
  let k = 0, lastRoom = '';
  for (const p of avkPts) {
    if (p.roomId !== lastRoom) { lastRoom = p.roomId; rows2.push({ fill: GREY, cells: [{ t: rname.get(p.roomId)?.name ?? '', span: 17, bold: true }] }); }
    rows2.push({ cells: [{ t: `${++k}.`, align: AlignmentType.CENTER }, (p.boardId && bm.get(p.boardId)?.identifier) || rname.get(p.roomId)?.name || '', p.identifier, show(get(p, 'ÁVK típusa')), show(get(p, 'Névleges áram')),
      show(get(p, 'ÁVK névleges hibaárama')), show(get(p, 'Névleges feszültség')), show(get(p, 'ÁVK pólusszáma')), ...a4(p, '0°'), resCell(p.result), ...a4(p, '180°')] as Cell[] });
  }
  const avk: (Paragraph | Table)[] = avkPts.length ? [par('ÁRAM-VÉDŐKAPCSOLÓK MŰKÖDÉSÉNEK ELLENŐRZÉSE', { bold: true, size: 26, after: 120, brk: true }), table(W2, rows2, 14)] : [];

  // 8. Hibalista, fényképes melléklet, bizonylatok
  const tail: (Paragraph | Table)[] = [title('HIBALISTA', false), defects.length ? table(fit([700, 4400, 1700, 2838], PW), [
    { header: true, cells: ['Sorszám', 'Hiba leírása', 'Besorolás', 'Javaslat'] },
    ...defects.map(d => ({ cells: [{ t: `${d.seq}.`, align: AlignmentType.CENTER }, d.description || d.title, d.severity || '-', d.action || '-'] as Cell[] }))], 17) : par('Nincs rögzített hiba.')];
  const img = async (ph: Photo, maxW: number, maxH: number): Promise<Paragraph[]> => {
    const d = await loadPhoto(ph); if (!d) return [par(`[${ph.code}: a kép nem tölthető be]`)];
    const s = Math.min(maxW / d.width, maxH / d.height, 1);
    return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, keepNext: true, children: [new ImageRun({ type: 'jpg', data: d.data, transformation: { width: Math.round(d.width * s), height: Math.round(d.height * s) } })] }),
      par([run(`${ph.code}${ph.caption ? ' – ' + ph.caption : ''}`, { size: 16, italics: true })], { align: AlignmentType.CENTER, after: 160 })];
  };
  if (opt.photos) {
    const withPh = defects.filter(d => photos.some(f => f.ownerType === 'defect' && f.ownerId === d.id));
    if (withPh.length) { tail.push(par('FÉNYKÉPES MELLÉKLET', { bold: true, size: 26, brk: true, after: 120 }));
      for (const d of withPh) { tail.push(par([run(`Hiba ${d.seq}. – ${d.title}`, { bold: true })], { before: 120, after: 60, keep: true }));
        for (const f of photos.filter(x => x.ownerType === 'defect' && x.ownerId === d.id)) tail.push(...await img(f, 440, 330)); } }
  }
  if (opt.attachments) {
    const qual = photos.filter(f => f.ownerType === 'inspection'); const sections = instruments.map(i => ({ i, ph: photos.filter(f => f.ownerType === 'instrument' && f.ownerId === i.id) })).filter(x => x.ph.length);
    if (qual.length || sections.length) tail.push(par('BIZONYLATOK', { bold: true, size: 26, brk: true, after: 120 }));
    if (qual.length) { tail.push(par('Végzettség igazolása', { bold: true, after: 80 })); for (const f of qual) tail.push(...await img(f, 620, 860)); }
    for (const { i, ph } of sections) { tail.push(par([run(`A felülvizsgálat során használt műszer hitelesítésének igazolása: ${[i.manufacturer, i.type, i.serial && `(${i.serial})`].filter(Boolean).join(' ')}`, { bold: true })], { brk: true, after: 80 }));
      for (const f of ph) tail.push(...await img(f, 620, 860)); }
  }

  const sp = (c: (Paragraph | Table)[]) => c;
  return new Document({ creator: 'VILL-NOVA', title: `${tx('reportTitle')} – ${insp.workNumber ?? insp.name}`, styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{ properties: portrait, ...hf(true), children: sp([...cover, ...q, ...base, ...sum, ...guide]) },
      { properties: landscape, ...hf(), children: sp([...meas, ...avk]) }, { properties: { page: portrait.page }, ...hf(), children: sp(tail) }] });
}

// Böngészőből: összegyűjti az adatokat és letölti a .docx fájlt (internetkapcsolat nélkül is működik).
export async function generateReport(id: string, opt: ReportOptions) {
  const B = await loadBundle(id); if (!B) return;
  const over = await getDocTemplateOverrides();
  const tx = (k: string) => over[k] ?? DOC_TEMPLATES.find(t => t.key === k)?.text ?? '';
  const loader: PhotoLoader = async ph => { const d = await db.photoData.get(ph.id); if (!d) return; const b64 = d.data.split(',')[1]; const bin = atob(b64); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i); return { data, width: ph.width, height: ph.height }; };
  const blob = await Packer.toBlob(await buildReport(B, tx, loader, opt));
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `VBF_jegyzokonyv_${(B.insp.workNumber || B.insp.name).replace(/[^\p{L}\p{N}]+/gu, '_')}_${B.insp.date}.docx`; a.click(); URL.revokeObjectURL(a.href);
}
