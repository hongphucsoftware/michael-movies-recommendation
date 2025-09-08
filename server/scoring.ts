import type { Title } from "../client/src/hooks/useEnhancedCatalogue";

export type ABPair = {
  left: Title;
  right: Title;
};

export type Vote = {
  winnerId: number;
  loserId: number;
};

export type Recommendation = {
  movies: Title[];
  explanation: {
    topGenres: Array<{ id: number; name: string; count: number }>;
    topActors: Array<{ id: number; name: string; count: number }>;
    topDirectors: Array<{ id: number; name: string; count: number }>;
    topEra: { bucket: string; count: number } | null;
  };
};

const GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

function getEra(releaseDate: string | null): string | null {
  if (!releaseDate) return null;
  const year = parseInt(releaseDate.slice(0, 4));
  if (isNaN(year)) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function getActorsFromOverview(title: Title): Array<{ id: number; name: string }> {
  // For MVP, we'll extract simple actor info from title if available
  // In real implementation, this would come from TMDb credits
  return []; // Simplified for MVP
}

function getDirectorFromOverview(title: Title): { id: number; name: string } | null {
  // For MVP, simplified director extraction
  // In real implementation, this would come from TMDb credits
  return null;
}

export function generateABPairs(titles: Title[], count: number = 12): ABPair[] {
  const shuffled = [...titles].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count * 2); // Need 24 movies for 12 pairs
  
  const pairs: ABPair[] = [];
  for (let i = 0; i < count; i++) {
    pairs.push({
      left: selected[i * 2],
      right: selected[i * 2 + 1]
    });
  }
  
  return pairs;
}

export function scoreMoviesFromVotes(
  votes: Vote[], 
  allMovies: Title[], 
  excludeIds: number[]
): Recommendation {
  // Build explanation counts (what they liked)
  const genreCounts: Record<number, number> = {};
  const actorCounts: Record<number, number> = {};
  const directorCounts: Record<number, number> = {};
  const eraCounts: Record<string, number> = {};
  
  // Build preference deltas (what separates winners from losers)
  const featureScores: Record<string, number> = {};
  
  // Process each vote
  for (const vote of votes) {
    const winner = allMovies.find(m => m.id === vote.winnerId);
    const loser = allMovies.find(m => m.id === vote.loserId);
    
    if (!winner || !loser) continue;
    
    // Explanation counts from winners
    for (const genreId of winner.genres || []) {
      genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
    }
    
    const winnerEra = getEra(winner.releaseDate);
    if (winnerEra) {
      eraCounts[winnerEra] = (eraCounts[winnerEra] || 0) + 1;
    }
    
    // Simplified actor/director counting for MVP
    const winnerActors = getActorsFromOverview(winner);
    const winnerDirector = getDirectorFromOverview(winner);
    
    for (const actor of winnerActors) {
      actorCounts[actor.id] = (actorCounts[actor.id] || 0) + 1;
    }
    if (winnerDirector) {
      directorCounts[winnerDirector.id] = (directorCounts[winnerDirector.id] || 0) + 1;
    }
    
    // Preference deltas for scoring
    const winnerGenres = new Set(winner.genres || []);
    const loserGenres = new Set(loser.genres || []);
    
    // Exclusive features
    const winnerOnlyGenres = Array.from(winnerGenres).filter(g => !loserGenres.has(g));
    const loserOnlyGenres = Array.from(loserGenres).filter(g => !winnerGenres.has(g));
    
    // Update feature scores
    for (const genreId of winnerOnlyGenres) {
      const key = `genre_${genreId}`;
      featureScores[key] = (featureScores[key] || 0) + 1;
    }
    for (const genreId of loserOnlyGenres) {
      const key = `genre_${genreId}`;
      featureScores[key] = (featureScores[key] || 0) - 1;
    }
    
    // Era scoring
    const loserEra = getEra(loser.releaseDate);
    if (winnerEra && (!loserEra || winnerEra !== loserEra)) {
      featureScores[`era_${winnerEra}`] = (featureScores[`era_${winnerEra}`] || 0) + 1;
    }
    if (loserEra && (!winnerEra || winnerEra !== loserEra)) {
      featureScores[`era_${loserEra}`] = (featureScores[`era_${loserEra}`] || 0) - 1;
    }
  }
  
  // Score all eligible movies
  const eligibleMovies = allMovies.filter(m => !excludeIds.includes(m.id));
  const scoredMovies = eligibleMovies.map(movie => {
    let score = 0;
    
    // Genre scoring
    const movieGenres = movie.genres || [];
    const genreScores = movieGenres.map(g => featureScores[`genre_${g}`] || 0);
    const genreScore = genreScores.length ? genreScores.reduce((a, b) => a + b, 0) / genreScores.length : 0;
    
    // Era scoring
    const movieEra = getEra(movie.releaseDate);
    const eraScore = movieEra ? (featureScores[`era_${movieEra}`] || 0) : 0;
    
    // Combine scores
    score = genreScore * 1.0 + eraScore * 0.5;
    
    // Add popularity bonus
    const popularityScore = (movie.popularity || 0) / 1000; // Normalize
    score += popularityScore * 0.1;
    
    // Add small jitter for deterministic but varied ordering
    const jitter = (movie.id % 100) / 10000;
    score += jitter;
    
    return { movie, score };
  });
  
  // Sort by score and apply diversity rules
  scoredMovies.sort((a, b) => b.score - a.score);
  
  // Select top 6 with diversity
  const selectedMovies: Title[] = [];
  const usedGenres: Record<number, number> = {};
  const usedDirectors = new Set<number>();
  
  for (const { movie } of scoredMovies) {
    if (selectedMovies.length >= 6) break;
    
    // Check diversity constraints
    const movieGenres = movie.genres || [];
    const topGenre = movieGenres[0];
    const genreCount = topGenre ? (usedGenres[topGenre] || 0) : 0;
    
    // Don't take >2 from same genre, >1 from same director
    if (genreCount >= 2) continue;
    
    selectedMovies.push(movie);
    
    if (topGenre) {
      usedGenres[topGenre] = genreCount + 1;
    }
  }
  
  // Build explanation
  const topGenres = Object.entries(genreCounts)
    .map(([id, count]) => ({ id: parseInt(id), name: GENRE_NAMES[parseInt(id)] || `Genre ${id}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  const topActors = Object.entries(actorCounts)
    .map(([id, count]) => ({ id: parseInt(id), name: `Actor ${id}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);
  
  const topDirectors = Object.entries(directorCounts)
    .map(([id, count]) => ({ id: parseInt(id), name: `Director ${id}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);
  
  const topEra = Object.entries(eraCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  return {
    movies: selectedMovies,
    explanation: {
      topGenres,
      topActors,
      topDirectors,
      topEra: topEra ? { bucket: topEra[0], count: topEra[1] } : null
    }
  };
}