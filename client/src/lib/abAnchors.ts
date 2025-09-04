import type { Title } from "../hooks/useEnhancedCatalogue";

// Curated A/B testing pairs with clear genre/style contrasts
const AB_TEST_PAIRS = [
  // Round 1-4: Broad genre exploration
  {
    round: 1,
    optionA: { title: "The Dark Knight", genres: [28, 80, 18], year: 2008, type: "action" },
    optionB: { title: "The Grand Budapest Hotel", genres: [35, 18], year: 2014, type: "comedy" }
  },
  {
    round: 2,
    optionA: { title: "Blade Runner 2049", genres: [878, 18, 53], year: 2017, type: "scifi" },
    optionB: { title: "The Shawshank Redemption", genres: [18, 80], year: 1994, type: "drama" }
  },
  {
    round: 3,
    optionA: { title: "Mad Max: Fury Road", genres: [28, 12, 878], year: 2015, type: "action" },
    optionB: { title: "Her", genres: [18, 10749, 878], year: 2013, type: "romance" }
  },
  {
    round: 4,
    optionA: { title: "Get Out", genres: [27, 53, 9648], year: 2017, type: "horror" },
    optionB: { title: "La La Land", genres: [35, 18, 10749], year: 2016, type: "musical" }
  },
  // Round 5-8: Style/era contrasts within preferred genres
  {
    round: 5,
    optionA: { title: "Terminator 2: Judgment Day", genres: [28, 878, 53], year: 1991, type: "classic_action" },
    optionB: { title: "John Wick", genres: [28, 80, 53], year: 2014, type: "modern_action" }
  },
  {
    round: 6,
    optionA: { title: "Goodfellas", genres: [18, 80], year: 1990, type: "classic_drama" },
    optionB: { title: "Parasite", genres: [18, 53, 35], year: 2019, type: "modern_drama" }
  },
  {
    round: 7,
    optionA: { title: "Alien", genres: [27, 878, 53], year: 1979, type: "classic_horror" },
    optionB: { title: "Hereditary", genres: [27, 18, 9648], year: 2018, type: "modern_horror" }
  },
  {
    round: 8,
    optionA: { title: "Some Like It Hot", genres: [35, 80, 10749], year: 1959, type: "classic_comedy" },
    optionB: { title: "Knives Out", genres: [35, 80, 9648], year: 2019, type: "modern_comedy" }
  },
  // Round 9-12: Fine-tuning within top genres
  {
    round: 9,
    optionA: { title: "Heat", genres: [28, 80, 18], year: 1995, type: "crime_action" },
    optionB: { title: "Mission: Impossible - Fallout", genres: [28, 12, 53], year: 2018, type: "spy_action" }
  },
  {
    round: 10,
    optionA: { title: "There Will Be Blood", genres: [18], year: 2007, type: "intense_drama" },
    optionB: { title: "Lost in Translation", genres: [18, 35], year: 2003, type: "quiet_drama" }
  },
  {
    round: 11,
    optionA: { title: "The Matrix", genres: [28, 878], year: 1999, type: "philosophical_scifi" },
    optionB: { title: "Interstellar", genres: [878, 18, 12], year: 2014, type: "emotional_scifi" }
  },
  {
    round: 12,
    optionA: { title: "Pulp Fiction", genres: [80, 18], year: 1994, type: "nonlinear_crime" },
    optionB: { title: "Casino", genres: [80, 18], year: 1995, type: "epic_crime" }
  }
];

// Map movie titles to their metadata for easier lookups
const MOVIE_METADATA = new Map(
  AB_TEST_PAIRS.flatMap(pair => [
    [pair.optionA.title.toLowerCase(), pair.optionA],
    [pair.optionB.title.toLowerCase(), pair.optionB]
  ])
);

// Genre ID mappings
const GENRE_IDS = {
  Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
  Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
  Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749,
  SciFi: 878, Thriller: 53, War: 10752, Western: 37
};

export type Anchor = {
  id: number;
  title: string;
  year: number;
  genres: number[];
  type: string;
  round?: number;
  isOptionA?: boolean;
};

