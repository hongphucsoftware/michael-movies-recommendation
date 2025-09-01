// UI LOCK — TrailerPlayer shows ONE trailer at a time. No grids, no poster walls.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers chosen by the A/B signal and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";

// --- Alignment tuning constants (higher correlation, less generic) ---
const SCORE_WEIGHTS = { cosine: 0.65, genre: 0.35, jitter: 0.0 }; // was 0.55/0.40/0.05
const MIN_REL = 0.35;                     // minimum cosine for a title to be eligible
const MIN_COMBO = 0.28;                   // if cosine is lower, allow if 0.5*rel+0.5*genre >= this
const TOP_SLICE = 120;                    // consider only the top N scored titles (was 250)
const PICK_TEMPERATURE = 0.45;            // lower temp => tighter to taste (was 0.65)
const BRAND_CAP_IN_FIVE = 1;              // still prevent duplicate brands in the 5

/* =========================
   Debug helpers & panel
   Toggle with "?debug=1" or press "D"
   ========================= */

function mean(xs: number[]) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function round(x: number, d = 3) { const k = 10**d; return Math.round(x*k)/k; }

type DebugRow = {
  id: number; title: string;
  rel: number; genreBias: number; antiPop: number; final: number;
  genres: number[]; sources: string[];
};

function useDebugToggle() {
  const qp = new URLSearchParams(location.search);
  const initial = qp.get("debug") === "1";
  const [on, setOn] = useState(initial);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "d") setOn(v => !v); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return [on, setOn] as const;
}

function DebugPanel({ rows }: { rows: DebugRow[] }) {
  const avgCos = round(mean(rows.map(r => r.rel)));
  const avgGB  = round(mean(rows.map(r => r.genreBias)));
  const brands = new Set(rows.map(r =>
    r.title.toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").slice(0,2).join(" ")
  ));
  const brandDiversity = `${brands.size}/5 brands`;
  const coverage = rows.reduce((acc, r) => {
    for (const s of r.sources||[]) acc[s] = (acc[s]||0)+1;
    return acc;
  }, {} as Record<string, number>);
  const verdict =
    avgCos >= 0.45 || (avgCos >= 0.35 && avgGB >= 0.5) ? "✅ Strong alignment"
    : avgCos >= 0.25 ? "⚠️ Mild alignment"
    : "❌ Weak alignment";

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 p-3 rounded-xl bg-black/80 backdrop-blur-sm text-xs text-white border border-white/20 shadow-2xl">
      <div className="font-semibold mb-2 text-sm">Recommendation Debug</div>
      <div className="mb-1">
        <span className="text-gray-300">Verdict:</span> <span className="font-medium">{verdict}</span>
      </div>
      <div className="mb-2 text-xs">
        <span className="text-gray-300">Avg cosine:</span> <b>{avgCos}</b> · 
        <span className="text-gray-300"> Genre match:</span> <b>{avgGB}</b> · 
        <span className="text-gray-300"> Diversity:</span> {brandDiversity}
      </div>
      <div className="mb-2 opacity-80 text-xs">
        <span className="text-gray-300">Sources:</span> {Object.entries(coverage).map(([k,v])=>`${k}:${v}`).join(" · ") || "n/a"}
      </div>
      <div className="max-h-32 sm:max-h-40 overflow-auto space-y-1 text-xs">
        {rows.map(r => (
          <div key={r.id} className="border-t border-white/10 pt-1">
            <div className="font-medium text-xs truncate">{r.title}</div>
            <div className="text-xs opacity-80">
              cos={round(r.rel)} · genre={round(r.genreBias)} · final={round(r.final)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 opacity-70 text-xs">
        Press <b>D</b> to toggle · <span className="hidden sm:inline">Use arrow keys for navigation</span>
      </div>
    </div>
  );
}

/* =========================
   Math & scoring helpers
   ========================= */

const l2 = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v*v, 0));
const cosine = (a: number[], b: number[]) => {
  const la = l2(a), lb = l2(b); if (!la || !lb) return 0;
  let dot = 0; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i]*b[i];
  return dot / (la * lb);
};

// deterministic jitter to break ties without biasing results
const jitterById = (id: number) => {
  const x = Math.sin(id * 99991) * 10000;
  return (x - Math.floor(x)) * 0.01;
};

// Weighted sample without replacement using softmax
function softmaxSample<T>(items: T[], getScore: (t: T)=>number, k: number, temperature = 0.65): T[] {
  const pool = items.slice();
  const out: T[] = [];
  for (let pick = 0; pick < k && pool.length; pick++) {
    const scores = pool.map(getScore);
    const max = Math.max(...scores);
    const exps = scores.map(s => Math.exp((s - max) / Math.max(temperature, 1e-6)));
    const sum = exps.reduce((a,b)=>a+b, 0) || 1;
    let r = Math.random() * sum;
    let idx = 0;
    for (; idx < exps.length; idx++) { r -= exps[idx]; if (r <= 0) break; }
    const chosen = pool.splice(Math.min(idx, pool.length-1), 1)[0];
    out.push(chosen);
  }
  return out;
}

