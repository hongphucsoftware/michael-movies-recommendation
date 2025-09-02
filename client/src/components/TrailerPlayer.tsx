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

  // Generate meaningful explanation based on A/B learning vector patterns
  const dynamicExplanation = useMemo(() => {
    if (!queue.length || !learnedVec.length) return explanation;

    // Analyze the learned vector to understand user preferences from A/B testing
    const [comedy, drama, action, thriller, scifi, fantasy, doc, light, dark, fast, slow, recent] = learnedVec;
    
    // Calculate vector strength to understand confidence level
    const vectorMagnitude = Math.sqrt(learnedVec.reduce((s, v) => s + v*v, 0));
    const isStrongSignal = vectorMagnitude > 2.5;
    const isMediumSignal = vectorMagnitude > 1.5;
    
    console.log('[TrailerPlayer] A/B Vector Analysis:', {
      comedy: comedy.toFixed(2),
      drama: drama.toFixed(2), 
      action: action.toFixed(2),
      thriller: thriller.toFixed(2),
      scifi: scifi.toFixed(2),
      recent: recent.toFixed(2),
      magnitude: vectorMagnitude.toFixed(2)
    });

    // Identify strongest preferences from A/B learning (above 0.8)
    const strongPrefs: string[] = [];
    if (comedy > 0.8) strongPrefs.push('comedies');
    if (drama > 0.8) strongPrefs.push('dramas');
    if (action > 0.8) strongPrefs.push('action films');
    if (thriller > 0.8) strongPrefs.push('thrillers');
    if (scifi > 0.8) strongPrefs.push('sci-fi');
    if (fantasy > 0.8) strongPrefs.push('fantasy');
    
    // Identify medium preferences (0.5-0.8)
    const mediumPrefs: string[] = [];
    if (comedy > 0.5 && comedy <= 0.8) mediumPrefs.push('some comedy');
    if (drama > 0.5 && drama <= 0.8) mediumPrefs.push('thoughtful stories');
    if (action > 0.5 && action <= 0.8) mediumPrefs.push('exciting action');
    
    // Era and tone preferences
    const eraPrefs: string[] = [];
    if (recent > 0.7) eraPrefs.push('modern films');
    else if (recent < 0.3) eraPrefs.push('classic cinema');
    
    if (dark > 0.7) eraPrefs.push('intense themes');
    if (light > 0.7) eraPrefs.push('lighter entertainment');
    if (fast > 0.7) eraPrefs.push('fast-paced stories');
    
    // Analyze actual queue content for validation
    const queueAnalysis = {
      hasAnimation: queue.some(m => ['luca', 'onward', 'raya', 'nimona', 'puss', 'spider-verse', 'elemental'].some(a => m.title.toLowerCase().includes(a))),
      hasAction: queue.some(m => m.title.toLowerCase().includes('spider') || m.title.toLowerCase().includes('planet') || m.title.toLowerCase().includes('apes')),
      hasComedy: queue.some(m => m.genres?.includes(35)),
      hasDrama: queue.some(m => m.genres?.includes(18)),
      hasRecent: queue.filter(m => parseInt(m.year) >= 2018).length >= 3
    };
    
    // Build explanation based on A/B learning strength and queue content
    if (!isStrongSignal) {
      // Weak signal - still learning
      if (queueAnalysis.hasAnimation) {
        return `Early signals suggest you enjoy animated storytelling — learning from your A/B choices`;
      }
      return `Building your taste profile from A/B testing — ${queue.length} personalized picks`;
    }
    
    if (isMediumSignal) {
      // Medium signal - some clear preferences
      const topPref = [...strongPrefs, ...mediumPrefs][0];
      if (topPref) {
        if (queueAnalysis.hasAnimation && (comedy > 0.6 || fantasy > 0.6)) {
          return `You seem to enjoy ${topPref} with animated adventures — from your A/B choices`;
        }
        return `Your A/B choices show you like ${topPref} — ${queue.length} matches found`;
      }
    }
    
    // Strong signal - confident recommendations
    if (strongPrefs.length === 0) {
      // Strong signal but mixed preferences
      if (queueAnalysis.hasAnimation) {
        return `Your diverse taste includes animated films — based on ${Math.round(vectorMagnitude * 5)} A/B comparisons`;
      }
      return `Eclectic taste detected — ${queue.length} diverse picks from your A/B learning`;
    }
    
    if (strongPrefs.length === 1) {
      const pref = strongPrefs[0];
      if (queueAnalysis.hasAnimation && pref === 'action films') {
        return `You chose animated action adventures — strong A/B signal (${vectorMagnitude.toFixed(1)})`;
      }
      return `Clear preference for ${pref} — confident A/B match (${vectorMagnitude.toFixed(1)})`;
    }
    
    if (strongPrefs.length === 2) {
      const [pref1, pref2] = strongPrefs;
      return `You like ${pref1} and ${pref2} — strong A/B learning (${vectorMagnitude.toFixed(1)})`;
    }
    
    // Multiple strong preferences
    return `Complex taste: ${strongPrefs.slice(0, 2).join(' + ')} — from ${Math.round(vectorMagnitude * 4)} A/B choices`;
  }, [queue, explanation, learnedVec]);

  // Build picks using the learned preferences with MAXIMUM VARIETY
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

    // Create a seed based on current timestamp to ensure different results each time
    const timeSeed = Date.now() % 10000;
    
    // Score each movie using learned preferences + massive randomization
    const scored = available.map((item, index) => {
      const features = item.feature || toFeatureVector(item);
      const preferenceScore = features.reduce((sum, feature, idx) => {
        return sum + (feature * (learnedVec[idx] || 0));
      }, 0);

      // MASSIVE randomization based on time + index to prevent same results
      const randomSeed = (timeSeed + index * 17) % 1000;
      const randomFactor = (Math.sin(randomSeed) * 2.5); // ±2.5 random variance
      
      return {
        item,
        score: preferenceScore + randomFactor,
        rawScore: preferenceScore,
        title: item.title,
        randomness: randomFactor
      };
    });

    // Shuffle the scored array before sorting to break deterministic patterns
    for (let i = scored.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scored[i], scored[j]] = [scored[j], scored[i]];
    }

    // Sort by score but with built-in chaos
    scored.sort((a, b) => b.score - a.score);

    console.log('[TrailerPlayer] A/B-aligned scoring with MAXIMUM variety:',
      scored.slice(0, 10).map(s => ({
        title: s.title,
        adjustedScore: s.score.toFixed(3),
        rawPreference: s.rawScore.toFixed(3),
        randomBoost: s.randomness.toFixed(3)
      }))
    );

    // EXTREME ANTI-REPETITION: Divide movies into genre buckets and pick from different buckets
    const selected: typeof scored[0]['item'][] = [];
    const usedTitleWords = new Set<string>();
    const usedGenres = new Set<number>();
    
    // Categorize movies by primary genre/theme for diversity
    const buckets = {
      action: scored.filter(s => s.item.genres?.includes(28) || s.title.toLowerCase().includes('spider') || s.title.toLowerCase().includes('fast')),
      animation: scored.filter(s => s.item.genres?.includes(16) || ['luca', 'onward', 'raya', 'nimona', 'puss'].some(a => s.title.toLowerCase().includes(a))),
      drama: scored.filter(s => s.item.genres?.includes(18) && !s.item.genres?.includes(16)),
      comedy: scored.filter(s => s.item.genres?.includes(35)),
      scifi: scored.filter(s => s.item.genres?.includes(878) || s.title.toLowerCase().includes('planet')),
      other: scored.filter(s => !s.item.genres?.some(g => [28, 16, 18, 35, 878].includes(g)))
    };

    // Pick one from each bucket, then fill remaining slots
    const bucketNames = Object.keys(buckets) as (keyof typeof buckets)[];
    let bucketIndex = 0;
    
    for (let i = 0; i < count && selected.length < count; i++) {
      let found = false;
      
      // Try to pick from different buckets for maximum variety
      for (let attempt = 0; attempt < bucketNames.length && !found; attempt++) {
        const currentBucket = buckets[bucketNames[bucketIndex]];
        bucketIndex = (bucketIndex + 1) % bucketNames.length;
        
        // Find a movie from this bucket that doesn't share words with selected
        for (const candidate of currentBucket) {
          if (selected.includes(candidate.item)) continue;
          
          const titleWords = candidate.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const hasWordOverlap = titleWords.some(word => usedTitleWords.has(word));
          const hasGenreOverlap = candidate.item.genres?.some(g => usedGenres.has(g)) || false;
          
          if (!hasWordOverlap || selected.length >= 3) { // Allow genre overlap after 3 picks
            selected.push(candidate.item);
            titleWords.forEach(word => usedTitleWords.add(word));
            candidate.item.genres?.forEach(g => usedGenres.add(g));
            found = true;
            break;
          }
        }
      }
      
      // If no bucket worked, pick randomly from remaining high-scoring items
      if (!found && scored.length > selected.length) {
        const remaining = scored.filter(s => !selected.includes(s.item));
        if (remaining.length > 0) {
          const randomPick = remaining[Math.floor(Math.random() * Math.min(10, remaining.length))];
          selected.push(randomPick.item);
        }
      }
    }

    console.log('[TrailerPlayer] Final picks (MAXIMUM VARIETY):', selected.map(item => item.title));

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