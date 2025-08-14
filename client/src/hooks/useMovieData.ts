import { useState, useCallback } from "react";
import { Movie } from "@/types/movie";

export function useMovieData() {
  const [currentTrailer, setCurrentTrailer] = useState<Movie | null>(null);

  const playTrailer = useCallback((movie: Movie) => {
    setCurrentTrailer(movie);
  }, []);

  const clearTrailer = useCallback(() => {
    setCurrentTrailer(null);
  }, []);

  return {
    currentTrailer,
    playTrailer,
    clearTrailer
  };
}
