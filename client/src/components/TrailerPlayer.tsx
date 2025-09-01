// UI LOCK — TrailerPlayer shows ONE trailer at a time. No grids, no poster walls.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers chosen by the A/B signal and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";

// --- Alignment tuning constants (higher correlation, less generic) ---
const SCORE_WEIGHTS = { cosine: 0.65, genre: 0.35, jitter: 0.0 };
const MIN_REL = 0.35;                 // must be at least this similar OR pass combo rule
const MIN_COMBO = 0.28;               // 0.5*cos + 0.5*genre >= this
const TOP_CANDIDATES = 180;           // how many to pre-check for trailers
const BRAND_CAP_IN_CANDIDATES = 2;    // max per brand in candidate pool
const BRAND_CAP_IN_QUEUE = 1;         // max per brand in final 5
const PICK_TEMPERATURE = 0.45;        // lower = tighter to taste
const RECENT_COOLDOWN_ROUNDS = 3;     // keep picks fresh across rounds
const RECENT_PENALTY = 0.35;          // push down items seen recently

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

  // persist recent 5 queues to reduce repeats across sessions
  type RecentBag = { ids: number[]; ts: number };
  function loadRecent(): RecentBag[] {
    try { return JSON.parse(localStorage.getItem("paf_recent_ids") || "[]"); } catch { return []; }
  }
  function saveRecent(ids: number[]) {
    const now = Date.now();
    const bag: RecentBag = { ids, ts: now };
    const prev = loadRecent().filter(b => now - b.ts < 7 * 24 * 3600 * 1000).slice(-RECENT_COOLDOWN_ROUNDS + 1);
    localStorage.setItem("paf_recent_ids", JSON.stringify([...prev, bag]));
  }
  function inRecent(id: number): boolean {
    return loadRecent().some(b => b.ids.includes(id));
  }

  // -------- Build candidate pool from FULL catalogue --------
  const picks = useMemo(() => {
    // 0) Unique pool with images (FULL catalogue is passed in as `items`)
    const byId = new Map<number, Title>();
    for (const t of items) if (bestImageUrl(t)) byId.set(t.id, t);
    let pool0 = Array.from(byId.values());

    // 1) Build profile (from A/B chosen ids) and decide vector to use
    const profile = buildUserProfile(pool0, recentChosenIds);
    let u = (learnedVec && l2(learnedVec) > 0.05) ? learnedVec.slice() : profile.vec.slice();
    const useCosine = l2(u) > 0.05;
    if (!useCosine) u = []; // fall back to genre-only if weak

    // 2) Score everything
    const genreBias = (t: Title) => {
      const ids = t.genres || []; if (!ids.length) return 0;
      let s = 0; for (const g of ids) s += profile.genreWeight[g] || 0;
      return s / ids.length;
    };

    const brandKey = (t: Title) =>
      (t.title || "")
        .toLowerCase()
        .replace(/^the\s+|^a\s+|^an\s+/,'')        // drop articles
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 2)
        .join(" ");

    const scored = pool0.map(t => {
      const f = t.feature || toFeatureVector(t);
      const rel = useCosine ? cosine(f, u) : 0;
      const gb  = genreBias(t);
      const base = SCORE_WEIGHTS.cosine*rel + SCORE_WEIGHTS.genre*gb + SCORE_WEIGHTS.jitter*0;
      const pop = Math.min(1, (t.popularity || 0) / 100);
      const antiPop = (pop > 0.60 && rel < 0.33 && gb < 0.30) ? -(0.08 * pop) : 0;
      const recent = inRecent(t.id) ? -RECENT_PENALTY : 0; // cooldown penalty
      return { t, s: base + antiPop + recent, rel, gb, brand: brandKey(t) };
    });

    // 3) Eligibility + top candidate slice
    const eligible = scored.filter(x => (x.rel >= MIN_REL) || ((0.5*x.rel + 0.5*x.gb) >= MIN_COMBO));
    const top = eligible.sort((a,b)=>b.s-a.s);

    // Brand-cap within candidates to avoid flooding with one franchise
    const capCount = new Map<string, number>();
    const candidates: typeof scored = [];
    for (const it of top) {
      const c = capCount.get(it.brand) || 0;
      if (c >= BRAND_CAP_IN_CANDIDATES) continue;
      capCount.set(it.brand, c+1);
      candidates.push(it);
      if (candidates.length >= TOP_CANDIDATES) break;
    }

    // Return only Titles for now; we will resolve embeds async in the effect below
    return candidates.map(c => c.t);
  }, [items, JSON.stringify(recentChosenIds), JSON.stringify(learnedVec)]);

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

  // ------- Prefetch embeds for CANDIDATES, then select EXACTLY 5 with trailers -------
  useEffect(() => {
    let mounted = true;
    (async () => {
      // 1) Ask server for embeds for the candidate pool (batch)
      const candIds = picks.map(p => p.id);
      const map = await fetchTrailerEmbeds(candIds); // /api/trailers returns { [id]: embed|null }
      if (!mounted) return;

      // 2) Keep only items with a trailer
      const withTrailer = picks
        .map(t => ({ t, embed: map[t.id] || null }))
        .filter(x => !!x.embed);

      // 3) Recompute scores (same as above) for the w/Trailer list and sample 5 with brand cap
      const profile = buildUserProfile(items, recentChosenIds);
      let u = (learnedVec && l2(learnedVec) > 0.05) ? learnedVec.slice() : profile.vec.slice();
      const useCosine = l2(u) > 0.05;
      if (!useCosine) u = [];

      const genreBias = (t: Title) => {
        const ids = t.genres || []; if (!ids.length) return 0;
        let s = 0; for (const g of ids) s += profile.genreWeight[g] || 0;
        return s / ids.length;
      };

      const brandKey = (t: Title) =>
        (t.title || "")
          .toLowerCase()
          .replace(/^the\s+|^a\s+|^an\s+/,'')        
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
          .split(" ")
          .slice(0, 2)
          .join(" ");

      const scoredWT = withTrailer.map(({ t, embed }) => {
        const f = t.feature || toFeatureVector(t);
        const rel = useCosine ? cosine(f, u) : 0;
        const gb  = genreBias(t);
        const base = SCORE_WEIGHTS.cosine*rel + SCORE_WEIGHTS.genre*gb;
        const recent = inRecent(t.id) ? -RECENT_PENALTY : 0;
        return { t, embed: embed as string, s: base + recent, rel, gb, brand: brandKey(t) };
      });

      // Brand cap in final queue
      const brandCount = new Map<string, number>();
      const filtered = scoredWT.filter(x => {
        const c = brandCount.get(x.brand) || 0;
        if (c >= BRAND_CAP_IN_QUEUE) return false;
        brandCount.set(x.brand, c+1);
        return true;
      });

      // Softmax-sample EXACTLY 5
      const sampled = softmaxSample(filtered, x => x.s, 5, PICK_TEMPERATURE);

      // 4) Commit queue + embeds; start at first playable
      setQueue(sampled.map(x => x.t));
      const embedMap: Record<number, string|null> = {};
      sampled.forEach(x => { embedMap[x.t.id] = x.embed; });
      setEmbeds(embedMap);
      setIdx(0);

      // 5) Save recent to reduce repeats across rounds
      saveRecent(sampled.map(x => x.t.id));

      // Console for audit
      console.info('[PAF] Final 5 picks', sampled.map(x => ({
        id: x.t.id, title: x.t.title, score: round(x.s), cos: round(x.rel), genre: round(x.gb)
      })));
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(picks.map(p => p.id)), JSON.stringify(recentChosenIds), JSON.stringify(learnedVec)]);

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