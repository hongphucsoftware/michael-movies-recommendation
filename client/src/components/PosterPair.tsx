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
  // Null guard for loading states
  if (!movieA || !movieB) {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-6">
          <div className="w-full h-96 bg-zinc-900 animate-pulse rounded-xl mb-4" />
          <div className="w-32 h-4 bg-zinc-800 animate-pulse rounded mb-2" />
          <div className="w-16 h-3 bg-zinc-800 animate-pulse rounded" />
        </div>
        <div className="p-6">
          <div className="w-full h-96 bg-zinc-900 animate-pulse rounded-xl mb-4" />
          <div className="w-32 h-4 bg-zinc-800 animate-pulse rounded mb-2" />
          <div className="w-16 h-3 bg-zinc-800 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  // Generate fallback poster URLs
  const fallbackA = `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${encodeURIComponent(movieA.title)}`;
  const fallbackB = `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${encodeURIComponent(movieB.title)}`;
  
  const posterA = movieA.posterUrl || fallbackA;
  const posterB = movieB.posterUrl || fallbackB;

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
              src={posterA} 
              alt={`${movieA.title} poster`} 
              className="w-full h-96 object-cover rounded-xl mb-4 shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:brightness-125"
            />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-electric-blue transition-colors">
                {movieA?.title || 'Loading...'}
              </h3>
              {movieA?.year && (
                <p className="text-gray-400 text-sm">{movieA.year}</p>
              )}
              {movieA?.genres && movieA.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movieA?.genres?.slice(0, 3).map((genre, idx) => (
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
              src={posterB} 
              alt={`${movieB.title} poster`} 
              className="w-full h-96 object-cover rounded-xl mb-4 shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:brightness-125"
            />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-electric-blue transition-colors">
                {movieB?.title || 'Loading...'}
              </h3>
              {movieB?.year && (
                <p className="text-gray-400 text-sm">{movieB.year}</p>
              )}
              {movieB?.genres && movieB.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {movieB?.genres?.slice(0, 3).map((genre, idx) => (
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