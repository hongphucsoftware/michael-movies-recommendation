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

export function toFeatureVector(t: Title): number[] {
  const g = GENRE_BUCKETS.map((gid) => (t.genres || []).includes(gid) ? 1 : 0);
  const era = t.releaseDate && Number(t.releaseDate.slice(0,4)) >= 2020 ? 1 : 0;
  const pop = Math.max(0, Math.min(1, (t.popularity || 0) / 100));
  return [...g, era, pop];
}

export function bestImageUrl(t: Title): string | null {
  return t.posterUrl || t.backdropUrl || t.image || null;
}

// ---- Fetch curated catalogue ----
export function useEnhancedCatalogue(page = 1, pageSize = 60) {
  const [items, setItems] = useState<Title[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/catalogue?page=${page}&pageSize=${pageSize}`);
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
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize]);

  return { items, total, loading, error: err };
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