import express, { Request, Response } from "express";

// ---------- Config ----------
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || "";
if (!TMDB_API_KEY) {
  console.warn("[TMDB] Missing TMDB_API_KEY (or TMDB_KEY). Set it in Replit Secrets.");
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w780";
const CATALOGUE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

type TMDbMovie = {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  genre_ids?: number[];
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
};

type CatalogueItem = {
  id: number;
  title: string;
  overview: string;
  genres: number[];
  releaseDate: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  posterUrl: string | null;
  backdropUrl: string | null;
};

type TrailerInfo = {
  site: "YouTube" | "Vimeo" | "Unknown";
  key: string;
  url: string;
  name: string;
  size?: number;
  official?: boolean;
  type?: string;
};

const api = express.Router();

// ---------- In-memory cache ----------
const cache = {
  catalogue: [] as CatalogueItem[],
  ts: 0,
};

function isCatalogueFresh() {
  return Date.now() - cache.ts < CATALOGUE_TTL_MS && cache.catalogue.length > 0;
}

// ---------- Simple curated movie list (known good movies) ----------
const CURATED_MOVIE_TITLES = [
  "The Shawshank Redemption",
  "The Godfather",
  "The Dark Knight", 
  "Pulp Fiction",
  "Forrest Gump",
  "Inception",
  "The Matrix",
  "Goodfellas",
  "The Lord of the Rings: The Return of the King",
  "Fight Club",
  "Star Wars",
  "The Lord of the Rings: The Fellowship of the Ring",
  "Interstellar",
  "Spirited Away",
  "Saving Private Ryan",
  "The Green Mile",
  "Life Is Beautiful",
  "Se7en",
  "The Silence of the Lambs",
  "Schindler's List",
  "Parasite",
  "Soul",
  "Nomadland",
  "Sound of Metal",
  "Minari",
  "The Trial of the Chicago 7",
  "Da 5 Bloods",
  "Ma Rainey's Black Bottom",
  "Mank",
  "News of the World",
  "Wonder Woman 1984",
  "Mulan",
  "Hamilton",
  "Tenet",
  "Dune",
  "No Time to Die",
  "Spider-Man: No Way Home",
  "The Batman",
  "Top Gun: Maverick",
  "Avatar: The Way of Water",
  "Black Panther: Wakanda Forever",
  "Elvis",
  "Tar",
  "The Banshees of Inisherin",
  "Everything Everywhere All at Once",
  "The Whale",
  "Triangle of Sadness",
  "Women Talking",
  "Aftersun",
  "RRR"
];

async function tmdb(path: string, params: Record<string, any> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDb ${path} failed ${res.status}: ${text}`);
  }
  return res.json();
}

function toItem(m: TMDbMovie): CatalogueItem {
  const title = m.title || m.original_title || "(Untitled)";
  const posterUrl = m.poster_path ? `${IMG_BASE}/${POSTER_SIZE}${m.poster_path}` : null;
  const backdropUrl = m.backdrop_path ? `${IMG_BASE}/${BACKDROP_SIZE}${m.backdrop_path}` : null;
  return {
    id: m.id,
    title,
    overview: m.overview ?? "",
    genres: m.genre_ids ?? [],
    releaseDate: m.release_date ?? null,
    popularity: m.popularity ?? 0,
    voteAverage: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    posterUrl,
    backdropUrl,
  };
}

async function searchMovieOnTmdb(title: string): Promise<TMDbMovie | null> {
  const params = {
    query: title,
    include_adult: "false",
    language: "en-US",
  };

  const s = await tmdb("/search/movie", params);
  const candidates: TMDbMovie[] = (s.results || []).filter((x: any) => x && !x.adult);

  if (candidates.length === 0) return null;
  
  // Return the most popular match
  return candidates.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Build catalogue from curated list ----------
async function buildSimpleCatalogue(): Promise<CatalogueItem[]> {
  if (!TMDB_API_KEY) return [];

  const items: CatalogueItem[] = [];
  const seen = new Set<number>();

  for (const title of CURATED_MOVIE_TITLES) {
    try {
      const movie = await searchMovieOnTmdb(title);
      if (!movie) continue;
      if (movie.adult) continue;
      if (seen.has(movie.id)) continue;
      seen.add(movie.id);
      
      items.push(toItem(movie));
      
      // Small delay to be nice to TMDb
      await sleep(100);
    } catch (error) {
      console.warn(`Failed to fetch ${title}:`, error);
    }
  }

  // Sort: posters first, then popularity
  items.sort((a, b) => {
    const ap = a.posterUrl ? 1 : 0;
    const bp = b.posterUrl ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  return items;
}

// ---------- Routes ----------
api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!isCatalogueFresh()) {
      cache.catalogue = await buildSimpleCatalogue();
      cache.ts = Date.now();
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "60"), 10)));
    const start = (page - 1) * pageSize;
    const slice = cache.catalogue.slice(start, start + pageSize);

    const normalized = slice.map((m) => ({
      ...m,
      image: m.posterUrl || m.backdropUrl || null,
    }));

    res.json({
      ok: true,
      total: cache.catalogue.length,
      page,
      pageSize,
      items: normalized,
      learnedDims: 12,
      cacheAgeMs: Date.now() - cache.ts,
      source: "curated classics + recent hits",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/catalogue/build", async (_req: Request, res: Response) => {
  try {
    cache.catalogue = await buildSimpleCatalogue();
    cache.ts = Date.now();
    res.json({ ok: true, total: cache.catalogue.length, rebuiltAt: cache.ts });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/cache/flush", (_req: Request, res: Response) => {
  cache.catalogue = [];
  cache.ts = 0;
  res.json({ ok: true });
});

// Trailer endpoint
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
    if (!TMDB_API_KEY) return res.status(400).json({ ok: false, error: "TMDB_API_KEY not set" });

    let vids = await fetchVideos(id, { include_video_language: "en,null", language: "en-US" });
    if (!vids.length) vids = await fetchVideos(id, {});

    const best = scoreVideos(vids)[0];
    if (!best) return res.json({ ok: true, trailer: null });

    const t: TrailerInfo = {
      site: (best.site as any) || "Unknown",
      key: best.key,
      url:
        (best.site || "").toLowerCase() === "youtube"
          ? `https://www.youtube.com/watch?v=${best.key}`
          : (best.site || "").toLowerCase() === "vimeo"
          ? `https://vimeo.com/${best.key}`
          : best.key,
      name: best.name,
      size: best.size,
      official: best.official,
      type: best.type,
    };

    res.json({ ok: true, trailer: t });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

async function fetchVideos(id: number, extra: Record<string, any>) {
  const json = await tmdb(`/movie/${id}/videos`, extra);
  return (json?.results || []).filter((v: any) => v && v.key);
}

function scoreVideos(vids: any[]) {
  return vids
    .map((v) => {
      let score = 0;
      const type = (v.type || "").toLowerCase();
      if (type === "trailer") score += 4;
      else if (type === "teaser") score += 2;

      if (v.official) score += 3;
      if ((v.site || "").toLowerCase() === "youtube") score += 2;
      if ((v.name || "").toLowerCase().includes("official")) score += 1;
      if (v.size) score += Math.min(3, Math.floor((v.size ?? 0) / 360));

      return { ...v, __score: score };
    })
    .sort((a, b) => b.__score - a.__score);
}

// Health
api.get("/health", (_req, res) => {
  res.json({
    ok: true,
    cacheItems: cache.catalogue.length,
    cacheAgeMs: Date.now() - cache.ts,
  });
});

export default api;