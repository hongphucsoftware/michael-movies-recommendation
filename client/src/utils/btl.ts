// BTL (Bradley-Terry-Luce) Model for Pairwise Preference Learning
export type BTLState = {
  theta: Record<string, number>;     // taste score per title
  info:  Record<string, number>;     // ~Fisher info accumulator
};

const ETA = 0.35, L2 = 1e-3;

export function updateBTL(s: BTLState, winner: string, loser: string) {
  const ti = s.theta[winner] ?? 0, tj = s.theta[loser] ?? 0;
  const z = ti - tj;
  const p = 1 / (1 + Math.exp(-z));          // P(winner beats loser)  (BTL) 
  const g = 1 - p;                            // gradient magnitude
  // SGD step with tiny L2 to keep scores bounded
  s.theta[winner] = ti + ETA * (g - L2 * ti);
  s.theta[loser]  = tj - ETA * (g + L2 * tj);
  // track curvature to estimate uncertainty (p*(1-p) is local Fisher info)
  s.info[winner] = (s.info[winner] ?? 0) + p * (1 - p);
  s.info[loser]  = (s.info[loser]  ?? 0) + p * (1 - p);
}

export function uncertainty(s: BTLState, id: string) {
  const I = s.info[id] ?? 1e-6;
  return 1 / Math.sqrt(I); // larger => more uncertain (see BTL variance intuition)
}