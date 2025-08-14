import { useEffect, useState } from "react";
import { Loader2, Film, Tv } from "lucide-react";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [loadingMessage, setLoadingMessage] = useState("Fetching trending movies...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messages = [
      "Fetching trending movies...",
      "Getting TV shows...", 
      "Finding trailers...",
      "Building your catalog...",
      "Almost ready!"
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < messages.length - 1) {
        currentIndex++;
        setLoadingMessage(messages[currentIndex]);
        setProgress((currentIndex / (messages.length - 1)) * 100);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
      <div className="glass-card p-12 rounded-2xl text-center">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-netflix-red animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-4">Building Your Movie Catalog</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          We're fetching the latest trending movies and TV shows with their trailers from TMDb to personalize your experience.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-3 text-lg">
            <div className="w-6 h-6 flex items-center justify-center">
              {loadingMessage.includes("movie") && <Film className="w-5 h-5 text-netflix-red" />}
              {loadingMessage.includes("TV") && <Tv className="w-5 h-5 text-electric-blue" />}
              {loadingMessage.includes("trailer") && <span className="text-yellow-400">🎬</span>}
              {loadingMessage.includes("catalog") && <span className="text-green-400">📚</span>}
              {loadingMessage.includes("ready") && <span className="text-purple-400">✨</span>}
            </div>
            <span className="text-white font-medium">{loadingMessage}</span>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-netflix-gray rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-netflix-red to-electric-blue h-full rounded-full transition-all duration-500 progress-glow" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% complete</p>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Powered by <span className="text-electric-blue">TMDb</span> • 
            All data stays private on your device
          </p>
        </div>
      </div>
    </section>
  );
}