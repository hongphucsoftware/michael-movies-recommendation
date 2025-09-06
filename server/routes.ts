import express, { Request, Response } from "express";
import * as cheerio from "cheerio";

/* ====================== Config ====================== */
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
if (!TMDB_API_KEY) console.warn("[TMDB] Missing TMDB_API_KEY");

// ONLY these 5 lists - no others, no fallbacks
const LIST_IDS = [
  "ls094921320",
  "ls003501243", 
  "ls002065120",
  "ls000873904",
  "ls005747458"
];

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const POSTER = "w500", BACKDROP = "w780";
const CATALOGUE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const CONCURRENCY = 3;

/* ====================== Types ====================== */
type Raw = { title: string; year?: number; srcList: string };
type Item = {
  id: number;
  title: string;
  year?: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  sources: string[];
};

/* ====================== Cache ====================== */
let ALL_MOVIES: Item[] = [];
let BUILT_AT = 0;

/* ====================== Utils ====================== */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function pLimit<T>(n: number, jobs: (() => Promise<T>)[]): Promise<T[]> {
  const res: T[] = [];
  const running: Promise<void>[] = [];
  for (const job of jobs) {
    const p = (async () => { res.push(await job()); })();
    running.push(p);
    if (running.length >= n) await Promise.race(running);
  }
  await Promise.all(running);
  return res;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ====================== IMDb Scraping ====================== */
async function fetchListTitles(listId: string): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>();

  for (let page = 1; page <= 3; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language": "en-US,en;q=0.9"
        }
      }).then(r => r.text());

      const $ = cheerio.load(html);
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();

        t = t.replace(/^\d+\.\s*/, "").trim();

        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";

        let yMatch = yText.match(/\(.*?(19|20)\d{2}.*?\)/);
        if (!yMatch) yMatch = yText.match(/(19|20)\d{2}/);
        const year = yMatch ? Number(yMatch[1] || yMatch[0]) : undefined;

        if (t) {
          const titleKey = `${t}_${year || 'noYear'}`;
          if (!seenTitles.has(titleKey)) {
            seenTitles.add(titleKey);
            out.push({ title: t, year, srcList: listId });
            newItemsThisPage++;
            console.log(`[IMDB] Found: "${t}" (${year || 'no year'})`);
          }
        }
      }

      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new items on page ${page}, stopping`);
        break;
      }

      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total from list ${listId}: ${out.length}`);
  return out;
}

/* ====================== TMDb Resolution ====================== */
interface TMDbSearchHit {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  adult?: boolean;
}

interface TMDbDetails {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
}

async function tmdbSearch(title: string, year?: number): Promise<TMDbSearchHit | null> {
  const u = `${TMDB}/search/movie?api_key=${encodeURIComponent(TMDB_API_KEY)}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ""}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const j: any = await r.json();
  const hits: TMDbSearchHit[] = j?.results || [];
  if (!hits.length) return null;
  const exact = year ? hits.find(h => (h.release_date || "").startsWith(String(year))) : null;
  return exact || hits[0];
}

async function tmdbDetails(id: number): Promise<TMDbDetails | null> {
  const u = `${TMDB}/movie/${id}?api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  return await r.json();
}

async function resolveRaw(raw: Raw): Promise<Item | null> {
  const hit = await tmdbSearch(raw.title, raw.year);
  if (!hit || hit.adult) return null;
  const det = await tmdbDetails(hit.id);
  if (!det) return null;

  return {
    id: det.id,
    title: (det.title || det.original_title || raw.title).trim(),
    year: raw.year,
    posterUrl: det.poster_path ? `${IMG}/${POSTER}${det.poster_path}` : null,
    backdropUrl: det.backdrop_path ? `${IMG}/${BACKDROP}${det.backdrop_path}` : null,
    overview: det.overview || "",
    sources: [raw.srcList],
  };
}

