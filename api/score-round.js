// Vercel serverless function for /api/score-round

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 } from './seed-data.js';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyDn0eaMpQSwbN_sQjDqm7R65tQ9-8Y6UOw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent';

// Default seed index (can be overridden by query parameter)
const DEFAULT_SEED_INDEX = 0;

// Globals for taste dial and movie scores
let tasteDial = { actors: {}, directors: {}, genres: {} };
let movieScores = {}; // { movieId: rating }, start at 1500 if missing

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
  const seeds = [SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5];
  const listIds = ["ls094921320", "ls003501243", "ls002065120", "ls000873904", "ls005747458"];
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

function findMovieById(movieId, catalogue) {
  return catalogue.find(movie => movie.id === movieId);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function getGeminiRecommendations(userSelections) {
  try {
    const prompt = `You are a movie concierge. Given a user's selections, infer their taste across genre, vibe, pacing, tone, director/actors, and recommend 5 fresh movies they will likely enjoy next. Avoid duplicates from the input. Output JSON only.`;
    
    const userSelectionsText = `User selections:\n${userSelections.map(movie => `- ${movie.title} (${movie.year})`).join('\n')}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { text: userSelectionsText }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const recommendationsText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!recommendationsText) {
      throw new Error('No recommendations received from Gemini API');
    }

    const recommendations = JSON.parse(recommendationsText);
    return recommendations;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

async function handleScoreRound(winners, catalogue) {
  try {
    // Get the winning movies from the catalogue
    const winningMovies = winners
      .map(winnerId => findMovieById(winnerId, catalogue))
      .filter(movie => movie !== undefined);

    if (winningMovies.length === 0) {
      throw new Error('No valid winning movies found');
    }

    // Get recommendations from Gemini
    const geminiRecommendations = await getGeminiRecommendations(winningMovies);
    
    // Convert Gemini recommendations to our movie format
    const recommendations = [];
    const trailers = {};
    
    for (const geminiRec of geminiRecommendations) {
      // Try to find a matching movie in our catalogue by title and year
      const matchingMovie = catalogue.find(movie => 
        movie.title.toLowerCase() === geminiRec.title.toLowerCase() && 
        movie.year === geminiRec.year
      );
      
      if (matchingMovie) {
        recommendations.push(matchingMovie);
        trailers[matchingMovie.id] = matchingMovie.trailerUrl;
      } else {
        // If not found in catalogue, create a placeholder movie object
        const placeholderMovie = {
          id: hashCode(geminiRec.title + geminiRec.year),
          imdbId: null,
          title: geminiRec.title,
          overview: "",
          genres: [],
          year: geminiRec.year,
          era: toEra(geminiRec.year),
          popularity: 50,
          voteAverage: 7.0,
          voteCount: 1000,
          posterUrl: null,
          backdropUrl: null,
          trailerUrl: null,
          topActors: [],
          director: null,
          sourceListIds: []
        };
        recommendations.push(placeholderMovie);
        trailers[placeholderMovie.id] = null;
      }
    }

    return {
      ok: true,
      recs: recommendations,
      trailers: trailers
    };
  } catch (error) {
    console.error('Error in handleScoreRound:', error);
    // Fallback to original scoring system if Gemini fails
    return handleScoreRoundFallback(winners, catalogue);
  }
}

function handleScoreRoundFallback(winners, catalogue) {
  // Process each winner-loser pair
  for (const winnerId of winners) {
    const winner = findMovieById(winnerId, catalogue);
    if (!winner) continue;

    // --- Update Taste Dial ---
    // bump actors
    for (const actor of winner.topActors || []) {
      tasteDial.actors[actor] = (tasteDial.actors[actor] || 0) + 1;
    }

    // bump directors (heavier weight)
    if (winner.director) {
      tasteDial.directors[winner.director] = (tasteDial.directors[winner.director] || 0) + 2;
    }

    // bump genres
    for (const genre of winner.genres || []) {
      tasteDial.genres[genre] = (tasteDial.genres[genre] || 0) + 1;
    }

    // --- Update Elo-lite scores ---
    movieScores[winnerId] = (movieScores[winnerId] || 1500) + 20;
  }

  // --- Build recommendations ---
  const scoredMovies = [];
  for (const movie of catalogue) {
    let score = movieScores[movie.id] || 1500;

    // add points for overlaps with Taste Dial
    for (const actor of movie.topActors || []) {
      if (tasteDial.actors[actor]) {
        score += 5 * tasteDial.actors[actor];
      }
    }

    if (movie.director && tasteDial.directors[movie.director]) {
      score += 10 * tasteDial.directors[movie.director];
    }

    for (const genre of movie.genres || []) {
      if (tasteDial.genres[genre]) {
        score += 3 * tasteDial.genres[genre];
      }
    }

    scoredMovies.push({ movie, score });
  }

  // sort by score descending
  scoredMovies.sort((a, b) => b.score - a.score);

  // add a little randomness for diversity
  const topCandidates = scoredMovies.slice(0, 12);
  const shuffled = shuffleArray(topCandidates);
  const recommendations = shuffled.slice(0, 6);

  // prepare trailers map
  const trailers = {};
  for (const rec of recommendations) {
    trailers[rec.movie.id] = rec.movie.trailerUrl;
  }

  return {
    ok: true,
    recs: recommendations.map(rec => rec.movie),
    trailers: trailers
  };
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
    
    req.on('end', async () => {
      try {
        const { winners } = JSON.parse(body);
        
        if (!winners || !Array.isArray(winners)) {
          return res.status(400).json({ ok: false, error: 'Invalid winners data' });
        }
        
        // Get seed index from query parameter or use default
        const seedIndex = req.query.seedIndex ? parseInt(req.query.seedIndex) : DEFAULT_SEED_INDEX;
        const catalogue = buildCatalogue(seedIndex);
        
        // Process winners and generate recommendations using Gemini
        const result = await handleScoreRound(winners, catalogue);
        
        res.status(200).json(result);
      } catch (parseError) {
        res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
