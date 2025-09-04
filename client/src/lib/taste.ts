
// Lightweight online pairwise learner (BTL-ish logistic update).
// w is your taste weights; phi(movie) is your feature vector.
// Call updateBTL(w, winner, loser) after each A/B choice.

export type Vec = number[];

export function dot(a: Vec, b: Vec) {
  let s = 0, n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i]*b[i];
  return s;
}

export function addInPlace(a: Vec, b: Vec, scale = 1) {
  for (let i = 0; i < Math.min(a.length,b.length); i++) a[i] += scale*b[i];
}

export function norm(a: Vec) {
  const l = Math.sqrt(a.reduce((s,x)=>s+x*x,0)) || 1;
  return a.map(x=>x/l);
}

// Online BTL-style update: p = σ(w·(φwin - φlose)); w += η * (1 - p) * (φwin - φlose) - λ w
export function updateBTL(w: Vec, phiWin: Vec, phiLose: Vec, eta = 0.6, l2 = 0.01) {
  const diff = phiWin.map((x,i)=> x - (phiLose[i] || 0));
  const m = dot(w, diff);
  const p = 1/(1+Math.exp(-m));            // predicted prob winner>loser
  const grad = (1 - p);                     // logistic gradient
  // regularize a bit
  for (let i = 0; i < w.length; i++) w[i] = (1 - l2) * w[i];
  addInPlace(w, diff, eta * grad);
  // keep vector stable
  const n = Math.sqrt(w.reduce((s,x)=>s+x*x,0));
  if (n > 0) for (let i=0;i<w.length;i++) w[i] /= n;
  return w;
}
