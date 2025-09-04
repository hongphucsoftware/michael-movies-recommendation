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

    // Build explanation based on funnel learning
    let explanation = 'Building your taste profile through structured A/B testing';
    if (preferences.length === 0) {
      explanation = vectorMagnitude > 2.0 ? 'Your refined taste profile from funnel A/B testing' : 'Learning your preferences through strategic A/B rounds';
    } else if (preferences.length === 1) {
      explanation = `Strong preference for ${preferences[0].label} discovered through focused A/B testing`;
    } else if (preferences.length >= 2) {
      explanation = `You prefer ${preferences[0].label} and ${preferences[1].label} based on your A/B funnel choices`;
    }

    return { preferences, strength, explanation, vectorMagnitude };
  }, [learnedVec]);

  // Properly A/B-driven movie selection using learned preferences
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
    console.log('[TrailerPlayer] A/B Preferences:', {
      comedy: learnedVec[0]?.toFixed(2),
      drama: learnedVec[1]?.toFixed(2), 
      action: learnedVec[2]?.toFixed(2),
      thriller: learnedVec[3]?.toFixed(2),
      scifi: learnedVec[4]?.toFixed(2),
      fantasy: learnedVec[5]?.toFixed(2)
    });

    // Score each movie using the learned preference vector directly
    const scored = available.map((item, index) => {
      const features = item.feature || toFeatureVector(item);
      
      // This is the key fix: use cosine similarity with learned vector
      const preferenceScore = cosine(features, learnedVec);
      
      // Add small diversity factors
      const yearSpread = Math.abs(parseInt(item.year) - 2000) / 50; // 0-0.5 range
      const genreCount = (item.genres?.length || 1) / 5; // Multi-genre bonus
      const sourceBonus = item.sources?.includes('imdbTop') ? 0.1 : 0.05;
      const randomJitter = (Math.random() - 0.5) * 0.1; // Small random element
      
      const finalScore = preferenceScore + yearSpread + genreCount + sourceBonus + randomJitter;

      return {
        item,
        preferenceScore,
        finalScore,
        title: item.title,
        explanation: `Score: ${preferenceScore.toFixed(3)} (${preferenceScore > 0.5 ? 'good match' : preferenceScore > 0.3 ? 'okay match' : 'poor match'} based on A/B choices)`
      };
    });

    // Sort by preference alignment
    scored.sort((a, b) => b.finalScore - a.finalScore);

    console.log('[TrailerPlayer] Top A/B preference matches:',
      scored.slice(0, 10).map(s => ({
        title: s.title,
        prefScore: s.preferenceScore.toFixed(3),
        final: s.finalScore.toFixed(3),
        year: s.item.year,
        genres: s.item.genres?.slice(0, 3)
      }))
    );

    // Genre mapping for descriptions
    const genreMap: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };

    // Select top 6 with enforced diversity
    const selected: Array<{
      item: typeof scored[0]['item'],
      genres: string[],
      explanation: string
    }> = [];
    
    const usedGenres = new Set<number>();
    const usedDecades = new Set<string>();
    
    for (let i = 0; i < scored.length && selected.length < 6; i++) {
      const candidate = scored[i];
      const item = candidate.item;
      
      // Check if this adds genre/decade diversity or is a top match
      const primaryGenre = item.genres?.[0];
      const decade = Math.floor(parseInt(item.year) / 10) * 10;
      
      const isTopMatch = candidate.preferenceScore > 0.4;
      const addsGenreDiversity = !primaryGenre || !usedGenres.has(primaryGenre);
      const addsDecadeDiversity = !usedDecades.has(decade);
      
      if (selected.length < 3 || isTopMatch || addsGenreDiversity || addsDecadeDiversity) {
        const itemGenres = item.genres?.map(g => genreMap[g]).filter(Boolean) || ['Unclassified'];
        
        // Generate explanation based on A/B learning
        let explanation = `Based on your A/B choices: `;
        if (candidate.preferenceScore > 0.5) {
          explanation += `strong match (${(candidate.preferenceScore * 100).toFixed(0)}% alignment)`;
        } else if (candidate.preferenceScore > 0.3) {
          explanation += `good match (${(candidate.preferenceScore * 100).toFixed(0)}% alignment)`;
        } else {
          explanation += `exploration pick (${(candidate.preferenceScore * 100).toFixed(0)}% alignment)`;
        }
        
        // Add preference reasoning
        const topPrefs = abAnalysis.preferences.slice(0, 2).map(p => p.label);
        if (topPrefs.length > 0) {
          explanation += ` - you showed preference for ${topPrefs.join(' and ')}.`;
        }

        selected.push({
          item,
          genres: itemGenres,
          explanation
        });
        
        if (primaryGenre) usedGenres.add(primaryGenre);
        usedDecades.add(decade);
        
        console.log(`[TrailerPlayer] Selected ${selected.length}: "${item.title}" (${item.year}) [${itemGenres.slice(0, 2).join('/')}] - preference score: ${candidate.preferenceScore.toFixed(3)}`);
      }
    }

    return selected;
  }, [items, learnedVec, recentChosenIds, avoidIds, abAnalysis]);

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
      const embeds = await fetchTrailerEmbeds(trailerIds);

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