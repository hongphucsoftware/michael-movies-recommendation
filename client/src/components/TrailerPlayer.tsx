// UI LOCK — TrailerPlayer shows ONE trailer at a time. No poster grid.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";

// ---------- small math helpers ----------
function l2(x: number[]) { return Math.sqrt(x.reduce((s, v) => s + v*v, 0)); }
function cosine(a: number[], b: number[]) {
  const la = l2(a), lb = l2(b); if (!la || !lb) return 0;
  let dot = 0; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i]*b[i];
  return dot / (la * lb);
}
function jitterById(id: number) { const x = Math.sin(id * 99991) * 10000; return (x - Math.floor(x)) * 0.01; }

// ---------- server call ----------
async function fetchTrailerEmbeds(ids: number[]): Promise<Record<number, string|null>> {
  if (!ids.length) return {};
  // IMPORTANT: keep commas unencoded; server also tolerates encoded.
  const r = await fetch(`/api/trailers?ids=${ids.join(",")}`);
  if (!r.ok) return {};
  const j = await r.json();
  const out: Record<number, string|null> = {};
  Object.keys(j?.trailers || {}).forEach(k => (out[Number(k)] = j.trailers[k]));
  return out;
}

type Props = {
  items: Title[];            // full catalogue (from the 3 lists)
  learnedVec: number[];      // from A/B learning
  recentChosenIds: number[]; // ids the user picked during A/B
  avoidIds?: number[];       // optional: ids to avoid repeating
  count?: number;            // number of trailers to queue (default 5)
};

export default function TrailerPlayer({
  items, learnedVec, recentChosenIds, avoidIds = [], count = 5,
}: Props) {
  const [queue, setQueue] = useState<Title[]>([]);
  const [embeds, setEmbeds] = useState<Record<number, string|null>>({});
  const [idx, setIdx] = useState(0);

  // --------- build ranked queue of 5 (no duplicates, brand-capped) ----------
  const picks = useMemo(() => {
    const avoid = new Set<number>(avoidIds);
    // unique by TMDb id + has image
    const byId = new Map<number, Title>();
    for (const t of items) if (bestImageUrl(t)) byId.set(t.id, t);
    const pool = Array.from(byId.values()).filter(t => !avoid.has(t.id));

    // warm start if vector is weak
    const F = (t: Title) => t.feature || toFeatureVector(t);
    let u = learnedVec.slice();
    if (l2(u) < 0.12 && recentChosenIds.length) {
      const chosenF = recentChosenIds
        .map(id => pool.find(p => p.id === id))
        .filter(Boolean)
        .map(t => F(t as Title));
      if (chosenF.length) {
        u = new Array(chosenF[0].length).fill(0);
        for (const f of chosenF) for (let i = 0; i < f.length; i++) u[i] += f[i];
      }
    }

    const chosenF = recentChosenIds
      .map(id => pool.find(p => p.id === id))
      .filter(Boolean)
      .map(t => F(t as Title));

    const scored = pool.map(t => {
      const f = F(t);
      const rel = cosine(f, u);
      const pop = Math.min(1, (t.popularity || 0) / 100);
      const antiPop = rel < 0.35 ? -(0.10 * pop) : 0;     // escape "same big titles"
      const likeBoost = chosenF.length
        ? (chosenF.reduce((acc, cf) => acc + Math.max(0, cosine(f, cf)), 0) / chosenF.length) * 0.15
        : 0;
      return { t, s: rel + likeBoost + antiPop + jitterById(t.id) };
    }).sort((a,b) => b.s - a.s).map(x => x.t);

    // brand-cap to stop e.g. 4x "Superman"
    const capPerBrand = 1;  // one per brand in a queue of 5
    const brand = (t: Title) => (t.title || "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").slice(0,2).join(" ");
    const seenBrand = new Map<string, number>();
    const out: Title[] = [];
    for (const t of scored) {
      const b = brand(t);
      const c = seenBrand.get(b) || 0;
      if (c >= capPerBrand) continue;
      seenBrand.set(b, c+1);
      out.push(t);
      if (out.length === count) break;
    }
    return out;
  }, [items, learnedVec, JSON.stringify(recentChosenIds), JSON.stringify(avoidIds), count]);

  // --------- prefetch embeds and set initial playable trailer ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setQueue(picks);
      const ids = picks.map(p => p.id);
      const map = await fetchTrailerEmbeds(ids);
      if (!mounted) return;
      setEmbeds(map);
      // jump to first playable
      const first = picks.findIndex(p => map[p.id]);
      setIdx(first >= 0 ? first : 0);
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(picks.map(p => p.id))]);

  const canPrev = idx > 0;
  const canNext = idx + 1 < queue.length;

  const prev = useCallback(() => canPrev && setIdx(i => Math.max(0, i-1)), [canPrev]);
  const next = useCallback(() => canNext && setIdx(i => Math.min(queue.length-1, i+1)), [canNext]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const current = queue[idx];
  const embed = current ? embeds[current.id] : null;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Your Trailer Reel</h2>
        <div className="text-xs opacity-60">{idx+1} / {queue.length}</div>
      </div>

      {current && (
        <div className="mb-3">
          <div className="text-lg font-medium mb-2">{current.title}</div>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            {embed ? (
              <iframe
                className="w-full h-full"
                src={embed}
                title={`Trailer: ${current.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm opacity-80">
                No trailer found for this title
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={prev}
          disabled={!canPrev}
          className={`px-3 py-2 rounded-lg ${canPrev ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50 cursor-not-allowed"}`}>
          ← Back
        </button>
        <button
          onClick={next}
          disabled={!canNext}
          className={`px-3 py-2 rounded-lg ${canNext ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50 cursor-not-allowed"}`}>
          Next →
        </button>
      </div>
    </div>
  );
}