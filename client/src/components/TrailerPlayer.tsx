import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Movie } from '@/types/movie';

// Define EnhancedMovie type for internal use
interface EnhancedMovie extends Movie {
  genres: string[]; // Ensure genres is always an array of strings (or numbers mapped to strings)
  features?: number[]; // Assuming features is an array of numbers
  sources?: string[]; // Assuming sources is an array of strings
}

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

  // Helper function to convert movie data into a feature vector for scoring
  // This function needs to be defined or imported. Assuming a basic implementation here.
  const toFeatureVector = (movie: EnhancedMovie): number[] => {
    const features: number[] = new Array(6).fill(0); // Initialize with 6 dimensions for core genres

    const genreMapForFeatures: Record<string, number> = {
      'Comedy': 0,
      'Drama': 1,
      'Action': 2,
      'Thriller': 3,
      'Sci-Fi': 4,
      'Fantasy': 5
    };

    movie.genres.forEach(genre => {
      const mappedIndex = genreMapForFeatures[genre];
      if (mappedIndex !== undefined) {
        features[mappedIndex] = 1; // Simple presence indicator
      }
    });
    return features;
  };

  // Helper function to generate explanation for movie recommendation
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


  // A/B-driven selection with modern movie preference
  const selectABDrivenTrailers = useCallback((movies: EnhancedMovie[], abVector: number[], count: number = 6): EnhancedMovie[] => {
    if (!abVector?.length || abVector.every(v => v === 0)) {
      console.log('[TrailerPlayer] No A/B preferences, using recent popular movies');
      return movies
        .filter(m => parseInt(m.year) >= 2000)
        .sort((a, b) => parseInt(b.year) - parseInt(a.year))
        .slice(0, count);
    }

    // Filter for modern movies first (2000+)
    const modernMovies = movies.filter(m => {
      const year = parseInt(m.year) || 1900;
      return year >= 2000;
    });

    const moviesPool = modernMovies.length >= count * 2 ? modernMovies : movies;

    // Score each movie based on A/B preferences
    const scoredMovies = moviesPool.map(movie => {
      const features = toFeatureVector(movie);
      const abScore = features.reduce((sum, feature, i) => sum + feature * (abVector[i] || 0), 0);

      // Bonus for recent movies (2010+)
      const currentYear = new Date().getFullYear();
      const movieYear = parseInt(movie.year) || 1900;
      const recencyBonus = movieYear >= 2010 ? 2 : movieYear >= 2000 ? 1 : 0;

      // Bonus for having trailers from popular sources
      const sourceBonus = (movie.sources?.includes('imdbTop') ? 1 : 0) +
                         (movie.sources?.includes('imdbList') ? 0.5 : 0);

      const finalScore = abScore + recencyBonus + sourceBonus;

      return {
        movie,
        abScore: abScore.toFixed(3),
        recency: recencyBonus.toFixed(1),
        source: sourceBonus.toFixed(1),
        final: finalScore.toFixed(3),
        year: movie.year,
        sources: movie.sources
      };
    }).sort((a, b) => parseFloat(b.final) - parseFloat(a.final));

    console.log('[TrailerPlayer] Top scored movies for A/B preferences:', scoredMovies.slice(0, 10));

    // Select diverse modern movies
    const selected: EnhancedMovie[] = [];
    const usedGenres = new Set<string>();

    for (const scored of scoredMovies) {
      if (selected.length >= count) break;

      const movieYear = parseInt(scored.movie.year) || 1900;
      const movieGenres = scored.movie.genres || [];

      // Strongly prefer movies from 2000+
      if (movieYear < 2000 && selected.length < count - 1) continue;

      // Add variety
      const hasNewGenre = movieGenres.some(g => !usedGenres.has(g)) || selected.length < 3;

      if (hasNewGenre) {
        selected.push(scored.movie);
        movieGenres.forEach(g => usedGenres.add(g));
      }
    }

    // Fill remaining spots if needed
    if (selected.length < count) {
      for (const scored of scoredMovies) {
        if (selected.length >= count) break;
        if (!selected.find(m => m.id === scored.movie.id)) {
          selected.push(scored.movie);
        }
      }
    }

    console.log('[TrailerPlayer] Final A/B-driven selection:', selected.map(m => ({
      title: m.title,
      genres: m.genres,
      sources: m.sources,
      year: m.year
    })));

    return selected;
  }, []);

  // Genre-based selection for modern movies
  const selectGenreBasedTrailers = useCallback((movies: EnhancedMovie[], abVector: number[], count: number = 6): EnhancedMovie[] => {
    const genreLabels = ['comedy', 'drama', 'action', 'thriller', 'scifi', 'fantasy', 'recent'];
    const topGenres = abVector
      .map((weight, i) => ({ type: genreLabels[i], weight, label: genreLabels[i] }))
      .filter(g => g.weight > 0.3) // Only consider significant preferences
      .sort((a, b) => b.weight - a.weight);

    console.log('[TrailerPlayer] Top user genres:', topGenres.map(g => `${g.type}:${g.weight.toFixed(2)}`));

    if (topGenres.length === 0) {
      // Default to recent popular movies
      return movies
        .filter(m => parseInt(m.year) >= 2010)
        .sort((a, b) => parseInt(b.year) - parseInt(a.year))
        .slice(0, count);
    }

    // Get movies matching top genres, prioritizing modern films
    let genreMovies: EnhancedMovie[] = [];

    for (const genre of topGenres.slice(0, 2)) { // Use top 2 genres
      let matchingMovies: EnhancedMovie[] = [];

      if (genre.type === 'comedy') matchingMovies = movies.filter(m => m.genres?.some(g => g.toLowerCase().includes('comedy')));
      else if (genre.type === 'drama') matchingMovies = movies.filter(m => m.genres?.some(g => g.toLowerCase().includes('drama')));
      else if (genre.type === 'action') matchingMovies = movies.filter(m => m.genres?.some(g => g.toLowerCase().includes('action') || g.toLowerCase().includes('adventure')));
      else if (genre.type === 'thriller') matchingMovies = movies.filter(m => m.genres?.some(g => g.toLowerCase().includes('thriller')));
      else if (genre.type === 'scifi') matchingMovies = movies.filter(m => m.genres?.some(g => g.toLowerCase().includes('sci-fi') || g.toLowerCase().includes('science')));
      else if (genre.type === 'fantasy') matchingMovies = movies.filter(m => m.genres?.some(g => g.toLowerCase().includes('fantasy')));

      // Prioritize modern movies (2000+)
      const modernMatches = matchingMovies.filter(m => parseInt(m.year) >= 2000);
      genreMovies.push(...(modernMatches.length > 0 ? modernMatches : matchingMovies));
    }

    // Remove duplicates and sort by year (newest first)
    const uniqueMovies = Array.from(new Map(genreMovies.map(m => [m.id, m])).values())
      .sort((a, b) => parseInt(b.year) - parseInt(a.year));

    console.log('[TrailerPlayer] Found', uniqueMovies.length, 'movies matching user preferences');

    return uniqueMovies.slice(0, count);
  }, []);


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

    // Map genres to strings for easier processing
    const enhancedItems: EnhancedMovie[] = available.map(item => ({
      ...item,
      genres: (item.genres || []).map(g => genreMap[g]).filter(Boolean) as string[],
      features: toFeatureVector(item as EnhancedMovie), // Use helper to get features
      sources: item.sources || []
    }));

    // Use A/B driven selection if preferences are present
    let selected: EnhancedMovie[] = [];
    if (learnedVec.some(v => v !== 0)) {
      selected = selectABDrivenTrailers(enhancedItems, learnedVec);
    }

    // Fallback to genre-based selection if not enough movies selected or no A/B preferences
    if (selected.length < 3) { // Ensure at least a few movies are selected
      console.log('[TrailerPlayer] Falling back to genre-based selection.');
      const genreSelected = selectGenreBasedTrailers(enhancedItems, learnedVec);
      // Combine and de-duplicate, prioritizing A/B selection
      const combined = [...selected, ...genreSelected];
      selected = Array.from(new Map(combined.map(m => [m.id, m])).values());
    }

    // Final selection, ensure we have enough and de-duplicate
    const finalSelection = selected.slice(0, 6);

    console.log('[TrailerPlayer] Final selection for trailers:', finalSelection.map(s => ({
      title: s.title,
      year: s.year,
      genres: s.genres,
      preference: learnedVec.reduce((sum, feature, i) => sum + feature * (s.features?.[i] || 0), 0).toFixed(2)
    })));

    return finalSelection;
  }, [items, learnedVec, recentChosenIds, avoidIds, genreMap, selectABDrivenTrailers, selectGenreBasedTrailers]);

  // Fetch trailers for selected movies
  useEffect(() => {
    if (selectedMovies.length === 0) {
      setCurrentQueue([]);
      return;
    }

    console.log('[TrailerPlayer] Fetching trailers for', selectedMovies.length, 'A/B-selected movies');

    const fetchTrailers = async () => {
      try {
        const ids = selectedMovies.map(s => s.id).join(',');
        const response = await fetch(`/api/trailers?ids=${encodeURIComponent(ids)}`);
        const data = await response.json();

        if (data.ok) {
          const moviesWithTrailers = selectedMovies
            .map(selected => ({
              ...selected,
              embed: data.trailers[selected.id] || null
            }))
            .filter(item => item.embed); // Only include movies with trailers

          console.log('[TrailerPlayer] Movies with trailers:', moviesWithTrailers.length);
          setCurrentQueue(moviesWithTrailers);
          setCurrentIndex(0);
        } else {
          console.error('[TrailerPlayer] Failed to fetch trailers:', data.message);
          setCurrentQueue([]); // Clear queue if fetch fails
        }
      } catch (error) {
        console.error('[TrailerPlayer] Error fetching trailers:', error);
        setCurrentQueue([]); // Clear queue on network error
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