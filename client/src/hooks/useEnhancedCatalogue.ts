import { useEffect, useMemo, useState } from "react";

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
  feature?: number[];
};

type CatalogueResponse = {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  items: Title[];
  learnedDims: number;
  cacheAgeMs: number;
};

// ---- Feature vector utils (10 genre buckets + era + popularity) ----
const GENRE_BUCKETS = [28,12,16,35,80,18,14,27,9648,878];

// Map genre names to TMDb genre IDs for SEED data
const GENRE_NAME_TO_ID: Record<string, number> = {
  "Action": 28,
  "Adventure": 12,
  "Animation": 16,
  "Comedy": 35,
  "Crime": 80,
  "Documentary": 99,
  "Drama": 18,
  "Family": 10751,
  "Fantasy": 14,
  "History": 36,
  "Horror": 27,
  "Music": 10402,
  "Mystery": 9648,
  "Romance": 10749,
  "Sci-Fi": 878,
  "Thriller": 53,
  "War": 10752,
  "Western": 37,
  "Biography": 18, // Map to Drama
  "Dystopian": 878, // Map to Sci-Fi
  "Black Comedy": 35, // Map to Comedy
  "Comedy-Drama": 35, // Map to Comedy
  "Dark Comedy": 35, // Map to Comedy
  "Psychological": 18, // Map to Drama
  "Survival": 18, // Map to Drama
  "Spy": 28, // Map to Action
  "Sports": 18, // Map to Drama
};

export function toFeatureVector(t: Title): number[] {
  // Handle both numeric IDs and string genre names
  const genreIds = (t.genres || []).map(g => {
    if (typeof g === 'string') {
      return GENRE_NAME_TO_ID[g] || 18; // Default to Drama if not found
    }
    return g;
  });
  
  const g = GENRE_BUCKETS.map((gid) => genreIds.includes(gid) ? 1 : 0);
  const era = t.releaseDate && Number(t.releaseDate.slice(0,4)) >= 2020 ? 1 : 0;
  const pop = Math.max(0, Math.min(1, (t.popularity || 0) / 100));
  return [...g, era, pop];
}

export function bestImageUrl(t: Title): string | null {
  return t.posterUrl || t.backdropUrl || t.image || null;
}

// ---- Fetch curated catalogue ----
export function useEnhancedCatalogue() {
  const [items, setItems] = useState<Title[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Pull ALL items in a single call (server guarantees no downsampling)
        // Get current seed index from URL parameter or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeedIndex = urlParams.get('seedIndex');
        const storedSeedIndex = localStorage.getItem('currentSeedIndex');
        const seedIndex = urlSeedIndex || storedSeedIndex || '0';
        
        // Update localStorage with the current seed index
        if (urlSeedIndex) {
          localStorage.setItem('currentSeedIndex', urlSeedIndex);
        }
        
        console.log(`[Catalogue] Using seed index: ${seedIndex} (from URL: ${urlSeedIndex}, stored: ${storedSeedIndex})`);
        const res = await fetch(`/api/catalogue?all=1&seedIndex=${seedIndex}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: CatalogueResponse = await res.json();
        if (cancelled) return;

        const enriched = (json.items || []).map((t) => {
          const image = bestImageUrl(t);
          const feature = toFeatureVector(t);
          return { ...t, image, feature };
        });

        setItems(enriched);
        setTotal(json.total || enriched.length);
        setStats((json as any).stats || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { items, total, loading, error, stats };
}

// ---- Learned vector (with persistence) ----
const LS_KEY = "pf_learned_v1";

export function useLearnedVector(dim = 12) {
  const [vec, setVec] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length === dim) return arr;
      }
    } catch {}
    return new Array(dim).fill(0);
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(vec)); } catch {}
  }, [vec]);

  function like(t: Title) {
    const f = t.feature || toFeatureVector(t);
    setVec((old) => old.map((v, i) => clamp(v + 0.18 * f[i], -1, 1))); // slightly stronger
  }

  function skip(t: Title) {
    const f = t.feature || toFeatureVector(t);
    setVec((old) => old.map((v, i) => clamp(v - 0.10 * f[i], -1, 1)));
  }

  function resetLearning() {
    setVec(new Array(dim).fill(0));
  }

  const learned = useMemo(() => vec.slice(), [vec]);
  return { learned, like, skip, resetLearning };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}