// Test endpoint for OpenAI API
// Import OpenAI function directly
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

async function getOpenAIRecommendations(userSelections) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const prompt = `You are a movie recommender that infers subjective vibe (tone, pacing, aesthetics, themes, era, star/director signatures) from only the user's 12 picks.
Return 5 widely-released films from anywhere (no candidate pool), each with a concise vibe-based reason, plus a 1–2 sentence summary.
Output strict JSON matching the requested schema—no extra prose.

CRITICAL: The recommendations MUST match the genres and era you identify in the summary. If you say "Drama, Comedy from the 2000s", then ALL 5 recommendations should be Drama/Comedy films from the 2000s era.

Here are the 12 winners from the A/B test:
${userSelections.map(movie => `- ${movie.title} (${movie.year})`).join('\n')}

{
  "summary": "Based on your A/B picks, you leaned toward [GENRES] with a [ERA] feel. Here are 6 films that match that profile.",
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
      return parsed;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error('OpenAI API failed after all retries:', error);
        throw error;
      }
      console.log(`OpenAI API attempt ${attempt + 1} failed, retrying...`);
    }
  }
}

export default async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    
    // Handle request body parsing for Vercel
    let body = '';
    if (req.body) {
      // Vercel already parsed the body
      body = JSON.stringify(req.body);
    } else {
      // Manual parsing for other environments
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      await new Promise((resolve) => {
        req.on('end', resolve);
      });
    }
    
    try {
      const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      const { testMovies } = parsedBody;
      
      if (!testMovies || !Array.isArray(testMovies)) {
        return res.status(400).json({ ok: false, error: 'Invalid testMovies data' });
      }
      
      console.log(`[TEST] Testing OpenAI with movies:`, testMovies.map(m => `${m.title} (${m.year})`));
      
      const result = await getOpenAIRecommendations(testMovies);
      
      console.log(`[TEST] OpenAI response:`, result);
      
      res.status(200).json({
        ok: true,
        input: testMovies,
        output: result,
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      console.error('[TEST] Parse error:', parseError);
      console.error('[TEST] Body received:', body);
      res.status(400).json({ ok: false, error: 'Invalid JSON in request body', body: body });
    }
  } catch (e) {
    console.error('[TEST] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
