// Poster-first helpers + MMR diversity picking for the trailer wheel

export type Title = {
  id: number;
  title: string;
  overview: string;
  genres: number[];
  releaseDate: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  image?: string | null;
  // computed:
  feature?: number[]; // 12-dim vector
};

const GENRE_BUCKETS = [
  28, // Action
  12, // Adventure
  16, // Animation
  35, // Comedy
  80, // Crime
  18, // Drama
  14, // Fantasy
  27, // Horror
  9648, // Mystery
  878, // Sci-Fi
];

/**
 * Build a 12-dim feature vector:
 *  - 10 dims: genre buckets (binary presence)
 *  - 1 dim: era recency (>=2020 -> 1, else 0)
 *  - 1 dim: normalized popularity (0..1)
 */
export function toFeatureVector(t: Title): number[] {
  const g = new Array<number>(GENRE_BUCKETS.length).fill(0);
  (t.genres || []).forEach((gid) => {
    const idx = GENRE_BUCKETS.indexOf(gid);
    if (idx >= 0) g[idx] = 1;
  });

  const era =
    t.releaseDate && Number((t.releaseDate || "").slice(0, 4)) >= 2020 ? 1 : 0;

  // normalize popularity softly
  const pop = Math.max(0, Math.min(1, t.popularity / 100));

  return [...g, era, pop];
}

/** Cosine similarity for vectors */
function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

/**
 * MMR selection:
 *  score = λ * sim(item, user) - (1-λ) * max_j sim(item, chosen_j)
 */
export function mmrPick(
  pool: Title[],
  userVec: number[],
  k = 10,
  lambda = 0.7
): Title[] {
  const chosen: Title[] = [];
  const remaining = pool.slice();

  while (chosen.length < k && remaining.length > 0) {
    let best: { item: Title; score: number } | null = null;

    for (const item of remaining) {
      const f = item.feature || toFeatureVector(item);
      const rel = cosine(f, userVec);
      const divPenalty =
        chosen.length === 0
          ? 0
          : Math.max(
              ...chosen.map((c) => cosine(f, c.feature || toFeatureVector(c)))
            );
      const score = lambda * rel - (1 - lambda) * divPenalty;

      if (!best || score > best.score) best = { item, score };
    }

    if (!best) break;

    chosen.push(best.item);
    const idx = remaining.findIndex((t) => t.id === best!.item.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  return chosen;
}

/** Poster-first URL */
export function bestImageUrl(t: Title): string | null {
  if (t.posterUrl) return t.posterUrl;
  if (t.backdropUrl) return t.backdropUrl;
  if (t.image) return t.image;
  return null;
}

/** Fetch a trailer URL from the server for a TMDb id */
export async function getTrailerUrl(tmdbId: number): Promise<string | null> {
  const res = await fetch(`/api/trailer?id=${tmdbId}`);
  if (!res.ok) return null;
  const json = await res.json();
  const t = json?.trailer;
  if (!t) return null;
  return t.url || null;
}

/**
 * Build a "wheel" of k diverse trailers given a pool and a learned user vector.
 * Returns titles plus a lazy loader that resolves trailer URLs only when needed.
 */
export function buildTrailerWheel(
  pool: Title[],
  userVec: number[],
  k = 12
): {
  picks: Title[];
  loadTrailer: (idx: number) => Promise<{ url: string | null; id: number }>;
} {
  // ensure features present
  const withF = pool.map((t) => ({ ...t, feature: t.feature || toFeatureVector(t) }));
  const picks = mmrPick(withF, userVec, k);

  async function loadTrailer(idx: number) {
    const t = picks[idx];
    if (!t) return { url: null, id: -1 };
    const url = await getTrailerUrl(t.id);
    return { url, id: t.id };
  }

  return { picks, loadTrailer };
}

// Legacy compatibility exports
export function posterFromTMDbPaths(movie: any): string | null {
  return movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
}

export function youtubeThumb(key: string): string {
  return key ? `https://img.youtube.com/vi/${key}/maxresdefault.jpg` : '';
}