import { useState, useCallback, useEffect } from "react";
import { Movie } from "@/types/movie";
import { buildCatalogue } from "@/lib/tmdbService";

export function useMovieData() {
  const [currentTrailer, setCurrentTrailer] = useState<Movie | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [posterStats, setPosterStats] = useState<{ ok: number; failed: number } | undefined>();

  // Load movies from TMDb on initialization
  useEffect(() => {
    let isMounted = true;

    const loadMovies = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to get cached movies first
        const cached = localStorage.getItem('tmdb_movies');
        const cacheTime = localStorage.getItem('tmdb_cache_time');
        const now = Date.now();
        
        // Check if we have valid cached data (less than 30 minutes old)
        if (cached && cacheTime && (now - parseInt(cacheTime)) < 30 * 60 * 1000) {
          console.log("Using cached movie data");
          const cachedMovies = JSON.parse(cached);
          if (isMounted && cachedMovies.length > 0) {
            setMovies(cachedMovies);
            setIsLoading(false);
            return;
          }
        }

        // Fetch fresh data from TMDb
        const fetchedMovies = await buildCatalogue((message, stats) => {
          setLoadingMessage(message);
          setPosterStats(stats);
        });
        
        if (isMounted) {
          if (fetchedMovies.length === 0) {
            setError("Failed to load movies. Please check your internet connection and try again.");
          } else {
            setMovies(fetchedMovies);
            // Cache the results
            localStorage.setItem('tmdb_movies', JSON.stringify(fetchedMovies));
            localStorage.setItem('tmdb_cache_time', now.toString());
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load movies from TMDb. Please try again.");
          setIsLoading(false);
        }
        console.error("Error loading movies:", err);
      }
    };

    loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  const playTrailer = useCallback((movie: Movie) => {
    setCurrentTrailer(movie);
  }, []);

  const clearTrailer = useCallback(() => {
    setCurrentTrailer(null);
  }, []);

  const refreshMovies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear cache and fetch fresh data
      localStorage.removeItem('tmdb_movies');
      localStorage.removeItem('tmdb_cache_time');
      
      const fetchedMovies = await buildCatalogue();
      
      if (fetchedMovies.length === 0) {
        setError("Failed to load movies. Please check your internet connection and try again.");
      } else {
        setMovies(fetchedMovies);
        localStorage.setItem('tmdb_movies', JSON.stringify(fetchedMovies));
        localStorage.setItem('tmdb_cache_time', Date.now().toString());
      }
    } catch (err) {
      setError("Failed to refresh movies from TMDb. Please try again.");
      console.error("Error refreshing movies:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    movies,
    isLoading,
    error,
    loadingMessage,
    posterStats,
    currentTrailer,
    playTrailer,
    clearTrailer,
    refreshMovies
  };
}
