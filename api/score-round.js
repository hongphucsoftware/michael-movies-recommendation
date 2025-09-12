// Vercel serverless function for /api/score-round

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
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    
    // Parse request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { winners } = JSON.parse(body);
        
        if (!winners || !Array.isArray(winners)) {
          return res.status(400).json({ ok: false, error: 'Invalid winners data' });
        }
        
        const catalogue = buildCatalogue();
        const shuffled = shuffleArray(catalogue);
        
        // Generate 6 random recommendations
        const recommendations = shuffled.slice(0, 6);
        
        // Create trailers object
        const trailers = {};
        recommendations.forEach(movie => {
          trailers[movie.id] = movie.trailerUrl;
        });
        
        res.status(200).json({
          ok: true,
          recs: recommendations,
          trailers: trailers
        });
      } catch (parseError) {
        res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
