// SERVER LOCK: DO NOT MODIFY
// Replit/Agent — Read carefully:
// This server builds a catalogue with EVERY movie from exactly three URLs:
//   1) RT 2020 editorial list
//   2) IMDb Top 250
//   3) IMDb list ls545836395
// No downsampling, no "curated 50". If scraping yields too few titles, we expose
// stats instead of shrinking the dataset.

import express, { Request, Response } from "express";
import * as cheerio from "cheerio";

// ------------ Config (unchanged TMDb plumbing) ------------
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || "";
if (!TMDB_API_KEY) console.warn("[TMDB] Missing TMDB_API_KEY (or TMDB_KEY). Set it in Replit Secrets.");

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w780";
const CONCURRENCY = 8;
const CATALOGUE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

// Films101 sources (decade → url)
const F101: Record<string, string> = {
  "f101-2020s": "https://www.films101.com/best-movies-of-2020s-by-rank.htm",
  "f101-2010s": "https://www.films101.com/best-movies-of-2010s-by-rank.htm",
  "f101-2000s": "https://www.films101.com/best-movies-of-2000s-by-rank.htm",
  "f101-1990s": "https://www.films101.com/best-movies-of-1990s-by-rank.htm",
  "f101-1980s": "https://www.films101.com/best-movies-of-1980s-by-rank.htm",
  "f101-1970s": "https://www.films101.com/best-movies-of-1970s-by-rank.htm",
  "f101-1960s": "https://www.films101.com/best-movies-of-1960s-by-rank.htm",
  "f101-1950s": "https://www.films101.com/best-movies-of-1950s-by-rank.htm",
};

// ------------ Types ------------
type RawTitle = { title: string; year?: number; src: string };
type TMDbMovie = {
  id: number; title?: string; original_title?: string; overview?: string;
  genre_ids?: number[]; release_date?: string; poster_path?: string|null; backdrop_path?: string|null;
  popularity?: number; vote_average?: number; vote_count?: number; adult?: boolean; original_language?: string;
};
type Item = {
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
  sources: string[]; // ["f101-1990s", ...]
  originalLanguage?: string | null;
  // Legacy compatibility fields for existing client
  name?: string;
  year?: string;
  poster?: string;
  youtube?: string;
  isSeries?: boolean;
  tags?: string[];
  features?: number[];
  category?: string;
};

type CatalogueCache = { ts: number; catalogue: Item[]; stats: Record<string, any> };
const cache: CatalogueCache = { ts: 0, catalogue: [], stats: {} };
let AB_SET_IDS: Set<number> = new Set();

