
import { useState, useEffect } from "react";
import { Play, Heart, X, Info, SkipForward, Volume2, VolumeX, RotateCcw, Shuffle } from "lucide-react";

interface Movie {
  id: number;
  title: string;
  overview: string;
  releaseDate: string | null;
  voteAverage: number;
  posterUrl: string | null;
  trailerUrl: string | null;
}

interface TrailerResultsProps {
  movies: Movie[];
  onNext: () => void;
}

export default function TrailerResults({ movies, onNext }: TrailerResultsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  if (!movies || movies.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center py-8 text-gray-400">
          No trailers available. Try getting new recommendations.
        </div>
      </div>
    );
  }

  const currentMovie = movies[currentIndex];
  const year = currentMovie.releaseDate ? currentMovie.releaseDate.slice(0, 4) : "";

  const handleNext = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onNext(); // Get new batch of movies
      setCurrentIndex(0);
    }
  };

  const handleWatchNow = (title: string, year: string) => {
    const justWatchUrl = `https://www.justwatch.com/au/search?q=${encodeURIComponent(title + ' ' + year)}`;
    window.open(justWatchUrl, '_blank');
  };

  const handleSave = (movieId: number) => {
    console.log('Save to watchlist:', movieId);
    // TODO: Implement save to watchlist functionality
  };

  const handleNotForMe = (movieId: number) => {
    console.log('Not for me:', movieId);
    handleNext(); // Skip to next trailer
  };

  const handleMoreInfo = (movieId: number) => {
    console.log('Show more info for movie:', movieId);
    // TODO: Implement more info modal
  };

  const handleReplay = () => {
    // Force iframe reload to restart video
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe && currentMovie.trailerUrl) {
      const currentSrc = iframe.src;
      iframe.src = '';
      setTimeout(() => {
        iframe.src = currentSrc.replace('autoplay=0', 'autoplay=1');
      }, 100);
    }
  };

  const handleMute = () => {
    setMuted(!muted);
    // Note: Muting YouTube embedded videos requires postMessage API
    console.log('Mute toggle:', !muted);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Personalized Trailers</h2>
        <div className="text-sm text-gray-400">
          {currentIndex + 1} of {movies.length}
        </div>
      </div>

      {/* Current Trailer */}
      <div className="bg-gray-900 rounded-xl overflow-hidden mb-6">
        {/* YouTube Player */}
        {currentMovie.trailerUrl ? (
          <div className="aspect-video">
            <iframe
              className="w-full h-full"
              src={`${currentMovie.trailerUrl}?autoplay=1&rel=0&modestbranding=1`}
              title={`${currentMovie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video bg-gray-800 flex items-center justify-center">
            <div className="text-gray-400">No trailer available</div>
          </div>
        )}
        
        {/* Movie Info */}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">{currentMovie.title}</h3>
          {year && (
            <p className="text-gray-400 mb-3">{year}</p>
          )}
          {currentMovie.overview && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-3">{currentMovie.overview}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>⭐ {currentMovie.voteAverage?.toFixed(1) || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Primary actions */}
        <button
          onClick={() => handleWatchNow(currentMovie.title, year)}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
          data-testid={`button-watch-now-${currentMovie.id}`}
        >
          <Play className="w-4 h-4" />
          Watch now
        </button>
        
        <button
          onClick={() => handleSave(currentMovie.id)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
          data-testid={`button-save-${currentMovie.id}`}
        >
          <Heart className="w-4 h-4" />
          Save
        </button>
        
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          data-testid="button-next-trailer"
        >
          <SkipForward className="w-4 h-4" />
          Next
        </button>
        
        {/* Secondary actions */}
        <button
          onClick={() => handleNotForMe(currentMovie.id)}
          className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          data-testid={`button-not-for-me-${currentMovie.id}`}
        >
          <X className="w-4 h-4" />
          Not for me
        </button>
        
        <button
          onClick={() => handleMoreInfo(currentMovie.id)}
          className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          data-testid={`button-more-info-${currentMovie.id}`}
        >
          <Info className="w-4 h-4" />
          More info
        </button>
        
        {currentMovie.trailerUrl && (
          <button
            onClick={handleReplay}
            className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            data-testid={`button-replay-${currentMovie.id}`}
          >
            <RotateCcw className="w-4 h-4" />
            Replay
          </button>
        )}
        
        {currentMovie.trailerUrl && (
          <button
            onClick={handleMute}
            className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            data-testid={`button-mute-${currentMovie.id}`}
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            {muted ? "Unmute" : "Mute"}
          </button>
        )}
        
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
          data-testid="button-shuffle-trailers"
        >
          <Shuffle className="w-4 h-4" />
          Shuffle 6
        </button>
      </div>
    </div>
  );
}
