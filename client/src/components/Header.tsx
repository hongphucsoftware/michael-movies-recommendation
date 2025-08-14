import { Play, Brain, Settings } from "lucide-react";

interface HeaderProps {
  choices: number;
  onboardingComplete: boolean;
}

export default function Header({ choices, onboardingComplete }: HeaderProps) {
  return (
    <header className="relative z-10 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-netflix-red rounded-xl flex items-center justify-center animate-pulse-glow">
              <Play className="text-white text-xl fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient">Trailer Shuffle</h1>
              <p className="text-gray-400 text-sm">Discover your next obsession</p>
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
