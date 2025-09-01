import { useEffect, useState } from "react";
import { Shuffle, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "./components/ui/badge";
import Header from "./components/Header";
import TrailerReel from "./components/TrailerReel";
import { useEnhancedCatalogue, useLearnedVector } from "./hooks/useEnhancedCatalogue";
import { useQuickPicks } from "./hooks/useQuickPicks";
import { bestImageUrl, type Title } from "./lib/videoPick";

function AppWorking() {
  const { items: movies, loading, error } = useEnhancedCatalogue();
  const { learned, like, skip } = useLearnedVector();
  const { pair, round, done, choose, reset } = useQuickPicks(movies, 12);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Update onboarding completion based on rounds
  useEffect(() => {
    if (done && !onboardingComplete) {
      setOnboardingComplete(true);
    }
  }, [done, onboardingComplete]);

  // Handle poster selection
  const handleChoice = (movie: Title, side: "left" | "right") => {
    like(movie);
    choose(side);
  };

  const handleSkip = () => {
    if (pair) {
      skip(pair[0] as Title);
      skip(pair[1] as Title);
      choose("left"); // Just advance the round
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <Header choices={0} onboardingComplete={false} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
          <div className="glass-card p-12 rounded-2xl text-center">
            <Shuffle className="w-16 h-16 mx-auto mb-6 text-netflix-red animate-spin" />
            <h2 className="text-3xl font-bold mb-4">PickaFlick</h2>
            <p className="text-electric-blue text-lg font-medium mb-2">Find Your Next Favourite in Minutes</p>
            <p className="text-gray-300 text-base mb-6">Loading authentic movie collection with TMDb API...</p>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              High-quality posters loading
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <Header choices={0} onboardingComplete={false} />
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="glass-card p-12 rounded-2xl text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-3xl font-bold mb-4">Loading Failed</h2>
            <p className="text-xl text-gray-300 mb-8">Error: {error}</p>
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
        choices={round} 
        onboardingComplete={onboardingComplete}
        catalogueSize={movies.length}
        watchlistSize={0}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* Onboarding Phase */}
        {!onboardingComplete && pair && (
          <section className="pt-8">
            <div className="glass-card p-8 rounded-2xl">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-4">Quick Pick</h1>
                <p className="text-xl text-gray-300 mb-6">Pick the poster that catches your eye. Our AI learns your taste in real-time.</p>
                
                {/* Progress */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300">Learning Progress</span>
                  <div className="flex items-center space-x-2">
                    <span className="bg-netflix-red text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {Math.min(round, 12)} / 12
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 mb-8 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-netflix-red to-electric-blue rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.round(100 * round / 12))}%` }}
                  ></div>
                </div>
              </div>

              {/* Movie Pair Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Left Movie */}
                <div className="text-center">
                  <button
                    onClick={() => handleChoice(pair[0] as Title, "left")}
                    className="group relative block w-full mb-4 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300"
                  >
                    <div className="aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden">
                      <img
                        src={bestImageUrl(pair[0] as Title) || ''}
                        alt={pair[0].title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-xl"></div>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-200">{pair[0].title}</h3>
                  <p className="text-sm text-gray-400">({pair[0].releaseDate?.slice(0, 4) || 'Unknown'})</p>
                </div>

                {/* Right Movie */}
                <div className="text-center">
                  <button
                    onClick={() => handleChoice(pair[1] as Title, "right")}
                    className="group relative block w-full mb-4 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300"
                  >
                    <div className="aspect-[2/3] bg-gray-800 rounded-xl overflow-hidden">
                      <img
                        src={bestImageUrl(pair[1] as Title) || ''}
                        alt={pair[1].title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-xl"></div>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-200">{pair[1].title}</h3>
                  <p className="text-sm text-gray-400">({pair[1].releaseDate?.slice(0, 4) || 'Unknown'})</p>
                </div>
              </div>

              {/* Skip Button */}
              <div className="text-center mt-8">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Skip Both
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Completed State */}
        {onboardingComplete && (
          <section className="pt-8">
            <div className="glass-card p-8 rounded-2xl text-center">
              <h1 className="text-4xl font-bold mb-4">Perfect!</h1>
              <p className="text-xl text-gray-300 mb-6">
                Your AI has learned your taste from {round} choices. 
                Ready to discover your next favourite movie!
              </p>
              <div className="flex justify-center gap-4 mb-8">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {movies.length} movies available
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  ML learning active
                </Badge>
              </div>

              {/* Trailer Reel */}
              <TrailerReel items={movies} learnedVec={learned} count={8} />

              <button
                onClick={() => {
                  setOnboardingComplete(false);
                  reset();
                }}
                className="mt-8 px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Start Over
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default AppWorking;