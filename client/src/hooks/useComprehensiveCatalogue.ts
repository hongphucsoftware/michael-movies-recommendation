
import { useState, useEffect } from 'react';

export interface ComprehensiveMovie {
  id: number;
  title: string;
  year: string;
  genres: number[];
  popularity: number;
  sources: string[];
  releaseDate?: string;
  posterUrl?: string;
}

export function useComprehensiveCatalogue() {
  const [movies, setMovies] = useState<ComprehensiveMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        console.log('[ComprehensiveCatalogue] Fetching full catalogue from server...');
        
        const response = await fetch('/api/catalogue');
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!mounted) return;
        
        console.log('[ComprehensiveCatalogue] Received comprehensive catalogue:', data.total, 'movies');
        console.log('[ComprehensiveCatalogue] Sources:', Object.keys(data.sources || {}));
        
        const processedMovies: ComprehensiveMovie[] = (data.items || []).map((item: any) => ({
          id: item.id,
          title: item.title || 'Unknown Title',
          year: item.releaseDate ? item.releaseDate.slice(0, 4) : '2024',
          genres: item.genres || [],
          popularity: item.popularity || 0,
          sources: item.sources || ['unknown'],
          releaseDate: item.releaseDate,
          posterUrl: item.posterUrl
        }));
        
        setMovies(processedMovies);
        setError(null);
        
        console.log('[ComprehensiveCatalogue] Processed movies:', processedMovies.length);
        console.log('[ComprehensiveCatalogue] Sample movie:', processedMovies[0]);
        
      } catch (err) {
        if (!mounted) return;
        
        console.error('[ComprehensiveCatalogue] Error fetching catalogue:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { movies, loading, error, total: movies.length };
}
