// Replit/Agent Note (read me):
// This server builds a catalogue that contains every movie from the three reference pages 
// (Rotten Tomatoes 2020 editorial list, IMDb Top 250, and the specific IMDb list). 
// Do not replace this with a "sample" or "curated 50". The product's evaluation requires 
// the full lists. Any change that reduces coverage violates the test protocol.

import express, { Request, Response } from "express";
import * as cheerio from "cheerio";

// ============= CONFIG =============
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || "";
if (!TMDB_API_KEY) {
  console.warn("[TMDB] Missing TMDB_API_KEY (or TMDB_KEY). Set it in Replit Secrets.");
}
const FULL_LISTS_ENFORCED = String(process.env.FULL_LISTS_ENFORCED || "true") === "true"; // keep ON
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w780";
const CATALOGUE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const CONCURRENCY = 4; // polite to TMDb

// Source URLs (DO NOT CHANGE)
const CURATED_SOURCES = {
  rt2020: "https://editorial.rottentomatoes.com/guide/the-best-movies-of-2020/",
  imdbTop: "https://www.imdb.com/chart/top/",
  imdbList: "https://www.imdb.com/list/ls545836395/",
};

// ============= TYPES =============
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
  sources: string[]; // which list(s) it came from
};

type RawTitle = { title: string; year?: number; src: string };

