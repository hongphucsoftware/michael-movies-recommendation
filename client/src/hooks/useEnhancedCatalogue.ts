import { useState, useEffect, useCallback } from "react";
import { Movie } from "@/types/movie";
import { imdbService } from "@/lib/imdbService";

export interface EnhancedState {
  movies: Movie[];
  isLoading: boolean;
  error: string | null;
  loadingMessage: string;
  catalogueSize: number;
  watchlist: Set<string>;
  hiddenItems: Set<string>;
  recentItems: string[];
}

export function useEnhancedCatalogue() {
  const [state, setState] = useState<EnhancedState>({
    movies: [],
    isLoading: true,
    error: null,
    loadingMessage: "Initializing...",
    catalogueSize: 0,
    watchlist: new Set(),
    hiddenItems: new Set(),
    recentItems: []
  });

  // Load saved state from localStorage
  const loadSavedState = useCallback(() => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('ts_likes') || '[]') as string[];
      const hidden = JSON.parse(localStorage.getItem('ts_hidden') || '[]') as string[];
      const recent = JSON.parse(localStorage.getItem('ts_recent') || '[]') as string[];
      
      return {
        watchlist: new Set<string>(watchlist),
        hiddenItems: new Set<string>(hidden),
        recentItems: recent.slice(-60) // Keep last 60
      };
    } catch {
      return {
        watchlist: new Set<string>(),
        hiddenItems: new Set<string>(),
        recentItems: [] as string[]
      };
    }
  }, []);

  // Save state to localStorage
  const saveState = useCallback((watchlist: Set<string>, hidden: Set<string>, recent: string[]) => {
    localStorage.setItem('ts_likes', JSON.stringify(Array.from(watchlist)));
    localStorage.setItem('ts_hidden', JSON.stringify(Array.from(hidden)));
    localStorage.setItem('ts_recent', JSON.stringify(recent.slice(-60)));
  }, []);

  // Load catalogue with smart caching and progressive loading
  useEffect(() => {
    let isMounted = true;

    const loadCatalogue = async () => {
      try {
        setState(prev => ({ 
          ...prev, 
          isLoading: true, 
          error: null, 
          loadingMessage: "Loading authentic IMDb Top 100..." 
        }));

        const savedState = loadSavedState();
        
        // This will return quickly (either from cache or first 15 movies)
        const movies = await imdbService.buildCatalogue();

        if (isMounted) {
          setState(prev => ({
            ...prev,
            movies,
            catalogueSize: movies.length,
            isLoading: false,
            loadingMessage: `Ready! ${movies.length} movies loaded`,
            watchlist: savedState.watchlist,
            hiddenItems: savedState.hiddenItems,
            recentItems: [...savedState.recentItems],
            error: null
          }));
        }
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: "Failed to load catalogue. Please check your connection.",
            isLoading: false
          }));
        }
        console.error("Catalogue loading error:", error);
      }
    };

    loadCatalogue();
    
    return () => {
      isMounted = false;
    };
  }, [loadSavedState]);

  // Add to watchlist (Save)
  const saveToWatchlist = useCallback((movieId: string) => {
    setState(prev => {
      const newWatchlist = new Set(prev.watchlist);
      newWatchlist.add(movieId);
      saveState(newWatchlist, prev.hiddenItems, prev.recentItems);
      return { ...prev, watchlist: newWatchlist };
    });
  }, [saveState]);

  // Remove from watchlist
  const removeFromWatchlist = useCallback((movieId: string) => {
    setState(prev => {
      const newWatchlist = new Set(prev.watchlist);
      newWatchlist.delete(movieId);
      saveState(newWatchlist, prev.hiddenItems, prev.recentItems);
      return { ...prev, watchlist: newWatchlist };
    });
  }, [saveState]);

  // Hide item (never show again)
  const hideItem = useCallback((movieId: string) => {
    setState(prev => {
      const newHidden = new Set(prev.hiddenItems);
      newHidden.add(movieId);
      saveState(prev.watchlist, newHidden, prev.recentItems);
      return { ...prev, hiddenItems: newHidden };
    });
  }, [saveState]);

  // Mark as recent (for avoiding repeats)
  const markAsRecent = useCallback((movieId: string) => {
    setState(prev => {
      const newRecent = [...prev.recentItems, movieId];
      // Keep only last 60 items
      if (newRecent.length > 60) {
        newRecent.shift();
      }
      saveState(prev.watchlist, prev.hiddenItems, newRecent);
      return { ...prev, recentItems: newRecent };
    });
  }, [saveState]);

  // Get available movies (not hidden, not recently shown)
  const getAvailableMovies = useCallback(() => {
    return state.movies.filter(movie => 
      !state.hiddenItems.has(movie.id) && 
      !state.recentItems.includes(movie.id)
    );
  }, [state.movies, state.hiddenItems, state.recentItems]);

  // Get watchlist movies
  const getWatchlistMovies = useCallback(() => {
    return state.movies.filter(movie => state.watchlist.has(movie.id));
  }, [state.movies, state.watchlist]);

  // Reset all data
  const resetAll = useCallback(() => {
    localStorage.removeItem('ts_likes');
    localStorage.removeItem('ts_hidden');
    localStorage.removeItem('ts_recent');
    
    setState(prev => ({
      ...prev,
      watchlist: new Set(),
      hiddenItems: new Set(),
      recentItems: []
    }));
  }, []);

  return {
    ...state,
    saveToWatchlist,
    removeFromWatchlist,
    hideItem,
    markAsRecent,
    getAvailableMovies,
    getWatchlistMovies,
    resetAll
  };
}