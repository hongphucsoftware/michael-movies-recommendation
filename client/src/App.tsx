// UI LOCK: DO NOT MODIFY — controlled layout for A/B testing
// Replit Agent, please read:
// This file intentionally renders the Quick-Pick (A/B) flow followed by the Trailer Reel.
// It is part of a locked UX experiment. Do not restructure routes or replace this component.

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import PosterPair from "./components/PosterPair";
import DataBanner from "./components/DataBanner";
import TrailerPlayer from './components/TrailerPlayer';

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

function ensureSessionId() {
  const key = "paf.sid";
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, crypto.randomUUID());
  }
}

async function fetchWithSession(url: string) {
  return fetch(url, {
    headers: { 
      "x-session-id": localStorage.getItem("paf.sid") || "",
      "cache-control": "no-cache"
    },
  });
}

// Convert server movie format to client Movie format
function convertServerMovie(serverMovie: any): Movie {
  return {
    id: serverMovie.id, // Keep numeric ID
    title: serverMovie.title || "Unknown",
    year: serverMovie.year || 2024,
    posterUrl: serverMovie.posterUrl || `https://via.placeholder.com/500x750/1a1a1a/ffffff?text=${encodeURIComponent(serverMovie.title || 'Unknown')}`,
    backdropUrl: serverMovie.backdropUrl || "",
    overview: serverMovie.overview || "",
    genres: (serverMovie.genres || []).slice(0, 3),
    sourceListId: serverMovie.sourceListId,
  };
}

export default function App() {
  const [posters, setPosters] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [trailers, setTrailers] = useState<TrailerMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [showTrailers, setShowTrailers] = useState(false);
  const [abTestingComplete, setAbTestingComplete] = useState(false);

  useEffect(() => {
    ensureSessionId();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[APP] Loading catalogue from server...');
      // Get poster movies (75 total: 15 per list)
      const posterRes = await fetchWithSession(`/api/catalogue?t=${Date.now()}`);
      const posterData = await posterRes.json();

      if (!posterData.ok || !Array.isArray(posterData.items)) {
        throw new Error('Failed to load poster catalogue');
      }

      console.log(`[APP] Loaded ${posterData.items.length} poster movies`);
      // Convert server format to client format
      const movies = posterData.items.map(convertServerMovie);
      setPosters(movies);

      // Get recommendations (random 6 from remaining pool)
      console.log('[APP] Loading recommendations...');
      const recRes = await fetchWithSession(`/api/recs?limit=6&t=${Date.now()}`);
      const recData = await recRes.json();

      if (!recData.ok || !Array.isArray(recData.recs)) {
        throw new Error('Failed to load recommendations');
      }

      console.log(`[APP] Loaded ${recData.recs.length} recommendations from pool of ${recData.total}`);
      setRecommendations(recData.recs);

      // Get trailers for recommendations
      if (recData.recs.length > 0) {
        console.log('[APP] Loading trailers...');
        const ids = recData.recs.map((m: Movie) => m.id);
        const trailerRes = await fetchWithSession(`/api/trailers?ids=${ids.join(',')}&t=${Date.now()}`);
        const trailerData = await trailerRes.json();

        if (trailerData.ok && trailerData.trailers) {
          console.log(`[APP] Loaded trailers:`, Object.keys(trailerData.trailers).length);
          setTrailers(trailerData.trailers);
        }
      }

    } catch (err) {
      console.error('[APP] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePosterChoice = (winner: Movie, loser: Movie) => {
    console.log(`[APP] Choice: "${winner.title}" beat "${loser.title}"`);

    // Move to next pair
    if (currentPairIndex < Math.floor(posters.length / 2) - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      // A/B testing complete, show trailers
      console.log('[APP] A/B testing complete, showing trailers');
      setAbTestingComplete(true);
      setShowTrailers(true);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen text-gray-100 bg-black">
        <header className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-extrabold tracking-tight">PickaFlick</h1>
          <p className="text-sm opacity-80 mt-1">
            Quick Picks → we learn your taste → then a personalised Trailer Reel.
          </p>
          <DataBanner />
        </header>
        <main className="max-w-6xl mx-auto p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold mb-4">Loading Movies...</h2>
            <p className="text-gray-300">Building your personalized catalogue</p>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen text-gray-100 bg-black">
        <header className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-extrabold tracking-tight">PickaFlick</h1>
          <p className="text-sm opacity-80 mt-1">
            Quick Picks → we learn your taste → then a personalised Trailer Reel.
          </p>
          <DataBanner />
        </header>
        <main className="max-w-6xl mx-auto p-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-2xl font-bold mb-4">Loading Failed</h2>
            <p className="text-gray-300 mb-8">{error}</p>
            <button 
              onClick={loadData}
              className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Show trailers if A/B testing is complete
  if (showTrailers && recommendations.length > 0) {
    return (
      <div className="min-h-screen text-gray-100 bg-black">
        <header className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-extrabold tracking-tight">PickaFlick</h1>
          <p className="text-sm opacity-80 mt-1">
            Your personalized trailer reel is ready!
          </p>
          <DataBanner />
        </header>
        <main className="max-w-6xl mx-auto p-6">
          <TrailerPlayer 
            movies={recommendations} 
            trailers={trailers}
            onBack={() => {
              setShowTrailers(false);
              setCurrentPairIndex(0);
              setAbTestingComplete(false);
            }}
          />
        </main>
      </div>
    );
  }

  // Show poster pairs for A/B testing
  const startIndex = currentPairIndex * 2;
  const currentPair = posters.slice(startIndex, startIndex + 2);

  if (currentPair.length < 2) {
    // Not enough movies for pairs, skip to trailers
    if (!showTrailers && recommendations.length > 0) {
      setShowTrailers(true);
      setAbTestingComplete(true);
    }
    return (
      <div className="min-h-screen text-gray-100 bg-black">
        <header className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-extrabold tracking-tight">PickaFlick</h1>
          <p className="text-sm opacity-80 mt-1">
            Quick Picks → we learn your taste → then a personalised Trailer Reel.
          </p>
          <DataBanner />
        </header>
        <main className="max-w-6xl mx-auto p-6">
          <div className="text-center">
            <p className="text-gray-300">Loading your trailer reel...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100 bg-black">
      <header className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-extrabold tracking-tight">PickaFlick</h1>
        <p className="text-sm opacity-80 mt-1">
          Quick Picks → we learn your taste → then a personalised Trailer Reel.
        </p>
        <DataBanner />
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Quick Picks</h2>
          <p className="text-xl text-gray-300 mb-2">
            Which movie would you rather watch?
          </p>
          <p className="text-sm text-gray-400">
            Choice {currentPairIndex + 1} of {Math.floor(posters.length / 2)}
          </p>
        </div>

        <PosterPair
          movieA={currentPair[0]}
          movieB={currentPair[1]}
          onChoice={handlePosterChoice}
        />
      </main>
    </div>
  );
}