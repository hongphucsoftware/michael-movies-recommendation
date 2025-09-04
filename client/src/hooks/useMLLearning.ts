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
const MAX_ROUNDS = 12;
const ANCHOR_MODE = process.env.NODE_ENV === 'development' ? 'hardlist' : 'auto';

// Informative pair selection helpers
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const dot = (a: number[], b: number[]) => {
  let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) s += (a[i]||0)*(b[i]||0);
  return s;
};
const l1dist = (a: number[], b: number[]) => {
  let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) s += Math.abs((a[i]||0)-(b[i]||0));
  return s;
};

// Pick the pair that's both uncertain for current weights and far apart in features
function pickInformativePairLocal(cands: Movie[], w: number[], avoidIds: Set<string>) : [Movie, Movie] {
  const pool = cands.filter(m => !avoidIds.has(m.id));
  const S = Math.min(120, pool.length);
  if (S < 2) return [pool[0], pool[1]];

  let best: {a: Movie, b: Movie, val: number} | null = null;
  for (let tries = 0; tries < S*6; tries++) {
    const i = Math.floor(Math.random()*S);
    let j = Math.floor(Math.random()*S);
    if (j === i) j = (j+1) % S;
    const A = pool[i], B = pool[j];
    const diff = A.features.map((x,k)=> (x||0) - (B.features[k]||0));
    const p = sigmoid(dot(w, diff));               // model's confidence A > B
    const uncertainty = 1 - Math.abs(p - 0.5)*2;   // 1 when ~50/50
    const distance = Math.min(1, l1dist(A.features, B.features) / 6); // scaled contrast
    const info = 0.6*uncertainty + 0.4*distance;
    if (!best || info > best.val) best = { a: A, b: B, val: info };
  }
  return [best!.a, best!.b];
}

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
  const [moviesData] = useMovieData();
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [serverAnchors, setServerAnchors] = useState<any[]>([]);

  // Fetch anchors from the server if ANCHOR_MODE is 'hardlist'
  useEffect(() => {
    if (ANCHOR_MODE === 'hardlist') {
      fetch('/config/paf_anchor_hardlist.json')
        .then(res => res.json())
        .then(data => {
          setServerAnchors(data);
          console.log('[FUNNEL] Loaded anchors from server:', data.length);
        })
        .catch(error => console.error('[FUNNEL] Failed to load anchors:', error));
    }
  }, []);

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

  // Initialize anchors when movies are loaded or server anchors are available
  useEffect(() => {
    if (moviesData.length > 0 && anchors.length === 0) {
      console.log('[FUNNEL] Building A/B anchor pool from', moviesData.length, 'movies');
      const movieTitles = moviesData.map(m => ({
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

      let anchorPool: Anchor[];
      if (ANCHOR_MODE === 'hardlist' && serverAnchors.length > 0) {
        console.log('[FUNNEL] Using server-provided anchors.');
        // Resolve server anchors to TMDB IDs
        anchorPool = serverAnchors.map((anchor: any) => {
          const matchedMovie = moviesData.find(m => m.name.toLowerCase() === anchor.title.toLowerCase() && m.year === anchor.year);
          if (matchedMovie) {
            return { ...anchor, id: matchedMovie.id };
          } else {
            console.warn(`[FUNNEL] Could not resolve anchor: ${anchor.title} (${anchor.year})`);
            return null;
          }
        }).filter((a: Anchor | null) => a !== null) as Anchor[];
      } else {
        anchorPool = buildABAnchors(movieTitles, 30);
      }
      
      setAnchors(anchorPool);
      console.log('[FUNNEL] Built anchor pool with', anchorPool.length, 'movies');
    }
  }, [moviesData, anchors.length, serverAnchors]);

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
    const found = moviesData.find(m => 
      m.name.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(m.name.toLowerCase())
    );
    return found || null;
  }, [moviesData]);

  // Informative pair selection that asks strategic questions
  const nextPair = useCallback((): [Movie, Movie] => {
    // Determine the candidate pool based on ANCHOR_MODE
    let candidatePool: Movie[];
    if (ANCHOR_MODE === 'hardlist' && anchors.length > 0) {
      console.log('[FUNNEL] Selecting from hardlist anchors.');
      candidatePool = moviesData.filter(m => anchors.some(a => a.id === m.id));
    } else {
      candidatePool = moviesData;
    }

    if (candidatePool.length < 2) {
      return [
        { id: 'loading1', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) } as unknown as Movie,
        { id: 'loading2', name: 'Loading...', year: '2024', poster: '', youtube: '', isSeries: false, tags: [], features: zeros(DIMENSION) } as unknown as Movie,
      ];
    }

    // build candidate pool (hide hidden; downweight very recent repeats)
    const hidden = new Set(state.preferences.hidden);
    const recentChoices = state.choices.slice(-6).map(c => c.choice);
    const recentSet = new Set(recentChoices);

    const candidates = candidatePool.filter(m => !hidden.has(m.id));
    if (candidates.length < 2) return [candidatePool[0], candidatePool[1]];

    return pickInformativePair(candidates, state.weights, recentSet);
  }, [moviesData, anchors, state]);

  // Update currentPair when movies are loaded
  useEffect(() => {
    if (moviesData.length >= 2 && !state.onboardingComplete && 
        (!state.currentPair || state.currentPair[0].id === 'loading1')) {
      setState(prev => ({
        ...prev,
        currentPair: nextPair()
      }));
    }
  }, [moviesData, state.onboardingComplete, state.currentPair, nextPair]);

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
    if (moviesData.length === 0) {
      return [];
    }

    const candidates = moviesData.filter(movie => !state.preferences.hidden.has(movie.id));
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
  }, [moviesData, state.preferences.hidden, state.preferences.eps, baseScore, noveltyBoost]);

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
    getWatchlist: () => moviesData.filter(movie => state.preferences.likes.has(movie.id)),
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