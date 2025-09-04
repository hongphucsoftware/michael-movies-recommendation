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

// Helper to extract YouTube video ID from embed URL
function extractVideoId(embedUrl: string | null): string | null {
  if (!embedUrl) return null;
  try {
    const url = new URL(embedUrl);
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v');
    } else if (url.hostname.includes('vimeo.com')) {
      return url.pathname.split('/').pop() || null;
    }
  } catch (e) {
    console.error("Error parsing embed URL:", e);
  }
  return null;
}

// Mock fetchTrailerBatch for development if needed
const fetchTrailerBatch = async (ids: number[]): Promise<Record<number, string | null>> => {
  console.log(`[Mock] Fetching trailers for IDs: ${ids.join(', ')}`);
  // In a real scenario, this would call an API like fetchTrailerEmbeds but batched
  // For now, simulate a successful response
  const mockEmbeds: Record<number, string | null> = {};
  ids.forEach(id => {
    // Simulate finding an embed for some IDs
    if (id % 2 === 0) {
      mockEmbeds[id] = `https://www.youtube.com/embed/mockvideo_${id}?autoplay=1`;
    } else {
      mockEmbeds[id] = `https://player.vimeo.com/video/mockvimeo_${id}`;
    }
  });
  return mockEmbeds;
};


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
  const [queue, setQueue] = useState<Array<Title & { genres: string[], explanation: string }>>([]);
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

    // Genre mapping for descriptions
    const genreMap: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };

    // Advanced selection with genre/theme diversity enforcement
    const selected: Array<{
      item: typeof scored[0]['item'],
      genres: string[],
      explanation: string
    }> = [];
    const usedGenres = new Set<number>();
    const usedDecades = new Set<string>();
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
      fantasy: scored.filter(s => s.item.genres?.includes(14)),
      all: scored
    };

    // Determine selection strategy based on A/B learning
    const topPreferences = Object.entries(abAnalysis.preferences).slice(0, 3);
    const strategy = topPreferences.map(([type]) => type).concat(['all', 'all', 'all']);

    console.log('[TrailerPlayer] Selection strategy based on A/B learning:', strategy);

    // Helper function to generate personalized explanation
    const generateExplanation = (item: typeof scored[0]['item'], matchedPreference?: string) => {
      const itemGenres = item.genres?.map(g => genreMap[g]).filter(Boolean) || [];
      const year = parseInt(item.year);
      const isRecent = year >= 2015;
      const isClassic = year < 1990;

      if (matchedPreference === 'comedy' && itemGenres.includes('Comedy')) {
        return `Perfect comedy match! This ${isRecent ? 'modern' : isClassic ? 'classic' : 'beloved'} ${itemGenres.join('/')} will deliver the laughs you're looking for.`;
      } else if (matchedPreference === 'thriller' && itemGenres.includes('Thriller')) {
        return `Ideal thriller pick! This ${isRecent ? 'contemporary' : isClassic ? 'timeless' : 'gripping'} ${itemGenres.join('/')} offers the suspense you crave.`;
      } else if (matchedPreference === 'fantasy' && itemGenres.includes('Fantasy')) {
        return `Fantasy lover's dream! This ${isRecent ? 'visually stunning' : isClassic ? 'imaginative' : 'enchanting'} ${itemGenres.join('/')} transports you to magical worlds.`;
      } else if (matchedPreference === 'scifi' && itemGenres.includes('Sci-Fi')) {
        return `Sci-fi enthusiast's choice! This ${isRecent ? 'cutting-edge' : isClassic ? 'visionary' : 'thought-provoking'} ${itemGenres.join('/')} explores fascinating possibilities.`;
      } else if (matchedPreference === 'drama' && itemGenres.includes('Drama')) {
        return `Compelling drama selection! This ${isRecent ? 'powerful' : isClassic ? 'masterful' : 'moving'} ${itemGenres.join('/')} delivers emotional depth.`;
      } else if (matchedPreference === 'action' && itemGenres.includes('Action')) {
        return `Action-packed choice! This ${isRecent ? 'adrenaline-fueled' : isClassic ? 'iconic' : 'thrilling'} ${itemGenres.join('/')} brings intense excitement.`;
      } else {
        // Fallback based on top user preferences
        const topPref = abAnalysis.preferences[0];
        if (topPref?.type === 'comedy') return `Comedy lover's pick! This ${itemGenres.join('/')} has the entertainment value you enjoy.`;
        if (topPref?.type === 'thriller') return `Suspense seeker's choice! This ${itemGenres.join('/')} delivers the tension you prefer.`;
        if (topPref?.type === 'fantasy') return `Fantasy fan's selection! This ${itemGenres.join('/')} offers the escapism you love.`;
        return `Curated for your taste! This ${itemGenres.join('/')} ${isRecent ? 'contemporary' : isClassic ? 'classic' : 'quality'} film matches your preferences.`;
      }
    };

    // Select diverse movies using the strategy - targeting 6 recommendations
    let selectionIndex = 0;
    for (let i = 0; i < Math.min(20, scored.length) && selected.length < 6; i++) {
      const poolKey = strategy[selectionIndex % strategy.length] as keyof typeof pools;
      const pool = pools[poolKey];

      // Find best unselected movie from this pool
      const candidate = pool.find(s => 
        !selected.some(sel => sel.item.id === s.item.id) &&
        (!usedSources.has(s.item.sources?.[0] || 'unknown') || selected.length >= 3)
      );

      if (candidate) {
        const itemGenres = candidate.item.genres?.map(g => genreMap[g]).filter(Boolean) || ['Unclassified'];
        const explanation = generateExplanation(candidate.item, poolKey);

        selected.push({
          item: candidate.item,
          genres: itemGenres,
          explanation
        });

        // Track diversity
        candidate.item.genres?.forEach(g => usedGenres.add(g));
        const decade = Math.floor(parseInt(candidate.item.year) / 10) * 10;
        usedDecades.add(decade.toString());
        usedSources.add(candidate.item.sources?.[0] || 'unknown');

        // Calculate and log diversity score
        const diversityScore = (usedGenres.size * 0.4) + (usedDecades.size * 0.3) + (usedSources.size * 0.3);

        console.log(`[TrailerPlayer] Selected ${selected.length}: "${candidate.item.title}" (${candidate.item.year}) [${itemGenres.join('/')}] from ${candidate.item.sources?.[0]} - diversity score: ${diversityScore.toFixed(2)}`);
      }

      selectionIndex++;
    }

    console.log('[TrailerPlayer] Final A/B-driven selection:', 
      selected.map(s => ({ 
        title: s.item.title, 
        genres: s.genres,
        sources: s.item.sources,
        year: s.item.year
      }))
    );

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
      
      const trailerIds = picks.map(s => s.item.id);
      const embeds = await fetchTrailerBatch(trailerIds);

      console.log('[TrailerPlayer] Received embeds for:', Object.keys(embeds).length, 'items');

      // Build final queue with trailers and explanations
      const newQueue = picks
        .filter(s => embeds[s.item.id])
        .map(s => ({
          ...s.item,
          yt: extractVideoId(embeds[s.item.id]) || '',
          embed: embeds[s.item.id],
          genres: s.genres,
          explanation: s.explanation
        }));

      console.log('[TrailerPlayer] Items with trailers:', newQueue.length);
      console.log('[TrailerPlayer] Trailer details:', 
        newQueue.map(item => ({
          title: item.title,
          genres: item.genres,
          year: item.year
        }))
      );

      setQueue(newQueue);

      if (newQueue.length > 0) {
        setIdx(0);
      }
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

  const currentItem = queue[idx];

  console.log('[TrailerPlayer] Current state:', {
    queueLength: queue.length,
    currentIndex: idx,
    currentTitle: currentItem?.title,
    hasEmbed: !!currentItem?.embed
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

      {currentItem && (
        <div className="mb-4 sm:mb-6">
          <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {currentItem.title} ({currentItem.year})
            </h3>
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                {currentItem.genres?.join(' • ') || 'Film'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {currentItem.explanation || abAnalysis.explanation}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Recommendation {idx + 1} of {queue.length} • Pool of {items.length} movies
            </p>
          </div>
          </div>
          <div className="aspect-video w-full rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-lg mt-6">
            {currentItem.embed ? (
              <iframe
                className="w-full h-full"
                src={currentItem.embed}
                title={`Trailer: ${currentItem.title}`}
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