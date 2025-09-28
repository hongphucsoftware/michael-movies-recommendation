// Vercel serverless function for /api/score-round

// Import full SEED data
import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 } from './seed-data.js';

// AI API configuration
// Read Gemini key from environment (set in .env or Vercel Project Settings)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBvQZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8Q';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// Read OpenAI key from environment (set in .env or Vercel Project Settings)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

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

function ensureConsistency(aiResponse, userSelections) {
  console.log(`[CONSISTENCY] Input userSelections:`, userSelections.map(m => `${m.title} (${m.year})`));
  
  // Analyze user selections to determine dominant era and genres
  const years = userSelections.map(m => m.year).filter(y => y);
  const genres = {};
  userSelections.forEach(m => {
    (m.genres || []).forEach(g => genres[g] = (genres[g] || 0) + 1);
  });
  
  console.log(`[CONSISTENCY] Years:`, years);
  console.log(`[CONSISTENCY] Genres:`, genres);
  
  // Find dominant era (most common decade)
  const decadeCounts = {};
  years.forEach(year => {
    const decade = Math.floor(year / 10) * 10;
    decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
  });
  const dominantDecade = Object.keys(decadeCounts).reduce((a, b) => 
    decadeCounts[a] > decadeCounts[b] ? a : b
  );
  const dominantEra = `${dominantDecade}s`;
  
  console.log(`[CONSISTENCY] Decade counts:`, decadeCounts);
  console.log(`[CONSISTENCY] Dominant decade:`, dominantDecade, '->', dominantEra);
  
  // Find top 2 genres
  const topGenres = Object.entries(genres)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2)
    .map(([g]) => g);
  
  console.log(`[CONSISTENCY] Top genres:`, topGenres);
  
  // Filter recommendations to match dominant era
  const eraFiltered = aiResponse.recommendations.filter(rec => {
    const recDecade = Math.floor(rec.year / 10) * 10;
    const matches = recDecade.toString() === dominantDecade;
    console.log(`[CONSISTENCY] ${rec.title} (${rec.year}) -> decade ${recDecade}, matches ${dominantDecade}: ${matches}`);
    return matches;
  });
  
  console.log(`[CONSISTENCY] Era filtered count:`, eraFiltered.length);
  
  // If we don't have enough era-consistent recommendations, use all but update summary
  const finalRecs = eraFiltered.length >= 3 ? eraFiltered : aiResponse.recommendations;
  
  // Update summary to be consistent
  const genreText = topGenres.length ? topGenres.join(', ') : 'a mix of genres';
  const eraText = eraFiltered.length >= 3 ? dominantEra : 'various decades';
  
  console.log(`[CONSISTENCY] Final summary: ${genreText} with ${eraText} feel`);
  
  return {
    ...aiResponse,
    summary: `Based on your A/B picks, you leaned toward ${genreText} with a ${eraText} feel. Here are 6 films that match that profile.`,
    recommendations: finalRecs.slice(0, 5),
    debug_winners: userSelections.map(m => `${m.title} (${m.year})`)
  };
}

async function getOpenAIRecommendations(userSelections) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const prompt = `You are a movie recommender that infers subjective vibe (tone, pacing, aesthetics, themes, era, star/director signatures) from only the user's 12 picks.
Return 5 widely-released films from anywhere (no candidate pool), each with a concise vibe-based reason, plus a 1–2 sentence summary.
Output strict JSON matching the requested schema—no extra prose.

CRITICAL CONSISTENCY RULES:
1. The recommendations MUST match the genres and era you identify in the summary. If you say "Drama, Comedy from the 2000s", then ALL 5 recommendations should be Drama/Comedy films from the 2000s era.
2. Era consistency is MANDATORY. If you identify a dominant era (e.g., "2000s feel"), ALL 5 recommendations must be from that same era.
3. Genre consistency is MANDATORY. If you identify genres (e.g., "Drama, Thriller"), ALL 5 recommendations must contain those genres.

Here are the 12 winners from the A/B test:
${userSelections.map(movie => `- ${movie.title} (${movie.year})`).join('\n')}

{
  "summary": "Based on your A/B picks, you leaned toward [SPECIFIC_GENRES] with a [SPECIFIC_ERA] feel. Here are 6 films that match that profile.",
  "derived_vibe_profile": {
    "pace": "slow-burn",
    "tone": ["bleak"],
    "aesthetic": ["desaturated"],
    "narrative_feel": ["investigation"],
    "era_bias": ["90s"],
    "weirdness": "grounded"
  },
  "recommendations": [
    {"title":"Zodiac","year":2007,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.86},
    {"title":"Prisoners","year":2013,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.84},
    {"title":"The Insider","year":1999,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.82},
    {"title":"Sicario","year":2015,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.81},
    {"title":"Heat","year":1995,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.80}
  ]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`OpenAI rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('No recommendations received from OpenAI API');
      const parsed = JSON.parse(text);
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('OpenAI did not return recommendations array');
      }
      
      // Post-process to ensure consistency
      const processed = ensureConsistency(parsed, userSelections);
      return processed;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('OpenAI API failed after all retries:', error);
        throw error;
      }
      console.log(`OpenAI API attempt ${attempt + 1} failed, retrying...`);
    }
  }
}

