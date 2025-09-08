import { useMemo, useState, useEffect } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector } from "../hooks/useEnhancedCatalogue";
import { Play, SkipForward, Heart, X, Info, RotateCcw, Volume2, VolumeX, Shuffle, ChevronLeft, ChevronRight } from "lucide-react";

// cosine + MMR reimplemented locally for independence
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

function mmrPick(pool: Title[], userVec: number[], k = 15, lambda = 0.7): Title[] {
  const chosen: Title[] = [];
  const remaining = pool.map(t => ({...t, feature: t.feature || toFeatureVector(t)}));
  while (chosen.length < k && remaining.length) {
    let best: { item: Title; score: number } | null = null;
    for (const item of remaining) {
      const f = item.feature!;
      const rel = cosine(f, userVec);
      const div = chosen.length === 0 ? 0 : Math.max(...chosen.map(c => cosine(f, c.feature || toFeatureVector(c))));
      const score = lambda * rel - (1 - lambda) * div;
      if (!best || score > best.score) best = { item, score };
    }
    if (!best) break;
    chosen.push(best.item);
    const idx = remaining.findIndex(r => r.id === best!.item.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }
  return chosen;
}

type TrailerData = {
  id: number;
  title: string;
  year: string;
  youtubeKey: string | null;
  embedUrl: string | null;
};

type Props = {
  items: Title[];
  learnedVec: number[];
  onSave?: (movieId: number) => void;
  onSkip?: (movieId: number) => void;
};

export default function TrailerReel({ items, learnedVec, onSave, onSkip }: Props) {
  const [currentSet, setCurrentSet] = useState(0);
  const [trailerData, setTrailerData] = useState<TrailerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutedTrailers, setMutedTrailers] = useState<Set<number>>(new Set());
  const [hiddenTrailers, setHiddenTrailers] = useState<Set<number>>(new Set());

  const picks = useMemo(() => mmrPick(items, learnedVec, 15), [items, learnedVec]);
  
  // Fetch trailer data for current picks
  useEffect(() => {
    let cancelled = false;
    
    const fetchTrailerData = async () => {
      setLoading(true);
      const trailers: TrailerData[] = [];
      
      for (const movie of picks) {
        try {
          const res = await fetch(`/api/trailer?id=${movie.id}`);
          const json = await res.json();
          const trailer = json.trailer;
          
          const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "";
          
          if (trailer?.site === "YouTube") {
            trailers.push({
              id: movie.id,
              title: movie.title,
              year,
              youtubeKey: trailer.key,
              embedUrl: `https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1&autoplay=0`
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch trailer for ${movie.title}:`, error);
        }
      }
      
      if (!cancelled) {
        setTrailerData(trailers);
        setLoading(false);
      }
    };
    
    if (picks.length > 0) {
      fetchTrailerData();
    }
    
    return () => { cancelled = true; };
  }, [picks]);

  // Get current 5 trailers
  const filteredTrailers = trailerData.filter(t => !hiddenTrailers.has(t.id));
  const visibleTrailers = filteredTrailers.slice(currentSet * 5, (currentSet + 1) * 5);
  
  const totalSets = Math.ceil(filteredTrailers.length / 5);
  const currentTrailerIndex = (currentSet * 5) + 1;
  const currentTrailerTotal = Math.min((currentSet + 1) * 5, filteredTrailers.length);

  // Action handlers
  const handleSkip = (id: number) => {
    onSkip?.(id);
    setHiddenTrailers(prev => new Set([...Array.from(prev), id]));
  };

  const handleSelect = (id: number, title: string, year: string) => {
    const justWatchUrl = `https://www.justwatch.com/au/search?q=${encodeURIComponent(title + ' ' + year)}`;
    window.open(justWatchUrl, '_blank');
  };

  const handleSave = (id: number) => {
    onSave?.(id);
    // Visual feedback could be added here
  };

  const handleHide = (id: number) => {
    setHiddenTrailers(prev => new Set([...Array.from(prev), id]));
  };

  const handleMoreInfo = (id: number) => {
    // TODO: Implement details modal
    console.log('Show more info for movie:', id);
  };

  const handleReplay = (youtubeKey: string) => {
    // Force iframe reload by changing src
    const iframe = document.querySelector(`iframe[src*="${youtubeKey}"]`) as HTMLIFrameElement;
    if (iframe) {
      const currentSrc = iframe.src;
      iframe.src = currentSrc.replace('autoplay=0', 'autoplay=1');
    }
  };

  const handleMute = (id: number) => {
    setMutedTrailers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleShuffle = () => {
    // Move to next set or wrap around
    const nextSet = (currentSet + 1) % totalSets;
    setCurrentSet(nextSet);
  };

  const goToPrevious = () => {
    setCurrentSet(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentSet(prev => Math.min(totalSets - 1, prev + 1));
  };

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-3">Your Trailer Reel</h2>
        <div className="text-center py-8 text-gray-400">
          Loading personalized trailers...
        </div>
      </div>
    );
  }

  if (visibleTrailers.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-3">Your Trailer Reel</h2>
        <div className="text-center py-8 text-gray-400">
          No trailers available. Try refreshing your recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Trailer Reel</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {currentTrailerIndex} / {currentTrailerTotal}
          </span>
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              disabled={currentSet === 0}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-previous-trailer-set"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentSet === totalSets - 1}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-next-trailer-set"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Single trailer display */}
      {visibleTrailers.length > 0 && (
        <div className="mb-6">
          <div className="bg-black rounded-xl overflow-hidden">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src={visibleTrailers[0].embedUrl || ""}
                title={visibleTrailers[0].title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            
            {/* Movie title */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white">{visibleTrailers[0].title}</h3>
            </div>
            
            {/* Action buttons */}
            <div className="p-4 pt-0">
              <div className="flex flex-wrap gap-2">
                {/* Primary buttons */}
                <button
                  onClick={() => handleSkip(visibleTrailers[0].id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-skip-${visibleTrailers[0].id}`}
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
                
                <button
                  onClick={() => handleSelect(visibleTrailers[0].id, visibleTrailers[0].title, visibleTrailers[0].year)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-watch-now-${visibleTrailers[0].id}`}
                >
                  <Play className="w-4 h-4" />
                  Watch now
                </button>
                
                {/* Secondary buttons */}
                <button
                  onClick={() => handleSave(visibleTrailers[0].id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-save-${visibleTrailers[0].id}`}
                >
                  <Heart className="w-4 h-4" />
                  Save
                </button>
                
                <button
                  onClick={() => handleHide(visibleTrailers[0].id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-hide-${visibleTrailers[0].id}`}
                >
                  <X className="w-4 h-4" />
                  Not for me
                </button>
                
                {/* Utility buttons */}
                <button
                  onClick={() => handleMoreInfo(visibleTrailers[0].id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-more-info-${visibleTrailers[0].id}`}
                >
                  <Info className="w-4 h-4" />
                  More info
                </button>
                
                <button
                  onClick={() => handleReplay(visibleTrailers[0].youtubeKey || "")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-replay-${visibleTrailers[0].id}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Replay
                </button>
                
                <button
                  onClick={() => handleMute(visibleTrailers[0].id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  data-testid={`button-mute-${visibleTrailers[0].id}`}
                >
                  {mutedTrailers.has(visibleTrailers[0].id) ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  {mutedTrailers.has(visibleTrailers[0].id) ? "Unmute" : "Mute"}
                </button>
                
                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                  data-testid="button-shuffle-trailers"
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle 6
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}