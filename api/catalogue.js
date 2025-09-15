// Vercel serverless function for /api/catalogue

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4 } from './seed-data.js';

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

function pickRandomN(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function buildCatalogue(seedIndex = DEFAULT_SEED_INDEX) {
  const seeds = [SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4];
  const listIds = ["ls094921320", "ls003501243", "ls002065120", "ls000873904"];
  const currentSeed = seeds[seedIndex] || SEED_LIST_1;
  const picked = pickRandomN(currentSeed, Math.min(24, currentSeed.length));
  const movies = picked.map(s => ({
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
    sourceListIds: [listIds[seedIndex] || listIds[0]],
  }));
  
  return movies;
}

// Vercel serverless function handler
export default (req, res) => {
  try {
    // Set headers
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    
    // Get seed index from query parameter or use default
    const seedIndex = req.query.seedIndex ? parseInt(req.query.seedIndex) : DEFAULT_SEED_INDEX;
    
    const catalogue = buildCatalogue(seedIndex);
    res.status(200).json({
      ok: true,
      total: catalogue.length,
      items: catalogue,
      seedIndex: seedIndex
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
