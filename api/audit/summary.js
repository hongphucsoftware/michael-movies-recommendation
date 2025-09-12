// Vercel serverless function for /api/audit/summary

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2 } from '../seed-data.js';

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

function buildCatalogue(seedIndex = DEFAULT_SEED_INDEX) {
  const currentSeed = seedIndex === 0 ? SEED_LIST_1 : SEED_LIST_2;
  const movies = currentSeed.map(s => ({
    id: hashCode(s.tt),
    imdbId: s.tt,
    title: s.title,
    year: s.year,
    genres: s.genres,
    director: s.director,
    actors: s.actors,
    posterUrl: s.poster,
    trailerUrl: s.trailer,
    sourceListIds: [seedIndex === 0 ? "ls094921320" : "ls003501243"],
  }));
  
  return movies;
}

// Vercel serverless function handler
export default (req, res) => {
  try {
    // Set headers
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    
    // Get seed index from query parameter or use default
    const seedIndex = req.query.seedIndex ? parseInt(req.query.seedIndex) : DEFAULT_SEED_INDEX;
    const catalogue = buildCatalogue(seedIndex);
    
    // Count movies by source list
    const lists = {};
    catalogue.forEach(movie => {
      movie.sourceListIds.forEach(listId => {
        lists[listId] = (lists[listId] || 0) + 1;
      });
    });
    
    res.status(200).json({
      ok: true,
      lists: lists,
      total: catalogue.length,
      seedIndex: seedIndex
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
