import React, { useState, useEffect, useMemo } from 'react';
import { phi } from '@/lib/phi';
import { dot } from '@/lib/taste';

export type Title = {
  id: number;
  title: string;
  year: string;
  genres: number[];
  popularity?: number;
  feature?: number[];
  sources?: string[];
};

type Props = {
  items: Title[];
  learnedVec: number[];
  recentChosenIds: number[];
  avoidIds?: number[];
  count?: number;
};

function bestImageUrl(t: Title): string | null {
  // Simple fallback for now - in a real app you'd use poster URLs
  return `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${encodeURIComponent(t.title)}`;
}

function cosine(a: number[], b: number[]): number {
  let dotProd = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProd += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  return dotProd / denom;
}

export default function TrailerPlayer({
  items, learnedVec, recentChosenIds, avoidIds = [], count = 6,
}: Props) {
  const [queue, setQueue] = useState<Array<Title & { genres: string[], explanation: string }>>([]);
  const [embeds, setEmbeds] = useState<Record<number, string|null>>({});
  const [idx, setIdx] = useState(0);

  console.log('[TrailerPlayer] Received items:', items.length);
  console.log('[TrailerPlayer] Learned vector length:', learnedVec.length);
  console.log('[TrailerPlayer] Recent chosen IDs:', recentChosenIds.length);
  console.log('[TrailerPlayer] A/B Learned Vector:', learnedVec.slice(0, 12));

  // MMR helper function for diversity selection
  function mmrSelect<T>(items: T[], k: number, relevance: (x:T)=>number, vec: (x:T)=>number[], lambda=0.75) {
    const chosen: T[] = [];
    const sim = (a:T,b:T) => {
      const va = vec(a), vb = vec(b);
      let dot=0, na=0, nb=0; 
      for (let i=0;i<va.length;i++){ 
        dot+=va[i]*vb[i]; 
        na+=va[i]*va[i]; 
        nb+=vb[i]*vb[i]; 
      }
      const la = Math.sqrt(na)||1, lb=Math.sqrt(nb)||1;
      return dot/(la*lb);
    };
    const pool = items.slice();
    while (chosen.length < k && pool.length) {
      let bestIdx = 0, bestVal = -1e9;
      for (let i=0;i<pool.length;i++){
        const rel = relevance(pool[i]);
        const div = chosen.length ? Math.max(...chosen.map(c=> sim(pool[i], c))) : 0;
        const val = lambda*rel - (1-lambda)*div;
        if (val > bestVal){ bestVal = val; bestIdx = i; }
      }
      chosen.push(pool.splice(bestIdx,1)[0]);
    }
    return chosen;
  }

  // RANDOM selection from 5 decade lists only (no A/B correlation yet)
  const picks = useMemo(() => {
    if (!items.length) return [];

    // Filter to movies from ONLY the 5 decade sources with posters
    const decadeMovies = items.filter(item => {
      // Must be from one of the 5 decade sources
      const isFromDecadeSources = item.sources?.some(src => 
        ['decade2020s', 'decade2010s', 'decade2000s', 'decade1990s', 'decade1980s'].includes(src)
      );

      // Must have a poster/image
      const hasImage = bestImageUrl(item);

      return isFromDecadeSources && hasImage;
    });

    // Remove recently chosen to avoid immediate repeats
    const available = decadeMovies.filter(item => 
      !recentChosenIds.includes(item.id) && !avoidIds.includes(item.id)
    );

    console.log(`[TrailerPlayer] RANDOM SELECTION: ${available.length} available from decade sources`);
    console.log(`[TrailerPlayer] Source breakdown:`, {
      decade2020s: available.filter(item => item.sources?.includes('decade2020s')).length,
      decade2010s: available.filter(item => item.sources?.includes('decade2010s')).length,
      decade2000s: available.filter(item => item.sources?.includes('decade2000s')).length,
      decade1990s: available.filter(item => item.sources?.includes('decade1990s')).length,
      decade1980s: available.filter(item => item.sources?.includes('decade1980s')).length,
    });

    if (available.length === 0) {
      console.warn('[TrailerPlayer] No available movies from decade sources');
      return [];
    }

    // PURE RANDOM SELECTION - No scoring, no preferences, no MMR
    const randomPicks: any[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < Math.min(count, available.length); i++) {
      let randomIndex;
      let attempts = 0;

      // Get a random unused movie
      do {
        randomIndex = Math.floor(Math.random() * available.length);
        attempts++;
      } while (usedIndices.has(randomIndex) && attempts < 100);

      if (attempts < 100) {
        usedIndices.add(randomIndex);
        const pick = available[randomIndex];
        randomPicks.push(pick);

        console.log(`[RANDOM PICK ${i+1}] "${pick.title}" (${pick.year}) from sources: ${pick.sources?.join(', ')}`);
      }
    }

    console.log(`[TrailerPlayer] Selected ${randomPicks.length} random movies from decade sources only`);

    return randomPicks;
  }, [items, learnedVec, recentChosenIds, avoidIds, count]);

  // Convert picks to queue format
  useEffect(() => {
    const newQueue = picks.map(item => ({
      ...item,
      genres: item.genres?.map(g => {
        // Convert genre IDs to strings
        const genreMap: Record<number, string> = {
          28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
          80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
          14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
          9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
          53: 'Thriller', 10752: 'War', 37: 'Western'
        };
        return genreMap[g] || 'Unknown';
      }) || [],
      explanation: 'Randomly selected from decade lists' // Update explanation
    }));

    setQueue(newQueue);
    setIdx(0);
  }, [picks]);

  // Fetch trailer embeds
  useEffect(() => {
    if (queue.length === 0) return;

    console.log('[TrailerPlayer] Fetching trailers for BTL picks:', queue.length);

    const fetchEmbeds = async () => {
      const newEmbeds: Record<number, string|null> = {};

      for (const item of queue) {
        try {
          const res = await fetch(`/api/trailer?id=${item.id}`);
          if (res.ok) {
            const data = await res.json();
            newEmbeds[item.id] = data.trailer?.url || null;
          } else {
            newEmbeds[item.id] = null;
          }
        } catch (error) {
          console.error(`Failed to fetch trailer for ${item.title}:`, error);
          newEmbeds[item.id] = null;
        }
      }

      console.log('[TrailerPlayer] Received embeds for:', Object.keys(newEmbeds).length, 'items');
      console.log('[TrailerPlayer] Items with trailers:', Object.values(newEmbeds).filter(Boolean).length);

      setEmbeds(newEmbeds);
    };

    fetchEmbeds();
  }, [queue]);

  const currentItem = queue[idx];
  const currentEmbed = currentItem ? embeds[currentItem.id] : null;

  console.log('[TrailerPlayer] Current state:', {
    queueLength: queue.length,
    currentIndex: idx,
    currentTitle: currentItem?.title,
    hasEmbed: !!currentEmbed
  });

  const nextItem = () => {
    setIdx(prev => (prev + 1) % queue.length);
  };

  const prevItem = () => {
    setIdx(prev => (prev - 1 + queue.length) % queue.length);
  };

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <p className="text-gray-400">Loading personalized recommendations...</p>
      </div>
    );
  }

  // Generate personalized explanation based on A/B learning (This part is now unused for selection but kept for UI)
  const generatePersonalizedExplanation = () => {
    const genrePrefs = [
      { name: 'Comedy', score: learnedVec[0] || 0, id: 35 },
      { name: 'Drama', score: learnedVec[1] || 0, id: 18 },
      { name: 'Action', score: learnedVec[2] || 0, id: 28 },
      { name: 'Thriller', score: learnedVec[3] || 0, id: 53 },
      { name: 'Sci-Fi', score: learnedVec[4] || 0, id: 878 },
      { name: 'Fantasy', score: learnedVec[5] || 0, id: 14 }
    ].sort((a, b) => b.score - a.score);

    const topGenres = genrePrefs.filter(g => g.score > 0.3).slice(0, 3);
    const strongestGenre = topGenres[0];

    if (topGenres.length === 0) {
      return "We're still learning your preferences! These movies offer a great variety to help us understand your taste better.";
    }

    let explanation = `Based on your A/B testing choices, you showed a strong preference for ${strongestGenre.name.toLowerCase()}`;

    if (topGenres.length > 1) {
      const otherGenres = topGenres.slice(1).map(g => g.name.toLowerCase()).join(" and ");
      explanation += ` with ${otherGenres}`;
    }

    explanation += `. We really think you should give one of these movies a go tonight:`;

    return explanation;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Your Personalized Trailer Reel</h3>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto leading-relaxed">
          {generatePersonalizedExplanation()}
        </p>
      </div>

      {/* Trailer Player */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {currentEmbed ? (
          <div className="aspect-video">
            <iframe
              src={currentEmbed}
              title={`${currentItem.title} trailer`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <p className="text-white font-semibold">{currentItem.title}</p>
              <p className="text-gray-400">Loading trailer...</p>
            </div>
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="text-center space-y-2">
        <h4 className="text-lg font-semibold text-white">{currentItem.title}</h4>
        <p className="text-gray-400">{currentItem.year} • {currentItem.genres.join(', ')}</p>
        <p className="text-sm text-gray-500">{currentItem.explanation}</p>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={prevItem}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={queue.length <= 1}
        >
          Previous
        </button>
        <span className="px-4 py-2 text-gray-400">
          {idx + 1} of {queue.length}
        </span>
        <button
          onClick={nextItem}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={queue.length <= 1}
        >
          Next
        </button>
      </div>

      {/* Queue Preview */}
      <div className="mt-6">
        <h5 className="text-sm font-semibold text-gray-400 mb-2">Up Next:</h5>
        <div className="flex space-x-2 overflow-x-auto">
          {queue.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 p-2 rounded text-xs ${
                i === idx ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}