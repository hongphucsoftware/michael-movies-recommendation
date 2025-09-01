import { useState, useEffect, useCallback } from "react";
import { Movie, UserPreferences, MLState } from "@/types/movie";
import { 
  zeros, 
  dot, 
  addInPlace, 
  subtract, 
  logistic, 
  shuffle, 
  LEARNING_RATE, 
  TARGET_CHOICES, 
  EPS_DEFAULT 
} from "@/lib/mlUtils";

const DIMENSION = 12;

export function useMLLearning(movies: Movie[]) {
  const [state, setState] = useState<MLState>(() => {
    // Fresh start - clear old preferences to fix variety issues
    const STORAGE_KEY = 'ts_preferences_enhanced_v2_fresh'; // fresh variety fix
    localStorage.removeItem('ts_preferences_enhanced_v1'); // Clear old restrictive prefs
    localStorage.removeItem('ts_recent_pairs'); // Clear recent tracking
    const storedPrefs = localStorage.getItem(STORAGE_KEY);
    const defaultPrefs: UserPreferences = {
      w: zeros(DIMENSION),
      explored: new Set<string>(),
      hidden: new Set<string>(),
      likes: new Set<string>(),
      choices: 0,
      eps: EPS_DEFAULT
    };

    let preferences = defaultPrefs;
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs);
        preferences = {
          w: parsed.w || zeros(DIMENSION),
          explored: new Set(parsed.explored || []),
          hidden: new Set(parsed.hidden || []),
          likes: new Set(parsed.likes || []),
          choices: parsed.choices || 0,
          eps: parsed.eps || EPS_DEFAULT
        };
      } catch (e) {
        console.error('Failed to parse stored preferences:', e);
      }
    }

    return {
      preferences,
      queue: [],
      currentPair: null,
      onboardingComplete: preferences.choices >= TARGET_CHOICES
    };
  });

  // Persist to localStorage whenever preferences change - fresh namespace for variety
  useEffect(() => {
    const STORAGE_KEY = 'ts_preferences_enhanced_v2_fresh'; // fresh variety fix
    const toStore = {
      w: state.preferences.w,
      explored: Array.from(state.preferences.explored),
      hidden: Array.from(state.preferences.hidden),
      likes: Array.from(state.preferences.likes),
      choices: state.preferences.choices,
      eps: state.preferences.eps
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [state.preferences]);

  const nextPair = useCallback((): [Movie, Movie] => {
    if (movies.length < 2) {
      return [
        { id: 'loading1', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) },
        { id: 'loading2', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) }
      ];
    }

    // Much simpler approach - prioritize variety over complex filtering
    const hidden = new Set(state.preferences.hidden);
    const explored = new Set(state.preferences.explored);
    
    // Get recently shown pairs (last 20 only to allow more variety)
    const recentPairs = new Set(
      JSON.parse(localStorage.getItem('ts_recent_pairs') || '[]').slice(-20)
    );

    // Build available pool - be much more lenient
    let available = movies.filter(movie => !hidden.has(movie.id));
    
    // Only filter out very recently shown if we have plenty of movies
    if (available.length > 30) {
      available = available.filter(movie => !recentPairs.has(movie.id));
    }
    
    console.log(`Movie variety check: ${available.length}/${movies.length} available, showing mix of classics (${available.filter(m => m.category === 'classic').length}) and recent (${available.filter(m => m.category === 'recent').length})`);

    // Simple random selection from available pool
    const shuffled = shuffle([...available]);
    const result: [Movie, Movie] = [
      shuffled[0] || movies[0], 
      shuffled[1] || movies[1]
    ];
    
    // Track recently shown pairs (much shorter list)
    const recentList = JSON.parse(localStorage.getItem('ts_recent_pairs') || '[]');
    recentList.push(result[0].id, result[1].id);
    localStorage.setItem('ts_recent_pairs', JSON.stringify(recentList.slice(-20))); // Keep only last 20

    return result;
  }, [movies, state.preferences.w, state.preferences.hidden, state.preferences.explored]);

  // Update currentPair when movies are loaded
  useEffect(() => {
    if (movies.length >= 2 && !state.onboardingComplete && 
        (!state.currentPair || state.currentPair[0].id === 'loading1')) {
      setState(prev => ({
        ...prev,
        currentPair: nextPair()
      }));
    }
  }, [movies, state.onboardingComplete, state.currentPair, nextPair]);

  const learnChoice = useCallback((winner: Movie, loser: Movie) => {
    setState(prev => {
      const diff = subtract(winner.features, loser.features);
      const p = logistic(dot(prev.preferences.w, diff));
      const gradScale = 1 - p;
      
      const newW = [...prev.preferences.w];
      addInPlace(newW, diff, LEARNING_RATE * gradScale);

      const newExplored = new Set(prev.preferences.explored);
      newExplored.add(winner.id);
      newExplored.add(loser.id);

      const newChoices = prev.preferences.choices + 1;
      const onboardingComplete = newChoices >= TARGET_CHOICES;

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          w: newW,
          explored: newExplored,
          choices: newChoices
        },
        onboardingComplete,
        currentPair: onboardingComplete ? null : nextPair()
      };
    });
  }, [nextPair]);

  const baseScore = useCallback((movie: Movie): number => {
    return logistic(dot(state.preferences.w, movie.features));
  }, [state.preferences.w]);

  const noveltyBoost = useCallback((movie: Movie): number => {
    const notSeen = state.preferences.explored.has(movie.id) ? 0 : 0.08;
    const short = movie.isSeries ? 0.05 : 0;
    return notSeen + short;
  }, [state.preferences.explored]);

  const rankQueue = useCallback((): Movie[] => {
    if (movies.length === 0) {
      return [];
    }
    
    const candidates = movies.filter(movie => !state.preferences.hidden.has(movie.id));
    const scored = candidates
      .map(movie => ({
        movie,
        score: baseScore(movie) + noveltyBoost(movie)
      }))
      .sort((a, b) => b.score - a.score);

    // Apply exploration randomness
    if (Math.random() < state.preferences.eps && scored.length > 6) {
      const k = 3 + Math.floor(Math.random() * Math.min(12, scored.length - 1));
      const temp = scored[0];
      scored[0] = scored[k];
      scored[k] = temp;
    }

    return scored.map(item => item.movie);
  }, [movies, state.preferences.hidden, state.preferences.eps, baseScore, noveltyBoost]);

  const updateQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: rankQueue()
    }));
  }, [rankQueue]);

  const adjustAdventurousness = useCallback((delta: number) => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        eps: Math.max(0.02, Math.min(0.35, prev.preferences.eps + delta))
      }
    }));
  }, []);

  const skipPair = useCallback(() => {
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        choices: Math.max(0, prev.preferences.choices - 1)
      },
      currentPair: nextPair()
    }));
  }, [nextPair]);

  const addToWatchlist = useCallback((movieId: string) => {
    setState(prev => {
      const newLikes = new Set(prev.preferences.likes);
      newLikes.add(movieId);
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          likes: newLikes
        }
      };
    });
  }, []);

  const removeFromWatchlist = useCallback((movieId: string) => {
    setState(prev => {
      const newLikes = new Set(prev.preferences.likes);
      newLikes.delete(movieId);
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          likes: newLikes
        }
      };
    });
  }, []);

  const hideMovie = useCallback((movieId: string) => {
    setState(prev => {
      const newHidden = new Set(prev.preferences.hidden);
      newHidden.add(movieId);
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          hidden: newHidden
        }
      };
    });
  }, []);

  const surpriseMe = useCallback(() => {
    const prevEps = state.preferences.eps;
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        eps: Math.min(0.45, prev.preferences.eps + 0.10)
      }
    }));
    
    updateQueue();
    
    // Reset after a delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          eps: prevEps
        }
      }));
    }, 800);
  }, [state.preferences.eps, updateQueue]);

  const reset = useCallback(() => {
    setState({
      preferences: {
        w: zeros(DIMENSION),
        explored: new Set<string>(),
        hidden: new Set<string>(),
        likes: new Set<string>(),
        choices: 0,
        eps: EPS_DEFAULT
      },
      queue: [],
      currentPair: null,
      onboardingComplete: false
    });
  }, []);

  // Initialize current pair on first load
  useEffect(() => {
    if (!state.onboardingComplete && !state.currentPair) {
      setState(prev => ({
        ...prev,
        currentPair: nextPair()
      }));
    }
  }, [state.onboardingComplete, state.currentPair, nextPair]);

  // Update queue when onboarding completes
  useEffect(() => {
    if (state.onboardingComplete && state.queue.length === 0) {
      updateQueue();
    }
  }, [state.onboardingComplete, state.queue.length, updateQueue]);

  return {
    ...state,
    learnChoice,
    adjustAdventurousness,
    skipPair,
    addToWatchlist,
    removeFromWatchlist,
    hideMovie,
    surpriseMe,
    reset,
    updateQueue,
    getAdventurousnessLabel: () => {
      if (state.preferences.eps <= 0.06) return "Tame";
      if (state.preferences.eps <= 0.16) return "Balanced";
      return "Wild";
    },
    getWatchlist: () => movies.filter(movie => state.preferences.likes.has(movie.id))
  };
}
