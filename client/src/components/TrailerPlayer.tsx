
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

  // FIXED: Actually use the BTL learned preferences to score movies
  const picks = useMemo(() => {
    if (!items.length || !learnedVec.length) return [];

    // Filter to movies with images and not recently seen
    const available = items
      .filter(item => bestImageUrl(item))
      .filter(item => !recentChosenIds.includes(item.id))
      .filter(item => !avoidIds.includes(item.id));

    if (available.length === 0) {
      console.warn('[TrailerPlayer] No available items');
      return [];
    }

    console.log('[TrailerPlayer] Available movies:', available.length);

    // Score movies using BTL learned preferences - THIS IS THE KEY FIX
    const scored = available.map((item) => {
      const itemPhi = phi(item);

      // Ensure vectors are same length
      const w = [...learnedVec];
      while (w.length < itemPhi.length) w.push(0);
      while (itemPhi.length < w.length) itemPhi.push(0);

      // Raw BTL score using dot product of learned weights and movie features
      const btlScore = dot(w, itemPhi);

      // Small bonuses for quality and recency
      const qualityBonus = item.sources?.includes('imdbTop') ? 0.2 : 0;
      const recentBonus = parseInt(item.year) >= 2015 ? 0.1 : 0;

      const finalScore = btlScore + qualityBonus + recentBonus;

      return {
        item,
        btlScore,
        finalScore,
        title: item.title
      };
    });

    // Sort by final score (higher = better match to your preferences)
    scored.sort((a,b) => b.finalScore - a.finalScore);

    console.log('[TrailerPlayer] Top BTL scored movies:',
      scored.slice(0, 15).map(s => ({
        title: s.title,
        btlScore: s.btlScore.toFixed(3),
        finalScore: s.finalScore.toFixed(3),
        year: s.item.year,
        genres: s.item.genres
      }))
    );

    // Take top 30 candidates and apply MMR for diversity
    const topCandidates = scored.slice(0, Math.min(30, scored.length));
    
    // MMR selection for diversity
    const selected: typeof topCandidates = [];
    const remaining = [...topCandidates];
    
    while (selected.length < count && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevance = candidate.finalScore;
        
        // Calculate diversity penalty (similarity to already selected)
        let maxSimilarity = 0;
        for (const sel of selected) {
          const candPhi = phi(candidate.item);
          const selPhi = phi(sel.item);
          const similarity = cosine(candPhi, selPhi);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        
        // MMR formula: λ * relevance - (1-λ) * max_similarity
        const lambda = 0.7; // Balance relevance vs diversity
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }
      
      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    console.log('[TrailerPlayer] Final BTL+MMR selection:', 
      selected.map(s => ({
        title: s.title,
        year: s.item.year,
        btlScore: s.btlScore.toFixed(3),
        finalScore: s.finalScore.toFixed(3)
      }))
    );

    return selected.map(s => s.item);
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
      explanation: 'Matches your A/B testing preferences'
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Your Personalized Trailer Reel</h3>
        <p className="text-gray-400">Based on your A/B testing choices</p>
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
              <p className="text-gray-400">Trailer not available</p>
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
