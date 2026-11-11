import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PlusSquare } from 'lucide-react';

export default function Dashboard() {
  const all = useLiveQuery(() => db.inspections.toArray(), []) ?? [];
  const ongoing = all.filter(i => i.status === 'folyamatban').length;
  const done = all.filter(i => i.status === 'befejezett').length;
  const recent = [...all].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Irányítópult</h1>
      <Link to="/uj" className="btn btn-primary"><PlusSquare size={20} />Új felülvizsgálat indítása</Link>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-surface border border-line rounded-md p-4"><div className="text-4xl font-bold">{ongoing}</div>Folyamatban lévő felülvizsgálat</div>
      <div className="bg-surface border border-line rounded-md p-4"><div className="text-4xl font-bold">{done}</div>Befejezett felülvizsgálat</div>
    </div>
    <section>
      <h2 className="text-lg font-semibold mb-2">Legutóbb megnyitott</h2>
      {recent.length === 0 ? <p>Még nincs felülvizsgálat. Indítsd az elsőt az „Új felülvizsgálat” gombbal.</p> :
        <ul className="divide-y divide-line bg-surface border border-line rounded-md">
          {recent.map(i => <li key={i.id}><Link to={`/felulvizsgalat/${i.id}`} className="flex justify-between p-4 min-h-14">
            <span className="font-semibold">{i.name}</span><span className="text-sm">{i.address}</span></Link></li>)}
        </ul>}
    </section>
  </div>;
}
