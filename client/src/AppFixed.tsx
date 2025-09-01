import { useEffect, useState } from "react";
import { Shuffle, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "./components/ui/badge";
import Header from "./components/Header";
import OnboardingSection from "./components/OnboardingSection";
import TrailerPlayer from "./components/TrailerPlayer";
import { EnhancedWatchlist } from "./components/EnhancedWatchlist";
import { useMLLearning } from "./hooks/useMLLearning";
import { posterFromTMDbPaths, youtubeThumb } from "./lib/videoPick";

// Movie type matching the new API format
type Movie = {
  id: string;
  name: string;
  year: number;
  poster: string;
  ytKeys: string[];
  genre_ids: number[];
  features: number[];
  category: "classic" | "recent";
};

const GENRES = {
  Comedy: 35, Drama: 18, Action: 28, Thriller: 53, SciFi: 878, Fantasy: 14,
  Documentary: 99, Animation: 16, Horror: 27, Crime: 80, Adventure: 12, Family: 10751, Romance: 10749, Mystery: 9648
};

function fVec(genre_ids: number[], year: number): number[] {
  const has = (...ids: number[]) => ids.some(g => genre_ids.includes(g)) ? 1 : 0;
  const comedy = has(GENRES.Comedy), drama = has(GENRES.Drama), action = has(GENRES.Action);
  const thrill = has(GENRES.Thriller, GENRES.Mystery, GENRES.Crime);
  const scifi = has(GENRES.SciFi), fanim = has(GENRES.Fantasy, GENRES.Animation);
  const docu = has(GENRES.Documentary);
  const light = Math.min(1, comedy*.8 + fanim*.4 + has(GENRES.Family)*.6 + has(GENRES.Romance)*.4);
  const dark = Math.min(1, thrill*.6 + drama*.4 + has(GENRES.Horror)*.8 + has(GENRES.Crime)*.5);
  const fast = Math.min(1, action*.8 + thrill*.6 + scifi*.4 + fanim*.3);
  const slow = Math.min(1, drama*.6 + docu*.4);
  const recent = year >= 2020 ? 1 : 0; // 12th slot = era
  return [comedy,drama,action,thrill,scifi,fanim,docu,light,dark,fast,slow,recent];
}

function AppFixed() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load movies from new API
  useEffect(() => {
    async function loadMovies() {
      try {
        setLoading(true);
        const response = await fetch("/api/movies/catalogue");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        const processedMovies: Movie[] = (data.items || []).map((m: any) => {
          const poster = posterFromTMDbPaths(m) || youtubeThumb(m.ytKeys?.[0] || '');
          const year = Number(m.year) || 0;
          return {
            id: `movie_${m.id}`,
            name: m.name,
            year,
            poster,
            ytKeys: m.ytKeys || [],
            genre_ids: m.genre_ids || [],
            features: fVec(m.genre_ids || [], year),
            category: year >= 2020 ? "recent" : "classic"
          };
        });
        
        // Shuffle for variety
        for (let i = processedMovies.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [processedMovies[i], processedMovies[j]] = [processedMovies[j], processedMovies[i]];
        }
        
        setMovies(processedMovies);
        console.log(`Movies loaded: ${processedMovies.length} total, ${processedMovies.filter(m => m.category === 'recent').length} recent, ${processedMovies.filter(m => m.category === 'classic').length} classics`);
      } catch (err) {
        setError(String(err));
        console.error("Failed to load movies:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadMovies();
  }, []);

  // ML Learning hook
  const {
    preferences,
    currentPair,
    onboardingComplete,
    learnChoice,
    adjustAdventurousness,
    skipPair,
    reset: resetML,
    getAdventurousnessLabel
  } = useMLLearning(movies);

  // Show loading screen
  if (loading) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <div className="fixed inset-0 opacity-5">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "20px 20px"
            }}
          ></div>
        </div>
        <Header choices={0} onboardingComplete={false} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
          <div className="glass-card p-12 rounded-2xl text-center">
            <Shuffle className="w-16 h-16 mx-auto mb-6 text-netflix-red animate-spin" />
            <h2 className="text-3xl font-bold mb-4">PickaFlick</h2>
            <p className="text-electric-blue text-lg font-medium mb-2">Find Your Next Favourite in Minutes</p>
            <p className="text-gray-300 text-base mb-6">Loading your personalized movie collection...</p>
            <div className="flex justify-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Recent hits + Classics
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                High-quality posters
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error screen
  if (error) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <Header choices={0} onboardingComplete={false} />
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="glass-card p-12 rounded-2xl text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-3xl font-bold mb-4">Loading Failed</h2>
            <p className="text-xl text-gray-300 mb-8">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-netflix-black text-white min-h-screen">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "20px 20px"
          }}
        ></div>
      </div>

      {/* Header */}
      <Header 
        choices={preferences?.choices || 0} 
        onboardingComplete={onboardingComplete}
        catalogueSize={movies.length}
        watchlistSize={0}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* Onboarding Phase */}
        {!onboardingComplete && currentPair && currentPair.left && currentPair.right && (
          <OnboardingSection
            currentPair={currentPair}
            onChoice={learnChoice}
            onSkip={skipPair}
            preferences={preferences}
            onAdjustAdventurousness={adjustAdventurousness}
            getAdventurousnessLabel={getAdventurousnessLabel}
          />
        )}

        {/* Trailer Wheel Phase */}
        {onboardingComplete && (
          <div className="space-y-8">
            <div className="glass-card p-8 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Your Trailer Wheel</h1>
                  <p className="text-gray-300">
                    Powered by machine learning • {movies.length} titles available
                  </p>
                </div>
                <button
                  onClick={resetML}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                >
                  Reset All
                </button>
              </div>

              <TrailerPlayer
                items={movies.map(m => ({
                  id: parseInt(String(m.id).replace(/\D/g, '')),
                  title: m.name,
                  year: m.year,
                  genres: m.genre_ids || [],
                  popularity: 0,
                  feature: m.features || [],
                  sources: [m.category]
                }))}
                learnedVec={preferences?.w || []}
                recentChosenIds={Array.from(preferences?.explored || new Set()).map(id => parseInt(String(id).replace(/\D/g, '')))}
                count={5}
              />
            </div>

            <EnhancedWatchlist
              watchlistMovies={[]}
              onRemoveFromWatchlist={() => {}}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default AppFixed;