import express, { Request, Response } from "express";
import * as cheerio from "cheerio";
import { z } from "zod";

/* ====================== Config ====================== */
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
if (!TMDB_API_KEY) console.warn("[TMDB] Missing TMDB_API_KEY");

const IMDB_LISTS = [
  { id: "ls094921320", url: "https://www.imdb.com/list/ls094921320/" },
];

const CATALOGUE_TTL_MS = 1000 * 60 * 60 * Number(process.env.CATALOGUE_TTL_HOURS || 168); // 1 week cache
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const POSTER = "w500", BACKDROP = "w780";

/* ====================== Types ====================== */
type BasicImdbItem = { title: string; year: number | null };

type CatalogueMovie = {
  id: number;
  title: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Array<{ id: number; name: string }>;
  sourceListId: string;
  sourceListUrl: string;
};

type BuiltState = {
  all: CatalogueMovie[];
  byList: Record<string, CatalogueMovie[]>;
  postersByList: Record<string, CatalogueMovie[]>;
  postersFlat: CatalogueMovie[];
  recPool: CatalogueMovie[];
  builtAt: number;
};

/* ====================== Global State ====================== */
let catalogueCache: BuiltState | null = null;

/* ====================== Utilities ====================== */
function noStore(res: Response) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Vary", "x-session-id");
}

function extractYear(s: string): number | null {
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const copy = [...arr];
  shuffleInPlace(copy);
  return copy.slice(0, n);
}

