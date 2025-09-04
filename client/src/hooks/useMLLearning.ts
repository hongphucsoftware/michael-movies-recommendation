
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

// Funnel-based A/B Testing Structure
const FUNNEL_ROUNDS = {
  BROAD: { start: 1, end: 4, description: "Broad genre exploration" },
  FOCUSED: { start: 5, end: 8, description: "Genre refinement" },
  PRECISE: { start: 9, end: 12, description: "Taste precision" }
};

// Well-known anchor movies for each phase
const ANCHOR_MOVIES = {
  // Phase 1: Broad cross-genre pairs (very recognizable)
  broad: [
    // Action vs Comedy
    { action: ["The Dark Knight", "Mad Max: Fury Road", "John Wick"], comedy: ["Groundhog Day", "The Grand Budapest Hotel", "Superbad"] },
    // Drama vs Sci-Fi
    { drama: ["The Shawshank Redemption", "Forrest Gump", "The Godfather"], scifi: ["Interstellar", "Blade Runner 2049", "The Matrix"] },
    // Fantasy vs Thriller
    { fantasy: ["The Lord of the Rings: The Fellowship of the Ring", "Harry Potter and the Philosopher's Stone", "Pan's Labyrinth"], thriller: ["Se7en", "The Silence of the Lambs", "Gone Girl"] },
    // Animation vs Crime
    { animation: ["Spirited Away", "Toy Story", "WALL-E"], crime: ["Pulp Fiction", "Goodfellas", "The Departed"] }
  ],
  
  // Phase 2: Genre-focused with decade/style contrasts
  focused: {
    action: [
      { classic: ["Terminator 2: Judgment Day", "Die Hard"], modern: ["John Wick", "Mad Max: Fury Road"] },
      { grounded: ["Heat", "The Bourne Identity"], fantastical: ["The Matrix", "Guardians of the Galaxy"] }
    ],
    drama: [
      { intense: ["There Will Be Blood", "No Country for Old Men"], uplifting: ["The Pursuit of Happyness", "Good Will Hunting"] },
      { period: ["Amadeus", "The English Patient"], contemporary: ["Manchester by the Sea", "Lady Bird"] }
    ],
    comedy: [
      { classic: ["Some Like It Hot", "The Pink Panther"], modern: ["Superbad", "The Grand Budapest Hotel"] },
      { dry: ["Fargo", "In Bruges"], broad: ["Anchorman", "Dumb and Dumber"] }
    ],
    scifi: [
      { cerebral: ["2001: A Space Odyssey", "Arrival"], action: ["Aliens", "Edge of Tomorrow"] },
      { dystopian: ["Blade Runner", "The Matrix"], optimistic: ["E.T.", "Star Trek"] }
    ],
    fantasy: [
      { epic: ["The Lord of the Rings", "Game of Thrones"], whimsical: ["The Princess Bride", "Big Fish"] },
      { dark: ["Pan's Labyrinth", "The Dark Crystal"], light: ["Harry Potter", "The Chronicles of Narnia"] }
    ],
    thriller: [
      { psychological: ["The Silence of the Lambs", "Black Swan"], action: ["Mission: Impossible", "Casino Royale"] },
      { mystery: ["Zodiac", "The Prestige"], suspense: ["No Country for Old Men", "Prisoners"] }
    ]
  }
};

