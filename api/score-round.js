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
  // Use all 5 seed lists combined for maximum coverage
  const allSeeds = [...SEED_LIST_1, ...SEED_LIST_2, ...SEED_LIST_3, ...SEED_LIST_4, ...SEED_LIST_5];
  const picked = pickRandomN(allSeeds, Math.min(100, allSeeds.length));
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
    imdbUrl: s.imdbUrl,
    watchUrl: s.watchUrl,
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

function getDatasetRecommendations(winners, catalogue, count = 5) {
  // Simple scoring system for dataset recommendations
  const winnerSet = new Set(winners);
  const scoredMovies = [];
  
  for (const movie of catalogue) {
    // Skip winning movies
    if (winnerSet.has(movie.id)) continue;
    let score = 0;
    // Basic popularity score
    score += movie.popularity || 50;
    // Random factor for diversity
    score += Math.random() * 20;
    scoredMovies.push({ movie, score });
  }
  // Sort by score and take top N
  scoredMovies.sort((a, b) => b.score - a.score);
  return scoredMovies.slice(0, count).map(item => item.movie);
}

function topUpWithDataset(current, winners, catalogue, target = 6) {
  if ((current || []).length >= target) return current.slice(0, target);
  const have = new Set((current || []).map(m => m.id));
  const winnerSet = new Set(winners);
  const scored = [];
  for (const movie of catalogue) {
    if (have.has(movie.id) || winnerSet.has(movie.id)) continue;
    let score = (movie.popularity || 50) + Math.random() * 20;
    scored.push({ movie, score });
  }
  scored.sort((a,b)=>b.score-a.score);
  const need = target - current.length;
  const extra = scored.slice(0, Math.max(0, need)).map(x=>x.movie);
  return current.concat(extra).slice(0, target);
}

