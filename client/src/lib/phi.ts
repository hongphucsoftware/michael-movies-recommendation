
import type { Title } from "../hooks/useEnhancedCatalogue";

// Build a ~40–60D vector: genres (one-hot), decade, pace, mainstreamness.
export function phi(t: Title, genreSpace: number[] = []): number[] {
  const gset = new Set(t.genres || []);
  const G = Math.max(19, Math.max(...genreSpace, 0) + 1); // TMDB has ~19 common movie genres
  const g = new Array(G).fill(0);
  for (const gid of gset) if (gid < G && gid >= 0) g[gid] = 1;

  const y = Number((t as any).year || (t as any).release_date?.slice(0,4) || 2000);
  const decadeBuckets = [1970,1980,1990,2000,2010,2020];
  const d = decadeBuckets.map(D => (y>=D && y < D+10) ? 1 : 0);

  const runtime = Math.min(200, Math.max(70, Number((t as any).runtime || 110)));
  const pace = [(runtime-110)/90]; // ~[-0.44..1]; shorter="faster"

  const pop = Math.min(1, Math.max(0, Number(t.popularity || 0)/100));
  const votes = Math.min(1, Math.max(0, Number((t as any).vote_count || 0)/20000));
  const mainstream = [0.7*pop + 0.3*votes];

  return [...g, ...d, ...pace, ...mainstream];
}
