
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
import { buildABAnchors, getAnchorsForPhase, type Anchor } from "@/lib/abAnchors";
import { updateBTL } from "@/lib/taste";
import { phi } from "@/lib/phi";
import { pickInformativePair } from "@/lib/abNext";

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
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  
  const [state, setState] = useState<MLState>(() => {
    // Clear all stored data on every app load to treat each reload as a new user
    ['ts_preferences_funnel_v1', 'pf_ab_chosen_v1', 'pf_ab_seen_v1'].forEach(key => {
      localStorage.removeItem(key);
    });
    
    const defaultPrefs: UserPreferences = {
      w: zeros(DIMENSION),
      explored: new Set<string>(),
      hidden: new Set<string>(),
      likes: new Set<string>(),
      choices: 0,
      eps: EPS_DEFAULT
    };

    return {
      preferences: defaultPrefs,
      queue: [],
      currentPair: null,
      onboardingComplete: false
    };
  });

  // Initialize anchors when movies are loaded
  useEffect(() => {
    if (movies.length > 0 && anchors.length === 0) {
      console.log('[FUNNEL] Building A/B anchor pool from', movies.length, 'movies');
      const movieTitles = movies.map(m => ({
        id: m.id,
        title: m.name,
        year: m.year,
        genres: m.tags.map(tag => {
          // Map string tags to genre IDs for clustering
          switch (tag.toLowerCase()) {
            case 'action': return 28;
            case 'adventure': return 12;
            case 'comedy': return 35;
            case 'drama': return 18;
            case 'horror': return 27;
            case 'thriller': return 53;
            case 'sci-fi': case 'science fiction': return 878;
            case 'fantasy': return 14;
            case 'romance': return 10749;
            case 'crime': return 80;
            case 'mystery': return 9648;
            case 'animation': return 16;
            case 'family': return 10751;
            default: return 18; // Default to drama
          }
        }),
        sources: [m.category || 'unknown'],
        popularity: 50, // Default popularity
        vote_count: 1000, // Default vote count
        poster: m.poster,
        original_language: 'en' // Assume English for now
      }));
      
      const newAnchors = buildABAnchors(movieTitles, 30);
      setAnchors(newAnchors);
      console.log('[FUNNEL] Built anchor pool with', newAnchors.length, 'movies');
    }
  }, [movies, anchors.length]);

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

  // Funnel-based pair selection using anchors
  const nextPair = useCallback((): [Movie, Movie] => {
    if (movies.length < 2 || anchors.length === 0) {
      return [
        { id: 'loading1', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) },
        { id: 'loading2', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) }
      ];
    }

    const phase = getCurrentPhase();
    const choice = state.preferences.choices + 1;
    const prefs = analyzePreferences();

    console.log(`[FUNNEL] Round ${choice}/12 - Phase: ${phase}`);

    if (phase === 'broad') {
      // Rounds 1-4: Broad genre exploration using anchor pool
      const phaseAnchors = getAnchorsForPhase(anchors, 'broad');
      console.log(`[FUNNEL BROAD] Using ${phaseAnchors.length} broad anchors`);
      
      // Create contrasting clusters for each round
      const clusterPairs = [
        ['Action', 'ComedyRomance'], // Action vs Comedy
        ['Drama', 'ScifiFantasy'],   // Drama vs Sci-Fi
        ['Horror', 'AnimationFamily'], // Horror vs Animation  
        ['CrimeMystery', 'Action']   // Crime vs Action
      ];
      
      const pairIndex = (choice - 1) % clusterPairs.length;
      const [clusterA, clusterB] = clusterPairs[pairIndex];
      
      const optionsA = phaseAnchors.filter(a => a.cluster === clusterA);
      const optionsB = phaseAnchors.filter(a => a.cluster === clusterB);
      
      const anchorA = optionsA[Math.floor(Math.random() * optionsA.length)];
      const anchorB = optionsB[Math.floor(Math.random() * optionsB.length)];
      
      // Convert anchors back to Movie format
      const movieA = findMovieByTitle(anchorA?.title || '') || movies[0];
      const movieB = findMovieByTitle(anchorB?.title || '') || movies[1];
      
      console.log(`[FUNNEL BROAD] ${clusterA} vs ${clusterB}: "${movieA.name}" vs "${movieB.name}"`);
      return [movieA, movieB];
    }

    if (phase === 'focused') {
      // Rounds 5-8: Focus on top 2 preferred genres using anchors
      const topGenres = [prefs.top, prefs.second];
      const phaseAnchors = getAnchorsForPhase(anchors, 'focused', topGenres);
      
      console.log(`[FUNNEL FOCUSED] Focusing on ${prefs.top}, ${prefs.second} with ${phaseAnchors.length} anchors`);
      
      // Create decade/style contrasts within preferred genres
      const focusGenre = choice <= 6 ? prefs.top : prefs.second;
      const clusterName = focusGenre === 'comedy' ? 'ComedyRomance' : 
                         focusGenre === 'drama' ? 'Drama' :
                         focusGenre === 'action' ? 'Action' :
                         focusGenre === 'thriller' ? 'Horror' :
                         focusGenre === 'scifi' ? 'ScifiFantasy' :
                         focusGenre === 'fantasy' ? 'ScifiFantasy' : 'Drama';
      
      const clusterAnchors = phaseAnchors.filter(a => a.cluster === clusterName);
      
      if (clusterAnchors.length >= 2) {
        // Create vintage vs modern contrast
        const vintage = clusterAnchors.filter(a => a.decade <= 1990);
        const modern = clusterAnchors.filter(a => a.decade >= 2000);
        
        const anchorA = vintage.length > 0 ? vintage[Math.floor(Math.random() * vintage.length)] : clusterAnchors[0];
        const anchorB = modern.length > 0 ? modern[Math.floor(Math.random() * modern.length)] : clusterAnchors[1];
        
        const movieA = findMovieByTitle(anchorA.title) || movies[0];
        const movieB = findMovieByTitle(anchorB.title) || movies[1];
        
        console.log(`[FUNNEL FOCUSED] ${anchorA.decade}s vs ${anchorB.decade}s in ${focusGenre}: "${movieA.name}" vs "${movieB.name}"`);
        return [movieA, movieB];
      }
    }

    // Phase 3: Precise (rounds 9-12) - Use learned preferences for boundary testing with anchors
    const topGenres = [prefs.top, prefs.second];
    const phaseAnchors = getAnchorsForPhase(anchors, 'precise', topGenres);
    
    console.log(`[FUNNEL PRECISE] Using ${phaseAnchors.length} precise anchors for boundary testing`);
    
    if (phaseAnchors.length >= 2) {
      // Score anchors using current preferences
      const w = state.preferences.w;
      const scoredAnchors = phaseAnchors.map(anchor => {
        const movie = findMovieByTitle(anchor.title);
        if (!movie) return null;
        return {
          anchor,
          movie,
          score: logistic(dot(w, movie.features))
        };
      }).filter(Boolean);
      
      scoredAnchors.sort((a, b) => b!.score - a!.score);
      
      // Pick one high-scoring (aligned) and one boundary case
      const topTier = scoredAnchors.slice(0, Math.floor(scoredAnchors.length * 0.3));
      const midTier = scoredAnchors.slice(Math.floor(scoredAnchors.length * 0.4), Math.floor(scoredAnchors.length * 0.8));
      
      const high = topTier[Math.floor(Math.random() * topTier.length)];
      const boundary = midTier[Math.floor(Math.random() * midTier.length)];
      
      const movieA = high?.movie || movies[0];
      const movieB = boundary?.movie || movies[1];
      
      console.log(`[FUNNEL PRECISE] High vs Boundary: "${movieA.name}" (${high?.score.toFixed(3)}) vs "${movieB.name}" (${boundary?.score.toFixed(3)})`);
      return [movieA, movieB];
    }
    
    // Fallback to original movie selection
    const w = state.preferences.w;
    const scored = movies.map(movie => ({
      movie,
      score: logistic(dot(w, movie.features))
    }));
    
    scored.sort((a, b) => b.score - a.score);
    const movieA = scored[0]?.movie || movies[0];
    const movieB = scored[Math.floor(scored.length * 0.5)]?.movie || movies[1];
    
    return [movieA, movieB];
  }, [movies, anchors, getCurrentPhase, state.preferences.choices, state.preferences.w, analyzePreferences, findMovieByTitle]);

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
      // Convert movies to proper Title format for phi function
      const winnerTitle = {
        id: typeof winner.id === 'string' ? parseInt(winner.id) : winner.id,
        title: winner.name,
        year: winner.year,
        genres: winner.tags.map(tag => {
          switch (tag.toLowerCase()) {
            case 'action': return 28;
            case 'adventure': return 12;
            case 'comedy': return 35;
            case 'drama': return 18;
            case 'horror': return 27;
            case 'thriller': return 53;
            case 'sci-fi': case 'science fiction': return 878;
            case 'fantasy': return 14;
            case 'romance': return 10749;
            case 'crime': return 80;
            case 'mystery': return 9648;
            case 'animation': return 16;
            case 'family': return 10751;
            default: return 18;
          }
        }),
        popularity: 50
      };

      const loserTitle = {
        id: typeof loser.id === 'string' ? parseInt(loser.id) : loser.id,
        title: loser.name,
        year: loser.year,
        genres: loser.tags.map(tag => {
          switch (tag.toLowerCase()) {
            case 'action': return 28;
            case 'adventure': return 12;
            case 'comedy': return 35;
            case 'drama': return 18;
            case 'horror': return 27;
            case 'thriller': return 53;
            case 'sci-fi': case 'science fiction': return 878;
            case 'fantasy': return 14;
            case 'romance': return 10749;
            case 'crime': return 80;
            case 'mystery': return 9648;
            case 'animation': return 16;
            case 'family': return 10751;
            default: return 18;
          }
        }),
        popularity: 50
      };

      // Use BTL pairwise learning
      const newW = [...prev.preferences.w];
      const winPhi = phi(winnerTitle);
      const losePhi = phi(loserTitle);
      
      // Ensure vectors are same length
      while (newW.length < Math.max(winPhi.length, losePhi.length)) {
        newW.push(0);
      }
      while (winPhi.length < newW.length) winPhi.push(0);
      while (losePhi.length < newW.length) losePhi.push(0);
      
      updateBTL(newW, winPhi, losePhi);
      
      const choice = prev.preferences.choices + 1;
      const phase = choice <= 4 ? 'BROAD' : choice <= 8 ? 'FOCUSED' : 'PRECISE';
      
      console.log(`[FUNNEL LEARN BTL] Round ${choice} (${phase}): "${winner.name}" beat "${loser.name}"`);
      console.log(`[FUNNEL VECTOR BTL] Updated weights:`, newW.slice(0, 10).map(w => w.toFixed(3)));

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
    anchors,
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
                  "Fine-tuning your taste profile",
      anchorsLoaded: anchors.length > 0
    })
  };
}