function deduplicateMovies(movies) {
  const seen = new Set();
  const unique = [];
  
  for (const movie of movies) {
    const key = `${movie.title.toLowerCase()}-${movie.year}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(movie);
    }
  }
  
  return unique;
}

async function getGeminiRecommendations(userSelections) {
  try {
    const prompt = `You are a movie recommender that infers subjective vibe (tone, pacing, aesthetics, themes, era, star/director signatures) from only the user's 12 picks.
Return 5 widely-released films from anywhere (no candidate pool), each with a concise vibe-based reason, plus a 1–2 sentence summary.
Output strict JSON matching the requested schema—no extra prose.

Here are the 12 winners from the A/B test:
${userSelections.map(movie => `- ${movie.title} (${movie.year})`).join('\n')}

{
  "summary": "Based on your A/B picks, ...",
  "derived_vibe_profile": {
    "pace": "slow-burn",
    "tone": ["bleak"],
    "aesthetic": ["desaturated"],
    "narrative_feel": ["investigation"],
    "era_bias": ["90s"],
    "weirdness": "grounded"
  },
  "recommendations": [
    {"title":"Zodiac","year":2007,"reason":"...","similarity":0.86},
    {"title":"Prisoners","year":2013,"reason":"...","similarity":0.84},
    {"title":"The Insider","year":1999,"reason":"...","similarity":0.82},
    {"title":"Sicario","year":2015,"reason":"...","similarity":0.81},
    {"title":"Heat","year":1995,"reason":"...","similarity":0.80}
  ]
}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No recommendations received from Gemini API');
    const parsed = JSON.parse(text);
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('Gemini did not return recommendations array');
    }
    return parsed;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

async function getGeminiSummary(userSelections) {
  try {
    const summaryPrompt = `You are a movie concierge. Based on the 12 selected films, return one short sentence explaining the taste profile and why these 6 recommendations fit. Max 30 words.`;
    const selectionsText = `User selections:\n${userSelections.map(m => `- ${m.title} (${m.year || ''})`).join('\n')}`;
    const requestBody = {
      contents: [
        { parts: [ { text: summaryPrompt }, { text: selectionsText } ] }
      ],
      generationConfig: { responseMimeType: "text/plain" }
    };
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw new Error(`Gemini summary HTTP ${response.status}`);
    const data = await response.json();
    const cand = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return cand.trim();
  } catch (e) {
    return "";
  }
}

function localSummaryFrom(winningMovies) {
  try {
    const years = winningMovies.map(w => Number(w.year)).filter(n => Number.isFinite(n));
    const decade = years.length ? `${Math.floor((years.reduce((a,b)=>a+b,0)/years.length)/10)*10}s` : "various decades";
    const genreCounts = new Map();
    for (const w of winningMovies) for (const g of (w.genres || [])) genreCounts.set(g, (genreCounts.get(g)||0)+1);
    const topGenres = Array.from(genreCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([g])=>g).join(", ");
    return `Based on your A/B picks, you leaned toward ${topGenres || 'a mix of genres'} with a ${decade} feel. Here are 6 films that match that profile.`;
  } catch {
    return "Based on your A/B picks, here are 6 films that match your profile.";
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

    // Step 1: Get Gemini recommendations (5 movies from anywhere)
    let geminiResponse = null;
    try {
      geminiResponse = await getGeminiRecommendations(winningMovies);
      
      // Convert Gemini recommendations to our movie format
      const geminiMovies = [];
      for (const geminiRec of geminiResponse.recommendations) {
        // Try to find a matching movie in our catalogue by title and year
        const matchingMovie = catalogue.find(movie => 
          movie.title.toLowerCase() === geminiRec.title.toLowerCase() && 
          movie.year === geminiRec.year
        );
        
        if (matchingMovie) {
          geminiMovies.push(matchingMovie);
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
            sourceListIds: [],
            imdbUrl: null,
            watchUrl: `https://www.justwatch.com/us/search?q=${encodeURIComponent(geminiRec.title)}`,
            reason: geminiRec.reason,
            similarity: geminiRec.similarity
          };
          geminiMovies.push(placeholderMovie);
        }
      }
      
      // Add 1 movie from dataset to reach 6 total
      const datasetOne = getDatasetRecommendations(winners, catalogue, 1);
      const allRecommendations = [...geminiMovies, ...datasetOne];
      
      // Prepare trailers map
      const trailers = {};
      for (const rec of allRecommendations) { trailers[rec.id] = rec.trailerUrl; }

      return {
        ok: true,
        summary: geminiResponse.summary,
        derived_vibe_profile: geminiResponse.derived_vibe_profile,
        recommendations: allRecommendations.slice(0, 6),
        recs: allRecommendations.slice(0, 6), // backward compatibility
        trailers
      };
    } catch (geminiError) {
      console.error('Gemini API failed:', geminiError);
      // Fallback: if Gemini fails, prefer 6 random picks from curated 50 within catalogue
      const curatedKeys = new Set([
        // title|year keys for curated 50
        "the shining|1980","raiders of the lost ark|1981","blade runner|1982","the thing|1982","this is spinal tap|1984","the princess bride|1987","die hard|1988","do the right thing|1989","when harry met sally…|1989","aliens|1986",
        "the silence of the lambs|1991","groundhog day|1993","jurassic park|1993","pulp fiction|1994","se7en|1995","heat|1995","fargo|1996","the big lebowski|1998","the matrix|1999","before sunrise|1995",
        "spirited away|2001","city of god|2002","lost in translation|2003","eternal sunshine of the spotless mind|2004","pan’s labyrinth|2006","the departed|2006","no country for old men|2007","there will be blood|2007","superbad|2007","the dark knight|2008",
        "the social network|2010","drive|2011","her|2013","the grand budapest hotel|2014","whiplash|2014","mad max: fury road|2015","get out|2017","call me by your name|2017","spider-man: into the spider-verse|2018","parasite|2019",
        "dune|2021","everything everywhere all at once|2022","top gun: maverick|2022","the banshees of inisherin|2022","aftersun|2022","the menu|2022","past lives|2023","oppenheimer|2023","barbie|2023","the northman|2022"
      ]);
      const key = (m) => `${(m.title||'').toLowerCase()}|${m.year||''}`;
      const curatedPool = catalogue.filter(m => curatedKeys.has(key(m)));
      const shuffled = shuffleArray(curatedPool.length ? curatedPool : catalogue);
      const sliced = shuffled.slice(0, 6);
      const trailers = {}; for (const rec of sliced) { trailers[rec.id] = rec.trailerUrl; }
      const summary = localSummaryFrom(winningMovies);
      return { ok: true, summary, recommendations: sliced, recs: sliced, trailers };
    }
  } catch (error) {
    console.error('Error in handleScoreRound:', error);
    // Fallback to original scoring system if everything fails
    const fb = handleScoreRoundFallback(winners, catalogue);
    // Ensure 6 and attach basic summary
    const base = (fb.recs || []).slice(0, 6);
    const sliced = topUpWithDataset(base, winners, catalogue, 6);
    const winningMovies = winners.map(wid => findMovieById(wid, catalogue)).filter(Boolean);
    const summary = localSummaryFrom(winningMovies);
    return { ok: true, summary, recommendations: sliced, recs: sliced, trailers: fb.trailers };
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
  const topCandidates = scoredMovies.slice(0, 20);
  const shuffled = shuffleArray(topCandidates);
  const recommendations = shuffled.slice(0, 10);

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
