
import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Header from './components/Header';
import PosterPair from './components/PosterPair';
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

export default function AppEnhanced() {
  const [posters, setPosters] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [trailers, setTrailers] = useState<TrailerMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [showTrailers, setShowTrailers] = useState(false);

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
      const posterRes = await fetchWithSession('/api/catalogue');
      
      if (!posterRes.ok) {
        throw new Error(`Failed to load catalogue: ${posterRes.status}`);
      }
      
      const posterData = await posterRes.json();

      if (!posterData.ok || !Array.isArray(posterData.items)) {
        throw new Error('Invalid catalogue response format');
      }

      console.log(`[APP] Loaded ${posterData.items.length} poster movies`);
      
      // Convert and validate poster data
      const movies = posterData.items
        .filter((item: any) => item && item.id && item.title)
        .map((item: any): Movie => ({
          id: item.id,
          title: item.title || "Unknown Title",
          year: item.year || undefined,
          posterUrl: item.posterUrl || null,
          backdropUrl: item.backdropUrl || null,
          overview: item.overview || "",
          genres: Array.isArray(item.genres) ? item.genres : [],
          sourceListId: item.sourceListId
        }));

      setPosters(movies);

      // Get recommendations
      console.log('[APP] Loading recommendations...');
      const recRes = await fetchWithSession('/api/recs?limit=6');
      
      if (recRes.ok) {
        const recData = await recRes.json();
        if (recData.ok && Array.isArray(recData.recs)) {
          console.log(`[APP] Loaded ${recData.recs.length} recommendations`);
          setRecommendations(recData.recs);

          // Get trailers for recommendations
          if (recData.recs.length > 0) {
            const ids = recData.recs.map((m: Movie) => m.id);
            const trailerRes = await fetchWithSession(`/api/trailers?ids=${ids.join(',')}`);
            
            if (trailerRes.ok) {
              const trailerData = await trailerRes.json();
              if (trailerData.ok && trailerData.trailers) {
                console.log(`[APP] Loaded trailers for ${Object.keys(trailerData.trailers).length} movies`);
                setTrailers(trailerData.trailers);
              }
            }
          }
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
    const totalPairs = Math.floor(posters.length / 2);
    if (currentPairIndex < totalPairs - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      // A/B testing complete, show trailers
      console.log('[APP] A/B testing complete, showing trailers');
      setShowTrailers(true);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <div className="fixed inset-0 opacity-5">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "20px 20px"
            }}
          ></div>
        </div>
        <Header choices={0} onboardingComplete={false} />
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-3xl font-bold mb-4">Loading Movies...</h2>
            <p className="text-xl text-gray-300">Building your personalized catalogue</p>
          </div>
        </section>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <div className="fixed inset-0 opacity-5">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "20px 20px"
            }}
          ></div>
        </div>
        <Header choices={0} onboardingComplete={false} />
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="glass-card p-12 rounded-2xl text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h2 className="text-3xl font-bold mb-4">Loading Failed</h2>
            <p className="text-xl text-gray-300 mb-8">{error}</p>
            <button 
              onClick={loadData}
              className="inline-flex items-center px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Show trailers if A/B testing is complete
  if (showTrailers && recommendations.length > 0) {
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <div className="fixed inset-0 opacity-5">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "20px 20px"
            }}
          ></div>
        </div>
        <Header choices={currentPairIndex + 1} onboardingComplete={true} />

        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4 text-gradient">Your Personalized Trailer Reel</h2>
            <p className="text-xl text-gray-300">Random selection from our premium catalogue</p>
          </div>

          <TrailerPlayer 
            movies={recommendations} 
            trailers={trailers}
            onBack={() => {
              setShowTrailers(false);
              setCurrentPairIndex(0);
            }}
          />
        </section>
      </div>
    );
  }

  // Check if we have enough posters for pairs
  if (posters.length < 2) {
    if (recommendations.length > 0) {
      setShowTrailers(true);
      return null;
    }
    
    return (
      <div className="bg-netflix-black text-white min-h-screen">
        <Header choices={0} onboardingComplete={false} />
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="glass-card p-12 rounded-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">No Movies Available</h2>
            <p className="text-xl text-gray-300 mb-8">Please try again later</p>
            <button 
              onClick={loadData}
              className="inline-flex items-center px-6 py-3 bg-netflix-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retry
            </button>
          </div>
        </section>
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
    }
    return null;
  }

  const totalPairs = Math.floor(posters.length / 2);

  return (
    <div className="bg-netflix-black text-white min-h-screen">
      <div className="fixed inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "20px 20px"
          }}
        ></div>
      </div>

      <Header 
        choices={currentPairIndex} 
        onboardingComplete={false}
        catalogueSize={posters.length}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 text-gradient">Quick Picks</h2>
          <p className="text-xl text-gray-300 mb-2">
            Which movie would you rather watch?
          </p>
          <p className="text-sm text-gray-400">
            Choice {currentPairIndex + 1} of {totalPairs}
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