/* ====================== IMDB Scraping ====================== */
async function scrapeImdbListAll(listId: string): Promise<BasicImdbItem[]> {
  console.log(`[IMDB] Scraping list ${listId}`);
  let page = 1;
  const results: BasicImdbItem[] = [];

  // Limit to first 2 pages to prevent server overload during development
  while (page <= 2) {
    const url = `https://www.imdb.com/list/${listId}/?mode=detail&page=${page}`;

    try {
      const html = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (PickAFlick/1.0)" },
      }).then(r => r.text());

      const $ = cheerio.load(html);
      const oldStyle = $(".lister-item").toArray();
      const newStyle = $(".ipc-metadata-list-summary-item").toArray();

      if (oldStyle.length === 0 && newStyle.length === 0) break;

      if (oldStyle.length) {
        for (const el of oldStyle) {
          const title = $(el).find(".lister-item-header a").first().text().trim();
          const year = extractYear($(el).find(".lister-item-year").first().text());
          if (title) results.push({ title, year });
        }
      } else {
        for (const el of newStyle) {
          const title = $(el).find("a.ipc-title-link-wrapper").first().text().trim();
          const metaBits = $(el).find(".cli-title-metadata-item").toArray().map(n => $(n).text().trim());
          const year = extractYear(metaBits.join(" "));
          if (title) results.push({ title, year });
        }
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${oldStyle.length + newStyle.length} items`);
      page += 1;
    } catch (error) {
      console.error(`[IMDB] Error scraping list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${results.length}`);
  return results;
}

/* ====================== TMDB Integration ====================== */
async function tmdbSearchOne(title: string, year: number | null) {
  const q = new URLSearchParams({
    query: title,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  if (year) q.set("year", String(year));

  const url = `${TMDB}/search/movie?${q.toString()}&api_key=${TMDB_API_KEY}`;

  try {
    const json = await fetch(url).then(r => r.json());
    return json?.results?.[0] ?? null;
  } catch (error) {
    console.error(`[TMDB] Search error for "${title}":`, error);
    return null;
  }
}

async function tmdbDetails(id: number) {
  const url = `${TMDB}/movie/${id}?append_to_response=credits&language=en-US&api_key=${TMDB_API_KEY}`;
  try {
    return await fetch(url).then(r => r.json());
  } catch (error) {
    console.error(`[TMDB] Details error for ID ${id}:`, error);
    return null;
  }
}

function img(kind: "poster" | "backdrop", path?: string | null) {
  if (!path) return null;
  return kind === "poster" ? `${IMG}/${POSTER}${path}` : `${IMG}/${BACKDROP}${path}`;
}

/* ====================== Catalogue Building ====================== */
async function buildCatalogue(): Promise<BuiltState> {
  console.log("[BUILD] Building catalogue from IMDB lists");

  const all: CatalogueMovie[] = [];
  const byList: Record<string, CatalogueMovie[]> = {};

  for (const list of IMDB_LISTS) {
    console.log(`[BUILD] Processing list ${list.id}`);
    const raw = await scrapeImdbListAll(list.id);
    const acc: CatalogueMovie[] = [];

    for (const r of raw) {
      const hit = await tmdbSearchOne(r.title, r.year);
      if (!hit) {
        console.log(`[TMDB] No match for "${r.title}"`);
        continue;
      }

      const det = await tmdbDetails(hit.id);
      if (!det) continue;

      const movie: CatalogueMovie = {
        id: det.id,
        title: det.title ?? hit.title ?? "",
        year: det.release_date ? Number(det.release_date.slice(0, 4)) : r.year,
        overview: det.overview ?? null,
        posterUrl: img("poster", det.poster_path ?? hit.poster_path ?? null),
        backdropUrl: img("backdrop", det.backdrop_path ?? hit.backdrop_path ?? null),
        genres: Array.isArray(det.genres) ? det.genres.map((g: any) => ({ id: g.id, name: g.name })) : [],
        sourceListId: list.id,
        sourceListUrl: list.url,
      };

      console.log(`[TMDB] Resolved: "${r.title}" → "${movie.title}" (ID: ${movie.id})`);
      acc.push(movie);
      all.push(movie);
    }

    byList[list.id] = acc;
    console.log(`[BUILD] List ${list.id}: ${acc.length} movies resolved`);
  }

  // Pick 10 random per list for posters to reduce load
  const postersByList: Record<string, CatalogueMovie[]> = {};
  for (const list of IMDB_LISTS) {
    postersByList[list.id] = sample(byList[list.id] || [], 10);
    console.log(`[BUILD] List ${list.id}: selected ${postersByList[list.id].length} for posters`);
  }

  const postersFlat = Object.values(postersByList).flat();
  console.log(`[BUILD] Total poster movies: ${postersFlat.length}`);

  // recPool = all movies EXCEPT those selected for posters
  const postersSet = new Set(postersFlat.map(m => m.id));
  const recPool = all.filter(m => !postersSet.has(m.id));
  console.log(`[BUILD] Recommendation pool: ${recPool.length} movies`);

  console.log(`[BUILD] Final catalogue: ${all.length} total movies, ${postersFlat.length} for posters, ${recPool.length} for recommendations`);

  return {
    all,
    byList,
    postersByList,
    postersFlat,
    recPool,
    builtAt: Date.now(),
  };
}

async function getState(): Promise<BuiltState> {
  if (!catalogueCache || Date.now() - catalogueCache.builtAt > CATALOGUE_TTL_MS) {
    console.log("[BUILD] Building new catalogue (cache expired or missing)");
    catalogueCache = await buildCatalogue();
  } else {
    console.log("[BUILD] Using cached catalogue");
  }
  return catalogueCache;
}

/* ====================== Routes ====================== */
const router = express.Router();

// Poster catalogue - returns the 75 movies selected for A/B testing (15 per list)
router.get("/catalogue", async (req: Request, res: Response) => {
  noStore(res);

  try {
    const state = await getState();

    if (req.query.grouped === "1") {
      return res.json({ 
        ok: true, 
        lists: state.postersByList, 
        builtAt: state.builtAt 
      });
    }

    return res.json({ 
      ok: true, 
      items: state.postersFlat, 
      total: state.postersFlat.length,
      builtAt: state.builtAt 
    });
  } catch (error) {
    console.error("[API] Catalogue error:", error);
    res.status(500).json({ ok: false, error: "Failed to build catalogue" });
  }
});

// Health check - shows all counts
router.get("/catalogue-all", async (req: Request, res: Response) => {
  noStore(res);

  try {
    const state = await getState();
    const perListCounts: Record<string, number> = {};

    for (const [k, v] of Object.entries(state.byList)) {
      perListCounts[k] = v.length;
    }

    res.json({
      ok: true,
      totals: {
        all: state.all.length,
        posters: state.postersFlat.length,
        recPool: state.recPool.length,
        perListCounts,
      },
      builtAt: state.builtAt,
    });
  } catch (error) {
    console.error("[API] Catalogue-all error:", error);
    res.status(500).json({ ok: false, error: "Failed to get catalogue stats" });
  }
});

// Recommendations - returns random movies from the pool (excluding poster movies)
router.get("/recs", async (req: Request, res: Response) => {
  noStore(res);

  try {
    const state = await getState();
    const limit = Number(req.query.limit ?? 6);
    const pool = [...state.recPool];
    shuffleInPlace(pool);

    res.json({ 
      ok: true, 
      recs: pool.slice(0, limit),
      total: pool.length
    });
  } catch (error) {
    console.error("[API] Recs error:", error);
    res.status(500).json({ ok: false, error: "Failed to get recommendations" });
  }
});

// Trailers for specific movie IDs
router.get("/trailers", async (req: Request, res: Response) => {
  noStore(res);

  const ids = String(req.query.ids ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n));

  const out: Record<number, string | null> = {};

  for (const id of ids) {
    try {
      const url = `${TMDB}/movie/${id}/videos?language=en-US&api_key=${TMDB_API_KEY}`;
      const data = await fetch(url).then(r => r.json());
      const vids = Array.isArray(data?.results) ? data.results : [];

      const yt = vids.find((v: any) =>
        v.site === "YouTube" &&
        /Trailer|Teaser|Official|Clip/i.test(`${v.type} ${v.name}`) &&
        v.key
      );

      out[id] = yt ? `https://www.youtube.com/embed/${yt.key}` : null;
    } catch (error) {
      console.error(`[TMDB] Trailer error for ID ${id}:`, error);
      out[id] = null;
    }
  }

  res.json({ ok: true, trailers: out });
});

// Return two posters for the old PosterPair UI
router.get("/ab/next", async (req: Request, res: Response) => {
  noStore(res);
  const state = await getState();
  const [left, right] = sample(state.postersFlat, 2);
  res.json({ ok: true, left, right });
});

// No-op vote that just returns fresh random recs from the remaining pool
router.post("/ab/vote", async (req: Request, res: Response) => {
  noStore(res);
  const state = await getState();
  const limit = Number(process.env.TOP_RECS ?? 6);
  const recs = sample(state.recPool, limit);
  res.json({ ok: true, rounds: 1, recs });
});

// Legacy vote endpoint (no-op for compatibility)
router.post("/vote", async (req: Request, res: Response) => {
  noStore(res);
  res.json({ ok: true, message: "Vote recorded (no-op in random mode)" });
});

export default router;