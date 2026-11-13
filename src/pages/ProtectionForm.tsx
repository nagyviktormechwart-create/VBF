import { ChevronDown } from 'lucide-react';
import { updateInspection, type Inspection } from '../db';
import { PROTECTION_GROUPS } from '../protections';

// A felülvizsgált védelmi módok, rendszerek és érintésvédelmi osztályok jelölőlistái (a jegyzőkönyv „Minősítési alapadatok” oldalához).
export default function ProtectionForm({ insp }: { insp: Inspection }) {
  const sel = insp.protections ?? {};
  const total = Object.values(sel).reduce((n, l) => n + l.length, 0);
  const toggle = (key: string, item: string) => {
    const cur = sel[key] ?? []; const next = cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item];
    updateInspection(insp.id, { protections: { ...sel, [key]: next } });
  };
  return <details className="bg-surface border border-line rounded-md group">
    <summary className="flex items-center justify-between p-4 min-h-14 cursor-pointer font-semibold list-none">
      <span>Védelmi módok és érintésvédelmi osztályok <span className="font-normal text-sm">({total ? `${total} kijelölve` : 'még nincs kijelölve'})</span></span>
      <ChevronDown size={20} className="group-open:rotate-180 transition-transform" /></summary>
    <div className="p-4 pt-0 space-y-4">{PROTECTION_GROUPS.map(g => <div key={g.key}>
      <h3 className="font-semibold text-sm mb-1">{g.title}</h3>
      <div className="space-y-1">{g.items.map(i => <label key={i} className="flex items-start gap-2 min-h-11 items-center">
        <input type="checkbox" className="size-6 shrink-0" checked={(sel[g.key] ?? []).includes(i)} onChange={() => toggle(g.key, i)} /><span className="text-sm">{i}</span></label>)}</div></div>)}
    </div>
  </details>;
}
