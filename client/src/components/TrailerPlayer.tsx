import React, { useState, useEffect, useMemo } from 'react';
import { phi } from '@/lib/phi';
import { dot } from '@/lib/taste';

export type Title = {
  id: number;
  title: string;
  year: string;
  genres: number[];
  popularity?: number;
  feature?: number[];
  sources?: string[];
};

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

type TrailerMap = Record<number, string | null>;

type Props = {
  movies: Movie[];
  trailers: TrailerMap;
  onBack?: () => void;
};

function bestImageUrl(t: Title): string | null {
  // Simple fallback for now - in a real app you'd use poster URLs
  return `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${encodeURIComponent(t.title)}`;
}

function cosine(a: number[], b: number[]): number {
  let dotProd = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProd += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  return dotProd / denom;
}

export default function TrailerPlayer({ movies, trailers, onBack }: Props) {
  const [idx, setIdx] = useState(0);

  console.log('[TrailerPlayer] Received movies:', movies.length);
  console.log('[TrailerPlayer] Available trailers:', Object.keys(trailers).length);

  const currentMovie = movies[idx];
  const currentEmbed = currentMovie ? trailers[currentMovie.id] : null;

  const nextItem = () => {
    setIdx(prev => (prev + 1) % movies.length);
  };

  const prevItem = () => {
    setIdx(prev => (prev - 1 + movies.length) % movies.length);
  };

  if (!currentMovie) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <p className="text-gray-400">Loading recommendations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Your Personalized Trailer Reel</h3>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto leading-relaxed">
          Based on your A/B testing choices, here are movies we think you'll love
        </p>
      </div>

      {/* Trailer Player */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {currentEmbed ? (
          <div className="aspect-video">
            <iframe
              src={currentEmbed.includes('youtube.com/embed/') ? currentEmbed : `https://www.youtube.com/embed/${currentEmbed.replace('https://www.youtube.com/watch?v=', '')}`}
              title={`${currentMovie.title} trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <p className="text-white font-semibold">{currentMovie.title}</p>
              <p className="text-gray-400">
                {Object.keys(trailers).length === 0 ? 'Loading trailer...' : 'No trailer available'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="text-center space-y-2">
        <h4 className="text-lg font-semibold text-white">{currentMovie.title}</h4>
        <p className="text-gray-400">
          {currentMovie.year} • {currentMovie.genres?.map(g => typeof g === 'string' ? g : g.name).join(', ')}
        </p>
        <p className="text-sm text-gray-500">{currentMovie.overview}</p>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Back to A/B Testing
          </button>
        )}
        <button
          onClick={prevItem}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={movies.length <= 1}
        >
          Previous
        </button>
        <span className="px-4 py-2 text-gray-400">
          {idx + 1} of {movies.length}
        </span>
        <button
          onClick={nextItem}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          disabled={movies.length <= 1}
        >
          Next
        </button>
      </div>

      {/* Queue Preview */}
      <div className="mt-6">
        <h5 className="text-sm font-semibold text-gray-400 mb-2">Up Next:</h5>
        <div className="flex space-x-2 overflow-x-auto">
          {movies.map((movie, i) => (
            <button
              key={movie.id}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 p-2 rounded text-xs ${
                i === idx ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {movie.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}