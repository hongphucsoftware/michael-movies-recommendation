// Vercel serverless function for /api/trailers

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3 } from './seed-data.js';

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
  const seeds = [SEED_LIST_1, SEED_LIST_2, SEED_LIST_3];
  const currentSeed = seeds[seedIndex] || SEED_LIST_1;
  const movies = currentSeed.map(s => ({
    id: hashCode(s.tt),
    imdbId: s.tt,
    title: s.title,
    trailerUrl: s.trailer,
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
    
    const { ids, seedIndex } = req.query;
    if (!ids) {
      return res.status(400).json({ ok: false, error: 'Missing ids parameter' });
    }
    
    // Get seed index from query parameter or use default
    const currentSeedIndex = seedIndex ? parseInt(seedIndex) : DEFAULT_SEED_INDEX;
    
    const idList = ids.split(',').map(id => parseInt(id.trim()));
    const catalogue = buildCatalogue(currentSeedIndex);
    
    const trailers = {};
    idList.forEach(id => {
      const movie = catalogue.find(m => m.id === id);
      if (movie) {
        trailers[id] = movie.trailerUrl;
      } else {
        trailers[id] = null;
      }
    });
    
    res.status(200).json({
      ok: true,
      trailers: trailers
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
