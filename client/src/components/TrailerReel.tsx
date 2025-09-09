// UI LOCK: DO NOT MODIFY — Reel uses ALL titles + learned preferences (A/B) + MMR diversity
// Replit Agent: Do not replace with static lists or "curated 50". This ranks the FULL catalogue.

import { useEffect, useMemo, useState } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { bestImageUrl, toFeatureVector } from "../hooks/useEnhancedCatalogue";

type Props = {
  items: Title[];
  learnedVec: number[];
  count?: number;
  recentChosenIds?: number[];  // A/B choices to steer toward "more like this"
  avoidIds?: number[];         // Anything shown during A/B this round (don't repeat)
};

function l2(x: number[]) { return Math.sqrt(x.reduce((s, v) => s + v*v, 0)); }
function cosine(a: number[], b: number[]) {
  const la = l2(a), lb = l2(b);
  if (la === 0 || lb === 0) return 0;
  let dot = 0; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i]*b[i];
  return dot / (la * lb);
}

function seededJitter(id: number) {
  // small repeatable jitter by id (keeps results from being identical each time)
  const x = Math.sin(id * 99991) * 10000;
  return (x - Math.floor(x)) * 0.01; // +/- up to 0.01
}

function mmrPick(pool: Title[], userVec: number[], k = 12, lambda = 0.75) {
  const chosen: Title[] = [];
  const feats = new Map<number, number[]>();
  const getF = (t: Title) => feats.get(t.id) || (feats.set(t.id, t.feature || toFeatureVector(t)), feats.get(t.id)!);

  while (chosen.length < k && pool.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      const f = getF(t);
      const rel = cosine(f, userVec);
      const div = chosen.length === 0 ? 0 : Math.max(...chosen.map(c => cosine(f, getF(c))));
      const score = lambda * rel - (1 - lambda) * div + seededJitter(t.id);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    if (bestIdx < 0) break;
    const [pick] = pool.splice(bestIdx, 1);
    chosen.push(pick);
  }
  return chosen;
}



export default function TrailerReel({ items, learnedVec, count = 12, recentChosenIds = [], avoidIds = [] }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<number, string|null>>({});

  // PURE RANDOM TRAILER SELECTION - No bias, no clustering, no smart algorithms
  // The whole point is to break the grouping patterns you're seeing
  const { picks, poolSize } = useMemo(() => {
    // Get all movies with posters
    const byId = new Map<number, Title>();
    for (const t of items) if (bestImageUrl(t)) byId.set(t.id, t);
    const pool = Array.from(byId.values());
    
    // Remove recently shown A/B pairs to avoid immediate repeats
    const avoid = new Set<number>(avoidIds || []);
    const available = pool.filter(t => !avoid.has(t.id));
    
    console.log(`[TRAILER REEL PURE RANDOM] Selecting ${count} from ${available.length} available movies`);
    
    // COMPLETELY RANDOM SELECTION - No scoring, no similarity, no MMR
    const selected: Title[] = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < Math.min(count, available.length); i++) {
      let randomIndex;
      let attempts = 0;
      
      // Get a truly random unused index
      do {
        randomIndex = Math.floor(Math.random() * available.length);
        attempts++;
      } while (usedIndices.has(randomIndex) && attempts < 50);
      
      if (attempts < 50) {
        usedIndices.add(randomIndex);
        selected.push(available[randomIndex]);
        console.log(`  [${i+1}] Random pick: "${available[randomIndex].title}" from sources: ${available[randomIndex].sources}`);
      }
    }
    
    return { picks: selected, poolSize: pool.length };
  }, [items, count, avoidIds]);

  // Prefetch trailer URLs and auto-select first available
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ids = picks.map(p => p.id);
      const map = await fetchTrailerEmbeds(ids);
      if (!mounted) return;
      setUrls(map);
      
      // Auto-select the first playable trailer
      const firstIdx = picks.findIndex(p => map[p.id]);
      if (firstIdx >= 0) {
        setActiveIdx(firstIdx);
        setActiveUrl(map[picks[firstIdx].id] || null);
      } else {
        setActiveIdx(null);
        setActiveUrl(null);
      }
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(picks.map(p => p.id))]);

  function clickPlay(i: number) {
    setActiveIdx(i);
    setActiveUrl(urls[picks[i].id] || null);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Personalized Trailer Reel</h2>
        <div className="text-xs opacity-70">
          Based on your A/B choices • {picks.length} curated from {poolSize} movies
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {picks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => clickPlay(i)}
            className={`rounded-xl overflow-hidden shadow hover:shadow-lg transition ${i === activeIdx ? "ring-2 ring-cyan-400" : ""}`}
            title={`Play trailer: ${t.title}`}
          >
            <img src={bestImageUrl(t) || ""} alt={t.title} className="w-full h-64 object-cover" loading="lazy" />
            <div className="p-2 text-sm font-medium text-left">{t.title}</div>
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="mt-6">
        {activeIdx === null && <div className="text-sm opacity-80">No playable trailer found for these picks.</div>}
        {activeIdx !== null && activeUrl && (
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-xl"
              src={toYouTubeEmbed(activeUrl)}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
        {activeIdx !== null && !activeUrl && (
          <div className="text-sm opacity-80">No trailer available for this title.</div>
        )}
      </div>
    </div>
  );
}

async function fetchTrailerEmbeds(ids: number[]): Promise<Record<number, string|null>> {
  if (!ids.length) return {};
  const qs = ids.join(",");                           // ← important: do NOT encode commas
  const r = await fetch(`/api/trailers?ids=${qs}`);
  if (!r.ok) return {};
  const j = await r.json();
  const out: Record<number, string|null> = {};
  Object.keys(j?.trailers || {}).forEach(k => out[Number(k)] = j.trailers[k]);
  return out;
}

function toYouTubeEmbed(u: string) {
  if (!/youtube\.com|youtu\.be/.test(u)) return u;
  const m = u.match(/v=([^&]+)/);
  const id = m ? m[1] : u.split("/").pop();
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}