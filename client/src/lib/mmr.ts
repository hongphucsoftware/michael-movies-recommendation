
import type { Title } from "../hooks/useEnhancedCatalogue";
import { phi } from "./phi";

export function mmrSelect(titles: Title[], relScore: (t:Title)=>number, k=5, lambda=0.75) {
  const selected: Title[] = [];
  const vecs = new Map<number, number[]>();

  function sim(a: Title, b: Title) {
    const va = vecs.get(a.id) || phi(a); vecs.set(a.id, va);
    const vb = vecs.get(b.id) || phi(b); vecs.set(b.id, vb);
    // cosine
    let dot=0, na=0, nb=0;
    for (let i=0;i<va.length;i++){ dot+=va[i]*vb[i]; na+=va[i]*va[i]; nb+=vb[i]*vb[i]; }
    const la = Math.sqrt(na)||1, lb=Math.sqrt(nb)||1;
    return dot/(la*lb);
  }

  const pool = titles.slice();
  while (selected.length < k && pool.length) {
    let best = null as Title | null; let bestVal = -1e9;
    for (const t of pool) {
      const rel = relScore(t);
      const div = selected.length ? Math.max(...selected.map(s=> sim(t, s))) : 0;
      const val = lambda * rel - (1 - lambda) * div;
      if (val > bestVal) { bestVal = val; best = t; }
    }
    const idx = pool.indexOf(best!);
    if (idx >= 0) pool.splice(idx,1);
    if (best) selected.push(best);
  }
  return selected;
}
