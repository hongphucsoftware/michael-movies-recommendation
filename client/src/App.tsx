import { useMLLearning } from "./hooks/useMLLearning";
import { useMovieData } from "./hooks/useMovieData";
import Header from "./components/Header";
import OnboardingSection from "./components/OnboardingSection";
import TrailerWheelSection from "./components/TrailerWheelSection";
import WatchlistSection from "./components/WatchlistSection";
import LoadingScreen from "./components/LoadingScreen";
import { RefreshCw, AlertCircle } from "lucide-react";

function App() {
  const { 
    movies, 
    isLoading, 
    error, 
    playTrailer, 
    refreshMovies 
  } = useMovieData();

  const {
    preferences,
    currentPair,
    queue,
    onboardingComplete,
    learnChoice,
    adjustAdventurousness,
    skipPair,
    addToWatchlist,
    removeFromWatchlist,
    hideMovie,
    surpriseMe,
    reset,
    updateQueue,
    getAdventurousnessLabel,
    getWatchlist
  } = useMLLearning(movies);

  const watchlist = getWatchlist();

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
        <Header choices={0} onboardingComplete={false} />
        <LoadingScreen onComplete={() => {}} />
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
            <AlertCircle className="w-16 h-16 text-netflix-red mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Unable to Load Content</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">{error}</p>
            <button
              onClick={refreshMovies}
              className="bg-netflix-red hover:bg-netflix-red/80 px-8 py-4 rounded-lg font-semibold transition-colors flex items-center mx-auto"
              data-testid="button-retry"
            >
              <RefreshCw className="mr-3" size={20} />
              Try Again
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

      <Header 
        choices={preferences.choices} 
        onboardingComplete={onboardingComplete} 
      />

      {!onboardingComplete ? (
        <OnboardingSection
          currentPair={currentPair}
          choices={preferences.choices}
          adventurousness={getAdventurousnessLabel()}
          onSelectPoster={learnChoice}
          onAdjustAdventurousness={adjustAdventurousness}
          onSkipPair={skipPair}
        />
      ) : (
        <>
          <TrailerWheelSection
            queue={queue}
            onAddToWatchlist={addToWatchlist}
            onHideMovie={hideMovie}
            onNextTrailer={updateQueue}
            onSurpriseMe={surpriseMe}
            onReset={reset}
          />
          <WatchlistSection
            watchlist={watchlist}
            onRemoveFromWatchlist={removeFromWatchlist}
            onPlayTrailer={playTrailer}
          />
        </>
      )}

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gradient">Trailer Shuffle</h3>
              <p className="text-gray-400 text-sm">
                Discover your next favorite movie or TV show through AI-powered trailer recommendations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>AI-Powered Recommendations</li>
                <li>Personalized Learning</li>
                <li>Watchlist Management</li>
                <li>Trailer Discovery</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Privacy</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>All data stored locally</li>
                <li>No account required</li>
                <li>Privacy-first design</li>
                <li>Open source algorithm</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>Built with privacy in mind. Your data never leaves your device.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
