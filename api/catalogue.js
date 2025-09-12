// Vercel serverless function for /api/catalogue

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2 } from './seed-data.js';

// Default seed index (can be overridden by query parameter)
const DEFAULT_SEED_INDEX = 0;

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function toEra(year) {
  if (!year) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function buildCatalogue() {
  const currentSeed = currentSeedIndex === 0 ? SEED_LIST_1 : SEED_LIST_2;
  const movies = currentSeed.map(s => ({
    id: hashCode(s.tt),
    imdbId: s.tt,
    title: s.title,
    overview: "",
    genres: s.genres || [],
    year: s.year,
    era: toEra(s.year),
    popularity: 50,
    voteAverage: 7.0,
    voteCount: 1000,
    posterUrl: s.poster,
    backdropUrl: null,
    trailerUrl: s.trailer,
    topActors: s.actors,
    director: s.director,
    sourceListIds: [currentSeedIndex === 0 ? "ls094921320" : "ls003501243"],
  }));
  
  return movies;
}

// Vercel serverless function handler
export default (req, res) => {
  try {
    // Set headers
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    
    const catalogue = buildCatalogue();
    res.status(200).json({
      ok: true,
      total: catalogue.length,
      items: catalogue
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