// ============= UTILS =============
const norm = (s: string) =>
  s
    .replace(/^\d+\.\s*/, "") // Remove ranking numbers FIRST
    .toLowerCase()
    .replace(/[\u00A0]/g, " ")
    .replace(/[:!?,."""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseYear(s: string): number | null {
  const m = s.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function dedupeRaw(arr: RawTitle[]): RawTitle[] {
  const seen = new Map<string, RawTitle>();
  for (const r of arr) {
    const key = `${norm(r.title)}|${r.year ?? ""}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values());
}

async function httpText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

async function tmdb(path: string, params: Record<string, any> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDb ${path} ${res.status}`);
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

// ============= SCRAPERS (ALL TITLES) =============
// RT 2020: collect every movie on the page; default year=2020 if not present
async function scrapeRT2020(url: string): Promise<RawTitle[]> {
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
    if (t && t.length > 1) out.push({ title: t, year: 2020, src: "rt2020" }); // assume 2020 if not stated
  });

  return dedupeRaw(out);
}

// IMDb Top 250 (single page)
async function scrapeImdbTop(url: string): Promise<RawTitle[]> {
  const html = await httpText(url);
  const $ = cheerio.load(html);
  const out: RawTitle[] = [];

  $("td.titleColumn").each((_i, el) => {
    const a = $(el).find("a").first();
    const rawTitle = a.text().trim();
    const title = rawTitle.replace(/^\d+\.\s*/, ""); // Remove ranking numbers
    const yearTxt = $(el).find("span.secondaryInfo").first().text().trim(); // "(1972)"
    const year = parseYear(yearTxt) ?? undefined;
    if (title) out.push({ title, year, src: "imdbTop" });
  });

  // Some redesigns render as <li> cards; fallback:
  if (out.length < 200) {
    $("a.ipc-title-link-wrapper").each((_i, el) => {
      const rawTitle = $(el).text().trim();
      const title = rawTitle.replace(/^\d+\.\s*/, ""); // Remove ranking numbers
      const yearTxt = $(el).closest("li").find("span.ipc-title-link-helper-text").text().trim();
      const year = parseYear(yearTxt) ?? undefined;
      if (title) out.push({ title, year, src: "imdbTop" });
    });
  }

  return dedupeRaw(out);
}

// Generic IMDb list (multi-page). Crawl until no items or no "next" detected.
async function scrapeImdbList(url: string, hardLimit = 1000): Promise<RawTitle[]> {
  const out: RawTitle[] = [];
  let page = 1;
  while (true) {
    const pageUrl = url.endsWith("/") ? `${url}?page=${page}` : `${url}/?page=${page}`;
    const html = await httpText(pageUrl);
    const $ = cheerio.load(html);
    const before = out.length;

    $("h3.lister-item-header").each((_i, el) => {
      const a = $(el).find("a").first();
      const rawTitle = a.text().trim();
      const title = rawTitle.replace(/^\d+\.\s*/, ""); // Remove ranking numbers
      const yearTxt = $(el).find(".lister-item-year").first().text().trim();
      const year = parseYear(yearTxt) ?? undefined;
      if (title) out.push({ title, year, src: "imdbList" });
    });

    // Grid fallback:
    if (out.length === before) {
      $("a[href^='/title/']").each((_i, el) => {
        const rawTitle = $(el).text().trim();
        const title = rawTitle.replace(/^\d+\.\s*/, ""); // Remove ranking numbers
        if (title) out.push({ title, src: "imdbList" });
      });
    }

    const after = out.length;
    const next = $("a.lister-page-next.next-page").attr("href"); // old skin
    const hasNext = !!next || /page=\d+/.test($("a:contains('Next')").attr("href") || "");

    if (after === before || !hasNext || out.length >= hardLimit) break;
    page++;
  }
  return dedupeRaw(out);
}

// ============= TMDb RESOLUTION (STRICT) =============
async function searchStrictOnTmdb(titleNorm: string, year?: number): Promise<TMDbMovie | null> {
  const params: any = { query: titleNorm, include_adult: "false", language: "en-US" };
  if (year) params.year = year;

  const s = await tmdb("/search/movie", params);
  const cands: TMDbMovie[] = (s.results || []).filter((x: any) => x && !x.adult);

  const exact = cands.find((c) => {
    const t1 = norm(c.title || "");
    const t2 = norm(c.original_title || "");
    const yr = (c.release_date || "").slice(0, 4);
    const yearOk = year ? String(year) === yr : true;
    return yearOk && (t1 === titleNorm || t2 === titleNorm);
  });
  if (exact) return exact;

  if (year) {
    const sameYear = cands
      .filter((c) => (c.release_date || "").startsWith(String(year)))
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
    if (sameYear) return sameYear;
  }

  // Last-resort: very close prefix
  const best = cands
    .filter((c) => {
      const t = norm(c.title || c.original_title || "");
      return t.startsWith(titleNorm.slice(0, Math.floor(titleNorm.length * 0.85)));
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];

  return best ?? null;
}

async function pLimit<T>(n: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const out: T[] = [];
  let i = 0;
  const workers = new Array(n).fill(0).map(async () => {
    while (i < tasks.length) {
      const idx = i++;
      out[idx] = await tasks[idx]();
    }
  });
  await Promise.all(workers);
  return out;
}

// ============= CATALOGUE BUILD (ALL TITLES) =============
const cache = { catalogue: [] as CatalogueItem[], ts: 0, stats: {} as any, misses: [] as RawTitle[] };

async function curatedCatalogueFull(): Promise<CatalogueItem[]> {
  if (!TMDB_API_KEY) {
    console.error("[TMDb] No TMDB_API_KEY found! This will cause all resolutions to fail.");
    return [];
  }
  console.log(`[TMDb] Using API key: ${TMDB_API_KEY.substring(0, 8)}...`);

  console.log("[FULL CATALOGUE] Starting build from ALL 3 sources...");

  // 1) Scrape every title from all three sources
  const [rt, top, list] = await Promise.all([
    scrapeRT2020(CURATED_SOURCES.rt2020),
    scrapeImdbTop(CURATED_SOURCES.imdbTop),
    scrapeImdbList(CURATED_SOURCES.imdbList),
  ]);

  console.log(`[SCRAPE] RT 2020: ${rt.length}, IMDb Top: ${top.length}, IMDb List: ${list.length}`);
  
  // Debug: Show first few titles from each source
  console.log(`[DEBUG] RT 2020 samples:`, rt.slice(0, 3));
  console.log(`[DEBUG] IMDb Top samples:`, top.slice(0, 3));
  console.log(`[DEBUG] IMDb List samples:`, list.slice(0, 3));
  
  // Test title normalization
  if (top.length > 0) {
    console.log(`[DEBUG] Before norm: "${top[0].title}" -> After norm: "${norm(top[0].title)}"`);
  }

  const allow = dedupeRaw([...rt, ...top, ...list]); // union
  console.log(`[SCRAPE] Total unique titles after dedup: ${allow.length}`);

  // 2) Resolve 1:1 onto TMDb (strict), keeping ALL that can be matched
  const seen = new Set<number>();
  const tasks = allow.map((r) => async () => {
    try {
      const hit = await searchStrictOnTmdb(norm(r.title), r.year);
      if (!hit || hit.adult) {
        console.log(`[TMDb] No match for: "${r.title}" (${r.year || 'no year'}) from ${r.src}`);
        return { item: null as CatalogueItem | null, raw: r };
      }
      if (seen.has(hit.id)) return { item: null, raw: null as any }; // already included from another source duplicate
      seen.add(hit.id);
      const sources = [r.src];
      console.log(`[TMDb] Matched: "${r.title}" -> "${hit.title}" (ID: ${hit.id})`);
      return { item: toItem(hit, sources), raw: null as any };
    } catch (err: any) {
      console.error(`[TMDb] Error resolving "${r.title}":`, err.message);
      return { item: null as CatalogueItem | null, raw: r };
    }
  });

  const results = await pLimit(CONCURRENCY, tasks);
  const items: CatalogueItem[] = [];
  const misses: RawTitle[] = [];

  for (const r of results) {
    if (r.item) items.push(r.item);
    if (r.raw) misses.push(r.raw);
  }

  // 3) Sort: posters first, then popularity
  items.sort((a, b) => {
    const ap = a.posterUrl ? 1 : 0;
    const bp = b.posterUrl ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  // 4) Stats + enforcement (do NOT silently reduce)
  const stats = {
    counts: {
      rt2020: items.filter(i => i.sources.includes("rt2020")).length,
      imdbTop: items.filter(i => i.sources.includes("imdbTop")).length,
      imdbList: items.filter(i => i.sources.includes("imdbList")).length,
    },
    total: items.length,
    misses: misses.length,
    withPosters: items.filter(i => i.posterUrl).length,
  };

  console.log(`[FULL CATALOGUE] Built with ${stats.total} movies:`, stats);

  // ENFORCEMENT: Warn if numbers seem too low
  if (FULL_LISTS_ENFORCED) {
    if (stats.counts.imdbTop < 200) console.warn(`[ENFORCEMENT] IMDb Top 250 only yielded ${stats.counts.imdbTop} titles - expected ~250`);
    if (stats.total < 300) console.warn(`[ENFORCEMENT] Total catalogue only ${stats.total} titles - expected 300+`);
  }

  cache.stats = stats;
  cache.misses = misses;
  return items;
}

function isCatalogueFresh() {
  return Date.now() - cache.ts < CATALOGUE_TTL_MS && cache.catalogue.length > 0;
}

// ============= API =============
const api = express.Router();

api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!isCatalogueFresh()) {
      cache.catalogue = await curatedCatalogueFull();
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
      source: "ALL movies from RT2020 + IMDb Top 250 + IMDb List",
      stats: cache.stats,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/catalogue/build", async (_req: Request, res: Response) => {
  try {
    cache.catalogue = await curatedCatalogueFull();
    cache.ts = Date.now();
    res.json({ 
      ok: true, 
      total: cache.catalogue.length, 
      rebuiltAt: cache.ts,
      stats: cache.stats,
      message: "Built complete catalogue from ALL 3 sources"
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) });
  }
});

api.post("/cache/flush", (_req: Request, res: Response) => {
  cache.catalogue = [];
  cache.ts = 0;
  cache.stats = {};
  cache.misses = [];
  res.json({ ok: true });
});

// Trailer endpoint (unchanged)
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
    if (!TMDB_API_KEY) return res.status(400).json({ ok: false, error: "TMDB_API_KEY not set" });

    let vids = await fetchVideos(id, { include_video_language: "en,null", language: "en-US" });
    if (!vids.length) vids = await fetchVideos(id, {});

    const best = scoreVideos(vids)[0];
    if (!best) return res.json({ ok: true, trailer: null });

    const trailer = {
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

    res.json({ ok: true, trailer });
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
    stats: cache.stats,
    fullListsEnforced: FULL_LISTS_ENFORCED,
  });
});

export default api;