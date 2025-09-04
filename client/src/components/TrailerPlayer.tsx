
import React, { useMemo, useEffect, useState } from 'react';
import { Movie } from '@/types/movie';

interface TrailerPlayerProps {
  items: Movie[];
  learnedVec: number[];
  recentChosenIds: number[];
  avoidIds: number[];
}

export function TrailerPlayer({ items, learnedVec, recentChosenIds, avoidIds }: TrailerPlayerProps) {
  const [currentQueue, setCurrentQueue] = useState<Array<{
    item: Movie;
    embed: string;
    genres: string[];
    explanation: string;
  }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  console.log('[TrailerPlayer] Received items:', items.length);
  console.log('[TrailerPlayer] Learned vector:', learnedVec);
  console.log('[TrailerPlayer] Recent chosen IDs:', recentChosenIds.length);

  // Genre mapping for display
  const genreMap: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  // A/B-driven movie selection using learned preferences
  const selectedMovies = useMemo(() => {
    if (!items.length || !learnedVec.length) return [];

    console.log('[TrailerPlayer] A/B Learned Vector:', learnedVec.slice(0, 6));
    
    // Filter to available movies (not recently seen, not avoided)
    const available = items
      .filter(item => item.title && item.title !== 'Unknown Title')
      .filter(item => !recentChosenIds.includes(parseInt(item.id)))
      .filter(item => !avoidIds.includes(parseInt(item.id)))
      .filter(item => item.year && parseInt(item.year) > 1960); // Filter out very old movies

    console.log('[TrailerPlayer] Available movies after filtering:', available.length);

    if (available.length === 0) return [];

    // Calculate preference scores using A/B learned vector
    const scoredMovies = available.map((item) => {
      let preferenceScore = 0;
      const movieFeatures = item.features || [];
      
      // Calculate alignment with A/B preferences (first 6 dimensions: comedy, drama, action, thriller, scifi, fantasy)
      for (let i = 0; i < Math.min(6, learnedVec.length, movieFeatures.length); i++) {
        if (learnedVec[i] > 0.3 && movieFeatures[i] > 0.5) {
          preferenceScore += learnedVec[i] * movieFeatures[i] * 2.0; // Strong weight for genre matches
        }
      }

      // Era preference (modern movies if learned vector shows recent preference)
      const recentPreference = learnedVec[11] || 0; // 12th dimension
      const movieYear = parseInt(item.year);
      if (movieYear >= 2010 && recentPreference > 0.5) {
        preferenceScore += 0.5;
      } else if (movieYear >= 2000 && recentPreference > 0.3) {
        preferenceScore += 0.3;
      }

      // Quality bonus for highly rated sources
      const qualityBonus = item.sources?.includes('imdbTop') ? 0.4 : 
                          item.sources?.includes('imdbList') ? 0.2 : 0.1;
      
      // Diversity factor to avoid clustering
      const diversityFactor = Math.random() * 0.3;
      
      const finalScore = preferenceScore + qualityBonus + diversityFactor;

      return {
        item,
        preferenceScore,
        finalScore,
        genres: (item.genres || []).map(g => genreMap[g]).filter(Boolean),
        explanation: generateExplanation(item, learnedVec, preferenceScore)
      };
    });

    // Sort by preference alignment, then final score
    scoredMovies.sort((a, b) => {
      if (Math.abs(a.preferenceScore - b.preferenceScore) > 0.5) {
        return b.preferenceScore - a.preferenceScore;
      }
      return b.finalScore - a.finalScore;
    });

    console.log('[TrailerPlayer] Top scored movies:', 
      scoredMovies.slice(0, 8).map(s => ({
        title: s.item.title,
        year: s.item.year,
        preference: s.preferenceScore.toFixed(2),
        final: s.finalScore.toFixed(2),
        genres: s.genres
      }))
    );

    // Select top 6 movies with good diversity
    const selected: typeof scoredMovies = [];
    const usedGenres = new Set<string>();
    const usedDecades = new Set<number>();

    for (const candidate of scoredMovies) {
      if (selected.length >= 6) break;
      
      const movieYear = parseInt(candidate.item.year);
      const decade = Math.floor(movieYear / 10) * 10;
      const primaryGenre = candidate.genres[0];

      // Ensure diversity while maintaining quality
      const diversityOk = selected.length < 3 || // First 3 can be anything good
                         !usedGenres.has(primaryGenre) || 
                         !usedDecades.has(decade) ||
                         candidate.preferenceScore > 1.0; // High preference overrides diversity

      if (diversityOk) {
        selected.push(candidate);
        if (primaryGenre) usedGenres.add(primaryGenre);
        usedDecades.add(decade);
      }
    }

    console.log('[TrailerPlayer] Final selection:', selected.map(s => ({
      title: s.item.title,
      year: s.item.year,
      genres: s.genres,
      preference: s.preferenceScore.toFixed(2)
    })));

    return selected;
  }, [items, learnedVec, recentChosenIds, avoidIds, genreMap]);

  // Generate explanation for why movie was recommended
  function generateExplanation(movie: Movie, learnedVec: number[], score: number): string {
    const topPreferences = learnedVec
      .slice(0, 6)
      .map((val, idx) => ({ 
        genre: ['comedy', 'drama', 'action', 'thriller', 'sci-fi', 'fantasy'][idx], 
        strength: val 
      }))
      .filter(p => p.strength > 0.4)
      .sort((a, b) => b.strength - a.strength);

    if (score > 1.5 && topPreferences.length > 0) {
      return `Strong match for your ${topPreferences[0].genre} preference from A/B testing`;
    } else if (score > 1.0) {
      return `Good alignment with your taste profile`;
    } else if (score > 0.5) {
      return `Recommended based on your A/B choices`;
    } else {
      return `Quality film for discovery`;
    }
  }

  // Fetch trailers for selected movies
  useEffect(() => {
    if (selectedMovies.length === 0) {
      setCurrentQueue([]);
      return;
    }

    console.log('[TrailerPlayer] Fetching trailers for', selectedMovies.length, 'A/B-selected movies');

    const fetchTrailers = async () => {
      try {
        const ids = selectedMovies.map(s => s.item.id).join(',');
        const response = await fetch(`/api/trailers?ids=${encodeURIComponent(ids)}`);
        const data = await response.json();

        if (data.ok) {
          const moviesWithTrailers = selectedMovies
            .map(selected => ({
              ...selected,
              embed: data.trailers[selected.item.id] || null
            }))
            .filter(item => item.embed); // Only include movies with trailers

          console.log('[TrailerPlayer] Movies with trailers:', moviesWithTrailers.length);
          setCurrentQueue(moviesWithTrailers);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('[TrailerPlayer] Error fetching trailers:', error);
      }
    };

    fetchTrailers();
  }, [selectedMovies]);

  if (currentQueue.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading personalized trailer recommendations...</p>
      </div>
    );
  }

  const currentMovie = currentQueue[currentIndex];
  if (!currentMovie) return null;

  const nextTrailer = () => {
    setCurrentIndex((prev) => (prev + 1) % currentQueue.length);
  };

  const prevTrailer = () => {
    setCurrentIndex((prev) => (prev - 1 + currentQueue.length) % currentQueue.length);
  };

  return (
    <div className="trailer-player w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">{currentMovie.item.title}</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
            {currentMovie.item.year}
          </span>
          {currentMovie.genres.map((genre, idx) => (
            <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
              {genre}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600 mb-4">{currentMovie.explanation}</p>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
        <iframe
          src={currentMovie.embed}
          title={currentMovie.item.title}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={prevTrailer}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          disabled={currentQueue.length <= 1}
        >
          Previous
        </button>
        
        <span className="text-sm text-gray-600">
          {currentIndex + 1} of {currentQueue.length}
        </span>
        
        <button
          onClick={nextTrailer}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          disabled={currentQueue.length <= 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
