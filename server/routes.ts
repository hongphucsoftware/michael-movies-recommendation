import express, { Request, Response } from "express";
import * as cheerio from "cheerio";

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

// Curated sources (your three links)
const CURATED_SOURCES = {
  rt2020: "https://editorial.rottentomatoes.com/guide/the-best-movies-of-2020/",
  imdbTop: "https://www.imdb.com/chart/top/",
  imdbList: "https://www.imdb.com/list/ls545836395/",
};

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
  id: number; // TMDb ID
  title: string;
  overview: string;
  genres: number[];
  releaseDate: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  sources?: string[]; // which list(s) it came from (for debugging)
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

// ---------- Helpers ----------
async function httpText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Fetch ${url} failed ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.text();
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

function toItem(m: TMDbMovie, sources: string[]): CatalogueItem {
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
    sources,
  };
}

// ---------- Scrapers ----------
type RawTitle = { title: string; year?: number; src: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u00A0]/g, " ")
    .replace(/[:!?,."""']/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

function parseYear(s: string): number | null {
  const m = s.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function dedupeRaw(arr: RawTitle[]): RawTitle[] {
  const seen = new Set<string>();
  const out: RawTitle[] = [];
  for (const r of arr) {
    const key = `${norm(r.title)}|${r.year ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

// Rotten Tomatoes (2020)
async function scrapeRTTitles(url: string): Promise<RawTitle[]> {
  const html = await httpText(url);
  const $ = cheerio.load(html);
  const out: RawTitle[] = [];

  // Headings like "Movie (2020)"
  $("h2,h3,h4").each((_i, el) => {
    const txt = $(el).text().trim();
    const m = txt.match(/^(.*)\s+\((\d{4})\)$/);
    if (m) out.push({ title: m[1].trim(), year: Number(m[2]), src: "rt2020" });
  });

  // Canonical movie anchors /m/<slug>
  $("a[href^='/m/']").each((_i, el) => {
    const t = $(el).text().trim();
    if (t && t.length > 1) out.push({ title: t, src: "rt2020" });
  });

  return dedupeRaw(out);
}

// IMDb Top 250
async function scrapeImdbTop(url: string): Promise<RawTitle[]> {
  const html = await httpText(url);
  const $ = cheerio.load(html);
  const out: RawTitle[] = [];

  $("td.titleColumn").each((_i, el) => {
    const a = $(el).find("a").first();
    const title = a.text().trim();
    const yearTxt = $(el).find("span.secondaryInfo").first().text().trim(); // "(1972)"
    const year = parseYear(yearTxt) ?? undefined;
    if (title) out.push({ title, year, src: "imdbTop" });
  });

  return dedupeRaw(out);
}

// IMDb list
async function scrapeImdbList(url: string, maxPages = 10): Promise<RawTitle[]> {
  const out: RawTitle[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = url.endsWith("/") ? `${url}?page=${page}` : `${url}/?page=${page}`;
    const html = await httpText(pageUrl);
    const $ = cheerio.load(html);

    let found = 0;
    $("h3.lister-item-header").each((_i, el) => {
      const a = $(el).find("a").first();
      const title = a.text().trim();
      const yearTxt = $(el).find(".lister-item-year").first().text().trim();
      const year = parseYear(yearTxt) ?? undefined;
      if (title) {
        out.push({ title, year, src: "imdbList" });
        found++;
      }
    });

    if (found === 0) break;
  }
  return dedupeRaw(out);
}

// ---------- Curated catalogue builder (strict) ----------
async function curatedCatalogue(): Promise<CatalogueItem[]> {
  if (!TMDB_API_KEY) return [];

  const [rt2020, imdbTop, imdbList] = await Promise.all([
    scrapeRTTitles(CURATED_SOURCES.rt2020),
    scrapeImdbTop(CURATED_SOURCES.imdbTop),
    scrapeImdbList(CURATED_SOURCES.imdbList),
  ]);

  // allowlist: map normalized title(+optional year) -> sources[]
  const allowByKey = new Map<string, Set<string>>();
  for (const r of dedupeRaw([...rt2020, ...imdbTop, ...imdbList])) {
    const key = `${norm(r.title)}|${r.year ?? ""}`;
    if (!allowByKey.has(key)) allowByKey.set(key, new Set());
    allowByKey.get(key)!.add(r.src);
  }

  // Resolve to TMDb using exact/strict matching against the allowlist
  const items: CatalogueItem[] = [];
  const seen = new Set<number>();

  for (const [key, sourcesSet] of Array.from(allowByKey.entries())) {
    const [titleNorm, yearStr] = key.split("|");
    const year = yearStr ? Number(yearStr) : undefined;

    const movie = await searchStrictOnTmdb(titleNorm, year);
    if (!movie) continue;
    if (movie.adult) continue;
    if (seen.has(movie.id)) continue;
    seen.add(movie.id);

    const sources: string[] = Array.from(sourcesSet);
    items.push(toItem(movie, sources));

    // tiny delay to be nice to TMDb
    await sleep(60);
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

async function searchStrictOnTmdb(titleNorm: string, year?: number): Promise<TMDbMovie | null> {
  // We search with the raw text (best effort), but only accept if normalized match.
  const rawQuery = titleNorm; // already normalized string
  const params: any = {
    query: rawQuery,
    include_adult: "false",
    language: "en-US",
  };
  if (year) params.year = year;

  const s = await tmdb("/search/movie", params);
  const cands: TMDbMovie[] = (s.results || []).filter((x: any) => x && !x.adult);

  // Strict normalized match on title or original_title; enforce year if provided
  const exact = cands.find((c) => {
    const t1 = norm(c.title || "");
    const t2 = norm(c.original_title || "");
    const yr = (c.release_date || "").slice(0, 4);
    const yearOk = year ? String(year) === yr : true;
    return yearOk && (t1 === titleNorm || t2 === titleNorm);
  });
  if (exact) return exact;

  // If we had a year and missed exact, try best same-year popular
  if (year) {
    const sameYear = cands
      .filter((c) => (c.release_date || "").startsWith(String(year)))
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
    if (sameYear) return sameYear;
  }

  // Last resort: most popular — but still require very close name (prefix >= 85% length)
  const best = cands
    .filter((c) => {
      const t = norm(c.title || c.original_title || "");
      return t.startsWith(titleNorm.slice(0, Math.floor(titleNorm.length * 0.85)));
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];

  return best ?? null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Routes ----------
api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!isCatalogueFresh()) {
      cache.catalogue = await curatedCatalogue();
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
      source: "curated(rt2020 + imdbTop250 + imdb list)",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/catalogue/build", async (_req: Request, res: Response) => {
  try {
    cache.catalogue = await curatedCatalogue();
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

// Trailer endpoint (with better fallback)
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
    if (!TMDB_API_KEY) return res.status(400).json({ ok: false, error: "TMDB_API_KEY not set" });

    let vids = await fetchVideos(id, { include_video_language: "en,null", language: "en-US" });
    if (!vids.length) vids = await fetchVideos(id, {}); // no language filter

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
      if (v.size) score += Math.min(3, Math.floor((v.size ?? 0) / 360)); // 720/1080 bump

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