import { useState, useEffect } from 'react';
import type { Movie } from './useMovieData'; // Assuming Movie type is still needed and correctly imported
import { catalogueService } from '@/lib/catalogueService'; // Corrected import for catalogueService

export function useEnhancedCatalogueNew() {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Added error state

  useEffect(() => {
    async function loadCatalogue() {
      try {
        setLoading(true);
        setError(null); // Reset error on new load attempt

        console.log("[HOOK] Loading comprehensive catalogue from all 3 sources...");
        const movies = await catalogueService.buildCatalogue();

        if (movies.length === 0) {
          setError("No movies found. Check server logs for scraping issues.");
          // Optionally, clear items if an error occurs and no movies are found
          setItems([]);
          return;
        }

        // This warning might be useful for debugging if the number of movies is unexpectedly low
        if (movies.length < 300) {
          console.warn(`[HOOK] Warning: Only ${movies.length} movies loaded, expected 300+`);
        }

        setItems(movies);
        console.log(`[HOOK] ✓ Loaded ${movies.length} movies from comprehensive catalogue`);

      } catch (err) {
        console.error("[HOOK] Failed to load catalogue:", err);
        // Set the error message, handling cases where err might not be an Error object
        setError(err instanceof Error ? err.message : "Failed to load movies");
        // Clear items on error to prevent displaying stale data
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadCatalogue();
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return { items, loading, error }; // Return error state as well
}