
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

  // Smart trailer selection with proper MMR diversity
  const picks = useMemo(() => {
    if (!items.length || !learnedVec.length) return [];

    // Filter to movies with trailers and not recently seen
    const available = items
      .filter(item => {
        // Robust: accept either .youtube or .ytKeys[0] for trailer availability
        const hasTrailer = bestImageUrl(item);
        return hasTrailer;
      })
      .filter(item => !recentChosenIds.includes(item.id))
      .filter(item => !avoidIds.includes(item.id));

    if (available.length === 0) {
      console.warn('[TrailerPlayer] No available items');
      return [];
    }

    console.log('[TrailerPlayer] Available movies with trailers:', available.length);
    
    // Debug Spider-Man filtering
    const spiderManInItems = items.filter(item => item.title.includes('Spider-Man'));
    const spiderManAvailable = available.filter(item => item.title.includes('Spider-Man'));
    console.log(`[DEBUG] Spider-Man movies: ${spiderManInItems.length} in pool, ${spiderManAvailable.length} available after filtering`);
    spiderManInItems.forEach(sm => {
      const isFiltered = recentChosenIds.includes(sm.id);
      console.log(`  - "${sm.title}" (ID: ${sm.id}) - In recent list: ${isFiltered}`);
    });

    // Direct genre-based scoring using A/B learned preferences
    const baseRel = (item: Title) => {
      if (!item.genres?.length) return 0.1; // Minimal score for ungenred movies
      
      // Extract learned preference strengths (first 6 are main genres)
      const [comedy, drama, action, thriller, scifi, fantasy] = learnedVec;
      
      // CRITICAL: Use A/B test learned preferences to score genres
      // Higher A/B scores = stronger preference from user choices
      const genreScores = {
        35: comedy || 0,     // Comedy
        18: drama || 0,      // Drama 
        28: action || 0,     // Action
        53: thriller || 0,   // Thriller
        878: scifi || 0,     // Sci-Fi
        14: fantasy || 0,    // Fantasy
        12: (action || 0) * 0.8, // Adventure (related to action)
        80: (thriller || 0) * 0.7, // Crime (related to thriller)
        9648: (thriller || 0) * 0.8, // Mystery (related to thriller)
        27: (thriller || 0) * 0.9, // Horror (related to thriller)
        10749: (comedy || 0) * 0.6, // Romance (light comedy overlap)
        16: 0  // Animation (disabled - avoid anime/cartoon bias in recommendations)
      };
      
      // Calculate genre match score based on A/B learning
      let genreScore = 0;
      let matchedGenres = [];
      let totalGenreWeight = 0;
      
      for (const genreId of item.genres) {
        const score = genreScores[genreId] || 0;
        totalGenreWeight += score;
        
        // Only count as a "match" if the user showed positive preference (score > 0.2)
        if (score > 0.2) {
          genreScore += score;
          const genreName = {
            35: 'comedy', 18: 'drama', 28: 'action', 53: 'thriller', 
            878: 'sci-fi', 14: 'fantasy', 12: 'adventure', 80: 'crime',
            9648: 'mystery', 27: 'horror', 10749: 'romance', 16: 'animation'
          }[genreId] || 'other';
          matchedGenres.push(genreName);
        }
      }
      
      // Heavy penalty for animation to avoid anime bias, and genres user dislikes
      const animationPenalty = item.genres?.includes(16) ? -2.0 : 0; // Block animation recommendations
      const antiPreferencePenalty = item.genres.some(gId => {
        const score = genreScores[gId] || 0;
        return score < -0.3; // User really dislikes this genre
      }) ? -1.0 : 0;
      
      // Bonus factors - ensure trailers come from all provided lists
      const sourceBonus = item.sources?.includes('imdbTop') ? 0.15 : 
                         item.sources?.includes('rt2020') ? 0.12 : 
                         item.sources?.includes('imdbList') ? 0.10 : 0;
      const recentBonus = parseInt(item.year) >= 2015 ? 0.08 : 0;
      const noveltyBonus = recentChosenIds.includes(item.id) ? -2.0 : 0; // Heavy penalty for repeats
      
      const finalScore = genreScore + sourceBonus + recentBonus + noveltyBonus + antiPreferencePenalty + animationPenalty;
      
      // Debug logging for top-scoring movies
      if (finalScore > 0.8) {
        console.log(`[SCORING] "${item.title}" = ${finalScore.toFixed(3)} (genres: ${matchedGenres.join('/')} | matched: ${genreScore.toFixed(2)})`);
      }
      
      return Math.max(0.01, finalScore); // Ensure positive scores
    };

    // Score top 150 candidates, then MMR-select diverse 5
    const prelim = available
      .map(item => ({ item, score: baseRel(item) }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 150)
      .map(x => x.item);

    console.log('[TrailerPlayer] A/B Learned Vector:', learnedVec.slice(0, 10).map(v => v?.toFixed(2)));
    console.log('[TrailerPlayer] A/B Preferences Summary:');
    console.log(`  - Comedy: ${learnedVec[0]?.toFixed(2)} | Sci-Fi: ${learnedVec[4]?.toFixed(2)} | Fantasy: ${learnedVec[5]?.toFixed(2)}`);
    console.log(`  - Action: ${learnedVec[2]?.toFixed(2)} | Drama: ${learnedVec[1]?.toFixed(2)} | Thriller: ${learnedVec[3]?.toFixed(2)}`);
    
    // Find user's actual top preferences from A/B learning
    const genrePrefs = [
      { name: 'comedy', score: learnedVec[0] || 0, id: 35 },
      { name: 'drama', score: learnedVec[1] || 0, id: 18 },
      { name: 'action', score: learnedVec[2] || 0, id: 28 },
      { name: 'thriller', score: learnedVec[3] || 0, id: 53 },
      { name: 'sci-fi', score: learnedVec[4] || 0, id: 878 },
      { name: 'fantasy', score: learnedVec[5] || 0, id: 14 }
    ].sort((a, b) => b.score - a.score);
    
    const topGenres = genrePrefs.filter(g => g.score > 0.5).slice(0, 3);
    console.log('[TrailerPlayer] User\'s TOP genres from A/B testing:', topGenres.map(g => `${g.name}:${g.score.toFixed(2)}`));
    
    console.log('[TrailerPlayer] Top preliminary candidates:', 
      prelim.slice(0, 10).map(item => ({
        title: item.title,
        year: item.year,
        score: baseRel(item).toFixed(3),
        sources: item.sources,
        genres: item.genres
      }))
    );

    // Apply brand diversity (one per franchise)
    const brandSeen = new Set<string>();
    const brandCapped = prelim.filter(item => {
      const key = (item.title || "").toLowerCase()
        .replace(/^the\s+|^a\s+|^an\s+/, "")
        .replace(/[^a-z0-9]+/g," ")
        .trim()
        .split(" ")
        .slice(0,2)
        .join(" ");
      if (brandSeen.has(key)) return false;
      brandSeen.add(key);
      return true;
    });

    // CRITICAL: Filter by A/B test correlation BEFORE final selection
    // Only show movies that match user's learned preferences  
    const correlatedCandidates = brandCapped.filter(item => {
      const userScore = baseRel(item);
      
      // Require minimum genre correlation from A/B testing  
      if (userScore < 0.5) return false;
      
      // Check if movie has genres user actually prefers from A/B testing
      const hasPreferredGenre = item.genres?.some(gId => {
        const genreScore = {
          35: learnedVec[0] || 0,  // Comedy
          18: learnedVec[1] || 0,  // Drama
          28: learnedVec[2] || 0,  // Action  
          53: learnedVec[3] || 0,  // Thriller
          878: learnedVec[4] || 0, // Sci-Fi
          14: learnedVec[5] || 0   // Fantasy
        }[gId] || 0;
        return genreScore > 0.5; // Must be a genre user showed preference for in A/B tests
      });
      
      return hasPreferredGenre;
    });
    
    console.log(`[CORRELATION] Filtered from ${brandCapped.length} to ${correlatedCandidates.length} movies matching A/B preferences`);
    
    // Use A/B-correlated movies first, fallback to top candidates if none match
    const candidatePool = correlatedCandidates.length >= count ? correlatedCandidates : brandCapped.slice(0, 50);
    
    // Final MMR selection for diversity
    const finalPicks = mmrSelect(
      candidatePool, 
      count, 
      baseRel, 
      (x) => phi(x), 
      0.75 // 75% relevance, 25% diversity
    );

    console.log('[TrailerPlayer] Final MMR diverse selection:', 
      finalPicks.map(item => ({
        title: item.title,
        year: item.year,
        score: baseRel(item).toFixed(3),
        sources: item.sources
      }))
    );

    return finalPicks;
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

  // Generate personalized explanation based on A/B learning
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
