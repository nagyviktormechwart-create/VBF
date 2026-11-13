import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDocTemplateOverrides, resetDocTemplate, setDocTemplate } from '../db';
import { DOC_TEMPLATES } from '../doctemplates';

function Block({ k, title, base, over }: { k: string; title: string; base: string; over?: string }) {
  const [v, setV] = useState(over ?? base);
  const changed = over !== undefined && over !== base;
  return <details className="bg-surface border border-line rounded-md">
    <summary className="p-3 min-h-12 cursor-pointer font-semibold flex items-center gap-2">{title}{changed && <span className="text-xs font-normal">(módosítva)</span>}</summary>
    <div className="p-3 pt-0 space-y-2">
      <textarea className="inp py-2 font-mono text-sm" rows={Math.min(14, Math.max(3, v.split('\n').length + 1))} value={v} onChange={e => setV(e.target.value)}
        onBlur={() => { if (v !== (over ?? base)) { v === base ? resetDocTemplate(k) : setDocTemplate(k, v); } }} />
      {changed && <button className="btn min-h-10" onClick={() => { setV(base); resetDocTemplate(k); }}>Eredeti szöveg visszaállítása</button>}
    </div></details>;
}

export default function Templates() {
  const over = useLiveQuery(getDocTemplateOverrides, []);
  if (!over) return <p>Betöltés...</p>;
  return <div className="space-y-3 max-w-3xl">
    <Link to="/beallitasok" className="underline text-sm">← Vissza a Beállításokhoz</Link>
    <h1 className="text-2xl font-bold">Szövegsablonok</h1>
    <p className="text-sm">Ezek a szövegek kerülnek majd a jegyzőkönyv és a minősítő irat állandó részeibe. Az alapszövegek a mintajegyzőkönyvből származnak. A jogi és szakmai tartalmat (jogszabályok, szabványok, megfogalmazás) a felülvizsgáló felelőssége ellenőrizni és szükség szerint javítani. Soronként egy tétel; a módosítás mezőből kilépéskor automatikusan mentődik.</p>
    {DOC_TEMPLATES.map(t => <Block key={t.key} k={t.key} title={t.title} base={t.text} over={over[t.key]} />)}
  </div>;
}
