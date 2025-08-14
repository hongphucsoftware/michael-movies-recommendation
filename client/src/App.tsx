import { useMLLearning } from "./hooks/useMLLearning";
import { useMovieData } from "./hooks/useMovieData";
import Header from "./components/Header";
import OnboardingSection from "./components/OnboardingSection";
import TrailerWheelSection from "./components/TrailerWheelSection";
import WatchlistSection from "./components/WatchlistSection";

function App() {
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
  } = useMLLearning();

  const { playTrailer } = useMovieData();

  const watchlist = getWatchlist();

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
