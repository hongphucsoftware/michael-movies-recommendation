import express, { Request, Response } from "express";
import { generateABPairs, scoreMoviesFromVotes, type Vote } from "./scoring";
import { getState, getBuildStatus, setBuildFunction, type CatalogueItem } from "./state";
import * as cheerio from "cheerio";

// ---------- Config ----------
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || "5806f2f63f3875fd9e1755ce864ee15f";
if (!TMDB_API_KEY) {
  console.warn("[TMDB] Missing TMDB_API_KEY (or TMDB_KEY). Set it in Replit Secrets.");
}

// ---------- STRICT Allowlist: Only these 5 IMDb lists are permitted ----------
const ALLOWED_IMDB_LISTS = [
  { id: "ls094921320", url: "https://www.imdb.com/list/ls094921320/" },
  { id: "ls003501243", url: "https://www.imdb.com/list/ls003501243/" },
  { id: "ls002065120", url: "https://www.imdb.com/list/ls002065120/" },
  { id: "ls000873904", url: "https://www.imdb.com/list/ls000873904/" },
  { id: "ls005747458", url: "https://www.imdb.com/list/ls005747458/" }
];

const ALLOWED_LIST_IDS = new Set(ALLOWED_IMDB_LISTS.map(list => list.id));

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w780";

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

// Set up the build function for the state management system
setBuildFunction(buildStrictCatalogue);

