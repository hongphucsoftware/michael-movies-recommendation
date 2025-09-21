import { useState } from "react";
import { Movie } from "@/types/movie";
import { Star, Clock, Plus, ThumbsDown, ThumbsUp, ArrowRight, Shuffle, RotateCcw } from "lucide-react";

interface TrailerWheelSectionProps {
  queue: Movie[];
  onAddToWatchlist: (movieId: string) => void;
  onHideMovie: (movieId: string) => void;
  onNextTrailer: () => void;
  onSurpriseMe: () => void;
  onReset: () => void;
}

export default function TrailerWheelSection({
  queue,
  onAddToWatchlist,
  onHideMovie,
  onNextTrailer,
  onSurpriseMe,
  onReset
}: TrailerWheelSectionProps) {
  const [currentTrailerIndex, setCurrentTrailerIndex] = useState(0);
  
  if (queue.length === 0) {
    return (
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        <div className="text-center py-12">
          <h2 className="text-4xl font-bold mb-4">Loading your recommendations...</h2>
        </div>
      </section>
    );
  }

  const currentMovie = queue[currentTrailerIndex];

  const handleNext = () => {
    if (currentTrailerIndex < queue.length - 1) {
      setCurrentTrailerIndex(prev => prev + 1);
    } else {
      onNextTrailer();
      setCurrentTrailerIndex(0);
    }
  };

  const handleLike = () => {
    onAddToWatchlist(currentMovie.id);
    handleNext();
  };

  const handleDislike = () => {
    onHideMovie(currentMovie.id);
    handleNext();
  };

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12" id="trailerWheel">
      {/* Section Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Your Personal <span className="text-gradient">Trailer Wheel</span>
        </h2>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Based on your choices, we've curated trailers that match your taste. Like what you see? Add it to your watchlist!
        </p>
      </div>

      {/* Trailer Player */}
      <div className="trailer-container mb-8">
        <div className="bg-netflix-dark rounded-2xl p-6">
          {/* YouTube Player */}
          <div className="relative bg-black rounded-xl overflow-hidden mb-6">
            <iframe
              src={`https://www.youtube.com/embed/${currentMovie.yt}?autoplay=1&rel=0`}
              title={`${currentMovie.name} trailer`}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              data-testid="youtube-player"
            />
          </div>

          {/* Trailer Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{currentMovie.name}</h3>
              <p className="text-gray-400 mb-3">
                {currentMovie.year} • {currentMovie.isSeries ? 'Series' : 'Film'}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {currentMovie.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="bg-netflix-red/20 text-netflix-red px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Star className="text-yellow-400 mr-1" size={16} fill="currentColor" />
                <span>{currentMovie.rating}</span>
                <span className="mx-2">•</span>
                <Clock className="mr-1" size={16} />
                <span>{currentMovie.duration}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button 
                className="bg-netflix-red hover:bg-netflix-red/80 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
                onClick={handleLike}
                data-testid="button-add-watchlist"
              >
                <Plus className="mr-2" size={16} />
                Add to Watchlist
              </button>
              <button 
                className="glass-card hover:bg-red-600 px-4 py-3 rounded-lg transition-colors"
                onClick={handleDislike}
                title="I dislike this"
                data-testid="button-dislike"
              >
                <ThumbsDown size={16} />
              </button>
              <button 
                className="glass-card hover:bg-green-600 px-4 py-3 rounded-lg transition-colors"
                title="I like this"
                data-testid="button-like"
              >
                <ThumbsUp size={16} />
              </button>
              <button 
                className="bg-electric-blue hover:bg-electric-blue/80 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
                onClick={handleNext}
                data-testid="button-next-trailer"
              >
                <span className="mr-2">Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <button 
          className="glass-card px-8 py-4 rounded-xl hover:bg-purple-600 transition-colors flex items-center text-lg"
          onClick={onSurpriseMe}
          data-testid="button-surprise-me"
        >
          <Shuffle className="mr-3 text-xl" size={20} />
          <span className="font-semibold">Surprise Me!</span>
        </button>
        <button 
          className="glass-card px-6 py-4 rounded-xl hover:bg-gray-600 transition-colors flex items-center"
          onClick={onReset}
          data-testid="button-reset"
        >
          <RotateCcw className="mr-2" size={16} />
          Reset Learning
        </button>
      </div>
    </section>
  );
}
