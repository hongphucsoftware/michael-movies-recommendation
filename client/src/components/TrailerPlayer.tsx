// UI LOCK — TrailerPlayer shows ONE trailer at a time. No grids, no poster walls.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers chosen by the A/B signal and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";

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
    <div className="fixed bottom-4 left-4 z-50 max-w-md p-3 rounded-xl bg-black/70 text-xs text-white border border-white/10">
      <div className="font-semibold mb-1">Reco Debug</div>
      <div>Verdict: <span className="font-medium">{verdict}</span></div>
      <div>Avg cosine: <b>{avgCos}</b> · Avg genre match: <b>{avgGB}</b> · {brandDiversity}</div>
      <div className="mt-1 opacity-80">
        Coverage: {Object.entries(coverage).map(([k,v])=>`${k}:${v}`).join(" · ") || "n/a"}
      </div>
      <div className="mt-2 max-h-40 overflow-auto space-y-1">
        {rows.map(r => (
          <div key={r.id} className="border-t border-white/10 pt-1">
            <div className="font-medium">{r.title}</div>
            <div>cos={round(r.rel)} · genre={round(r.genreBias)} · antiPop={round(r.antiPop)} · final={round(r.final)}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 opacity-70">Press <b>D</b> to toggle</div>
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

// Simple shuffle function for fallback
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function toYouTubeEmbed(u: string) {
  if (!/youtube\.com|youtu\.be/.test(u)) return u;
  const m = u.match(/v=([^&]+)/);
  const id = m ? m[1] : u.split("/").pop();
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

async function fetchTrailerEmbeds(ids: number[]): Promise<Record<number, string|null>> {
  if (!ids.length) return {};
  
  // Get current seed index from URL parameter or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const urlSeedIndex = urlParams.get('seedIndex');
  const storedSeedIndex = localStorage.getItem('currentSeedIndex');
  const seedIndex = urlSeedIndex || storedSeedIndex || '0';
  
  // Keep commas unencoded; server also tolerates encoded commas.
  const r = await fetch(`/api/trailers?ids=${ids.join(",")}&seedIndex=${seedIndex}`);
  if (!r.ok) return {};
  const j = await r.json();
  const out: Record<number, string|null> = {};
  Object.keys(j?.trailers || {}).forEach(k => {
    const url = j.trailers[k];
    out[Number(k)] = url ? toYouTubeEmbed(url) : null;
  });
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
   Stateless Recommendation Engine
   ========================= */

function computeStatelessRecommendations(
  pool: Title[], 
  recentChosenIds: number[], 
  count: number,
  avoidIds: number[] = []
): Title[] {
  console.log(`[StatelessReco] Computing recommendations from ${pool.length} candidates`);
  
  if (pool.length <= count) {
    console.log("[StatelessReco] Pool too small, returning all");
    return shuffle(pool);
  }

  // Get user's chosen movies (A/B winners)
  const chosenMovies = pool.filter(t => recentChosenIds.includes(t.id));
  console.log(`[StatelessReco] User chose ${chosenMovies.length} movies`);
  
  if (chosenMovies.length === 0) {
    console.log("[StatelessReco] No chosen movies, returning random");
    return shuffle(pool).slice(0, count);
  }

  // Compute similarity scores for each candidate
  const scored = pool.map(candidate => {
    let totalScore = 0;
    let matchCount = 0;

    // Compare against each chosen movie
    for (const chosen of chosenMovies) {
      let similarity = 0;

      // 1. Genre similarity (weighted Jaccard)
      const candidateGenres = new Set(candidate.genres || []);
      const chosenGenres = new Set(chosen.genres || []);
      if (candidateGenres.size > 0 && chosenGenres.size > 0) {
        const intersection = new Set([...candidateGenres].filter(g => chosenGenres.has(g)));
        const union = new Set([...candidateGenres, ...chosenGenres]);
        similarity += (intersection.size / union.size) * 0.4; // 40% weight
      }

      // 2. Actor similarity (Top-3 actors)
      const candidateActors = new Set((candidate.topActors || []).map(a => a.toLowerCase()));
      const chosenActors = new Set((chosen.topActors || []).map(a => a.toLowerCase()));
      if (candidateActors.size > 0 && chosenActors.size > 0) {
        const actorIntersection = new Set([...candidateActors].filter(a => chosenActors.has(a)));
        const actorUnion = new Set([...candidateActors, ...chosenActors]);
        similarity += (actorIntersection.size / actorUnion.size) * 0.3; // 30% weight
      }

      // 3. Director similarity
      if (candidate.director && chosen.director) {
        if (candidate.director.toLowerCase() === chosen.director.toLowerCase()) {
          similarity += 0.2; // 20% weight
        }
      }

      // 4. Era similarity (decade-based)
      if (candidate.era && chosen.era) {
        if (candidate.era === chosen.era) {
          similarity += 0.1; // 10% weight
        }
      }

      totalScore += similarity;
      if (similarity > 0) matchCount++;
    }

    // Average similarity across chosen movies
    const avgSimilarity = chosenMovies.length > 0 ? totalScore / chosenMovies.length : 0;
    
    // Small popularity prior (boost popular movies slightly)
    const popularityBoost = Math.log(1 + (candidate.popularity || 0)) * 0.05;
    
    // Prefer movies that weren't shown in A/B rounds (small bonus)
    const avoidPenalty = avoidIds.includes(candidate.id) ? -0.1 : 0;
    
    return {
      movie: candidate,
      score: avgSimilarity + popularityBoost + avoidPenalty,
      similarity: avgSimilarity,
      popularityBoost,
      avoidPenalty
    };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Apply diversity guards
  const selected: Title[] = [];
  const genreCounts = new Map<number, number>();
  const directorCounts = new Map<string, number>();

  for (const { movie } of scored) {
    // Get top genre (most common genre in chosen movies)
    const topGenre = (() => {
      const genreFreq = new Map<number, number>();
      for (const chosen of chosenMovies) {
        for (const genre of chosen.genres || []) {
          genreFreq.set(genre, (genreFreq.get(genre) || 0) + 1);
        }
      }
      let maxFreq = 0;
      let topG = null;
      for (const [genre, freq] of genreFreq) {
        if (freq > maxFreq) {
          maxFreq = freq;
          topG = genre;
        }
      }
      return topG;
    })();

    const movieTopGenre = movie.genres?.includes(topGenre) ? topGenre : null;
    const director = movie.director;

    // Diversity guards: ≤2 same top genre, ≤1 same director
    const genreLimit = movieTopGenre ? (genreCounts.get(movieTopGenre) || 0) < 2 : true;
    const directorLimit = director ? (directorCounts.get(director) || 0) < 1 : true;

    if (genreLimit && directorLimit) {
      selected.push(movie);
      
      // Update counts
      if (movieTopGenre) {
        genreCounts.set(movieTopGenre, (genreCounts.get(movieTopGenre) || 0) + 1);
      }
      if (director) {
        directorCounts.set(director, (directorCounts.get(director) || 0) + 1);
      }

      if (selected.length >= count) break;
    }
  }

  // If we don't have enough diverse results, fill with remaining high-scored movies
  if (selected.length < count) {
    const remaining = scored
      .map(s => s.movie)
      .filter(m => !selected.includes(m))
      .slice(0, count - selected.length);
    selected.push(...remaining);
  }

  console.log(`[StatelessReco] Selected ${selected.length} recommendations`);
  return selected;
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
  const [saved, setSaved] = useState<Record<number, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("pf_saved_v1") || "{}"); } catch { return {}; }
  });
  const [thumbs, setThumbs] = useState<Record<number, 1|-1|0>>(() => {
    try { return JSON.parse(localStorage.getItem("pf_thumbs_v1") || "{}"); } catch { return {}; }
  });
  const [debugOn] = useDebugToggle();

  // Build the same profile the picker uses (for debug panel)
  const debugProfile = useMemo(
    () => buildUserProfile(items, recentChosenIds),
    [items, JSON.stringify(recentChosenIds)]
  );

  // ------- Build recommendations using stateless similarity -------
  const picks = useMemo(() => {
    // Get all movies with images (don't exclude A/B items since we only have 24 total)
    const byId = new Map<number, Title>();
    for (const t of items) if (bestImageUrl(t)) byId.set(t.id, t);
    const pool = Array.from(byId.values());
    
    console.log(`[Reco] Pool size: ${pool.length}, Avoid: ${avoidIds.length}, Count: ${count}`);
    
    // Use stateless recommendation engine with preference for non-A/B items
    return computeStatelessRecommendations(pool, recentChosenIds, count, avoidIds);

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

  function persistSaved(next: Record<number, boolean>) {
    setSaved(next);
    try { localStorage.setItem("pf_saved_v1", JSON.stringify(next)); } catch {}
  }
  function persistThumbs(next: Record<number, 1|-1|0>) {
    setThumbs(next);
    try { localStorage.setItem("pf_thumbs_v1", JSON.stringify(next)); } catch {}
  }

  const toggleSave = useCallback(() => {
    if (!current) return;
    const next = { ...saved, [current.id]: !saved[current.id] };
    persistSaved(next);
  }, [current, saved]);

  const thumbUp = useCallback(() => {
    if (!current) return;
    const next = { ...thumbs, [current.id]: thumbs[current.id] === 1 ? 0 : 1 } as Record<number,1|-1|0>;
    persistThumbs(next);
  }, [current, thumbs]);
  const thumbDown = useCallback(() => {
    if (!current) return;
    const next = { ...thumbs, [current.id]: thumbs[current.id] === -1 ? 0 : -1 } as Record<number,1|-1|0>;
    persistThumbs(next);
  }, [current, thumbs]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Your Trailer Reel</h2>
        <div className="text-xs opacity-60">{idx + 1} / {queue.length}</div>
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
          {/* Right-side controls under the embed */}
          <div className="flex flex-wrap items-center justify-between mt-3 gap-2">
            <div className="flex gap-2">
              <button
                onClick={toggleSave}
                className={`px-3 py-2 rounded-lg ${saved[current.id] ? "bg-green-700" : "bg-neutral-800 hover:bg-neutral-700"}`}
                title="Save to watch later"
                data-testid="button-save"
              >
                {saved[current.id] ? "Saved" : "Save"}
              </button>
              <button
                onClick={thumbUp}
                className={`px-3 py-2 rounded-lg ${thumbs[current.id] === 1 ? "bg-cyan-700" : "bg-neutral-800 hover:bg-neutral-700"}`}
                title="I like this"
                data-testid="button-thumb-up"
              >
                👍
              </button>
              <button
                onClick={thumbDown}
                className={`px-3 py-2 rounded-lg ${thumbs[current.id] === -1 ? "bg-red-700" : "bg-neutral-800 hover:bg-neutral-700"}`}
                title="I dislike this"
                data-testid="button-thumb-down"
              >
                👎
              </button>
            </div>
            <div className="flex gap-2">
              <a
                href={current.trailerUrl || current.backdropUrl || current.posterUrl || "#"}
                target="_blank" rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-electric-blue hover:bg-blue-600"
                data-testid="button-watch-now"
              >
                Watch Now
              </a>
              <button
                onClick={next}
                disabled={!canNext}
                className={`px-3 py-2 rounded-lg ${canNext ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50 cursor-not-allowed"}`}
                title="Skip"
                data-testid="button-skip"
              >
                Skip
              </button>
            </div>
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

      {/* You feel like watching… swipable picks */}
      {(() => {
        // Determine top genres from recent choices, default to Action(28)
        const chosenSet = new Set(recentChosenIds);
        const chosen = items.filter((t) => chosenSet.has(t.id));
        const counts = new Map<number, number>();
        for (const t of chosen) for (const g of (t.genres || [])) counts.set(g, (counts.get(g) || 0) + 1);
        const top = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).map(([g])=>g);
        const focusGenres = (top.length ? top : [28]).slice(0,3);
        const recs = items
          .filter((t) => (t.genres || []).some((g) => focusGenres.includes(g)))
          .sort((a,b)=> (b.popularity||0) - (a.popularity||0))
          .slice(0, 10);
        if (!recs.length) return null;
        return (
          <div className="mt-6">
            <div className="text-sm opacity-80 mb-2">You feel like watching…</div>
            <Carousel className="w-full">
              <CarouselContent>
                {recs.map((t) => (
                  <CarouselItem key={t.id} className="basis-5/6 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                    <div className="p-2">
                      <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition">
                        <div className="aspect-[2/3] w-full bg-black/40">
                          {(() => {
                            const img = bestImageUrl(t);
                            return img ? (
                              <img src={img} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs opacity-70">No image</div>
                            );
                          })()}
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-medium line-clamp-2">{t.title}</div>
                          <div className="text-xs opacity-70 mt-1">{t.releaseDate?.slice(0,4) || ""}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(t.genres || []).slice(0,2).map((g) => (
                              <span key={g} className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                                {g}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <a
                              href={t.trailerUrl || t.backdropUrl || t.posterUrl || "#"}
                              target="_blank" rel="noreferrer"
                              className="text-xs px-2 py-1 rounded-md bg-electric-blue hover:bg-blue-600"
                            >
                              Watch Now
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex items-center justify-between mt-2">
                <CarouselPrevious className="bg-neutral-800 hover:bg-neutral-700 border-neutral-700" />
                <CarouselNext className="bg-neutral-800 hover:bg-neutral-700 border-neutral-700" />
              </div>
            </Carousel>
          </div>
        );
      })()}

      {/* Debug panel */}
      {debugOn && <DebugPanel rows={debugRows} />}
    </div>
  );
}