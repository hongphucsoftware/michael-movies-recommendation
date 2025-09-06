// UI LOCK: DO NOT MODIFY — controlled layout for A/B testing
// Replit Agent: This component must render TWO posters per round,
// randomise their left/right position, and call like()/skip() on click.

import React, { useState } from "react";
import RobustImage from "./RobustImage";

type Movie = {
  id: number;
  title: string;
  year?: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  sourceListId?: string;
};

interface PosterPairProps {
  movieA: Movie;
  movieB: Movie;
  onChoice: (winner: Movie, loser: Movie) => void;
}

export default function PosterPair({ movieA, movieB, onChoice }: PosterPairProps) {
  const handleChoice = (winner: Movie, loser: Movie) => {
    // Record vote to server
    fetch('/api/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': localStorage.getItem('paf.sid') || '',
      },
      body: JSON.stringify({
        winnerId: winner.id,
        loserId: loser.id,
      }),
    }).catch(error => {
      console.error('[A/B VOTE] Failed to record vote:', error);
    });

    onChoice(winner, loser);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left Poster */}
      <div 
        className="poster-card group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-netflix-red/25" 
        onClick={() => handleChoice(movieA, movieB)}
        data-testid="poster-left"
      >
        <div className="gradient-border relative overflow-hidden">
          <div className="p-6 relative">
            <RobustImage 
              src={movieA.posterUrl || ''} 
              alt={`${movieA.title} poster`} 
              className="w-full h-96 object-cover rounded-xl mb-4 shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:brightness-125"
            />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-electric-blue transition-colors">
                {movieA.title}
              </h3>
              {movieA.year && (
                <p className="text-gray-400 text-sm">{movieA.year}</p>
              )}
              {movieA.genres && movieA.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movieA.genres.slice(0, 3).map((genre, idx) => (
                    <span key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {typeof genre === 'string' ? genre : genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Poster */}
      <div 
        className="poster-card group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-electric-blue/25" 
        onClick={() => handleChoice(movieB, movieA)}
        data-testid="poster-right"
      >
        <div className="gradient-border relative overflow-hidden">
          <div className="p-6 relative">
            <RobustImage 
              src={movieB.posterUrl || ''} 
              alt={`${movieB.title} poster`} 
              className="w-full h-96 object-cover rounded-xl mb-4 shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:brightness-125"
            />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-electric-blue transition-colors">
                {movieB.title}
              </h3>
              {movieB.year && (
                <p className="text-gray-400 text-sm">{movieB.year}</p>
              )}
              {movieB.genres && movieB.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movieB.genres.slice(0, 3).map((genre, idx) => (
                    <span key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {typeof genre === 'string' ? genre : genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }

  async function doRebuild() {
    try { 
      setRebuilding(true); 
      await fetch("/api/catalogue/build", { method: "POST" }); 
      window.location.reload(); 
    } finally { 
      setRebuilding(false); 
    }
  }

  function hardReset() { 
    resetLearning(); 
    resetAB(); 
    reset(); 
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Progress + controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm sm:text-base font-medium">Learning Progress</div>
        <div className="text-xs sm:text-sm opacity-80 font-mono">{progress.current} / {progress.total}</div>
      </div>
      <div className="w-full h-2 sm:h-3 rounded-full bg-gray-800 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
        />
      </div>

      {/* The A/B cards */}
      {!done && pair && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <button
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition-all duration-200 active:scale-[0.98]"
            onClick={() => pick("left")}
          >
            <img
              src={bestImageUrl(pair.left as any) || ""}
              alt={(pair.left as any).title}
              className="w-full h-[400px] sm:h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 sm:p-4 text-center">
              <div className="font-medium text-sm sm:text-base">{(pair.left as any).title}</div>
              <div className="text-xs opacity-70 mt-1">{(pair.left as any).releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>

          <button
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition-all duration-200 active:scale-[0.98]"
            onClick={() => pick("right")}
          >
            <img
              src={bestImageUrl(pair.right as any) || ""}
              alt={(pair.right as any).title}
              className="w-full h-[400px] sm:h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 sm:p-4 text-center">
              <div className="font-medium text-sm sm:text-base">{(pair.right as any).title}</div>
              <div className="text-xs opacity-70 mt-1">{(pair.right as any).releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>
        </div>
      )}

      {/* When the deck is done, reveal the Trailer Reel */}
      {done && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-center sm:text-left">
              Perfect! Your personalised Trailer Reel
            </h2>
            <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start">
              <button
                onClick={() => reset()}
                className="text-xs sm:text-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 transition-colors"
                title="New round with fresh A/B pairs"
              >
                New Round
              </button>
              <button
                onClick={hardReset}
                className="text-xs sm:text-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500/20 hover:bg-red-500/30 transition-colors"
                title="Reset all learned preferences and A/B history"
              >
                Reset All
              </button>
            </div>
          </div>

          <TrailerPlayer items={items} learnedVec={learned} recentChosenIds={[...chosenIds, ...seenIds]} avoidIds={seenIds} count={5} />
        </div>
      )}
    </div>
  );
}