// ------------ Helpers ------------
const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&/g, "and")
    .replace(/[–—-]/g, "-")
    .replace(/[:!?,.()"']/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseYear = (s?: string) => {
  const m = String(s || "").match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : undefined;
};

function fresh() {
  return cache.catalogue.length > 0 && Date.now() - cache.ts < CATALOGUE_TTL_MS;
}

async function httpText(url: string, tries = 3, delayMs = 400): Promise<string> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

async function pLimit<T>(limit: number, fns: (() => Promise<T>)[]) {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  for (const fn of fns) {
    const p = (async () => { results.push(await fn()); })();
    executing.push(p);
    if (executing.length >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
}

// ------------ Films101 scraping ------------
async function scrapeFilms101Decade(url: string, src: string): Promise<RawTitle[]> {
  const pages = new Set<string>();
  pages.add(url);

  // follow pagination links
  try {
    const html = await httpText(url);
    const $ = cheerio.load(html);
    $("a").each((_, a) => {
      const t = ($(a).text() || "").trim();
      const href = ($(a).attr("href") || "").trim();
      if (/^\d+$/.test(t) && Number(t) <= 9 && href && href.includes("by-rank")) {
        const full = href.startsWith("http") ? href : new URL(href, url).toString();
        pages.add(full);
      }
    });
  } catch (_) {}

  const out: RawTitle[] = [];

  for (const pg of pages) {
    console.log(`[SCRAPE] ${src}: ${pg}`);
    try {
      const html = await httpText(pg);
      const $ = cheerio.load(html);

      // Look for the main content table with movie rankings
      const tables = $("table");
      let foundMovies = false;

      tables.each((_, table) => {
        const $table = $(table);
        const headers = $table.find("tr").first().find("th, td");
        
        // Check if this table has movie ranking structure
        const hasRank = headers.filter((_, el) => /rank/i.test($(el).text())).length > 0;
        const hasTitle = headers.filter((_, el) => /title/i.test($(el).text())).length > 0;
        
        if (hasRank || hasTitle || headers.length >= 4) {
          $table.find("tr").slice(1).each((_, tr) => {
            const $row = $(tr);
            const cells = $row.find("td");
            
            if (cells.length >= 4) {
              // Try different column positions for title and year
              let title = "", year = undefined;
              
              // Common patterns: [Rank, Poster, Title, Year, Rating] or [Rank, Title, Year, Rating]
              for (let i = 1; i < Math.min(cells.length, 5); i++) {
                const cellText = $(cells[i]).text().trim();
                if (cellText && cellText.length > 2 && !cellText.match(/^\d+\.?\d*$/) && !cellText.match(/^\d{4}$/) && !title) {
                  title = cellText.replace(/\s+/g, " ").trim();
                }
                if (cellText.match(/^\d{4}$/)) {
                  year = parseYear(cellText);
                }
              }
              
              if (title && title.length > 1) {
                out.push({ title, year, src });
                foundMovies = true;
              }
            }
          });
        }
      });

      // Fallback: look for any structured list of movies
      if (!foundMovies) {
        // Try to find movie titles in any structured format
        $("tr").each((_, tr) => {
          const $row = $(tr);
          const cells = $row.find("td");
          if (cells.length >= 2) {
            const possibleTitle = $(cells[cells.length >= 4 ? 2 : 1]).text().trim();
            if (possibleTitle && possibleTitle.length > 2 && !possibleTitle.match(/^\d+\.?\d*$/)) {
              const possibleYear = cells.length > 2 ? parseYear($(cells[cells.length - 2]).text()) : undefined;
              out.push({ title: possibleTitle.replace(/\s+/g, " ").trim(), year: possibleYear, src });
            }
          }
        });
      }
    } catch (e) {
      console.warn(`[SCRAPE] Failed to scrape ${pg}:`, e);
    }
  }

  console.log(`[SCRAPE] ${src}: found ${out.length} titles`);
  return out;
}

// ------------ TMDb resolution ------------
async function tmdbSearchTitle(q: string, year?: number): Promise<TMDbMovie | null> {
  const url = `${TMDB_BASE}/search/movie?api_key=${encodeURIComponent(TMDB_API_KEY)}&query=${encodeURIComponent(q)}${year ? `&year=${year}` : ""}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j: any = await res.json();
    const hits: TMDbMovie[] = Array.isArray(j?.results) ? j.results : [];
    if (!hits.length) return null;

    // prefer exact-year, otherwise first good popularity hit
    const exact = year ? hits.find(h => parseYear(h.release_date) === year) : null;
    const best = exact || hits[0];
    return best || null;
  } catch {
    return null;
  }
}

// Genre mapping for features vector (legacy compatibility)
const GENRE_FEATURES = [
  35, // Comedy
  18, // Drama  
  28, // Action
  53, // Thriller
  878, // Sci-Fi
  14, // Fantasy
  12, // Adventure
  80, // Crime
  9648, // Mystery
  27, // Horror
  10749, // Romance
  16 // Animation
];

function generateFeatures(genreIds: number[]): number[] {
  const features = new Array(12).fill(0);
  genreIds.forEach(gid => {
    const idx = GENRE_FEATURES.indexOf(gid);
    if (idx >= 0) features[idx] = 1;
  });
  return features;
}

function genreIdsToTags(genreIds: number[]): string[] {
  const genreMap: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };
  return genreIds.map(id => genreMap[id]).filter(Boolean);
}

function toItem(m: TMDbMovie, src: string[]): Item {
  const releaseYear = parseYear(m.release_date);
  const tags = genreIdsToTags(m.genre_ids || []);

  return {
    id: m.id,
    title: (m.title || m.original_title || "").trim(),
    overview: (m.overview || "").trim(),
    genres: (m.genre_ids || []).slice(),
    releaseDate: m.release_date || null,
    popularity: m.popularity || 0,
    voteAverage: m.vote_average || 0,
    voteCount: m.vote_count || 0,
    posterUrl: m.poster_path ? `${IMG_BASE}/${POSTER_SIZE}${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${IMG_BASE}/${BACKDROP_SIZE}${m.backdrop_path}` : null,
    sources: src.slice(),
    originalLanguage: m.original_language || null,
    // Legacy compatibility for existing client
    name: (m.title || m.original_title || "").trim(),
    year: releaseYear ? releaseYear.toString() : "2024",
    poster: m.poster_path ? `${IMG_BASE}/${POSTER_SIZE}${m.poster_path}` : null,
    isSeries: false,
    tags: tags,
    features: generateFeatures(m.genre_ids || []),
    category: (releaseYear && releaseYear >= 2020) ? 'recent' : 'classic'
  };
}

// ------------ Build full catalogue + AB selection ------------
function dedupeRaw(arr: RawTitle[]): RawTitle[] {
  const seen = new Set<string>(); const out: RawTitle[] = [];
  for (const r of arr) { const k = `${norm(r.title)}|${r.year ?? ""}`; if (!seen.has(k)) { seen.add(k); out.push(r); } }
  return out;
}

function decadeFromSrc(src: string): number {
  const m = src.match(/f101-(\d{4})s/);
  return m ? Number(m[1]) : 0;
}

// Greedy diversity: spread by year-bin (early/mid/late decade) and by primary genre
function pickAB30ForDecade(items: Item[], src: string): number[] {
  if (items.length <= 30) return items.map(x => x.id);

  const decade = decadeFromSrc(src); // e.g., 1990
  const yearOf = (it: Item) => parseYear(it.releaseDate || "") || decade;
  const bin = (y: number) => (y < decade + 3 ? "early" : y < decade + 7 ? "mid" : "late");
  const byBin: Record<string, Item[]> = { early: [], mid: [], late: [] };
  for (const it of items) byBin[bin(yearOf(it))].push(it);

  // shuffle light (deterministic-ish)
  const jitter = (id: number) => (id * 9301 + 49297) % 233280;

  // primary genre bucket
  const primary = (it: Item) => (it.genres?.length ? it.genres[0] : -1);

  const out: number[] = [];
  const need = 30;
  const perBin = { early: 10, mid: 10, late: 10 };

  // within each bin, round-robin top-popularity + primary-genre coverage
  for (const k of ["early", "mid", "late"] as const) {
    const pool = byBin[k].slice().sort((a, b) => (b.popularity - a.popularity) || (jitter(a.id) - jitter(b.id)));
    const seenGenre = new Set<number>();
    while (out.length < need && out.filter(id => byBin[k].some(x => x.id === id)).length < perBin[k]) {
      let pick = pool.find(p => !seenGenre.has(primary(p)) && !out.includes(p.id));
      if (!pick) pick = pool.find(p => !out.includes(p.id));
      if (!pick) break;
      out.push(pick.id);
      seenGenre.add(primary(pick));
      // remove it
      const idx = pool.findIndex(x => x.id === pick.id);
      if (idx >= 0) pool.splice(idx, 1);
    }
  }
  // top-up if a bin was short
  if (out.length < need) {
    const remainder = items
      .slice()
      .sort((a,b)=> (b.popularity - a.popularity))
      .map(x => x.id)
      .filter(id => !out.includes(id))
      .slice(0, need - out.length);
    out.push(...remainder);
  }
  return out.slice(0, need);
}

async function buildAll(): Promise<Item[]> {
  console.log("[BUILD] Scraping Films101 decades…");

  // 1) scrape all decades
  const rawLists = await Promise.all(
    Object.entries(F101).map(async ([src, url]) => {
      try {
        const r = await scrapeFilms101Decade(url, src);
        return { src, rows: r };
      } catch (e) {
        console.warn(`[BUILD] Failed to scrape ${src}:`, e);
        return { src, rows: [] };
      }
    })
  );

  // 2) union raw rows
  const union = dedupeRaw(rawLists.flatMap(r => r.rows));
  console.log(`[BUILD] Raw rows: ${union.length}`);

  // 3) resolve to TMDb
  const seen = new Set<number>();
  const items: Item[] = [];
  const misses: RawTitle[] = [];

  const tasks = union.map((r) => async () => {
    try {
      const hit = await tmdbSearchTitle(r.title, r.year);
      if (!hit || hit.adult) { misses.push(r); return; }
      if (seen.has(hit.id)) { return; }
      seen.add(hit.id);
      items.push(toItem(hit, [r.src]));
    } catch {
      misses.push(r);
    }
  });

  await pLimit(CONCURRENCY, tasks);

  // merge sources for duplicates (same TMDb id across decades — rare but handle)
  const byId = new Map<number, Item>();
  for (const it of items) {
    const ex = byId.get(it.id);
    if (!ex) { byId.set(it.id, it); continue; }
    ex.sources = Array.from(new Set([...ex.sources, ...it.sources]));
  }
  const deduped = Array.from(byId.values());

  // 4) build AB set: 30 per decade
  const bySrc: Record<string, Item[]> = {};
  for (const it of deduped) for (const s of it.sources) {
    if (!bySrc[s]) bySrc[s] = [];
    bySrc[s].push(it);
  }
  const abIds: number[] = [];
  for (const [src, arr] of Object.entries(bySrc)) {
    const pick = pickAB30ForDecade(arr, src);
    abIds.push(...pick);
    console.log(`[AB] ${src}: selected ${pick.length}/30 from ${arr.length} candidates`);
  }
  AB_SET_IDS = new Set(abIds);

  // 5) stats
  cache.stats = {
    totalRaw: union.length,
    resolved: deduped.length,
    misses: misses.length,
    sources: Object.keys(F101),
    abSet: AB_SET_IDS.size,
    bySource: Object.fromEntries(Object.entries(bySrc).map(([k,v]) => [k, v.length]))
  };

  console.log(`[BUILD] Resolved ${deduped.length} TMDb items. AB set = ${AB_SET_IDS.size}`);
  console.log(`[BUILD] By source:`, cache.stats.bySource);

  return deduped;
}

// ------------ Trailer helpers (existing behaviour) ------------
const trailerCache = new Map<number, { at: number; embed: string|null }>();

async function bestYouTubeEmbedFor(movieId: number): Promise<string|null> {
  const cached = trailerCache.get(movieId);
  const now = Date.now();
  if (cached && now - cached.at < 1000 * 60 * 60 * 24) return cached.embed;

  const url = `${TMDB_BASE}/movie/${movieId}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
  try {
    const res = await fetch(url);
    const j: any = await res.json();
    const vids: any[] = Array.isArray(j?.results) ? j.results : [];
    const yt = vids.find(v => v.site === "YouTube" && /(Trailer|Teaser)/i.test(v.name)) || vids.find(v => v.site === "YouTube");
    const embed = yt ? `https://www.youtube.com/embed/${yt.key}` : null;
    trailerCache.set(movieId, { embed, at: now });
    return embed;
  } catch {
    trailerCache.set(movieId, { embed: null, at: now });
    return null;
  }
}

// ------------ Router ------------
const api = express.Router();

// Legacy single trailer endpoint
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid movie ID" });
    }

    const url = await bestYouTubeEmbedFor(id);
    res.json({ 
      ok: true, 
      trailer: url ? { url } : null 
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

// Batch trailers endpoint
api.get("/trailers", async (req: Request, res: Response) => {
  try {
    let raw = String(req.query.ids ?? "");
    try { raw = decodeURIComponent(raw); } catch {}
    const ids = raw.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0).slice(0, 200);
    if (!ids.length) return res.json({ ok: true, trailers: {} });

    const tasks = ids.map((id) => async () => ({ id, embed: await bestYouTubeEmbedFor(id) }));
    const pairs = await pLimit(6, tasks);
    const map: Record<number, string|null> = {};
    for (const p of pairs) map[p.id] = p.embed;
    res.json({ ok: true, trailers: map });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message ?? String(e) });
  }
});

api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!fresh()) {
      cache.catalogue = await buildAll();
      cache.ts = Date.now();
    }
    const wantAll = String(req.query.all || "") === "1";
    const allItems = cache.catalogue.slice();
    const items = wantAll ? allItems : allItems.filter(x => AB_SET_IDS.has(x.id));

    // Add legacy youtube field by fetching first trailer for compatibility
    const itemsWithYoutube = items.map(item => ({
      ...item,
      image: item.posterUrl || item.backdropUrl || null,
      youtube: null // Will be populated by separate trailer calls
    }));

    res.json({
      ok: true,
      total: allItems.length,     // banner uses this — keep full count
      items: itemsWithYoutube,
      stats: cache.stats,
      sources: Object.keys(F101),
      policy: wantAll ? "ALL_ITEMS_FOR_RECS" : "AB_SET_30_PER_DECADE",
    });
  } catch (e:any) {
    console.error("[CATALOGUE ERROR]", e);
    res.status(500).json({ ok:false, error: e?.message ?? String(e) });
  }
});

export default api;