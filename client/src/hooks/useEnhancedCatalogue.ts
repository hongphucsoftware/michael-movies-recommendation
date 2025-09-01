import { useEffect, useMemo, useState } from "react";
import type { Title } from "../lib/videoPick";
import { bestImageUrl, toFeatureVector } from "../lib/videoPick";

type CatalogueResponse = {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  items: Title[];
  learnedDims: number;
  cacheAgeMs: number;
};

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
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  return { items, total, loading, error: err };
}

/**
 * Minimal learned vector:
 *  - Start neutral (zeros)
 *  - Each "like" nudges toward that title's feature vector
 *  - Each "skip" nudges away
 * This is intentionally simple and stable.
 */
export function useLearnedVector(dim = 12) {
  const [vec, setVec] = useState<number[]>(() => new Array(dim).fill(0));

  function like(t: Title) {
    const f = t.feature || toFeatureVector(t);
    setVec((old) => old.map((v, i) => clamp(v + 0.15 * f[i], -1, 1)));
  }

  function skip(t: Title) {
    const f = t.feature || toFeatureVector(t);
    setVec((old) => old.map((v, i) => clamp(v - 0.1 * f[i], -1, 1)));
  }

  const learned = useMemo(() => vec.slice(), [vec]);
  return { learned, like, skip };
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}