/* ====================== Build Catalogue ====================== */
async function buildAll(): Promise<void> {
  const now = Date.now();
  if (ALL_MOVIES.length && now - BUILT_AT < CATALOGUE_TTL_MS) {
    console.log(`[BUILD] Using cached catalogue: ${ALL_MOVIES.length} movies`);
    return;
  }

  ALL_MOVIES = [];
  console.log(`[BUILD] Building fresh catalogue from 5 IMDb lists`);

  const rawAll: Raw[] = [];

  for (const listId of LIST_IDS) {
    console.log(`[BUILD] Fetching IMDB list: ${listId}`);
    const rows = await fetchListTitles(listId);
    console.log(`[BUILD] List ${listId}: ${rows.length} raw titles`);
    rawAll.push(...rows);
  }

  console.log(`[BUILD] Total raw titles: ${rawAll.length}`);

  // Resolve all to TMDb
  const jobs = rawAll.map(r => async () => await resolveRaw(r));
  const resolved = await pLimit(CONCURRENCY, jobs);
  const items = resolved.filter(Boolean) as Item[];

  // Deduplicate by TMDb ID
  const uniqueItems = new Map<number, Item>();
  for (const item of items) {
    const existing = uniqueItems.get(item.id);
    if (!existing) {
      uniqueItems.set(item.id, item);
    } else {
      // Merge sources
      existing.sources = Array.from(new Set([...existing.sources, ...item.sources]));
    }
  }

  ALL_MOVIES = Array.from(uniqueItems.values());
  BUILT_AT = now;

  console.log(`[BUILD] Final catalogue: ${ALL_MOVIES.length} unique movies`);
}

/* ====================== Router ====================== */
const api = express.Router();

function noStore(res: express.Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

// Get 15 random movies per list (75 total for posters)
api.get("/catalogue", async (req: Request, res: Response) => {
  await buildAll();

  const posterMovies: Item[] = [];

  // Get 15 random from each list
  for (const listId of LIST_IDS) {
    const listMovies = ALL_MOVIES.filter(m => m.sources.includes(listId));
    const randomFromList = shuffle(listMovies).slice(0, 15);
    posterMovies.push(...randomFromList);
  }

  res.json({
    ok: true,
    policy: "RANDOM_15_PER_LIST",
    total: posterMovies.length,
    items: posterMovies.map(t => ({
      id: t.id,
      title: t.title,
      year: t.year,
      image: t.posterUrl || t.backdropUrl || null,
      posterUrl: t.posterUrl,
      backdropUrl: t.backdropUrl,
      overview: t.overview,
      sources: t.sources
    })),
  });
});

// Get 6 random movies from ALL movies for trailer recommendations
api.get("/recs", async (req: Request, res: Response) => {
  noStore(res);
  await buildAll();

  const randomMovies = shuffle(ALL_MOVIES).slice(0, 6);

  res.json({
    ok: true,
    rounds: 0, // No A/B testing
    items: randomMovies.map(t => ({
      id: t.id,
      title: t.title,
      year: t.year,
      image: t.posterUrl || t.backdropUrl,
      posterUrl: t.posterUrl,
      backdropUrl: t.backdropUrl,
      overview: t.overview,
      sources: t.sources
    })),
    topGenres: [] // No learning
  });
});

// Batch trailers
api.get("/trailers", async (req: Request, res: Response) => {
  noStore(res);
  const ids = String(req.query.ids || "")
    .split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n));
  const out: Record<number, string | null> = {};

  await Promise.all(ids.slice(0, 50).map(async id => {
    const url = `${TMDB}/movie/${id}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
    try {
      const r = await fetch(url);
      const j: any = await r.json();
      const vids: any[] = j?.results || [];
      const yt = vids.find(v => v.site === "YouTube" && /(Trailer|Teaser|Official|Clip)/i.test(v.name)) 
                || vids.find(v => v.site === "YouTube");
      out[id] = yt ? `https://www.youtube.com/embed/${yt.key}` : null;
    } catch { 
      out[id] = null; 
    }
  }));

  res.json({ ok: true, trailers: out });
});

// Individual trailer
api.get("/trailer", async (req: Request, res: Response) => {
  noStore(res);
  const id = Number(req.query.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const url = `${TMDB}/movie/${id}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
  try {
    const r = await fetch(url);
    const j: any = await r.json();
    const vids: any[] = j?.results || [];
    const yt = vids.find(v => v.site === "YouTube" && /(Trailer|Teaser|Official|Clip)/i.test(v.name))
             || vids.find(v => v.site === "YouTube");
    const trailer = yt ? { url: `https://www.youtube.com/embed/${yt.key}` } : null;
    res.json({ ok: true, trailer });
  } catch {
    res.json({ ok: true, trailer: null });
  }
});

export default api;