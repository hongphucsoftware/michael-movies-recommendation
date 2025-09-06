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

  // Fetch personalized recommendations from new Bradley-Terry model
  const [recommendations, setRecommendations] = useState<Title[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('/api/recs?top=12');
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.items) {
            // Convert API format to Title format
            const recs: Title[] = data.items.map((item: any) => ({
              id: item.id,
              title: item.title,
              year: item.year?.toString() || '',
              genres: item.genres || [],
              popularity: 50, // Default
              feature: [], // Not used
              sources: item.sources || [],
            }));

            console.log(`[TrailerPlayer] Fetched ${recs.length} personalized recommendations from Bradley-Terry model`);
            console.log(`[TrailerPlayer] User completed ${data.rounds} A/B rounds`);
            if (data.likes?.length > 0) {
              console.log(`[TrailerPlayer] User preferences:`, data.likes.slice(0, 3));
            }

            setRecommendations(recs);
          }
        }
      } catch (error) {
        console.error('[TrailerPlayer] Failed to fetch recommendations:', error);
        setRecommendations([]);
      }
    };

    fetchRecommendations();
  }, [learnedVec]); // Refetch when A/B learning updates

  const picks = useMemo(() => {
    if (recommendations.length === 0) return [];

    // Remove recently chosen to avoid immediate repeats
    const available = recommendations.filter(item =>
      !recentChosenIds.includes(item.id) && !avoidIds.includes(item.id)
    );

    console.log(`[TrailerPlayer] ${available.length} personalized recommendations available`);

    if (available.length === 0) {
      console.warn('[TrailerPlayer] No available personalized recommendations');
      return [];
    }

    // Take top recommendations (already ranked by Bradley-Terry model)
    const picks = available.slice(0, count);

    picks.forEach((pick, i) => {
      console.log(`[PERSONALIZED PICK ${i+1}] "${pick.title}" (${pick.year})`);
    });

    console.log(`[TrailerPlayer] Selected ${picks.length} personalized recommendations`);
    return picks;
  }, [recommendations, recentChosenIds, avoidIds, count]);

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
      explanation: 'Personalized based on your A/B testing preferences'
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
      console.log('[TrailerPlayer] Sample embed URLs:', Object.entries(newEmbeds).slice(0, 3));

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

  // Helper to set the current index in the queue
  const setCurrentIndex = (index: number) => {
    setIdx(index);
  };

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <p className="text-gray-400">Loading personalized recommendations...</p>
      </div>
    );
  }

  // Generate explanation based on recommendations API response
  const [explanationText, setExplanationText] = useState("Loading your personalized recommendations...");

  useEffect(() => {
    const fetchExplanation = async () => {
      try {
        const response = await fetch('/api/recs?top=5');
        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            if (data.rounds === 0) {
              setExplanationText("Complete the A/B testing to get personalized recommendations!");
            } else if (data.rounds < 12) {
              setExplanationText(`Based on ${data.rounds} A/B choices, here are some initial recommendations. Complete more rounds for better personalization!`);
            } else {
              // Generate explanation from user preferences
              const topPrefs = data.likes?.slice(0, 3) || [];
              if (topPrefs.length > 0) {
                const prefText = topPrefs.map((pref: [string, number]) => {
                  const [key] = pref;
                  if (key.startsWith('g:')) return `genre preferences`;
                  if (key.startsWith('dir:')) return `director style`;
                  if (key.startsWith('act:')) return `actor preferences`;
                  if (key.startsWith('era:')) return `era preferences`;
                  return 'cinematic taste';
                }).slice(0, 2).join(' and ');

                setExplanationText(`Based on your A/B testing choices, we've learned your ${prefText}. Here are movies we think you'll love:`);
              } else {
                setExplanationText("Based on your A/B testing choices, here are personalized recommendations for you:");
              }
            }
          }
        }
      } catch (error) {
        setExplanationText("These movies are selected based on your preferences:");
      }
    };

    fetchExplanation();
  }, [learnedVec]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Your Personalized Trailer Reel</h3>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto leading-relaxed">
          {explanationText}
        </p>
      </div>

      {/* Trailer Player */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {currentEmbed ? (
          <div className="aspect-video">
            <iframe
              src={currentEmbed.includes('youtube.com/embed/') ? currentEmbed : `https://www.youtube.com/embed/${currentEmbed.replace('https://www.youtube.com/watch?v=', '')}`}
              title={`${currentItem.title} trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <p className="text-white font-semibold">{currentItem.title}</p>
              <p className="text-gray-400">
                {Object.keys(embeds).length === 0 ? 'Loading trailer...' : 'No trailer available'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Debug: Queue {queue.length}, Index {idx}, Embeds {Object.keys(embeds).length}
              </p>
            </div>
          </div>
        )}</div>
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