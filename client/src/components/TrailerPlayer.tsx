
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

  console.log('[TrailerPlayer] Received items:', items.length);
  console.log('[TrailerPlayer] Learned vector length:', learnedVec.length);
  console.log('[TrailerPlayer] Recent chosen IDs:', recentChosenIds.length);
  console.log('[TrailerPlayer] A/B Learned Vector:', learnedVec.slice(0, 5));
  console.log('[TrailerPlayer] Vector magnitude:', Math.sqrt(learnedVec.reduce((s, v) => s + v*v, 0)).toFixed(3));

  // Analyze A/B learning vector to understand user preferences
  const abAnalysis = useMemo(() => {
    if (!learnedVec.length) return { preferences: [], strength: 'none', explanation: 'Learning in progress...' };

    const [comedy, drama, action, thriller, scifi, fantasy, doc, light, dark, fast, slow, recent] = learnedVec;
    const vectorMagnitude = Math.sqrt(learnedVec.reduce((s, v) => s + v*v, 0));
    
    console.log('[TrailerPlayer] A/B Vector Breakdown:', {
      comedy: comedy?.toFixed(2) || '0',
      drama: drama?.toFixed(2) || '0', 
      action: action?.toFixed(2) || '0',
      thriller: thriller?.toFixed(2) || '0',
      scifi: scifi?.toFixed(2) || '0',
      fantasy: fantasy?.toFixed(2) || '0',
      recent: recent?.toFixed(2) || '0',
      magnitude: vectorMagnitude.toFixed(2)
    });

    const preferences = [];
    
    // Identify strong preferences (> 0.7)
    if (comedy > 0.7) preferences.push({ type: 'comedy', strength: comedy, label: 'comedies' });
    if (drama > 0.7) preferences.push({ type: 'drama', strength: drama, label: 'dramatic films' });
    if (action > 0.7) preferences.push({ type: 'action', strength: action, label: 'action films' });
    if (thriller > 0.7) preferences.push({ type: 'thriller', strength: thriller, label: 'thrillers' });
    if (scifi > 0.7) preferences.push({ type: 'scifi', strength: scifi, label: 'sci-fi' });
    if (fantasy > 0.7) preferences.push({ type: 'fantasy', strength: fantasy, label: 'fantasy' });

    // Sort by strength
    preferences.sort((a, b) => b.strength - a.strength);
    
    let strength = 'weak';
    if (vectorMagnitude > 2.5) strength = 'strong';
    else if (vectorMagnitude > 1.5) strength = 'medium';

    // Build explanation
    let explanation = 'Building your taste profile from A/B testing';
    if (preferences.length === 0) {
      explanation = vectorMagnitude > 1.0 ? 'Your diverse taste profile from A/B choices' : 'Learning your preferences through A/B testing';
    } else if (preferences.length === 1) {
      explanation = `Your clear preference for ${preferences[0].label} from A/B testing`;
    } else if (preferences.length >= 2) {
      explanation = `You like ${preferences[0].label} and ${preferences[1].label} from A/B choices`;
    }

    return { preferences, strength, explanation, vectorMagnitude };
  }, [learnedVec]);

  // Advanced A/B-driven movie selection with maximum diversity
  const picks = useMemo(() => {
    if (!items.length || !learnedVec.length) return [];

    // Filter to movies with images and not recently seen
    const available = items
      .filter(item => bestImageUrl(item))
      .filter(item => !recentChosenIds.includes(item.id))
      .filter(item => !avoidIds.includes(item.id));

    if (available.length === 0) {
      console.warn('[TrailerPlayer] No available items with images');
      return [];
    }

    console.log('[TrailerPlayer] Available movies:', available.length);
    console.log('[TrailerPlayer] A/B Analysis:', abAnalysis);

    // Score each movie based on A/B learning + diversity factors
    const scored = available.map((item, index) => {
      const features = item.feature || toFeatureVector(item);
      
      // Core preference score from A/B learning
      const abScore = features.reduce((sum, feature, idx) => {
        return sum + (feature * (learnedVec[idx] || 0));
      }, 0);

      // Diversity factors to prevent same movie clustering
      const titleWords = item.title.toLowerCase().split(/\s+/);
      const diversityFactors = {
        // Year diversity bonus/penalty
        yearDiversity: Math.abs(parseInt(item.year) - 2010) > 10 ? 0.3 : 0,
        
        // Genre diversity - avoid clustering around single genres
        genreSpread: item.genres && item.genres.length > 2 ? 0.2 : 0,
        
        // Source diversity - prefer mixing sources
        sourceBonus: item.sources?.includes('imdbTop') ? 0.1 : 
                    item.sources?.includes('rt2020') ? 0.15 : 0.05,
        
        // Title uniqueness - avoid similar titles
        titleUnique: titleWords.length > 2 ? 0.1 : 0,
        
        // Random factor to break ties and ensure variety
        randomFactor: (Math.sin(Date.now() + index * 47) + 1) * 1.0 // ±1.0 random
      };

      const diversityScore = Object.values(diversityFactors).reduce((sum, val) => sum + val, 0);
      const finalScore = abScore + diversityScore;

      return {
        item,
        abScore,
        diversityScore,
        finalScore,
        title: item.title
      };
    });

    // Sort by final score
    scored.sort((a, b) => b.finalScore - a.finalScore);

    console.log('[TrailerPlayer] Top scored movies for A/B preferences:',
      scored.slice(0, 10).map(s => ({
        title: s.title,
        abScore: s.abScore.toFixed(3),
        diversity: s.diversityScore.toFixed(3),
        final: s.finalScore.toFixed(3),
        year: s.item.year,
        sources: s.item.sources
      }))
    );

    // Advanced selection with genre/theme diversity enforcement
    const selected: typeof scored[0]['item'][] = [];
    const usedGenres = new Set<number>();
    const usedDecades = new Set<string>();
    const usedTitleWords = new Set<string>();
    const usedSources = new Set<string>();

    // Create selection pools for maximum variety
    const pools = {
      recent: scored.filter(s => parseInt(s.item.year) >= 2015),
      classic: scored.filter(s => parseInt(s.item.year) < 2000),
      middle: scored.filter(s => parseInt(s.item.year) >= 2000 && parseInt(s.item.year) < 2015),
      action: scored.filter(s => s.item.genres?.includes(28)),
      drama: scored.filter(s => s.item.genres?.includes(18)),
      comedy: scored.filter(s => s.item.genres?.includes(35)),
      thriller: scored.filter(s => s.item.genres?.includes(53)),
      scifi: scored.filter(s => s.item.genres?.includes(878)),
      all: scored
    };

    // Selection strategy based on A/B preferences
    const selectionStrategy = [];
    
    if (abAnalysis.preferences.length > 0) {
      // Use A/B preferences to guide selection
      for (const pref of abAnalysis.preferences.slice(0, 2)) {
        if (pref.type === 'action' && pools.action.length > 0) selectionStrategy.push('action');
        if (pref.type === 'drama' && pools.drama.length > 0) selectionStrategy.push('drama');
        if (pref.type === 'comedy' && pools.comedy.length > 0) selectionStrategy.push('comedy');
        if (pref.type === 'thriller' && pools.thriller.length > 0) selectionStrategy.push('thriller');
        if (pref.type === 'scifi' && pools.scifi.length > 0) selectionStrategy.push('scifi');
      }
    }
    
    // Add era diversity based on recent preference
    if (learnedVec[11] > 0.6) {
      selectionStrategy.push('recent');
    } else if (learnedVec[11] < 0.4) {
      selectionStrategy.push('classic');
    } else {
      selectionStrategy.push('middle');
    }
    
    // Fill remaining slots with 'all' for maximum variety
    while (selectionStrategy.length < count) {
      selectionStrategy.push('all');
    }

    console.log('[TrailerPlayer] Selection strategy based on A/B learning:', selectionStrategy);

    // Execute selection strategy
    for (let i = 0; i < count && selected.length < count; i++) {
      const pool = pools[selectionStrategy[i] as keyof typeof pools] || pools.all;
      
      // Find best movie from this pool that maximizes diversity
      let bestCandidate = null;
      let bestDiversityScore = -1;
      
      for (const candidate of pool) {
        if (selected.includes(candidate.item)) continue;
        
        // Calculate diversity score for this candidate
        const decade = Math.floor(parseInt(candidate.item.year) / 10) * 10;
        const titleWords = candidate.item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const candidateGenres = candidate.item.genres || [];
        const candidateSources = candidate.item.sources || [];
        
        let diversityScore = 0;
        
        // Bonus for unused decade
        if (!usedDecades.has(decade.toString())) diversityScore += 2.0;
        
        // Bonus for unused genres
        const unusedGenres = candidateGenres.filter(g => !usedGenres.has(g));
        diversityScore += unusedGenres.length * 0.5;
        
        // Bonus for unused title words
        const unusedWords = titleWords.filter(w => !usedTitleWords.has(w));
        diversityScore += unusedWords.length * 0.3;
        
        // Bonus for unused sources
        const unusedSources = candidateSources.filter(s => !usedSources.has(s));
        diversityScore += unusedSources.length * 0.4;
        
        // Factor in the original A/B score
        diversityScore += candidate.finalScore * 0.3;
        
        if (diversityScore > bestDiversityScore) {
          bestDiversityScore = diversityScore;
          bestCandidate = candidate;
        }
      }
      
      if (bestCandidate) {
        selected.push(bestCandidate.item);
        
        // Update used sets to maintain diversity
        const decade = Math.floor(parseInt(bestCandidate.item.year) / 10) * 10;
        usedDecades.add(decade.toString());
        
        bestCandidate.item.genres?.forEach(g => usedGenres.add(g));
        bestCandidate.item.sources?.forEach(s => usedSources.add(s));
        
        const titleWords = bestCandidate.item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        titleWords.forEach(w => usedTitleWords.add(w));
        
        console.log(`[TrailerPlayer] Selected ${i+1}: "${bestCandidate.item.title}" (${bestCandidate.item.year}) from ${bestCandidate.item.sources} - diversity score: ${bestDiversityScore.toFixed(2)}`);
      }
    }

    console.log('[TrailerPlayer] Final A/B-driven selection:', selected.map(item => ({
      title: item.title,
      year: item.year,
      sources: item.sources,
      genres: item.genres
    })));

    return selected;
  }, [items, learnedVec, recentChosenIds, avoidIds, count, abAnalysis]);

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
      console.log('[TrailerPlayer] Fetching trailers for A/B-driven picks:', picks.length);
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
          <h2 className="text-lg sm:text-xl font-semibold">Your Personalized Trailer Reel</h2>
          <div className="text-xs sm:text-sm opacity-60">0 / 0</div>
        </div>
        <div className="text-center py-12">
          <div className="text-lg mb-2">Building your A/B-personalized trailer queue...</div>
          <div className="text-sm opacity-60">Finding trailers that match your choices from the A/B testing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg sm:text-xl font-semibold">Your Personalized Trailer Reel</h2>
          <div className="text-xs sm:text-sm opacity-60">{idx + 1} / {queue.length}</div>
        </div>
        <div className="text-xs sm:text-sm opacity-70 italic">
          {abAnalysis.explanation}
        </div>
      </div>

      {current && (
        <div className="mb-4 sm:mb-6">
          <div className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-center sm:text-left">
            {current.title} ({current.year})
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
