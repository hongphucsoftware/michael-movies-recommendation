
import { phi } from "./phi";
import { dot } from "./taste";
import type { Title } from "../hooks/useEnhancedCatalogue";

// picks best pair from a candidate anchor set
export function pickInformativePair(anchors: Title[], w: number[], usedIds = new Set<number>()) {
  // Precompute embeddings
  const PHI = anchors.map(t => ({ t, v: phi(t) })).filter(x => !usedIds.has(x.t.id));
  if (PHI.length < 2) throw new Error("Need >=2 anchors");
  let best = null as null | { a: Title, b: Title, score: number };

  // sample a subset for speed (anchors are ~120-160)
  const C = Math.min(110, PHI.length);
  const pool = PHI.slice(0, C);

  for (let i = 0; i < pool.length; i++) {
    for (let j = i+1; j < Math.min(pool.length, i+26); j++) { // bounded inner loop
      const A = pool[i], B = pool[j];
      const diff = A.v.map((x,k)=> x - (B.v[k] || 0));
      const margin = dot(w, diff);           // confidence for A>B (sign matters)
      const conf = Math.abs(margin);          // smaller = more uncertain
      // feature distance encourages informative contrast
      let dist = 0; for (let k=0;k<diff.length;k++) dist += Math.abs(diff[k]);
      const info = (1 - Math.min(1, conf)) * (0.5 + 0.5 * Math.min(1, dist)); // 0..1
      const score = info;
      if (!best || score > best.score) best = { a: A.t, b: B.t, score };
    }
  }
  return best!;
}
