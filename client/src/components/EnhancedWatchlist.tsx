import React from "react";
import { Movie } from "@/types/movie";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ExternalLink } from "lucide-react";

interface EnhancedWatchlistProps {
  watchlistMovies: Movie[];
  onRemoveFromWatchlist: (movieId: string) => void;
}

export function EnhancedWatchlist({ watchlistMovies, onRemoveFromWatchlist }: EnhancedWatchlistProps) {
  if (watchlistMovies.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Your Watchlist is Empty</h3>
          <p className="text-muted-foreground">
            Save trailers you want to watch later by clicking the "Save" button while browsing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Watchlist</h2>
        <Badge variant="secondary">{watchlistMovies.length} saved</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {watchlistMovies.map((movie) => (
          <Card key={movie.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="aspect-video relative">
              <img
                src={movie.poster}
                alt={`${movie.name} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Button
                  size="sm"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${movie.youtube}`, '_blank')}
                  data-testid={`button-watch-${movie.id}`}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Watch Trailer
                </Button>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold line-clamp-1" title={movie.name}>
                    {movie.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {movie.isSeries ? "Series" : "Film"} • {movie.year}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {movie.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {movie.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{movie.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${movie.youtube}`, '_blank')}
                    className="flex-1"
                    data-testid={`link-youtube-${movie.id}`}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    YouTube
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveFromWatchlist(movie.id)}
                    data-testid={`button-remove-${movie.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}