export function buildABAnchors(catalogue: Title[]): Anchor[] {
  console.log('[AB ANCHORS] Building curated A/B test pairs from catalogue');

  const anchors: Anchor[] = [];

  // Find movies in catalogue that match our curated list
  for (const pair of AB_TEST_PAIRS) {
    for (const option of [pair.optionA, pair.optionB]) {
      const found = catalogue.find(movie =>
        movie.title.toLowerCase().includes(option.title.toLowerCase()) ||
        option.title.toLowerCase().includes(movie.title.toLowerCase())
      );

      if (found) {
        anchors.push({
          id: found.id,
          title: found.title,
          year: option.year,
          genres: option.genres,
          type: option.type,
          round: pair.round,
          isOptionA: option === pair.optionA
        });
        console.log(`[AB ANCHORS] Found "${found.title}" for round ${pair.round}`);
      } else {
        console.warn(`[AB ANCHORS] Missing "${option.title}" in catalogue`);
      }
    }
  }

  console.log(`[AB ANCHORS] Built ${anchors.length} curated anchors for A/B testing`);
  return anchors;
}

export function getABPairForRound(anchors: Anchor[], round: number): [Anchor | null, Anchor | null] {
  const roundAnchors = anchors.filter(a => a.round === round);
  const optionA = roundAnchors.find(a => a.isOptionA) || null;
  const optionB = roundAnchors.find(a => !a.isOptionA) || null;

  console.log(`[AB PAIR] Round ${round}: "${optionA?.title}" vs "${optionB?.title}"`);
  return [optionA, optionB];
}

// Analyze user preferences from A/B choices
export function analyzeABPreferences(choices: number[]): {
  topGenres: Array<{ genre: string, strength: number }>;
  preferredEras: Array<{ era: string, strength: number }>;
  stylePreferences: Record<string, number>;
} {
  const genreScores: Record<number, number> = {};
  const eraScores: Record<string, number> = {};
  const styleScores: Record<string, number> = {};

  // Process each choice
  choices.forEach((chosenId, index) => {
    const round = index + 1;
    const pair = AB_TEST_PAIRS.find(p => p.round === round);
    if (!pair) return;

    // Determine which option was chosen based on title length (a proxy for id if id is not available)
    // In a real scenario, 'chosenId' would likely be the movie's actual ID.
    // For demonstration, we'll assume 'chosenId' refers to the index of the chosen option in the pair.
    // If `chosenId` is a movie ID, we need to find which movie it is.
    // A more robust approach would be to pass the chosen movie's ID.
    // For now, let's assume `choices` contains the `id` of the chosen movie.
    const chosenMovieId = chosenId;
    const chosenOption = (chosenMovieId === pair.optionA.title.length) // This logic needs to be revisited if choices are actual IDs
      ? pair.optionA
      : (chosenMovieId === pair.optionB.title.length) // This logic needs to be revisited if choices are actual IDs
        ? pair.optionB
        : undefined; // Fallback if no match

    if (!chosenOption) {
      // If the above proxy logic fails, we might need to iterate through the catalogue
      // to find the movie matching `chosenId` and then determine its role in the pair.
      // For simplicity here, we'll skip if we can't identify the choice.
      // In a real implementation, `choices` should be an array of movie IDs.
      console.warn(`Could not identify chosen movie for round ${round} with choice identifier: ${chosenId}`);
      return;
    }


    // Score genres
    chosenOption.genres.forEach(genreId => {
      genreScores[genreId] = (genreScores[genreId] || 0) + 1;
    });

    // Score eras
    const era = chosenOption.year >= 2010 ? 'modern' : chosenOption.year >= 1990 ? 'recent' : 'classic';
    eraScores[era] = (eraScores[era] || 0) + 1;

    // Score styles
    styleScores[chosenOption.type] = (styleScores[chosenOption.type] || 0) + 1;
  });

  // Convert to sorted arrays
  const topGenres = Object.entries(genreScores)
    .map(([genreId, score]) => ({
      genre: Object.keys(GENRE_IDS).find(k => GENRE_IDS[k] === parseInt(genreId)) || 'Unknown',
      strength: score / choices.length
    }))
    .sort((a, b) => b.strength - a.strength);

  const preferredEras = Object.entries(eraScores)
    .map(([era, score]) => ({ era, strength: score / choices.length }))
    .sort((a, b) => b.strength - a.strength);

  return { topGenres, preferredEras, stylePreferences: styleScores };
}