/* =========================
   Server call for trailer embeds
   ========================= */

async function fetchTrailerEmbeds(ids: number[]): Promise<Record<number, string|null>> {
  if (!ids.length) return {};
  // Keep commas unencoded; server also tolerates encoded commas.
  const r = await fetch(`/api/trailers?ids=${ids.join(",")}`);
  if (!r.ok) return {};
  const j = await r.json();
  const out: Record<number, string|null> = {};
  Object.keys(j?.trailers || {}).forEach(k => (out[Number(k)] = j.trailers[k]));
  return out;
}

/* =========================
   User profile from A/B picks
   ========================= */

type UserProfile = {
  vec: number[];                      // preference vector (centroid)
  genreWeight: Record<number, number>; // TMDB genreId -> weight [0..1]
};

function buildUserProfile(items: Title[], chosenIds: number[]): UserProfile {
  const byId = new Map<number, Title>(); items.forEach(t => byId.set(t.id, t));

  const chosen: Title[] = chosenIds.map(id => byId.get(id)).filter(Boolean) as Title[];

  // Vector centroid
  let vec: number[] = [];
  if (chosen.length) {
    const dim = (chosen[0].feature || toFeatureVector(chosen[0])).length;
    vec = new Array(dim).fill(0);
    for (const t of chosen) {
      const f = t.feature || toFeatureVector(t);
      for (let i = 0; i < dim; i++) vec[i] += f[i];
    }
    const n = l2(vec) || 1;
    vec = vec.map(v => v / n);
  }

  // Genre weights w/ smoothing
  const counts: Record<number, number> = {};
  let total = 0;
  for (const t of chosen) for (const g of (t.genres || [])) { counts[g] = (counts[g] || 0) + 1; total++; }
  const uniq = Object.keys(counts).length || 1;
  const alpha = 0.5;
  const genreWeight: Record<number, number> = {};
  for (const g of Object.keys(counts).map(Number)) {
    genreWeight[g] = (counts[g] + alpha) / (total + alpha * uniq);
  }

  return { vec, genreWeight };
}

/* =========================
   TrailerPlayer component
   ========================= */

type Props = {
  items: Title[];            // full catalogue from the 3 lists
  learnedVec: number[];      // from A/B learner
  recentChosenIds: number[]; // TMDB ids the user picked in A/B
  avoidIds?: number[];       // optional: avoid repeating
  count?: number;            // number of trailers to queue (default 5)
};

