import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { db, deleteBoard, deleteCircuit, saveBoard, saveCircuit, type Board, type Circuit } from '../db';
import RecordForm, { type RF } from './RecordForm';

const BOARD_F: RF[] = [
  { k: 'identifier', label: 'Elosztó azonosítója', required: true }, { k: 'name', label: 'Elosztó megnevezése' },
  { k: 'location', label: 'Elhelyezkedése' }, { k: 'feed', label: 'Betáplálás megnevezése' },
  { k: 'voltage', label: 'Névleges feszültség (V)', kind: 'num' }, { k: 'mainSwitch', label: 'Főkapcsoló adatai' },
  { k: 'mainProtection', label: 'Fő védelmi készülék adatai' }, { k: 'note', label: 'Megjegyzés', kind: 'area' }];
const CIRCUIT_F: RF[] = [
  { k: 'identifier', label: 'Áramkör azonosítója (pl. A1)', required: true }, { k: 'name', label: 'Áramkör megnevezése' },
  { k: 'function', label: 'Áramkör funkciója' }, { k: 'protType', label: 'Védelmi készülék típusa', list: ['Kismegszakító', 'Olvadóbiztosító', 'ÁVK', 'Kombinált ÁVK/kismegszakító'] },
  { k: 'characteristic', label: 'Védelmi készülék karakterisztikája', list: ['B', 'C', 'D', 'K', 'Z'] }, { k: 'current', label: 'Névleges áram (A)', kind: 'num' },
  { k: 'poles', label: 'Pólusszám', list: ['1', '2', '3', '4'] }, { k: 'breaking', label: 'Megszakítóképesség (kA)', kind: 'num' },
  { k: 'cableMaterial', label: 'Vezeték anyaga', list: ['Cu', 'Al'] }, { k: 'crossSection', label: 'Vezeték keresztmetszete (mm²)', kind: 'num' },
  { k: 'phases', label: 'Fázis vagy fázisok megjelölése', list: ['L1', 'L2', 'L3', 'L1-L2-L3'] }, { k: 'note', label: 'Megjegyzés', kind: 'area' }];
const toVals = (o?: object, fields: RF[] = []) => Object.fromEntries(fields.map(f => [f.k, String((o as Record<string, unknown> | undefined)?.[f.k] ?? '')]));

export default function Boards() {
  const { id = '' } = useParams();
  const boards = useLiveQuery(() => db.boards.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const circuits = useLiveQuery(() => db.circuits.where('inspectionId').equals(id).sortBy('order'), [id]) ?? [];
  const cnt = useLiveQuery(async () => { const b: Record<string, number> = {}, c: Record<string, number> = {};
    (await db.points.where('inspectionId').equals(id).toArray()).forEach(p => { if (p.boardId) b[p.boardId] = (b[p.boardId] ?? 0) + 1; if (p.circuitId) c[p.circuitId] = (c[p.circuitId] ?? 0) + 1; });
    return { b, c }; }, [id]) ?? { b: {}, c: {} };
  const [eb, setEb] = useState<string | null>(null);                       // 'new' vagy elosztó-azonosító
  const [ec, setEc] = useState<{ board: string; id: string } | null>(null); // áramkör szerkesztése

  const boardForm = (b?: Board) => <RecordForm fields={BOARD_F} initial={toVals(b, BOARD_F)} onCancel={() => setEb(null)}
    onSave={async v => { await saveBoard({ ...(v as unknown as Board), id: b?.id ?? crypto.randomUUID(), inspectionId: id, order: b?.order, createdAt: b?.createdAt }); setEb(null); }} />;
  const circuitForm = (boardId: string, c?: Circuit) => <RecordForm fields={CIRCUIT_F} initial={toVals(c, CIRCUIT_F)} onCancel={() => setEc(null)}
    onSave={async v => { await saveCircuit({ ...(v as unknown as Circuit), id: c?.id ?? crypto.randomUUID(), inspectionId: id, boardId, order: c?.order, createdAt: c?.createdAt }); setEc(null); }} />;

  return <div className="space-y-4">
    <Link to={`/felulvizsgalat/${id}`} className="underline text-sm">← Vissza a felülvizsgálathoz</Link>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-bold">Elosztótáblák és áramkörök</h1>
      <button className="btn btn-primary" onClick={() => setEb('new')}><Plus size={18} />Új elosztó</button>
    </div>
    {eb === 'new' && boardForm()}
    {boards.length === 0 && eb !== 'new' && <p>Még nincs elosztó. A mérési pontok hozzárendelése nem kötelező, elosztó nélkül is rögzíthetsz méréseket.</p>}
    {boards.map(b => { const cs = circuits.filter(c => c.boardId === b.id); return <section key={b.id} className="bg-white border border-line rounded-md p-4 space-y-3">
      {eb === b.id ? boardForm(b) : <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0"><div className="font-bold text-lg">{b.identifier}{b.name && ` – ${b.name}`}</div>
          <div className="text-sm">{[b.location, b.feed && `Betáplálás: ${b.feed}`, b.voltage && `${b.voltage} V`].filter(Boolean).join(' · ') || 'Nincs több adat megadva'} · {cs.length} áramkör · {cnt.b[b.id] ?? 0} mérési pont</div></div>
        <button className="btn" aria-label="Szerkesztés" onClick={() => setEb(b.id)}><Pencil size={18} /></button>
        <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd a(z) „${b.identifier}” elosztót és ${cs.length} áramkörét?${cnt.b[b.id] ? `\nA hozzárendelt ${cnt.b[b.id]} mérési pont megmarad, csak az összerendelésük törlődik.` : ''}`)) deleteBoard(b.id); }}><Trash2 size={18} /></button>
      </div>}
      <ul className="divide-y divide-line border border-line rounded-md">{cs.map(c => <li key={c.id} className="p-3">
        {ec?.id === c.id ? circuitForm(b.id, c) : <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0"><div className="font-semibold">{c.identifier}{c.name && ` – ${c.name}`}</div>
            <div className="text-sm">{[c.function, c.protType, c.characteristic, c.current && `${c.current} A`, c.crossSection && `${c.crossSection} mm²`].filter(Boolean).join(' · ') || 'Nincs több adat megadva'} · {cnt.c[c.id] ?? 0} mérési pont</div></div>
          <button className="btn" aria-label="Szerkesztés" onClick={() => setEc({ board: b.id, id: c.id })}><Pencil size={18} /></button>
          <button className="btn btn-danger" aria-label="Törlés" onClick={() => { if (confirm(`Törlöd a(z) „${c.identifier}” áramkört?${cnt.c[c.id] ? `\nA hozzárendelt ${cnt.c[c.id]} mérési pont megmarad.` : ''}`)) deleteCircuit(c.id); }}><Trash2 size={18} /></button>
        </div>}</li>)}
        {cs.length === 0 && <li className="p-3 text-sm">Ehhez az elosztóhoz még nincs áramkör.</li>}</ul>
      {ec?.id === 'new' && ec.board === b.id ? circuitForm(b.id) : <button className="btn min-h-11" onClick={() => setEc({ board: b.id, id: 'new' })}><Plus size={16} />Új áramkör</button>}
    </section>; })}
  </div>;
}
