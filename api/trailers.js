// Vercel serverless function for /api/trailers

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2 } from './seed-data.js';

// Global variable to track current seed list
let currentSeedIndex = 0;

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function buildCatalogue() {
  const currentSeed = currentSeedIndex === 0 ? SEED_LIST_1 : SEED_LIST_2;
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
    
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ ok: false, error: 'Missing ids parameter' });
    }
    
    const idList = ids.split(',').map(id => parseInt(id.trim()));
    const catalogue = buildCatalogue();
    
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
