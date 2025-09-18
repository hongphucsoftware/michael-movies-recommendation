// Vercel serverless function for /api/catalogue/all

import { SEED_LIST_1, SEED_LIST_2, SEED_LIST_3, SEED_LIST_4, SEED_LIST_5 } from '../seed-data.js';

const LIST_IDS = [
  'ls094921320',
  'ls003501243',
  'ls002065120',
  'ls000873904',
  'ls005747458',
];

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

function mapSeedToMovies(seed, listId) {
  return seed.map((s) => ({
    id: hashCode(s.tt),
    imdbId: s.tt,
    title: s.title,
    overview: '',
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
    sourceListIds: [listId],
  }));
}

export default (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const all = [
      mapSeedToMovies(SEED_LIST_1, LIST_IDS[0]),
      mapSeedToMovies(SEED_LIST_2, LIST_IDS[1]),
      mapSeedToMovies(SEED_LIST_3, LIST_IDS[2]),
      mapSeedToMovies(SEED_LIST_4, LIST_IDS[3]),
      mapSeedToMovies(SEED_LIST_5, LIST_IDS[4]),
    ].flat();

    res.status(200).json({ ok: true, items: all });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};


