// Vercel serverless function for /api/ab/round

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3 } from '../seed-data.js';

// Default seed index (can be overridden by query parameter)
const DEFAULT_SEED_INDEX = 0;

// Global state for A/B round management
let movieScores = {}; // { movieId: rating }, start at 1500 if missing
let pairsShown = new Set(); // Track pairs already shown
let recent = []; // Recently shown movies (cooldown list)

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
  const seeds = [SEED_LIST_1, SEED_LIST_2, SEED_LIST_3];
  const listIds = ["ls094921320", "ls003501243", "ls002065120"];
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

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom(array) {
  if (array.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function makePairKey(id1, id2) {
  // Create a consistent key regardless of order
  return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

function handleABRound(catalogue) {
  // --- Step 1. Ensure every movie has a score ---
  for (const movie of catalogue) {
    if (movieScores[movie.id] === undefined) {
      movieScores[movie.id] = 1500;
    }
  }

  // --- Step 2. Pick eligible pool ---
  // For now, use all movies as eligible (we'll implement cooldown later)
  const eligible = catalogue;

  // --- Step 3. Sort by score ---
  const sorted = eligible.sort((a, b) => movieScores[b.id] - movieScores[a.id]);

  const pairs = [];
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loops

  // Generate pairs more systematically
  const usedMovies = new Set();
  
  for (let i = 0; i < 12 && pairs.length < 12; i++) {
    // pick champion from top quartile
    const topQuartileSize = Math.max(1, Math.floor(sorted.length / 4));
    const topQuartile = sorted.slice(0, topQuartileSize);
    const availableChampions = topQuartile.filter(m => !usedMovies.has(m.id));
    
    if (availableChampions.length === 0) break;
    
    const champion = pickRandom(availableChampions);
    if (!champion) break;

    // find challengers within ~40–120 Elo of champion
    const championScore = movieScores[champion.id];
    const challengers = eligible.filter(c => {
      if (c.id === champion.id || usedMovies.has(c.id)) return false;
      const scoreDiff = Math.abs(movieScores[c.id] - championScore);
      return scoreDiff >= 40 && scoreDiff <= 120;
    });

    // if no good challengers, fall back to random eligible
    const challenger = challengers.length > 0
      ? pickRandom(challengers)
      : pickRandom(eligible.filter(c => c.id !== champion.id && !usedMovies.has(c.id)));

    if (!challenger) break;

    // add pair
    pairs.push({
      left: champion,
      right: challenger
    });
    
    // mark movies as used
    usedMovies.add(champion.id);
    usedMovies.add(challenger.id);
  }

  // If we couldn't generate enough pairs, fill with random pairs
  while (pairs.length < 12 && eligible.length >= 2) {
    const shuffled = shuffleArray(eligible);
    const left = shuffled[0];
    const right = shuffled[1];
    
    if (left && right && left.id !== right.id) {
      const key = makePairKey(left.id, right.id);
      if (!pairsShown.has(key)) {
        pairs.push({ left, right });
        pairsShown.add(key);
        recent.push(left.id, right.id);
        if (recent.length > 20) {
          recent = recent.slice(-20);
        }
      }
    }
    break; // Prevent infinite loop
  }

  return {
    ok: true,
    pairs: pairs,
    excludeIds: Array.from(usedMovies)
  };
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
    
    // Use the new sophisticated pairing algorithm
    const result = handleABRound(catalogue);
    
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