export function useMLLearning(movies: Movie[]) {
  const [state, setState] = useState<MLState>(() => {
    const STORAGE_KEY = 'ts_preferences_funnel_v1';
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

  // Persist to localStorage
  useEffect(() => {
    const STORAGE_KEY = 'ts_preferences_funnel_v1';
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

  // Get current funnel phase
  const getCurrentPhase = useCallback(() => {
    const choice = state.preferences.choices + 1;
    if (choice <= FUNNEL_ROUNDS.BROAD.end) return 'broad';
    if (choice <= FUNNEL_ROUNDS.FOCUSED.end) return 'focused';
    return 'precise';
  }, [state.preferences.choices]);

  // Analyze current preferences to determine top genres
  const analyzePreferences = useCallback(() => {
    const w = state.preferences.w;
    const genreStrengths = {
      comedy: w[0] || 0,
      drama: w[1] || 0,
      action: w[2] || 0,
      thriller: w[3] || 0,
      scifi: w[4] || 0,
      fantasy: w[5] || 0
    };

    const sorted = Object.entries(genreStrengths)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);

    return {
      top: sorted[0]?.[0] || 'drama',
      second: sorted[1]?.[0] || 'action',
      strengths: genreStrengths
    };
  }, [state.preferences.w]);

  // Find movie by title in catalogue
  const findMovieByTitle = useCallback((title: string): Movie | null => {
    const found = movies.find(m => 
      m.name.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(m.name.toLowerCase())
    );
    return found || null;
  }, [movies]);

  // Funnel-based pair selection
  const nextPair = useCallback((): [Movie, Movie] => {
    if (movies.length < 2) {
      return [
        { id: 'loading1', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) },
        { id: 'loading2', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) }
      ];
    }

    const phase = getCurrentPhase();
    const choice = state.preferences.choices + 1;

    console.log(`[FUNNEL] Round ${choice}/12 - Phase: ${phase}`);

    if (phase === 'broad') {
      // Rounds 1-4: Broad genre exploration with anchors
      const roundIndex = (choice - 1) % ANCHOR_MOVIES.broad.length;
      const pair = ANCHOR_MOVIES.broad[roundIndex];
      const genres = Object.keys(pair);
      
      // Try to find these specific movies
      const genreA = genres[0];
      const genreB = genres[1];
      const optionsA = pair[genreA as keyof typeof pair];
      const optionsB = pair[genreB as keyof typeof pair];
      
      let movieA = null, movieB = null;
      
      // Try to find anchor movies, fallback to genre-based selection
      for (const title of optionsA) {
        movieA = findMovieByTitle(title);
        if (movieA) break;
      }
      
      for (const title of optionsB) {
        movieB = findMovieByTitle(title);
        if (movieB) break;
      }
      
      // Fallback: filter by genre features
      if (!movieA) {
        const genreIndex = genreA === 'comedy' ? 0 : genreA === 'drama' ? 1 : genreA === 'action' ? 2 : genreA === 'thriller' ? 3 : genreA === 'scifi' ? 4 : 5;
        const candidates = movies.filter(m => m.features[genreIndex] > 0.6);
        movieA = candidates[Math.floor(Math.random() * candidates.length)] || movies[0];
      }
      
      if (!movieB) {
        const genreIndex = genreB === 'comedy' ? 0 : genreB === 'drama' ? 1 : genreB === 'action' ? 2 : genreB === 'thriller' ? 3 : genreB === 'scifi' ? 4 : 5;
        const candidates = movies.filter(m => m.features[genreIndex] > 0.6);
        movieB = candidates[Math.floor(Math.random() * candidates.length)] || movies[1];
      }
      
      console.log(`[FUNNEL BROAD] ${genreA} vs ${genreB}: "${movieA.name}" vs "${movieB.name}"`);
      return [movieA, movieB];
    }

    if (phase === 'focused') {
      // Rounds 5-8: Focus on top 2 preferred genres
      const prefs = analyzePreferences();
      const focusGenre = choice <= 6 ? prefs.top : prefs.second;
      
      console.log(`[FUNNEL FOCUSED] Focusing on ${focusGenre}, strengths:`, prefs.strengths);
      
      // Get contrasting pairs within this genre
      const genrePairs = ANCHOR_MOVIES.focused[focusGenre as keyof typeof ANCHOR_MOVIES.focused];
      if (genrePairs && genrePairs.length > 0) {
        const pairIndex = (choice - 5) % genrePairs.length;
        const contrastPair = genrePairs[pairIndex];
        const styles = Object.keys(contrastPair);
        
        let movieA = null, movieB = null;
        
        // Try to find specific anchor movies
        for (const title of contrastPair[styles[0] as keyof typeof contrastPair]) {
          movieA = findMovieByTitle(title);
          if (movieA) break;
        }
        
        for (const title of contrastPair[styles[1] as keyof typeof contrastPair]) {
          movieB = findMovieByTitle(title);
          if (movieB) break;
        }
        
        // Fallback to genre filtering
        if (!movieA || !movieB) {
          const genreIndex = focusGenre === 'comedy' ? 0 : focusGenre === 'drama' ? 1 : focusGenre === 'action' ? 2 : focusGenre === 'thriller' ? 3 : focusGenre === 'scifi' ? 4 : 5;
          const candidates = movies.filter(m => m.features[genreIndex] > 0.5);
          movieA = movieA || candidates[Math.floor(Math.random() * candidates.length)] || movies[0];
          movieB = movieB || candidates[Math.floor(Math.random() * candidates.length)] || movies[1];
        }
        
        console.log(`[FUNNEL FOCUSED] ${styles[0]} vs ${styles[1]} in ${focusGenre}: "${movieA.name}" vs "${movieB.name}"`);
        return [movieA, movieB];
      }
    }

    // Phase 3: Precise (rounds 9-12) - Use learned preferences for boundary testing
    const w = state.preferences.w;
    const scored = movies.map(movie => ({
      movie,
      score: logistic(dot(w, movie.features))
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    // Pick one high-scoring (aligned with preferences) and one boundary case
    const topTier = scored.slice(0, Math.floor(scored.length * 0.2));
    const midTier = scored.slice(Math.floor(scored.length * 0.4), Math.floor(scored.length * 0.7));
    
    const movieA = topTier[Math.floor(Math.random() * topTier.length)]?.movie || movies[0];
    const movieB = midTier[Math.floor(Math.random() * midTier.length)]?.movie || movies[1];
    
    console.log(`[FUNNEL PRECISE] High vs Boundary: "${movieA.name}" (${scored.find(s => s.movie.id === movieA.id)?.score.toFixed(3)}) vs "${movieB.name}" (${scored.find(s => s.movie.id === movieB.id)?.score.toFixed(3)})`);
    return [movieA, movieB];
  }, [movies, getCurrentPhase, state.preferences.choices, state.preferences.w, analyzePreferences, findMovieByTitle]);

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
      
      const choice = prev.preferences.choices + 1;
      const phase = choice <= 4 ? 'BROAD' : choice <= 8 ? 'FOCUSED' : 'PRECISE';
      
      console.log(`[FUNNEL LEARN] Round ${choice} (${phase}): "${winner.name}" beat "${loser.name}"`);
      console.log(`[FUNNEL VECTOR] Updated weights:`, newW.map(w => w.toFixed(2)));

      const newExplored = new Set(prev.preferences.explored);
      newExplored.add(winner.id);
      newExplored.add(loser.id);

      const onboardingComplete = choice >= TARGET_CHOICES;

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          w: newW,
          explored: newExplored,
          choices: choice
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
    if (state.onboardingComplete) {
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
    }
  }, [state.onboardingComplete]);

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
    ['ts_preferences_funnel_v1', 'pf_ab_chosen_v1', 'pf_ab_seen_v1'].forEach(key => localStorage.removeItem(key));
    
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
    getWatchlist: () => movies.filter(movie => state.preferences.likes.has(movie.id)),
    getCurrentPhase,
    getFunnelProgress: () => ({
      phase: getCurrentPhase(),
      round: state.preferences.choices + 1,
      description: state.preferences.choices < 4 ? "Exploring broad preferences" : 
                  state.preferences.choices < 8 ? "Refining genre preferences" : 
                  "Fine-tuning your taste profile"
    })
  };
}
