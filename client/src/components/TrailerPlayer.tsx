// UI LOCK — TrailerPlayer shows ONE trailer at a time. No grids, no poster walls.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers chosen by the A/B signal and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";

// --- alignment & variety tuning (tighter than before) ---
const SCORE_WEIGHTS = { cosine: 0.60, genre: 0.40, jitter: 0.0 };

// A title must be clearly on-taste OR decent on both axes
const MIN_REL = 0.42;            // min cosine similarity
const MIN_COMBO = 0.36;          // min 0.5*cos + 0.5*genre

// Candidate pool (we'll pre-check embeds for these)
const TOP_CANDIDATES = 220;      // larger pool -> more options with trailers

// Diversity limits
const BRAND_CAP_IN_CANDIDATES = 2;
const BRAND_CAP_IN_QUEUE = 1;
const SOURCE_CAP_IN_QUEUE = 2;   // max 2 from the same source in final 5

// Variety control
const PICK_TEMPERATURE = 0.40;   // lower = tighter to taste

// Repeat avoidance across rounds
const RECENT_COOLDOWN_ROUNDS = 4; // remember last 4 rounds
const RECENT_PENALTY = 0.50;      // push down recently shown titles more

// Popularity dampener when off-taste
const OFF_TASTE_ANTIPOP = 0.18;   // stronger than before

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
    console.log('[TrailerPlayer] Building picks from items:', items.length);
    
    // 0) Unique pool with images (FULL catalogue is passed in as `items`)
    const byId = new Map<number, Title>();
    for (const t of items) {
      if (bestImageUrl(t)) {
        const numId = typeof t.id === 'string' ? parseInt(t.id.replace(/\D/g, '')) : t.id;
        if (!isNaN(numId)) {
          byId.set(numId, { ...t, id: numId });
        }
      }
    }
    let pool0 = Array.from(byId.values());
    console.log('[TrailerPlayer] Pool with images:', pool0.length);

    if (pool0.length === 0) {
      console.warn('[TrailerPlayer] No movies with images found!');
      return [];
    }

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
        .replace(/^the\s+|^a\s+|^an\s+/,'')
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ").slice(0, 2).join(" ");

    const sourceKey = (t: Title) => (t.sources && t.sources[0]) || "unknown";

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

    console.log('[TrailerPlayer] Eligible candidates:', eligible.length);

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

    console.log('[TrailerPlayer] Final candidates:', candidates.length);
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

  // ------- Prefetch embeds for CANDIDATES, then select EXACTLY 5 with genre quota, brand/source caps -------
  useEffect(() => {
    console.log('[TrailerPlayer] Effect triggered with items:', items.length);
    let mounted = true;
    (async () => {
      // Build candidates exactly like in your useMemo "picks"
      const byId = new Map<number, Title>();
      for (const t of items) {
        if (bestImageUrl(t)) {
          const numId = typeof t.id === 'string' ? parseInt(t.id.replace(/\D/g, '')) : t.id;
          if (!isNaN(numId)) {
            byId.set(numId, { ...t, id: numId });
          }
        }
      }
      const pool = Array.from(byId.values());
      console.log('[TrailerPlayer] Pool built:', pool.length);

      // Preference profile
      const profile = buildUserProfile(pool, recentChosenIds);
      let u = (learnedVec && l2(learnedVec) > 0.05) ? learnedVec.slice() : profile.vec.slice();
      const useCosine = l2(u) > 0.05;
      if (!useCosine) u = [];

      // Top genres (we'll enforce coverage)
      const topGenres = Object.entries(profile.genreWeight)
        .sort((a,b)=> (b[1] as number) - (a[1] as number))
        .slice(0, 2)
        .map(([gid]) => Number(gid));

      const genreBias = (t: Title) => {
        const ids = t.genres || []; if (!ids.length) return 0;
        let s = 0; for (const g of ids) s += profile.genreWeight[g] || 0;
        return s / ids.length;
      };

      // Score full pool and take top candidates
      const scored = pool.map(t => {
        const f   = t.feature || toFeatureVector(t);
        const rel = useCosine ? cosine(f, u) : 0;
        const gb  = genreBias(t);
        const pop = Math.min(1, (t.popularity || 0) / 100);
        const offTaste = (rel < 0.40 && gb < 0.35);
        const antiPop = offTaste && pop > 0.50 ? -(OFF_TASTE_ANTIPOP * pop) : 0;
        const recent = inRecent(t.id) ? -RECENT_PENALTY : 0;
        const s = SCORE_WEIGHTS.cosine*rel + SCORE_WEIGHTS.genre*gb + antiPop + recent;

        return { t, s, rel, gb, brand: brandKey(t), source: sourceKey(t) };
      });

      const eligible = scored.filter(x => (x.rel >= MIN_REL) || ((0.5*x.rel + 0.5*x.gb) >= MIN_COMBO))
                             .sort((a,b)=> b.s - a.s);

      // Cap brand inside candidates and keep a big pool
      const brandCountCand = new Map<string, number>();
      const candidates: typeof scored = [];
      for (const it of eligible) {
        const c = brandCountCand.get(it.brand) || 0;
        if (c >= BRAND_CAP_IN_CANDIDATES) continue;
        brandCountCand.set(it.brand, c+1);
        candidates.push(it);
        if (candidates.length >= TOP_CANDIDATES) break;
      }

      // 1) Resolve embeds for candidates
      const ids = candidates.map(c => c.t.id);
      const embedsMap = await fetchTrailerEmbeds(ids);
      if (!mounted) return;

      const withTrailer = candidates
        .map(c => ({ ...c, embed: embedsMap[c.t.id] || null }))
        .filter(x => !!x.embed);

      // If we somehow have too few withTrailer, fall back to eligible (will still likely have embeds)
      const poolWT = withTrailer.length ? withTrailer : candidates;

      // 2) Enforce that at least 3 of 5 come from the user's top genres (if topGenres exist)
      const isTopGenre = (t: Title) => (t.genres || []).some(g => topGenres.includes(g));
      const preferWT   = poolWT.filter(x => isTopGenre(x.t));
      const otherWT    = poolWT.filter(x => !isTopGenre(x.t));

      // 3) Build the final 5 respecting brand & source caps
      const final: typeof withTrailer = [];
      const brandCount = new Map<string, number>();
      const sourceCount = new Map<string, number>();

      const canTake = (x: typeof withTrailer[number]) => {
        const b = brandCount.get(x.brand) || 0;
        const s = sourceCount.get(x.source) || 0;
        return (b < BRAND_CAP_IN_QUEUE) && (s < SOURCE_CAP_IN_QUEUE);
      };

      // Helper to pick with softmax
      function softmaxSample<T>(arr: T[], score: (t:T)=>number, temperature = PICK_TEMPERATURE): T | null {
        if (!arr.length) return null;
        const scores = arr.map(score);
        const max = Math.max(...scores);
        const exps = scores.map(v => Math.exp((v - max) / Math.max(temperature, 1e-6)));
        const sum = exps.reduce((a,b)=>a+b, 0) || 1;
        let r = Math.random() * sum;
        for (let i = 0; i < arr.length; i++) { r -= exps[i]; if (r <= 0) return arr[i]; }
        return arr[arr.length-1];
      }

      // First, take up to 3 from top-genre pool
      let preferPool = preferWT.slice(0, 120);
      while (final.length < 3 && preferPool.length) {
        const pick = softmaxSample(preferPool, x => x.s);
        if (!pick) break;
        const idx = preferPool.indexOf(pick); preferPool.splice(idx,1);
        if (!canTake(pick)) continue;
        final.push(pick);
        brandCount.set(pick.brand, (brandCount.get(pick.brand)||0)+1);
        sourceCount.set(pick.source, (sourceCount.get(pick.source)||0)+1);
      }

      // Then, fill up to 5 from the rest (still respecting caps)
      let fillPool = otherWT.concat(preferPool).slice(0, 200);
      while (final.length < 5 && fillPool.length) {
        const pick = softmaxSample(fillPool, x => x.s);
        if (!pick) break;
        const idx = fillPool.indexOf(pick); fillPool.splice(idx,1);
        if (!canTake(pick)) continue;
        final.push(pick);
        brandCount.set(pick.brand, (brandCount.get(pick.brand)||0)+1);
        sourceCount.set(pick.source, (sourceCount.get(pick.source)||0)+1);
      }

      // If we still don't have 5 (rare), greedily top-up ignoring source cap but keeping brand cap
      if (final.length < 5) {
        for (const x of poolWT) {
          if (final.length >= 5) break;
          if ((brandCount.get(x.brand)||0) >= BRAND_CAP_IN_QUEUE) continue;
          final.push(x);
          brandCount.set(x.brand, (brandCount.get(x.brand)||0)+1);
        }
      }

      // 4) Commit queue + embeds; start at first playable
      const finalTitles = final.map(x => x.t);
      const embedMap: Record<number, string|null> = {};
      final.forEach(x => { embedMap[x.t.id] = x.embed as string; });

      console.log('[TrailerPlayer] Setting queue:', finalTitles.length, 'titles');
      console.log('[TrailerPlayer] Queue titles:', finalTitles.map(t => t.title));

      if (!mounted) return;
      setQueue(finalTitles);
      setEmbeds(embedMap);
      setIdx(0);

      // Save recent to avoid repeats across rounds
      saveRecent(finalTitles.map(t => t.id));

      // Debug log
      console.info('[PAF] Final 5 picks (tight)', final.map(x => ({
        id: x.t.id, title: x.t.title, score: Number(x.s.toFixed(3)),
        cos: Number(x.rel.toFixed(3)), genre: Number(x.gb.toFixed(3)),
        brand: x.brand, source: x.source
      })));
    })();
    return () => { mounted = false; };
  }, [JSON.stringify(items.map(i=>i.id)), JSON.stringify(recentChosenIds), JSON.stringify(learnedVec)]);

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