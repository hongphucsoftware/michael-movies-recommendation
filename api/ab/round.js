// Vercel serverless function for /api/ab/round

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 } from '../seed-data.js';

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

// Curated 50 movies for A/B testing (by decade)
const CURATED_50_KEYS = new Set([
  // 1980s (10)
  "the shining|1980","raiders of the lost ark|1981","blade runner|1982","the thing|1982","this is spinal tap|1984","the princess bride|1987","die hard|1988","do the right thing|1989","when harry met sally…|1989","aliens|1986",
  // 1990s (10)
  "the silence of the lambs|1991","groundhog day|1993","jurassic park|1993","pulp fiction|1994","se7en|1995","heat|1995","fargo|1996","the big lebowski|1998","the matrix|1999","before sunrise|1995",
  // 2000s (10)
  "spirited away|2001","city of god|2002","lost in translation|2003","eternal sunshine of the spotless mind|2004","pan's labyrinth|2006","the departed|2006","no country for old men|2007","there will be blood|2007","superbad|2007","the dark knight|2008",
  // 2010s (10)
  "the social network|2010","drive|2011","her|2013","the grand budapest hotel|2014","whiplash|2014","mad max: fury road|2015","get out|2017","call me by your name|2017","spider-man: into the spider-verse|2018","parasite|2019",
  // 2020s (10)
  "dune|2021","everything everywhere all at once|2022","top gun: maverick|2022","the banshees of inisherin|2022","aftersun|2022","the menu|2022","past lives|2023","oppenheimer|2023","barbie|2023","the northman|2022"
]);

function buildCatalogue(seedIndex = DEFAULT_SEED_INDEX) {
  const seeds = [SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5];
  const listIds = ["ls094921320", "ls003501243", "ls002065120", "ls000873904", "ls005747458"];
  
  // Use all 5 seed lists combined to find the curated 50 movies
  const allSeeds = [...SEED_LIST_1, ...SEED_LIST_2, ...SEED_LIST_3, ...SEED_LIST_4, ...SEED_LIST_5];
  
  // Filter to only include movies from the curated 50 list
  const curatedMovies = allSeeds.filter(s => {
    const key = `${(s.title || '').toLowerCase()}|${s.year || ''}`;
    return CURATED_50_KEYS.has(key);
  });
  
  // Shuffle and pick 24 movies from the curated 50 for 12 pairs
  const picked = pickRandomN(curatedMovies, Math.min(24, curatedMovies.length));
  
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

  // Generate exactly 12 pairs using simple random selection
  const shuffled = shuffleArray(eligible);
  const usedMovies = new Set();
  
  for (let i = 0; i < 12 && pairs.length < 12; i++) {
    // Find two unused movies
    let left = null, right = null;
    
    for (let j = 0; j < shuffled.length; j++) {
      if (!usedMovies.has(shuffled[j].id)) {
        if (!left) {
          left = shuffled[j];
        } else if (!right) {
          right = shuffled[j];
          break;
        }
      }
    }
    
    if (left && right) {
      pairs.push({ left, right });
      usedMovies.add(left.id);
      usedMovies.add(right.id);
    } else {
      // If we can't find enough unused movies, break
      break;
    }
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
