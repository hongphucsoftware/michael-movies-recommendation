// Vercel serverless function for /api/ab/round

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

function toEra(year) {
  if (!year) return null;
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function buildCatalogue(seedIndex = DEFAULT_SEED_INDEX) {
  const currentSeed = seedIndex === 0 ? SEED_LIST_1 : SEED_LIST_2;
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
    sourceListIds: [seedIndex === 0 ? "ls094921320" : "ls003501243"],
  }));
  
  return movies;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
    const shuffled = shuffleArray(catalogue);
    
    // Create 12 pairs (24 unique items)
    const pairs = [];
    const excludeIds = new Set();
    
    for (let i = 0; i < 12 && i * 2 + 1 < shuffled.length; i++) {
      const left = shuffled[i * 2];
      const right = shuffled[i * 2 + 1];
      
      if (left && right) {
        pairs.push({
          left: left,
          right: right
        });
        
        excludeIds.add(left.id);
        excludeIds.add(right.id);
      }
    }
    
    res.status(200).json({
      ok: true,
      pairs: pairs,
      excludeIds: Array.from(excludeIds)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
