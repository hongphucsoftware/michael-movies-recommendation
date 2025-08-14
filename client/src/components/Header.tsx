import { Play, Brain, Settings } from "lucide-react";

interface HeaderProps {
  choices: number;
  onboardingComplete: boolean;
  catalogueSize?: number;
  watchlistSize?: number;
}

export default function Header({ choices, onboardingComplete, catalogueSize, watchlistSize }: HeaderProps) {
  return (
    <header className="relative z-10 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-netflix-red rounded-xl flex items-center justify-center animate-pulse-glow">
              <Play className="text-white text-xl fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">PickaFlick</h1>
              <p className="text-electric-blue text-sm font-medium mb-1">Find Your Next Favourite in Minutes</p>
              <p className="text-gray-400 text-xs">Tired of scrolling endlessly? We've flipped the script.</p>
              <div className="text-gray-500 text-xs mt-2 space-y-1">
                <p><span className="text-electric-blue font-medium">Quick Picks</span> – We'll show you pairs of movie posters. Tap the one you'd rather watch.</p>
                <p><span className="text-electric-blue font-medium">Smart Match</span> – Our system learns your tastes in genres, styles, and vibes — without a single boring form.</p>
                <p><span className="text-electric-blue font-medium">Trailer Feed</span> – Sit back and watch a hand-picked reel of trailers perfectly matched to you.</p>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                {catalogueSize ? `${catalogueSize} titles with trailers` : ''}
                {watchlistSize ? ` • ${watchlistSize} saved` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="glass-card px-4 py-2 rounded-lg">
              <Brain className="text-electric-blue mr-2 inline" size={16} />
              <span className="text-sm">
                AI Learning: <span className="text-electric-blue font-semibold">
                  {onboardingComplete ? 'Active' : `${choices}/12`}
                </span>
              </span>
            </div>
            <button 
              className="glass-card p-3 rounded-lg hover:bg-netflix-red transition-colors" 
              title="Settings"
              data-testid="button-settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