async function getGeminiRecommendations(userSelections) {
  try {
    const prompt = `You are a movie recommender that infers subjective vibe (tone, pacing, aesthetics, themes, era, star/director signatures) from only the user's 12 picks.
Return 5 widely-released films from anywhere (no candidate pool), each with a concise vibe-based reason, plus a 1–2 sentence summary.
Output strict JSON matching the requested schema—no extra prose.

CRITICAL CONSISTENCY RULES:
1. The recommendations MUST match the genres and era you identify in the summary. If you say "Drama, Comedy from the 2000s", then ALL 5 recommendations should be Drama/Comedy films from the 2000s era.
2. Era consistency is MANDATORY. If you identify a dominant era (e.g., "2000s feel"), ALL 5 recommendations must be from that same era.
3. Genre consistency is MANDATORY. If you identify genres (e.g., "Drama, Thriller"), ALL 5 recommendations must contain those genres.

Here are the 12 winners from the A/B test:
${userSelections.map(movie => `- ${movie.title} (${movie.year})`).join('\n')}

{
  "summary": "Based on your A/B picks, you leaned toward [SPECIFIC_GENRES] with a [SPECIFIC_ERA] feel. Here are 6 films that match that profile.",
  "derived_vibe_profile": {
    "pace": "slow-burn",
    "tone": ["bleak"],
    "aesthetic": ["desaturated"],
    "narrative_feel": ["investigation"],
    "era_bias": ["90s"],
    "weirdness": "grounded"
  },
  "recommendations": [
    {"title":"Zodiac","year":2007,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.86},
    {"title":"Prisoners","year":2013,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.84},
    {"title":"The Insider","year":1999,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.82},
    {"title":"Sicario","year":2015,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.81},
    {"title":"Heat","year":1995,"reason":"Matches your preference for [specific genre/era mentioned in summary]","similarity":0.80}
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
    
    // Post-process to ensure consistency
    const processed = ensureConsistency(parsed, userSelections);
    return processed;
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

async function handleScoreRound(winners, catalogue, model = 'openai') {
  try {
    // Get the winning movies from the catalogue
    const winningMovies = winners
      .map(winnerId => findMovieById(winnerId, catalogue))
      .filter(movie => movie !== undefined);

    console.log(`[DEBUG] Winners count: ${winners.length}, Found movies: ${winningMovies.length}`);
    console.log(`[DEBUG] Winning movies:`, winningMovies.map(m => `${m.title} (${m.year})`));

    if (winningMovies.length === 0) {
      throw new Error('No valid winning movies found');
    }

    // Step 1: Get AI recommendations (5 movies from anywhere)
    let aiResponse = null;
    try {
      console.log(`[DEBUG] Attempting ${model.toUpperCase()} API call...`);
      // Default to OpenAI first; fall back to Gemini on failure
      if (model === 'gemini') {
        aiResponse = await getGeminiRecommendations(winningMovies);
        console.log(`[DEBUG] Gemini response received:`, aiResponse?.summary);
      } else {
        try {
          aiResponse = await getOpenAIRecommendations(winningMovies);
          console.log(`[DEBUG] OpenAI response received:`, aiResponse?.summary);
        } catch (openAiErr) {
          console.error('OPENAI API failed, falling back to GEMINI:', openAiErr);
          aiResponse = await getGeminiRecommendations(winningMovies);
          console.log(`[DEBUG] Gemini fallback response:`, aiResponse?.summary);
        }
      }
      
      // Convert AI recommendations to our movie format
      console.log(`[DEBUG] AI recommended ${aiResponse.recommendations.length} movies:`, aiResponse.recommendations.map(r => `${r.title} (${r.year})`));
      
      const aiMovies = [];
      for (const aiRec of aiResponse.recommendations) {
        // Try to find a matching movie in our catalogue by title and year
        const matchingMovie = catalogue.find(movie => 
          movie.title.toLowerCase() === aiRec.title.toLowerCase() && 
          movie.year === aiRec.year
        );
        
        if (matchingMovie) {
          console.log(`[DEBUG] Found catalogue match for: ${aiRec.title} (${aiRec.year})`);
          aiMovies.push(matchingMovie);
        } else {
          console.log(`[DEBUG] Creating placeholder for: ${aiRec.title} (${aiRec.year})`);
          // If not found in catalogue, create a placeholder movie object
          const placeholderMovie = {
            id: hashCode(aiRec.title + aiRec.year),
            imdbId: null,
            title: aiRec.title,
            overview: "",
            genres: [],
            year: aiRec.year,
            era: toEra(aiRec.year),
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
            watchUrl: `https://www.justwatch.com/us/search?q=${encodeURIComponent(aiRec.title)}`,
            reason: aiRec.reason,
            similarity: aiRec.similarity
          };
          aiMovies.push(placeholderMovie);
        }
      }
      
      // Add 1 movie from dataset to reach 6 total
      const datasetOne = getDatasetRecommendations(winners, catalogue, 1);
      const allRecommendations = [...aiMovies, ...datasetOne];
      
      // Prepare trailers map
      const trailers = {};
      for (const rec of allRecommendations) { trailers[rec.id] = rec.trailerUrl; }

      return {
        ok: true,
        summary: aiResponse.summary,
        derived_vibe_profile: aiResponse.derived_vibe_profile,
        recommendations: allRecommendations.slice(0, 6),
        recs: allRecommendations.slice(0, 6), // backward compatibility
        trailers
      };
    } catch (aiError) {
      console.error(`AI recommendation stage failed:`, aiError);
      
      // Fallback: if both AI models fail, prefer 6 random picks from curated 50 within catalogue
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
        
        // Process winners and generate recommendations (OpenAI default)
        const result = await handleScoreRound(winners, catalogue, 'openai');
        
        res.status(200).json(result);
      } catch (parseError) {
        res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