export default function TrailerPlayer({
  items, learnedVec, recentChosenIds, avoidIds = [], count = 5,
}: Props) {
  const [queue, setQueue] = useState<Title[]>([]);
  const [embeds, setEmbeds] = useState<Record<number, string|null>>({});
  const [idx, setIdx] = useState(0);
  const [debugOn] = useDebugToggle();

  // Build the same profile the picker uses (for debug panel)
  const debugProfile = useMemo(
    () => buildUserProfile(items, recentChosenIds),
    [items, JSON.stringify(recentChosenIds)]
  );

  // ------- Build 5 correlated picks from full catalogue -------
  const picks = useMemo(() => {
    // Unique pool (image present) & avoid repeats
    const avoid = new Set<number>(avoidIds);
    const byId = new Map<number, Title>();
    for (const t of items) if (bestImageUrl(t)) byId.set(t.id, t);
    const pool0 = Array.from(byId.values()).filter(t => !avoid.has(t.id));

    // Build profile and choose final preference vector
    const profile = buildUserProfile(pool0, recentChosenIds);
    let u = (learnedVec && l2(learnedVec) > 0.05) ? learnedVec.slice() : profile.vec.slice();
    const useCosine = l2(u) > 0.05;
    if (!useCosine) u = []; // fallback to genre-only if no vector learned

    // Scoring components
    const genreBias = (t: Title) => {
      const ids = t.genres || []; if (!ids.length) return 0;
      let s = 0; for (const g of ids) s += profile.genreWeight[g] || 0;
      return s / ids.length;
    };
    const brandKey = (t: Title) =>
      (t.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").slice(0, 2).join(" ");

    const scored = pool0.map(t => {
      const f = t.feature || toFeatureVector(t);
      const rel = useCosine ? cosine(f, u) : 0;
      const gb  = genreBias(t);
      const base = SCORE_WEIGHTS.cosine*rel + SCORE_WEIGHTS.genre*gb + SCORE_WEIGHTS.jitter*jitterById(t.id);
      
      // Only penalize popularity if BOTH similarity and genre are weak AND it's very popular
      const pop = Math.min(1, (t.popularity || 0) / 100);
      const antiPop = (pop > 0.60 && rel < 0.33 && gb < 0.30) ? -(0.08 * pop) : 0;
      
      return { t, s: base + antiPop, rel, gb, antiPop, brand: brandKey(t) };
    });

    // FILTER by minimum taste and build top slice
    const eligible = scored.filter(x => (x.rel >= MIN_REL) || ((0.5*x.rel + 0.5*x.gb) >= MIN_COMBO));
    const topSlice = eligible.sort((a,b)=>b.s-a.s).slice(0, Math.min(TOP_SLICE, eligible.length));

    // Brand diversity cap (no duplicate brands in 5)
    const filtered: typeof topSlice = [];
    const brandCount = new Map<string, number>();
    for (const it of topSlice) {
      const c = brandCount.get(it.brand) || 0;
      if (c >= BRAND_CAP_IN_FIVE) continue;
      brandCount.set(it.brand, c+1);
      filtered.push(it);
    }

    // Softmax sample 5 with tighter temperature
    const sampled = softmaxSample(filtered, x => x.s, count, PICK_TEMPERATURE);
    
    // Store for debug (console)
    console.debug("[Reco] sampled", sampled.map(x => ({
      id:x.t.id, title:x.t.title, score:round(x.s), cos:round(x.rel), genre:round(x.gb), antiPop:round(x.antiPop)
    })));
    
    return sampled.map(x => x.t);
  }, [items, JSON.stringify(recentChosenIds), JSON.stringify(avoidIds), JSON.stringify(learnedVec), count]);

  // ⬇️ Debug rows using the same genre weights as the picker
  const debugRows: DebugRow[] = useMemo(() => {
    const genreBias = (t: Title) => {
      const ids = t.genres || [];
      if (!ids.length) return 0;
      let s = 0;
      for (const g of ids) s += debugProfile.genreWeight[g] || 0;
      return s / ids.length;
    };

    return queue.map(t => {
      const f = t.feature || toFeatureVector(t);
      const rel = learnedVec && l2(learnedVec) > 0.05 ? cosine(f, learnedVec) : 0;
      const gb  = genreBias(t);
      const pop = Math.min(1, (t.popularity || 0) / 100);
      const antiPop = (rel < 0.35 && gb < 0.35) ? -(0.12 * pop) : 0;
      // jitter omitted in debug final so numbers are stable/readable
      const final = SCORE_WEIGHTS.cosine*rel + SCORE_WEIGHTS.genre*gb + SCORE_WEIGHTS.jitter*0 + antiPop;
      return {
        id: t.id, title: t.title, rel, genreBias: gb, antiPop, final,
        genres: t.genres || [], sources: (t as any).sources || []
      };
    });
  }, [JSON.stringify(queue.map(q => q.id)), JSON.stringify(learnedVec), JSON.stringify(debugProfile.genreWeight)]);

  // ------- Prefetch embeds and set initial playable trailer -------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setQueue(picks);
      const ids = picks.map(p => p.id);
      const map = await fetchTrailerEmbeds(ids);
      if (!mounted) return;
      setEmbeds(map);
      const first = picks.findIndex(p => map[p.id]);
      setIdx(first >= 0 ? first : 0);
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(picks.map(p => p.id))]);

  // ------- Controls -------
  const canPrev = idx > 0;
  const canNext = idx + 1 < queue.length;
  const prev = useCallback(() => { if (canPrev) setIdx(i => Math.max(0, i-1)); }, [canPrev]);
  const next = useCallback(() => { if (canNext) setIdx(i => Math.min(queue.length-1, i+1)); }, [canNext]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const current = queue[idx];
  const embed = current ? embeds[current.id] : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Your Trailer Reel</h2>
        <div className="text-xs sm:text-sm opacity-60">{idx + 1} / {queue.length}</div>
      </div>

      {current && (
        <div className="mb-4 sm:mb-6">
          <div className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-center sm:text-left">
            {current.title}
          </div>
          <div className="aspect-video w-full rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-lg">
            {embed ? (
              <iframe
                className="w-full h-full"
                src={embed}
                title={`Trailer: ${current.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm sm:text-base opacity-80 p-4">
                <div className="text-center">
                  <div className="mb-2">No trailer found for this title</div>
                  <div className="text-xs opacity-60">Try the next recommendation</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={prev}
          disabled={!canPrev}
          className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            canPrev 
              ? "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600" 
              : "bg-neutral-900 opacity-50 cursor-not-allowed"
          }`}>
          <span className="flex items-center justify-center gap-2">
            <span>←</span>
            <span>Back</span>
          </span>
        </button>
        <button
          onClick={next}
          disabled={!canNext}
          className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            canNext 
              ? "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600" 
              : "bg-neutral-900 opacity-50 cursor-not-allowed"
          }`}>
          <span className="flex items-center justify-center gap-2">
            <span>Next</span>
            <span>→</span>
          </span>
        </button>
      </div>

      {/* Debug panel */}
      {debugOn && <DebugPanel rows={debugRows} />}
    </div>
  );
}