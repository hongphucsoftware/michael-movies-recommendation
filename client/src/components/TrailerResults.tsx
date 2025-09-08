import { useState } from "react";
import { Play, Heart, Info, RotateCcw, Volume2, VolumeX, Shuffle, ExternalLink } from "lucide-react";
import type { Recommendation } from "../hooks/useStatelessAB";

type Props = {
  recommendations: Recommendation;
  onReset: () => void;
};

export default function TrailerResults({ recommendations, onReset }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mutedTrailers, setMutedTrailers] = useState<Set<number>>(new Set());
  
  const { movies, trailers, explanation } = recommendations;
  const currentMovie = movies[currentIndex];
  const currentTrailerUrl = currentMovie ? trailers[currentMovie.id] : null;

  const handleWatchNow = (title: string, year: string) => {
    const justWatchUrl = `https://www.justwatch.com/au/search?q=${encodeURIComponent(title + ' ' + year)}`;
    window.open(justWatchUrl, '_blank');
  };

  const handleMoreInfo = (movieId: number) => {
    console.log('Show more info for movie:', movieId);
    // TODO: Implement details modal
  };

  const handleReplay = () => {
    if (currentTrailerUrl) {
      // Force iframe reload
      const iframe = document.querySelector('.trailer-iframe') as HTMLIFrameElement;
      if (iframe) {
        const currentSrc = iframe.src;
        iframe.src = currentSrc.replace('autoplay=0', 'autoplay=1');
      }
    }
  };

  const handleMute = () => {
    if (currentMovie) {
      setMutedTrailers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(currentMovie.id)) {
          newSet.delete(currentMovie.id);
        } else {
          newSet.add(currentMovie.id);
        }
        return newSet;
      });
    }
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % movies.length);
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + movies.length) % movies.length);
  };

  // Build explanation text
  const buildExplanationText = () => {
    const parts: string[] = [];
    
    if (explanation.topGenres.length > 0) {
      const genreText = explanation.topGenres
        .slice(0, 2)
        .map(g => `${g.name} (${g.count})`)
        .join(" and ");
      parts.push(`you leaned toward ${genreText}`);
    }
    
    if (explanation.topActors.length > 0) {
      const actorText = explanation.topActors
        .slice(0, 2)
        .map(a => `${a.name} (${a.count})`)
        .join(" and ");
      parts.push(`with a soft spot for ${actorText}`);
    }
    
    if (explanation.topDirectors.length > 0) {
      const directorText = explanation.topDirectors
        .slice(0, 1)
        .map(d => `${d.name} (${d.count})`)
        .join("");
      parts.push(`and films by ${directorText}`);
    }
    
    if (explanation.topEra && explanation.topEra.count >= 3) {
      parts.push(`mostly from the ${explanation.topEra.bucket}`);
    }
    
    if (parts.length === 0) {
      return "Based on your 12 picks, you showed varied taste across different genres and styles.";
    }
    
    return `Based on your 12 picks, ${parts.join(", ")}.`;
  };

  const year = currentMovie?.releaseDate ? currentMovie.releaseDate.slice(0, 4) : "";

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Perfect! Your Personalized Trailer Reel</h2>
          <button
            onClick={onReset}
            className="text-xs rounded-full px-3 py-1 bg-white/10 hover:bg-white/20 transition"
            data-testid="button-new-round"
          >
            New Round
          </button>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            {buildExplanationText()} Here are {movies.length} trailers that fit your vibe.
          </p>
        </div>
      </div>

      {/* Trailer navigation */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{currentIndex + 1} / {movies.length}</span>
        <div className="flex gap-2">
          <button
            onClick={goToPrevious}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition"
            data-testid="button-previous-trailer"
          >
            Previous
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition"
            data-testid="button-next-trailer"
          >
            Next
          </button>
        </div>
      </div>

      {/* Current trailer */}
      {currentMovie && (
        <div className="bg-black rounded-xl overflow-hidden">
          <div className="aspect-video">
            {currentTrailerUrl ? (
              <iframe
                className="trailer-iframe w-full h-full"
                src={currentTrailerUrl}
                title={currentMovie.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 mb-4">No trailer available</p>
                  <img
                    src={currentMovie.posterUrl || ""}
                    alt={currentMovie.title}
                    className="w-32 h-48 object-cover rounded mx-auto"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Movie info */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-white mb-2">{currentMovie.title}</h3>
            {currentMovie.overview && (
              <p className="text-sm text-gray-300 mb-4 line-clamp-2">{currentMovie.overview}</p>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {/* Primary actions */}
              <button
                onClick={() => handleWatchNow(currentMovie.title, year)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                data-testid={`button-watch-now-${currentMovie.id}`}
              >
                <Play className="w-4 h-4" />
                Watch now
              </button>
              
              <button
                onClick={() => console.log('Save to watchlist:', currentMovie.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                data-testid={`button-save-${currentMovie.id}`}
              >
                <Heart className="w-4 h-4" />
                Save
              </button>
              
              {/* Utility actions */}
              <button
                onClick={() => handleMoreInfo(currentMovie.id)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                data-testid={`button-more-info-${currentMovie.id}`}
              >
                <Info className="w-4 h-4" />
                More info
              </button>
              
              {currentTrailerUrl && (
                <button
                  onClick={handleReplay}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-replay-${currentMovie.id}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Replay
                </button>
              )}
              
              {currentTrailerUrl && (
                <button
                  onClick={handleMute}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-mute-${currentMovie.id}`}
                >
                  {mutedTrailers.has(currentMovie.id) ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  {mutedTrailers.has(currentMovie.id) ? "Unmute" : "Mute"}
                </button>
              )}
              
              <button
                onClick={goToNext}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                data-testid="button-shuffle-trailers"
              >
                <Shuffle className="w-4 h-4" />
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movie grid for quick selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {movies.map((movie, index) => (
          <button
            key={movie.id}
            onClick={() => setCurrentIndex(index)}
            className={`rounded-lg overflow-hidden transition-all ${
              index === currentIndex 
                ? "ring-2 ring-red-500 shadow-lg scale-105" 
                : "hover:scale-102 hover:shadow-md"
            }`}
            data-testid={`button-select-movie-${movie.id}`}
          >
            <img
              src={movie.posterUrl || ""}
              alt={movie.title}
              className="w-full h-32 object-cover"
            />
            <div className="p-2 bg-gray-800">
              <div className="text-xs font-medium truncate">{movie.title}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}