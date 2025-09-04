
import { useState, useEffect, useCallback } from "react";
import { Movie, UserPreferences, MLState } from "@/types/movie";
import { 
  zeros, 
  dot, 
  addInPlace, 
  subtract, 
  logistic, 
  LEARNING_RATE, 
  TARGET_CHOICES 
} from "@/lib/mlUtils";
import { buildABAnchors, getABPairForRound, analyzeABPreferences, type Anchor } from "@/lib/abAnchors";

const DIMENSION = 12;

export function useMLLearning(movies: Movie[]) {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [abChoices, setABChoices] = useState<number[]>([]);
  
  const [state, setState] = useState<MLState>(() => {
    const STORAGE_KEY = 'ts_preferences_structured_v1';
    const AB_CHOICES_KEY = 'ts_ab_choices_v1';
    
    const storedPrefs = localStorage.getItem(STORAGE_KEY);
    const storedChoices = localStorage.getItem(AB_CHOICES_KEY);
    
    const defaultPrefs: UserPreferences = {
      w: zeros(DIMENSION),
      explored: new Set<string>(),
      hidden: new Set<string>(),
      likes: new Set<string>(),
      choices: 0,
      eps: 0.12
    };

    let preferences = defaultPrefs;
    let choices: number[] = [];
    
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs);
        preferences = {
          w: parsed.w || zeros(DIMENSION),
          explored: new Set(parsed.explored || []),
          hidden: new Set(parsed.hidden || []),
          likes: new Set(parsed.likes || []),
          choices: parsed.choices || 0,
          eps: parsed.eps || 0.12
        };
      } catch (e) {
        console.error('Failed to parse stored preferences:', e);
      }
    }
    
    if (storedChoices) {
      try {
        choices = JSON.parse(storedChoices);
      } catch (e) {
        console.error('Failed to parse stored choices:', e);
      }
    }

    return {
      preferences,
      queue: [],
      currentPair: null,
      onboardingComplete: preferences.choices >= TARGET_CHOICES
    };
  });

  // Load A/B choices from storage
  useEffect(() => {
    const stored = localStorage.getItem('ts_ab_choices_v1');
    if (stored) {
      try {
        setABChoices(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load A/B choices:', e);
      }
    }
  }, []);

  // Initialize anchors when movies are loaded
  useEffect(() => {
    if (movies.length > 0 && anchors.length === 0) {
      console.log('[ML LEARNING] Building structured A/B anchor pairs from', movies.length, 'movies');
      const movieTitles = movies.map(m => ({
        id: m.id,
        title: m.name,
        year: parseInt(m.year),
        genres: m.features.slice(0, 6).map((val, idx) => val > 0.5 ? [35, 18, 28, 53, 878, 14][idx] : -1).filter(g => g !== -1),
        sources: [m.category || 'unknown'],
        popularity: 50,
        vote_count: 1000,
        poster: m.poster,
        original_language: 'en'
      }));
      
      const newAnchors = buildABAnchors(movieTitles);
      setAnchors(newAnchors);
      console.log('[ML LEARNING] Built', newAnchors.length, 'structured anchor pairs');
    }
  }, [movies, anchors.length]);

  // Persist preferences and choices
  useEffect(() => {
    const STORAGE_KEY = 'ts_preferences_structured_v1';
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

  useEffect(() => {
    localStorage.setItem('ts_ab_choices_v1', JSON.stringify(abChoices));
  }, [abChoices]);

  // Get current A/B pair based on round
  const getCurrentABPair = useCallback((): [Movie, Movie] | null => {
    if (movies.length < 2 || anchors.length === 0) return null;
    
    const currentRound = state.preferences.choices + 1;
    if (currentRound > 12) return null;
    
    const [anchorA, anchorB] = getABPairForRound(anchors, currentRound);
    if (!anchorA || !anchorB) {
      console.warn(`[ML LEARNING] Missing anchors for round ${currentRound}`);
      return null;
    }
    
    // Find corresponding movies in catalogue
    const movieA = movies.find(m => 
      m.name.toLowerCase().includes(anchorA.title.toLowerCase()) ||
      anchorA.title.toLowerCase().includes(m.name.toLowerCase())
    );
    const movieB = movies.find(m => 
      m.name.toLowerCase().includes(anchorB.title.toLowerCase()) ||
      anchorB.title.toLowerCase().includes(m.name.toLowerCase())
    );
    
    if (!movieA || !movieB) {
      console.warn(`[ML LEARNING] Could not find movies for round ${currentRound}: "${anchorA.title}" / "${anchorB.title}"`);
      return null;
    }
    
    console.log(`[ML LEARNING] Round ${currentRound}: "${movieA.name}" vs "${movieB.name}"`);
    return [movieA, movieB];
  }, [movies, anchors, state.preferences.choices]);

  // Update current pair when needed
  useEffect(() => {
    if (!state.onboardingComplete && !state.currentPair && anchors.length > 0) {
      const pair = getCurrentABPair();
      if (pair) {
        setState(prev => ({
          ...prev,
          currentPair: pair
        }));
      }
    }
  }, [state.onboardingComplete, state.currentPair, anchors.length, getCurrentABPair]);

  const learnChoice = useCallback((winner: Movie, loser: Movie) => {
    setState(prev => {
      const diff = subtract(winner.features, loser.features);
      const p = logistic(dot(prev.preferences.w, diff));
      const gradScale = 1 - p;
      
      const newW = [...prev.preferences.w];
      addInPlace(newW, diff, LEARNING_RATE * gradScale);
      
      const choice = prev.preferences.choices + 1;
      
      console.log(`[ML LEARNING] Round ${choice}: "${winner.name}" beat "${loser.name}"`);
      console.log(`[ML LEARNING] Updated weights:`, newW.map(w => w.toFixed(2)));

      const newExplored = new Set(prev.preferences.explored);
      newExplored.add(winner.id);
      newExplored.add(loser.id);

      const onboardingComplete = choice >= TARGET_CHOICES;

      // Store the choice
      setABChoices(current => [...current, winner.id]);

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          w: newW,
          explored: newExplored,
          choices: choice
        },
        onboardingComplete,
        currentPair: onboardingComplete ? null : getCurrentABPair()
      };
    });
  }, [getCurrentABPair]);

  // Analyze current preferences for display
  const getPreferenceAnalysis = useCallback(() => {
    const w = state.preferences.w;
    if (!w || w.length < 6) return { preferences: [], strength: "weak", explanation: "Learning your preferences..." };
    
    const genreStrengths = {
      comedy: w[0] || 0,
      drama: w[1] || 0, 
      action: w[2] || 0,
      thriller: w[3] || 0,
      scifi: w[4] || 0,
      fantasy: w[5] || 0
    };

    const preferences = Object.entries(genreStrengths)
      .filter(([_, score]) => score > 0.3)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([type, strength]) => ({
        type,
        strength,
        label: type === 'scifi' ? 'sci-fi' : 
               type === 'fantasy' ? 'fantasy' :
               type === 'action' ? 'action films' :
               type === 'thriller' ? 'thrillers' :
               type === 'drama' ? 'dramatic films' : 
               'comedies'
      }));

    const vectorMagnitude = Math.sqrt(w.reduce((sum, val) => sum + val * val, 0));
    const strength = vectorMagnitude > 2.5 ? "strong" : vectorMagnitude > 1.5 ? "medium" : "weak";
    
    let explanation = "Building your taste profile through structured A/B testing";
    if (preferences.length >= 2) {
      explanation = `You prefer ${preferences[0].label} and ${preferences[1].label} based on your A/B choices`;
    } else if (preferences.length === 1) {
      explanation = `Strong preference for ${preferences[0].label} discovered through A/B testing`;
    }

    return { preferences, strength, explanation };
  }, [state.preferences.w]);

  // Ranking function using learned preferences
  const rankMovies = useCallback((candidates: Movie[]): Movie[] => {
    if (!candidates.length || !state.preferences.w.length) return candidates;
    
    const w = state.preferences.w;
    const scored = candidates.map(movie => ({
      movie,
      score: logistic(dot(w, movie.features)) + 
             (state.preferences.explored.has(movie.id) ? 0 : 0.1) + // novelty bonus
             (Math.random() * 0.05) // small randomization
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.movie);
  }, [state.preferences.w, state.preferences.explored]);

  const reset = useCallback(() => {
    ['ts_preferences_structured_v1', 'ts_ab_choices_v1'].forEach(key => localStorage.removeItem(key));
    
    setState({
      preferences: {
        w: zeros(DIMENSION),
        explored: new Set<string>(),
        hidden: new Set<string>(),
        likes: new Set<string>(),
        choices: 0,
        eps: 0.12
      },
      queue: [],
      currentPair: null,
      onboardingComplete: false
    });
    
    setABChoices([]);
  }, []);

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

  return {
    ...state,
    anchors,
    abChoices,
    learnChoice,
    rankMovies,
    addToWatchlist,
    removeFromWatchlist,
    hideMovie,
    reset,
    getPreferenceAnalysis,
    getWatchlist: () => movies.filter(movie => state.preferences.likes.has(movie.id)),
    getFunnelProgress: () => ({
      phase: state.preferences.choices < 4 ? 'broad' : state.preferences.choices < 8 ? 'focused' : 'precise',
      round: state.preferences.choices + 1,
      description: state.preferences.choices < 4 ? "Exploring broad genre preferences" : 
                  state.preferences.choices < 8 ? "Refining style preferences" : 
                  "Fine-tuning your taste profile",
      anchorsLoaded: anchors.length > 0
    })
  };
}
