// Active Learning Pair Picker using uncertainty × feature distance
import type { BTLState } from './btl';

type Vec = number[];

export function cosine(a: Vec, b: Vec) {
  let dp=0, na=0, nb=0; 
  for (let i=0;i<a.length;i++){
    dp+=a[i]*b[i];
    na+=a[i]*a[i];
    nb+=b[i]*b[i];
  }
  return dp / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}

export function pickNextPair(
  ids: string[],                      // from hard anchors only
  feats: Record<string, Vec>,         // genre/decade/etc one-hots
  state: BTLState
): [string,string] {
  // 1) pick a high-uncertainty pivot near the current decision boundary (p~0.5)
  const sorted = ids.slice().sort((a,b)=>(state.theta[b]??0)-(state.theta[a]??0));
  const mid = Math.floor(sorted.length/2);
  const window = sorted.slice(Math.max(0, mid-12), mid+12);
  const pivot = window.sort((a,b)=>{
    const uA = state.info[a] ?? 1e-6;
    const uB = state.info[b] ?? 1e-6;
    return (1/Math.sqrt(uB)) - (1/Math.sqrt(uA));
  })[0];

  // 2) choose opponent that maximizes [uncertainty] × [feature distance] × [score proximity]
  let best = '', bestScore = -1;
  for (const j of ids) if (j!==pivot) {
    const uPivot = 1 / Math.sqrt(state.info[pivot] ?? 1e-6);
    const uJ = 1 / Math.sqrt(state.info[j] ?? 1e-6);
    const u = Math.min(uPivot, uJ);
    const dist = 1 - cosine(feats[pivot], feats[j]);        // larger => more contrast
    const prox = Math.exp(-Math.abs((state.theta[pivot]??0)-(state.theta[j]??0))); // near boundary
    const s = u * dist * prox;
    if (s > bestScore) { bestScore = s; best = j; }
  }
  return [pivot, best];
}