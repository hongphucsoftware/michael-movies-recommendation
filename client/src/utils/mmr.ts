// MMR (Maximal Marginal Relevance) for diverse recommendations
export function mmrSelect<T>(
  candidates: T[],
  relevance: (item: T) => number,    // your cosine/genre blend
  similarity: (a: T, b: T) => number,  // cosine in embedding space
  k = 5, 
  lambda = 0.75
): T[] {
  const selected: T[] = [];
  const pool = candidates.slice(); // copy
  
  while (selected.length < k && pool.length > 0) {
    let best: T | null = null;
    let bestVal = -Infinity;
    let bestIdx = -1;
    
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      const rel = relevance(item);
      const div = selected.length ? Math.max(...selected.map(s => similarity(item, s))) : 0;
      const val = lambda * rel - (1 - lambda) * div;
      if (val > bestVal) { 
        bestVal = val; 
        best = item;
        bestIdx = i;
      }
    }
    
    if (best !== null) {
      selected.push(best); 
      pool.splice(bestIdx, 1);
    } else {
      break;
    }
  }
  return selected;
}