// ---------- IMDb List Scraping with IMDb ID extraction ----------
function extractYear(s: string): number | null {
  const m = s?.match?.(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function pickImdbId(href: string | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/title\/(tt\d+)/);
  return m ? m[1] : null;
}

// Scrape a single IMDb list and return movie data with IMDb IDs
async function scrapeImdbListWithIds(listId: string): Promise<Array<{ imdbId: string; title: string; year: number | null }>> {
  console.log(`Scraping IMDb list ${listId} for IMDb IDs...`);
  const PER_LIST_LIMIT = 200;
  let page = 1;
  const rows: Array<{ imdbId: string; title: string; year: number | null }> = [];

  while (rows.length < PER_LIST_LIMIT) {
    const url = `https://www.imdb.com/list/${listId}/?mode=detail&page=${page}`;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (PickAFlick/1.0)" }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch IMDb list ${listId} page ${page}:`, response.status);
        break;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Handle both old and new IMDb layouts
      const oldRows = $(".lister-list .lister-item").toArray();
      const newRows = $(".ipc-page-content-container .ipc-metadata-list-summary-item").toArray();

      if (oldRows.length === 0 && newRows.length === 0) {
        break; // No more content
      }

      if (oldRows.length > 0) {
        // Old layout
        for (const el of oldRows) {
          const $el = $(el);
          const a = $el.find(".lister-item-header a").first();
          const href = a.attr("href") || "";
          const imdbId = pickImdbId(href);

          if (!imdbId) continue; // Skip if no valid IMDb ID

          const title = a.text().trim();
          const yearText = $el.find(".lister-item-year").first().text();
          const year = extractYear(yearText);

          if (title) {
            rows.push({ imdbId, title, year });
            if (rows.length >= PER_LIST_LIMIT) break;
          }
        }
      } else {
        // New layout
        for (const el of newRows) {
          const $el = $(el);
          const a = $el.find("a.ipc-title-link-wrapper").first();
          const href = a.attr("href") || "";
          const imdbId = pickImdbId(href);

          if (!imdbId) continue; // Skip if no valid IMDb ID

          const title = a.text().trim();
          const metaItems = $el.find(".cli-title-metadata-item")
            .toArray()
            .map(n => $(n).text().trim())
            .join(" ");
          const year = extractYear(metaItems);

          if (title) {
            rows.push({ imdbId, title, year });
            if (rows.length >= PER_LIST_LIMIT) break;
          }
        }
      }

      page++;

      // Small delay to be respectful
      await sleep(100);

    } catch (error) {
      console.warn(`Failed to scrape IMDb list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`Scraped ${rows.length} titles with IMDb IDs from list ${listId}`);
  return rows;
}

// Map IMDb ID to TMDb using the /find endpoint (EXACT matching)
async function tmdbFindByImdbId(imdbId: string): Promise<TMDbMovie | null> {
  try {
    const url = `${TMDB_BASE}/find/${imdbId}?external_source=imdb_id&api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`TMDb /find failed for ${imdbId}:`, response.status);
      return null;
    }

    const data = await response.json();
    const movies = data.movie_results;

    if (Array.isArray(movies) && movies.length > 0) {
      const movie = movies[0]; // Take the first (and usually only) result
      if (movie.adult) return null; // Skip adult content
      return movie;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to map IMDb ID ${imdbId} to TMDb:`, error);
    return null;
  }
}

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

function toItem(m: TMDbMovie, sourceListId: string): CatalogueItem {
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
    sourceListId,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- STRICT catalogue builder using IMDb ID mapping ----------
async function buildStrictCatalogue(): Promise<CatalogueItem[]> {
  if (!TMDB_API_KEY) {
    console.warn("No TMDB_API_KEY - returning empty catalogue");
    return [];
  }

  const allItems: CatalogueItem[] = [];
  const seen = new Set<number>(); // Dedupe by TMDb ID

  console.log(`Building STRICT catalogue from ${ALLOWED_IMDB_LISTS.length} approved IMDb lists using IMDb ID mapping...`);

  // Process each approved IMDb list
  for (const list of ALLOWED_IMDB_LISTS) {
    console.log(`Processing IMDb list ${list.id}...`);

    try {
      // Scrape titles and IMDb IDs from this IMDb list
      const scrapedData = await scrapeImdbListWithIds(list.id);

      let addedFromThisList = 0;

      // Map each IMDb ID directly to TMDb using /find endpoint
      for (const { imdbId, title, year } of scrapedData) {
        try {
          const movie = await tmdbFindByImdbId(imdbId);
          if (!movie) {
            console.log(`No TMDb match for IMDb ID ${imdbId} (${title})`);
            continue;
          }
          if (movie.adult) continue;
          if (seen.has(movie.id)) continue; // Skip duplicates across lists

          seen.add(movie.id);
          allItems.push(toItem(movie, list.id));
          addedFromThisList++;

          // Small delay to be respectful to TMDb
          await sleep(100);

        } catch (error) {
          console.warn(`Failed to process IMDb ID ${imdbId} (${title}) from list ${list.id}:`, error);
        }
      }

      console.log(`Added ${addedFromThisList} movies from list ${list.id}`);

    } catch (error) {
      console.error(`Failed to process IMDb list ${list.id}:`, error);
    }
  }

  // FINAL ENFORCEMENT: Only keep movies with allowed sourceListId
  const allowedItems = allItems.filter(item => ALLOWED_LIST_IDS.has(item.sourceListId));

  console.log(`Total movies before filtering: ${allItems.length}`);
  console.log(`Total movies after allowlist filtering: ${allowedItems.length}`);

  if (allowedItems.length === 0) {
    console.error("WARNING: No movies found after strict filtering! Check TMDb API key and list accessibility.");
  }

  // Sort: posters first, then popularity
  allowedItems.sort((a, b) => {
    const ap = a.posterUrl ? 1 : 0;
    const bp = b.posterUrl ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  return allowedItems;
}

// ---------- Routes ----------
api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    const state = await getState();

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "60"), 10)));
    const start = (page - 1) * pageSize;
    const slice = state.catalogue.slice(start, start + pageSize);

    const normalized = slice.map((m) => ({
      ...m,
      image: m.posterUrl || m.backdropUrl || null,
    }));

    res.json({
      ok: true,
      total: state.catalogue.length,
      page,
      pageSize,
      items: normalized,
      learnedDims: 12,
      cacheAgeMs: Date.now() - state.builtAt,
      source: "5 approved IMDb lists only",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/catalogue/build", async (_req: Request, res: Response) => {
  try {
    const { forceRebuild } = await import('./state');
    await forceRebuild();
    const state = await getState();
    res.json({ ok: true, total: state.catalogue.length, rebuiltAt: state.builtAt });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/cache/flush", async (_req: Request, res: Response) => {
  try {
    const { clearState } = await import('./state');
    clearState();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

// Trailer endpoint
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
    if (!TMDB_KEY) return res.status(400).json({ ok: false, error: "TMDB_KEY not set" });

    console.log(`Fetching trailer for TMDb ID: ${id}`);

    // Try with English language preference first
    let vids = await fetchVideos(id, { include_video_language: "en,null", language: "en-US" });
    if (!vids.length) {
      console.log(`No English trailers found for ${id}, trying without language filter`);
      vids = await fetchVideos(id, {}); // no language filter
    }

    const best = scoreVideos(vids)[0];
    if (!best) {
      console.log(`No suitable trailer found for TMDb ID ${id}`);
      return res.json({ ok: true, trailer: null });
    }

    console.log(`Found trailer for TMDb ID ${id}: ${best.key} (${best.site})`);

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
    console.error(`Trailer fetch error for ID ${id}:`, err.message);
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

// A/B Testing Round - Get 12 pairs for voting (with strict allowlist enforcement)
api.get("/ab/round", async (req: Request, res: Response) => {
  try {
    const state = await getState();

    // STRICT: Filter to only allowed sourceListIds  
    const allowedCatalogue = state.catalogue.filter(movie => 
      movie.sourceListId && ALLOWED_LIST_IDS.has(movie.sourceListId)
    );

    console.log(`A/B pairs: ${allowedCatalogue.length} allowed movies from ${state.catalogue.length} total`);

    const pairs = generateABPairs(allowedCatalogue, 12);
    res.json({ ok: true, pairs });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

// Score Round - Process 12 votes and return 6 recommendations
api.post("/score-round", async (req: Request, res: Response) => {
  try {
    const { votes, excludeIds } = req.body;

    if (!Array.isArray(votes) || votes.length !== 12) {
      return res.status(400).json({ 
        ok: false, 
        error: "Expected exactly 12 votes" 
      });
    }

    if (!Array.isArray(excludeIds)) {
      return res.status(400).json({ 
        ok: false, 
        error: "Expected excludeIds array" 
      });
    }

    const state = await getState();

    // STRICT: Filter to only allowed sourceListIds
    const allowedCatalogue = state.catalogue.filter(movie => 
      movie.sourceListId && ALLOWED_LIST_IDS.has(movie.sourceListId)
    );

    console.log(`Scoring: ${allowedCatalogue.length} allowed movies from ${state.catalogue.length} total`);

    // Validate vote structure
    for (const vote of votes) {
      if (typeof vote.winnerId !== 'number' || typeof vote.loserId !== 'number') {
        return res.status(400).json({ 
          ok: false, 
          error: "Invalid vote structure. Expected {winnerId: number, loserId: number}" 
        });
      }
    }

    const recommendation = scoreMoviesFromVotes(votes, allowedCatalogue, excludeIds);

    // Fetch trailers for recommended movies
    const trailers: Record<number, string | null> = {};
    for (const movie of recommendation.movies) {
      try {
        const vids = await fetchVideos(movie.id, { include_video_language: "en,null", language: "en-US" });
        const best = scoreVideos(vids)[0];
        if (best?.site?.toLowerCase() === "youtube") {
          trailers[movie.id] = `https://www.youtube.com/embed/${best.key}?rel=0&modestbranding=1&autoplay=0`;
        } else {
          trailers[movie.id] = null;
        }
      } catch {
        trailers[movie.id] = null;
      }
    }

    res.json({
      ok: true,
      movies: recommendation.movies,
      trailers,
      explanation: recommendation.explanation
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

// Build status endpoint for debugging
api.get("/build/status", (_req, res) => {
  res.json(getBuildStatus());
});

// ---------- Audit Endpoints ----------
// Audit: summary of movies per sourceListId
api.get("/audit/summary", async (_req, res) => {
  try {
    const state = await getState();
    const perList: Record<string, number> = {};

    // Count movies per sourceListId
    for (const movie of state.catalogue) {
      if (movie.sourceListId) {
        perList[movie.sourceListId] = (perList[movie.sourceListId] || 0) + 1;
      }
    }

    res.json({ 
      ok: true, 
      perList, 
      total: state.catalogue.length,
      allowedListIds: Array.from(ALLOWED_LIST_IDS)
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

// Audit: find movies by title
api.get("/audit/find", async (req, res) => {
  try {
    const state = await getState();
    const query = String(req.query.title || "").toLowerCase();

    if (!query) {
      return res.status(400).json({ ok: false, error: "Missing title parameter" });
    }

    // Find movies matching the title query
    const matches = state.catalogue
      .filter(movie => movie.title.toLowerCase().includes(query))
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        sourceListId: movie.sourceListId,
        posterUrl: movie.posterUrl
      }));

    res.json({ 
      ok: true, 
      query, 
      matches,
      total: matches.length
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

// Health
api.get("/health", async (_req, res) => {
  try {
    const state = await getState();
    res.json({
      ok: true,
      cacheItems: state.catalogue.length,
      cacheAgeMs: Date.now() - state.builtAt,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

export default api;