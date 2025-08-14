import { Loader2, Film, Tv, Image, Check } from "lucide-react";

interface LoadingScreenProps {
  message: string;
  posterStats?: { ok: number; failed: number };
}

export default function LoadingScreen({ message, posterStats }: LoadingScreenProps) {

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
              {message?.includes("movie") && <Film className="w-5 h-5 text-netflix-red" />}
              {message?.includes("TV") && <Tv className="w-5 h-5 text-electric-blue" />}
              {message?.includes("poster") && <Image className="w-5 h-5 text-yellow-400" />}
              {message?.includes("trailer") && <span className="text-yellow-400">🎬</span>}
              {message?.includes("ready") && <Check className="w-5 h-5 text-green-400" />}
            </div>
            <span className="text-white font-medium">{message}</span>
          </div>

          {posterStats && (
            <div className="text-sm text-gray-400">
              <span className="text-green-400">{posterStats.ok} posters loaded</span>
              {posterStats.failed > 0 && (
                <span className="text-red-400"> • {posterStats.failed} failed (using placeholders)</span>
              )}
            </div>
          )}
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