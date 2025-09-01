import React, { useState, useEffect, useCallback } from "react";
import { Movie } from "@/types/movie";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, EyeOff, SkipForward, Shuffle } from "lucide-react";

// Diversity helper functions for MMR-style variety
const dot = (a: number[], b: number[]) => a.reduce((s,v,i)=> s + (v||0)*(b[i]||0), 0);
const norm = (a: number[]) => Math.sqrt(dot(a,a)) || 1;
const cosine = (a: number[], b: number[]) => dot(a,b) / (norm(a)*norm(b));

interface EnhancedTrailerWheelProps {
  movies: Movie[];
  preferences: {
    w: number[];
    explored: Set<string>;
  };
  onSave: (movieId: string) => void;
  onHide: (movieId: string) => void;
  onMarkRecent: (movieId: string) => void;
  getAvailableMovies: () => Movie[];
  explorationRate: number;
  onExplorationChange: (rate: number) => void;
}

export function EnhancedTrailerWheelSection({
  movies,
  preferences,
  onSave,
  onHide,
  onMarkRecent,
  getAvailableMovies,
  explorationRate,
  onExplorationChange
}: EnhancedTrailerWheelProps) {
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [queue, setQueue] = useState<Movie[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recentHistory, setRecentHistory] = useState<Movie[]>([]); // Track recent for diversity

  // ML scoring functions
  const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

  // Calculate novelty bonus
  const calculateNovelty = useCallback((movie: Movie) => {
    const notSeen = preferences.explored.has(movie.id) ? 0 : 0.08;
    const shortBonus = movie.isSeries && movie.tags.includes("Comedy") ? 0.05 : 0;
    return notSeen + shortBonus;
  }, [preferences.explored]);

  // Score and rank movies with MMR-style diversity
  const rankMovies = useCallback(() => {
    const available = getAvailableMovies();
    if (available.length === 0) return [];

    // MMR-style diversity scoring to prevent repetitive recommendations
    // Mean vector of last few shown, to diversify against
    let recentVec: number[] | null = null;
    if (recentHistory.length > 0) {
      const d = recentHistory[0].features.length;
      const sum = new Array(d).fill(0);
      recentHistory.forEach(m => m.features.forEach((v,i)=> sum[i] += (v||0)));
      recentVec = sum.map(v => v / recentHistory.length);
    }

    const LAMBDA = 0.25; // diversity strength to avoid repetitive crime/drama loops

    const scored = available.map(movie => {
      const base = sigmoid(dotProduct(preferences.w, movie.features));
      const nov  = calculateNovelty(movie);
      // Era bonus to promote 2020+ movies - critical fix for variety
      const eraBonus = (movie.features[11] > 0.5) ? 0.3 : 0; // slot 11 = recent era
      // Diversity penalty to avoid same-genre clustering
      const div  = recentVec ? -LAMBDA * Math.max(0, cosine(movie.features, recentVec)) : 0;
      return { movie, score: base + nov + eraBonus + div };
    });

    scored.sort((a,b) => b.score - a.score);

    // High exploration to ensure variety (much higher than default)
    const highExploration = Math.max(0.5, explorationRate);
    if (Math.random() < highExploration && scored.length > 6) {
      const k = 3 + Math.floor(Math.random() * Math.min(12, scored.length - 1));
      [scored[0], scored[k]] = [scored[k], scored[0]];
    }

    console.log(`Trailer queue: ${scored.slice(0,5).map(s => `${s.movie.name} (${s.movie.year}) [${s.movie.category}]`).join(', ')}`);
    console.log(`Queue breakdown: ${scored.filter(s => s.movie.category === 'classic').length} classics, ${scored.filter(s => s.movie.category === 'recent').length} recent (2020+)`);
    return scored.map(s => s.movie);
  }, [getAvailableMovies, preferences.w, calculateNovelty, explorationRate, recentHistory]);

  // Initialize and update queue
  useEffect(() => {
    const newQueue = rankMovies();
    setQueue(newQueue);
    if (!currentMovie && newQueue.length > 0) {
      setCurrentMovie(newQueue[0]);
    }
  }, [movies, preferences, rankMovies, currentMovie]);

  // Show next trailer
  const showNext = useCallback((options: { save?: boolean; hide?: boolean; skip?: boolean } = {}) => {
    if (!currentMovie) return;

    // Handle the current movie based on action
    if (options.save) {
      onSave(currentMovie.id);
    }
    if (options.hide) {
      onHide(currentMovie.id);
    }
    
    // Mark as recent (for skip and normal next)
    onMarkRecent(currentMovie.id);
    
    // Track for diversity - keep minimal history for variety  
    setRecentHistory(prev => [currentMovie, ...prev].slice(0, 4)); // keep last 4 for better diversity tracking

    // Get next movie
    let nextQueue = [...queue];
    nextQueue.shift(); // Remove current movie

    // If skip, add current movie to back of queue (but still mark as recent)
    if (options.skip && !options.hide) {
      nextQueue.push(currentMovie);
    }

    // If queue is empty, regenerate
    if (nextQueue.length === 0) {
      nextQueue = rankMovies();
    }

    setQueue(nextQueue);
    setCurrentMovie(nextQueue[0] || null);
  }, [currentMovie, queue, onSave, onHide, onMarkRecent, rankMovies]);

  // Surprise me (increase exploration temporarily)
  const surpriseMe = useCallback(() => {
    const originalRate = explorationRate;
    onExplorationChange(Math.min(0.45, explorationRate + 0.1));
    
    // Regenerate queue with higher exploration
    const newQueue = rankMovies();
    setQueue(newQueue);
    setCurrentMovie(newQueue[0] || null);
    
    // Restore original exploration rate after 800ms
    setTimeout(() => {
      onExplorationChange(originalRate);
    }, 800);
  }, [explorationRate, onExplorationChange, rankMovies]);

  // Get exploration label
  const getExplorationLabel = () => {
    if (explorationRate <= 0.06) return "Adventurous: Tame";
    if (explorationRate <= 0.16) return "Adventurous: Balanced";
    return "Adventurous: Wild";
  };

  if (!currentMovie) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">No More Trailers</h2>
        <p className="text-muted-foreground mb-4">
          All available trailers have been explored. Try adjusting your exploration settings or reset your progress.
        </p>
        <Button onClick={() => onExplorationChange(0.3)} variant="outline">
          Increase Exploration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trailer Player */}
      <div className="relative">
        <div className="aspect-video w-full bg-black rounded-xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${currentMovie.youtube}?autoplay=1&rel=0`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            data-testid="trailer-player"
          />
        </div>
        
        {/* Movie Info */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">{currentMovie.name}</h3>
              <p className="text-muted-foreground">
                {currentMovie.isSeries ? "Series" : "Film"} • {currentMovie.year}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{getExplorationLabel()}</Badge>
              <Badge variant="secondary">Queue: {queue.length}</Badge>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {currentMovie.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center p-6 bg-black/20 rounded-xl border border-gray-800">
        <Button
          onClick={() => showNext({ hide: true })}
          variant="destructive"
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 shadow-lg"
          data-testid="button-hide"
        >
          <EyeOff className="w-5 h-5 mr-2" />
          Hide
        </Button>
        
        <Button
          onClick={() => showNext({ skip: true })}
          size="lg"
          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 shadow-lg border border-gray-600"
          data-testid="button-skip"
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Skip
        </Button>
        
        <Button
          onClick={() => showNext({ save: true })}
          size="lg"
          className="bg-netflix-red hover:bg-red-700 text-white font-semibold px-6 py-3 shadow-lg"
          data-testid="button-save"
        >
          <Heart className="w-5 h-5 mr-2" />
          Save
        </Button>
        
        <Button
          onClick={() => showNext()}
          size="lg"
          className="bg-electric-blue hover:bg-blue-600 text-white font-semibold px-6 py-3 shadow-lg"
          data-testid="button-next"
        >
          <SkipForward className="w-5 h-5 mr-2" />
          Skip
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        <Button
          onClick={surpriseMe}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 shadow"
          data-testid="button-surprise"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Surprise Me
        </Button>
        
        <Button
          onClick={() => onExplorationChange(Math.max(0.02, explorationRate - 0.05))}
          variant="outline"
          size="sm"
          className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
        >
          − Less Wild
        </Button>
        
        <Button
          onClick={() => onExplorationChange(Math.min(0.35, explorationRate + 0.05))}
          variant="outline"
          size="sm"
          className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
        >
          + More Wild
        </Button>
      </div>
    </div>
  );
}