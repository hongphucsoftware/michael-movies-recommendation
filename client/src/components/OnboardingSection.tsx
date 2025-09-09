import { useState, useEffect } from "react";
import { Movie } from "@/types/movie";
import { TARGET_CHOICES } from "@/lib/mlUtils";
import { Lightbulb, Minus, Plus, SkipForward, MousePointer } from "lucide-react";
import RobustImage from "./RobustImage";

interface OnboardingSectionProps {
  currentPair: { left: Movie | null; right: Movie | null } | null;
  onChoice: (winner: Movie, loser: Movie) => void;
  onSkip: () => void;
  preferences: any;
  onAdjustAdventurousness: (delta: number) => void;
  getAdventurousnessLabel: () => string;
}

export default function OnboardingSection({
  currentPair,
  onChoice,
  onSkip,
  preferences,
  onAdjustAdventurousness,
  getAdventurousnessLabel
}: OnboardingSectionProps) {
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    const choices = preferences?.choices || 0;
    const percentage = Math.min(100, Math.round(100 * choices / TARGET_CHOICES));
    setProgressWidth(percentage);
  }, [preferences?.choices]);

  if (!currentPair || !currentPair.left || !currentPair.right) {
    return null;
  }

  const movieA = currentPair.left;
  const movieB = currentPair.right;
  const choices = preferences?.choices || 0;

  return (
    <main className="relative z-10 max-w-7xl mx-auto px-6 pb-12" id="onboarding">
      {/* Hero Section */}
      <section className="text-center py-12 mb-12">
        <div className="hero-glow absolute inset-0 transform -translate-y-32"></div>
        <div className="relative">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Which would you
            <span className="text-gradient"> rather watch?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Pick posters based on your gut feeling. Our AI learns your taste in real-time and curates the perfect trailer queue for you.
          </p>

          {/* Progress Section */}
          <div className="glass-card p-6 rounded-2xl max-w-md mx-auto animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-300">Learning Progress</span>
              <div className="flex items-center space-x-2">
                <span className="bg-netflix-red text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {Math.min(preferences?.choices || 0, TARGET_CHOICES)} / {TARGET_CHOICES}
                </span>
                <div className="bg-electric-blue/20 text-electric-blue px-3 py-1 rounded-full text-sm">
                  <svg className="inline mr-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {getAdventurousnessLabel()}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-netflix-gray rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-netflix-red to-electric-blue h-full rounded-full transition-all duration-500 progress-glow" 
                style={{ width: `${progressWidth}%` }}
              ></div>
            </div>

            {/* Funnel Phase Indicator */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">
                {choices < 4 ? 'Phase 1: Broad Genre Discovery' : 
                 choices < 8 ? 'Phase 2: Preference Refinement' : 
                 'Phase 3: Taste Precision'}
              </div>
              <div className="flex justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${choices >= 1 ? 'bg-electric-blue' : 'bg-gray-600'}`} />
                <div className={`w-3 h-3 rounded-full ${choices >= 5 ? 'bg-electric-blue' : 'bg-gray-600'}`} />
                <div className={`w-3 h-3 rounded-full ${choices >= 9 ? 'bg-electric-blue' : 'bg-gray-600'}`} />
              </div>
            </div>

            <div className="flex items-center justify-center text-sm text-gray-400">
              <Lightbulb className="mr-2 text-yellow-400" size={16} />
              <span>Trust your instincts — quick choices help us learn better</span>
            </div>
          </div>
        </div>
      </section>

      {/* Poster Selection */}
      <section className="animate-fade-in">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Left Poster */}
          <div 
            className="poster-card group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-netflix-red/25" 
            onClick={() => onChoice(movieA, movieB)}
            data-testid="poster-left"
          >
            <div className="gradient-border relative overflow-hidden">
              <div className="p-6 relative">
                <RobustImage 
                  src={movieA.poster} 
                  alt={`${movieA.name} poster`} 
                  className="w-full h-96 object-cover rounded-xl mb-4 shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:brightness-125"

                />

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">{movieA.name}</h3>
                  <p className="text-gray-400 text-sm">{movieA.year} • Film • {movieA.category}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-netflix-red/20 text-netflix-red px-2 py-1 rounded-full text-xs">
                      {movieA.category === 'recent' ? 'Recent Hit' : 'Classic'}
                    </span>
                  </div>
                  <div className="flex items-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MousePointer className="text-netflix-red mr-2" size={16} />
                    <span className="text-sm text-gray-300">Click to choose</span>
                  </div>

                  {/* Selection overlay */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75 z-20">
                    <div className="bg-netflix-red text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      CHOOSE THIS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Poster */}
          <div 
            className="poster-card group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/25" 
            onClick={() => onChoice(movieB, movieA)}
            data-testid="poster-right"
          >
            <div className="gradient-border relative overflow-hidden">
              <div className="p-6 relative">
                <RobustImage 
                  src={movieB.poster} 
                  alt={`${movieB.name} poster`} 
                  className="w-full h-96 object-cover rounded-xl mb-4 shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:brightness-125"

                />

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">{movieB.name}</h3>
                  <p className="text-gray-400 text-sm">{movieB.year} • Film • {movieB.category}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-electric-blue/20 text-electric-blue px-2 py-1 rounded-full text-xs">
                      {movieB.category === 'recent' ? 'Recent Hit' : 'Classic'}
                    </span>
                  </div>
                  <div className="flex items-center mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MousePointer className="text-netflix-red mr-2" size={16} />
                    <span className="text-sm text-gray-300">Click to choose</span>
                  </div>

                  {/* Selection overlay */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75 z-20">
                    <div className="bg-electric-blue text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      CHOOSE THIS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button 
            className="glass-card px-6 py-3 rounded-lg hover:bg-netflix-red transition-colors flex items-center" 
            onClick={() => onAdjustAdventurousness(-0.05)}
            data-testid="button-less-wild"
          >
            <Minus className="mr-2" size={16} />
            Less Wild
          </button>
          <button 
            className="glass-card px-6 py-3 rounded-lg hover:bg-electric-blue transition-colors flex items-center"
            onClick={() => onAdjustAdventurousness(0.05)}
            data-testid="button-more-wild"
          >
            <Plus className="mr-2" size={16} />
            More Wild
          </button>
          <button 
            className="glass-card px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors flex items-center"
            onClick={onSkip}
            data-testid="button-skip-pair"
          >
            <SkipForward className="mr-2" size={16} />
            Skip This Pair
          </button>
        </div>
      </section>
    </main>
  );
}