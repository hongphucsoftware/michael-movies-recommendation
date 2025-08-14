import { Movie } from "@/types/movie";
import { Star, Play, Trash2, Bookmark } from "lucide-react";

interface WatchlistSectionProps {
  watchlist: Movie[];
  onRemoveFromWatchlist: (movieId: string) => void;
  onPlayTrailer: (movie: Movie) => void;
}

export default function WatchlistSection({
  watchlist,
  onRemoveFromWatchlist,
  onPlayTrailer
}: WatchlistSectionProps) {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12" id="watchlist">
      <div className="glass-card p-8 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Watchlist</h2>
            <p className="text-gray-400">Movies and shows you've saved for later</p>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <span className="bg-netflix-red text-white px-4 py-2 rounded-lg font-semibold">
              {watchlist.length} items
            </span>
          </div>
        </div>

        {/* Watchlist Items */}
        {watchlist.length > 0 ? (
          <div className="space-y-4 custom-scrollbar max-h-96 overflow-y-auto">
            {watchlist.map((movie) => (
              <div 
                key={movie.id}
                className="flex items-center justify-between p-4 bg-netflix-dark rounded-xl border border-gray-700 hover:border-netflix-red transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <img 
                    src={movie.poster} 
                    alt={`${movie.name} poster`} 
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div>
                    <h3 className="font-semibold text-white">{movie.name}</h3>
                    <p className="text-sm text-gray-400">
                      {movie.year} • {movie.isSeries ? 'Series' : 'Film'}
                    </p>
                    <div className="flex items-center mt-1">
                      <Star className="text-yellow-400 text-xs mr-1" size={12} fill="currentColor" />
                      <span className="text-xs text-gray-400">{movie.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="glass-card p-2 rounded hover:bg-netflix-red transition-colors" 
                    onClick={() => onPlayTrailer(movie)}
                    data-testid={`button-play-${movie.id}`}
                  >
                    <Play className="text-sm" size={14} fill="currentColor" />
                  </button>
                  <button 
                    className="glass-card p-2 rounded hover:bg-red-600 transition-colors"
                    onClick={() => onRemoveFromWatchlist(movie.id)}
                    data-testid={`button-remove-${movie.id}`}
                  >
                    <Trash2 className="text-sm" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <Bookmark className="text-4xl text-gray-600 mb-4 mx-auto" size={64} />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">Your watchlist is empty</h3>
            <p className="text-gray-500">Start discovering trailers to build your collection!</p>
          </div>
        )}
      </div>
    </section>
  );
}
