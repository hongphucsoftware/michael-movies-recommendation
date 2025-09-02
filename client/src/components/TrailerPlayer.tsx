// UI LOCK — TrailerPlayer shows ONE trailer at a time. No grids, no poster walls.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers chosen by the A/B signal and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";

// Math helpers
const l2 = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v*v, 0));
const cosine = (a: number[], b: number[]) => {
  const la = l2(a), lb = l2(b);
  if (!la || !lb) return 0;
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i]*b[i];
  return dot / (la * lb);
};

// Server call for trailer embeds
async function fetchTrailerEmbeds(ids: number[]): Promise<Record<number, string|null>> {
  if (!ids.length) return {};
  const r = await fetch(`/api/trailers?ids=${ids.join(",")}`);
  if (!r.ok) return {};
  const j = await r.json();
  const out: Record<number, string|null> = {};
  Object.keys(j?.trailers || {}).forEach(k => (out[Number(k)] = j.trailers[k]));
  return out;
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

type Props = {
  items: Title[];
  learnedVec: number[];
  recentChosenIds: number[];
  avoidIds?: number[];
  count?: number;
};

export default function TrailerPlayer({
  items, learnedVec, recentChosenIds, avoidIds = [], count = 5,
}: Props) {
  const [queue, setQueue] = useState<Title[]>([]);
  const [embeds, setEmbeds] = useState<Record<number, string|null>>({});
  const [idx, setIdx] = useState(0);

  // Generate explanation based on actual selected movies - MUST be at top level
  const explanation = useMemo(() => {
    return "Based on your A/B choices, here are your personalized picks";
  }, []);

  console.log('[TrailerPlayer] Received items:', items.length);
  console.log('[TrailerPlayer] Learned vector length:', learnedVec.length);
  console.log('[TrailerPlayer] Recent chosen IDs:', recentChosenIds.length);
  console.log('[TrailerPlayer] A/B Learned Vector:', learnedVec.slice(0, 5)); // Show first 5 values
  console.log('[TrailerPlayer] Vector magnitude:', Math.sqrt(learnedVec.reduce((s, v) => s + v*v, 0)).toFixed(3));

  // Generate explanation based on actual A/B choices and resulting picks
  const dynamicExplanation = useMemo(() => {
    if (!queue.length || !learnedVec.length) return explanation;

    // Analyze the actual movies in the queue to build accurate explanation
    const movieTitles = queue.map(m => m.title.toLowerCase());
    const genres = new Set<string>();
    const themes = new Set<string>();
    
    // Detect war movies and military themes
    const warIndicators = ['war', 'battle', 'military', 'soldier', 'combat', 'battlefield', 'army', 'navy', 'marines', 'vietnam', 'wwii', 'ww2', 'world war', 'platoon', 'apocalypse', 'full metal', 'saving private', 'black hawk', 'dunkirk', '1917', 'hacksaw ridge'];
    const warMovies = queue.filter(m => 
      warIndicators.some(indicator => m.title.toLowerCase().includes(indicator))
    );
    
    // Detect action/thriller themes
    const actionIndicators = ['mission', 'impossible', 'fast', 'furious', 'die hard', 'terminator', 'rambo', 'batman', 'superman', 'spider', 'avengers', 'john wick'];
    const actionMovies = queue.filter(m => 
      actionIndicators.some(indicator => m.title.toLowerCase().includes(indicator))
    );
    
    // Detect crime/drama themes
    const crimeIndicators = ['godfather', 'goodfellas', 'pulp fiction', 'scarface', 'casino', 'departed', 'heat', 'reservoir', 'kill bill'];
    const crimeMovies = queue.filter(m => 
      crimeIndicators.some(indicator => m.title.toLowerCase().includes(indicator))
    );
    
    // Detect sci-fi themes
    const scifiIndicators = ['star', 'space', 'alien', 'blade runner', 'matrix', 'interstellar', 'inception', 'dune'];
    const scifiMovies = queue.filter(m => 
      scifiIndicators.some(indicator => m.title.toLowerCase().includes(indicator))
    );

    // Build genre list based on actual content
    if (warMovies.length >= 2) genres.add('war films');
    if (actionMovies.length >= 2) genres.add('action thrillers');
    if (crimeMovies.length >= 2) genres.add('crime dramas');
    if (scifiMovies.length >= 2) genres.add('sci-fi epics');
    
    // Check era preferences from actual queue
    const recentMovies = queue.filter(m => parseInt(m.year) >= 2015).length;
    const classicMovies = queue.filter(m => parseInt(m.year) <= 1990).length;
    
    if (recentMovies >= 3) themes.add('recent releases');
    if (classicMovies >= 3) themes.add('classic cinema');
    
    // Analyze learned vector for additional context
    const [comedy, drama, action, thriller, scifi, fantasy, doc, light, dark, fast, slow, recent] = learnedVec;
    
    // Only add vector-based preferences if they're very strong AND match the queue
    if (drama > 0.8 && crimeMovies.length > 0) genres.add('intense dramas');
    if (action > 0.8 && actionMovies.length > 0) genres.add('high-octane action');
    
    // Build explanation from actual content
    const genreList = Array.from(genres);
    const themeList = Array.from(themes);
    
    if (genreList.length === 0 && themeList.length === 0) {
      // Fallback to specific movie titles
      return `Featuring: ${queue.slice(0, 2).map(m => m.title).join(', ')}${queue.length > 2 ? ` and ${queue.length - 2} more` : ''}`;
    }
    
    const allPrefs = [...genreList, ...themeList];
    
    if (allPrefs.length === 1) {
      return `Your preference for ${allPrefs[0]} — from your A/B choices`;
    }
    
    if (allPrefs.length === 2) {
      return `You chose ${allPrefs[0]} and ${allPrefs[1]} — A/B personalized`;
    }
    
    // For 3+ preferences, show the top 2
    return `Your taste: ${allPrefs.slice(0, 2).join(' and ')} — based on your A/B picks`;
  }, [queue, explanation, learnedVec]);

  // Build picks using the learned preferences with PROPER anti-repetition
  const picks = useMemo(() => {
    if (!items.length || !learnedVec.length) return [];

    console.log('[TrailerPlayer] Items with images:', items.filter(item => bestImageUrl(item)).length);

    // Filter items with valid posters and exclude recently seen
    const available = items
      .filter(item => bestImageUrl(item))
      .filter(item => !recentChosenIds.includes(item.id))
      .filter(item => !avoidIds.includes(item.id));

    if (available.length === 0) {
      console.warn('[TrailerPlayer] No available items with images');
      return [];
    }

    // Score each movie using learned preferences
    const scored = available.map(item => {
      const features = item.feature || toFeatureVector(item);
      const preferenceScore = features.reduce((sum, feature, idx) => {
        return sum + (feature * (learnedVec[idx] || 0));
      }, 0);

      // Add significant randomization to break ties and prevent same picks
      const randomFactor = (Math.random() - 0.5) * 0.8; // ±0.4 random variance
      
      return {
        item,
        score: preferenceScore + randomFactor,
        rawScore: preferenceScore,
        title: item.title // For easy tracking
      };
    });

    // Sort by score with built-in randomization
    scored.sort((a, b) => b.score - a.score);

    console.log('[TrailerPlayer] A/B-aligned scoring with anti-repetition:',
      scored.slice(0, 10).map(s => ({
        title: s.title,
        adjustedScore: s.score.toFixed(3),
        rawPreference: s.rawScore.toFixed(3)
      }))
    );

    // STRONG ANTI-REPETITION: Use weighted sampling to avoid always picking the same top movies
    const selected: typeof scored[0]['item'][] = [];
    const pool = scored.slice(); // Copy the scored array
    
    for (let i = 0; i < count && pool.length > 0; i++) {
      let pickIndex = 0;
      
      // For the first pick, bias toward top but add randomness
      if (i === 0) {
        // Pick from top 5 movies with weighted probability
        const topN = Math.min(5, pool.length);
        const weights = Array.from({length: topN}, (_, j) => Math.exp(-j * 0.7)); // Exponential decay
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (let j = 0; j < weights.length; j++) {
          random -= weights[j];
          if (random <= 0) {
            pickIndex = j;
            break;
          }
        }
      }
      // For subsequent picks, ensure variety by avoiding similar titles
      else {
        const selectedTitles = selected.map(item => item.title.toLowerCase());
        
        // Find first movie that doesn't share words with already selected
        for (let j = 0; j < Math.min(20, pool.length); j++) {
          const candidateTitle = pool[j].title.toLowerCase();
          const candidateWords = candidateTitle.split(/\s+/);
          
          // Check if this movie shares significant words with already selected
          const hasOverlap = selectedTitles.some(selectedTitle => {
            const selectedWords = selectedTitle.split(/\s+/);
            const commonWords = candidateWords.filter(word => 
              word.length > 3 && selectedWords.includes(word)
            );
            return commonWords.length > 0;
          });
          
          if (!hasOverlap) {
            pickIndex = j;
            break;
          }
        }
        
        // If no non-overlapping found, just pick with some randomness
        if (pickIndex === 0 && pool.length > 3) {
          pickIndex = Math.floor(Math.random() * Math.min(8, pool.length));
        }
      }
      
      const picked = pool.splice(pickIndex, 1)[0];
      selected.push(picked.item);
    }

    console.log('[TrailerPlayer] Final picks (preference-weighted):', selected.map(item => item.title));

    return selected;
  }, [items, learnedVec, recentChosenIds, avoidIds, count]);

  // Fetch trailer embeds when picks change
  useEffect(() => {
    if (!picks.length) {
      console.log('[TrailerPlayer] No picks, clearing queue');
      setQueue([]);
      setEmbeds({});
      setIdx(0);
      return;
    }

    let mounted = true;

    (async () => {
      console.log('[TrailerPlayer] Fetching trailers for picks:', picks.length);
      const ids = picks.map(p => p.id);
      const embedMap = await fetchTrailerEmbeds(ids);

      if (!mounted) return;

      console.log('[TrailerPlayer] Received embeds for:', Object.keys(embedMap).length, 'items');

      // Filter to only items with actual trailer embeds
      const withTrailers = picks.filter(p => embedMap[p.id]);

      console.log('[TrailerPlayer] Items with trailers:', withTrailers.length);
      console.log('[TrailerPlayer] Trailer titles:', withTrailers.map(t => t.title));

      setQueue(withTrailers);
      setEmbeds(embedMap);
      setIdx(0);
    })();

    return () => { mounted = false; };
  }, [picks]);

  // Navigation handlers
  const canPrev = idx > 0;
  const canNext = idx + 1 < queue.length;

  const prev = useCallback(() => {
    if (canPrev) setIdx(i => Math.max(0, i-1));
  }, [canPrev]);

  const next = useCallback(() => {
    if (canNext) setIdx(i => Math.min(queue.length-1, i+1));
  }, [canNext]);

  // Keyboard navigation
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

  console.log('[TrailerPlayer] Current state:', {
    queueLength: queue.length,
    currentIndex: idx,
    currentTitle: current?.title,
    hasEmbed: !!embed
  });

  if (!queue.length) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Your Trailer Reel</h2>
          <div className="text-xs sm:text-sm opacity-60">0 / 0</div>
        </div>
        <div className="text-center py-12">
          <div className="text-lg mb-2">Building your personalized trailer queue...</div>
          <div className="text-sm opacity-60">Please wait while we find trailers that match your taste</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg sm:text-xl font-semibold">Your Trailer Reel</h2>
          <div className="text-xs sm:text-sm opacity-60">{idx + 1} / {queue.length}</div>
        </div>
        <div className="text-xs sm:text-sm opacity-70 italic">
          {dynamicExplanation}
        </div>
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
    </div>
  );
}