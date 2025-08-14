import { useMLLearning } from "./hooks/useMLLearning";
import { useEnhancedCatalogue } from "./hooks/useEnhancedCatalogue";
import Header from "./components/Header";
import OnboardingSection from "./components/OnboardingSection";
import { EnhancedTrailerWheelSection } from "./components/EnhancedTrailerWheelSection";
import { EnhancedWatchlist } from "./components/EnhancedWatchlist";
import { RefreshCw, AlertCircle, Shuffle } from "lucide-react";
import { Badge } from "./components/ui/badge";

function AppEnhanced() {
  const {
    movies,
    isLoading,
    error,
    loadingMessage,
    catalogueSize,
    saveToWatchlist,
    removeFromWatchlist,
    hideItem,
    markAsRecent,
    getAvailableMovies,
    getWatchlistMovies,
    resetAll
  } = useEnhancedCatalogue();

  const {
    preferences,
    currentPair,
    onboardingComplete,
    learnChoice,
    adjustAdventurousness,
    skipPair,
    reset: resetML,
    getAdventurousnessLabel
  } = useMLLearning(movies || []);

  // Combined reset function
  const handleReset = () => {
    resetML();
    resetAll();
  };

  // Show loading screen while fetching data
  if (isLoading) {
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
        <Header choices={preferences.choices} onboardingComplete={false} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
          <div className="glass-card p-12 rounded-2xl text-center">
            <Shuffle className="w-16 h-16 mx-auto mb-6 text-netflix-red animate-spin" />
            <h2 className="text-3xl font-bold mb-4">PickaFlick</h2>
            <p className="text-electric-blue text-lg font-medium mb-2">Seconds now will save you hours later</p>
            <p className="text-gray-300 text-base mb-6">Pick posters based on your gut feeling. Our AI learns your taste in real-time and curates the perfect trailer queue for you.</p>
            <p className="text-xl text-gray-300 mb-6">{loadingMessage}</p>
            <div className="flex justify-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Target: 250+ titles with trailers
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Using YouTube thumbnails for reliability
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if data loading failed
  if (error) {
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
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="glass-card p-12 rounded-2xl text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-3xl font-bold mb-4">Catalogue Loading Failed</h2>
            <p className="text-xl text-gray-300 mb-8">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Reload Page
            </button>
          </div>
        </section>
      </div>
    );
  }

  const watchlistMovies = getWatchlistMovies() || [];

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
        choices={preferences.choices} 
        onboardingComplete={onboardingComplete}
        catalogueSize={catalogueSize}
        watchlistSize={watchlistMovies.length}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* Onboarding Phase */}
        {!onboardingComplete && currentPair && currentPair.length >= 2 && (
          <OnboardingSection
            currentPair={currentPair}
            choices={preferences.choices}
            onSelectPoster={learnChoice}
            onSkipPair={skipPair}
            adventurousness={getAdventurousnessLabel()}
            onAdjustAdventurousness={adjustAdventurousness}
            getAdventurousnessLabel={getAdventurousnessLabel}
            totalMovies={movies.length}
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
                    Powered by machine learning • {catalogueSize} titles available
                  </p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="outline" className="text-sm">
                    {getAdventurousnessLabel()}
                  </Badge>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Reset All
                  </button>
                </div>
              </div>

              <EnhancedTrailerWheelSection
                movies={movies}
                preferences={preferences}
                onSave={saveToWatchlist}
                onHide={hideItem}
                onMarkRecent={markAsRecent}
                getAvailableMovies={getAvailableMovies}
                explorationRate={preferences.eps}
                onExplorationChange={adjustAdventurousness}
              />
            </div>

            {/* Watchlist */}
            <div className="glass-card p-8 rounded-2xl">
              <EnhancedWatchlist
                watchlistMovies={watchlistMovies}
                onRemoveFromWatchlist={removeFromWatchlist}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AppEnhanced;