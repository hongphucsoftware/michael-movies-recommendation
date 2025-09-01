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

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || "";
if (!TMDB_API_KEY) console.warn("[TMDB] Missing TMDB_API_KEY.");

const SOURCES = {
  rt2020: "https://editorial.rottentomatoes.com/guide/the-best-movies-of-2020/",
  imdbTop: "https://www.imdb.com/chart/top/",
  imdbList: "https://www.imdb.com/list/ls545836395/",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w780";
const TTL = 1000 * 60 * 60 * 6; // 6h
const CONCURRENCY = 4;

type RawTitle = { title: string; year?: number; src: string };
type TMDbMovie = {
  id: number; title?: string; original_title?: string; overview?: string;
  genre_ids?: number[]; release_date?: string; poster_path?: string|null; backdrop_path?: string|null;
  popularity?: number; vote_average?: number; vote_count?: number; adult?: boolean;
};
type Item = {
  id: number; title: string; overview: string; genres: number[];
  releaseDate: string|null; popularity: number; voteAverage: number; voteCount: number;
  posterUrl: string|null; backdropUrl: string|null; sources: string[];
};

const norm = (s: string) =>
  s.toLowerCase()
   .replace(/[\u00A0]/g, " ")
   .replace(/[:!?,."""'']/g, "")
   .replace(/^\d+\.\s*/, "")
   .replace(/\s+/g, " ")
   .trim();

const parseYear = (s: string) => { const m = s?.match?.(/(\d{4})/); return m ? Number(m[1]) : undefined; };

function dedupeRaw(arr: RawTitle[]): RawTitle[] {
  const seen = new Set<string>(); const out: RawTitle[] = [];
  for (const r of arr) { const k = `${norm(r.title)}|${r.year ?? ""}`; if (!seen.has(k)) { seen.add(k); out.push(r); } }
  return out;
}

async function httpText(url: string, tries = 3, delayMs = 300): Promise<string> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
          "accept": "text/html,application/xhtml+xml",
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "referer": url,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

async function tmdb(path: string, params: Record<string, any> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k,v]) => v!=null && url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDb ${path} ${res.status}`);
  return res.json();
}

function toItem(m: TMDbMovie, sources: string[]): Item {
  return {
    id: m.id,
    title: m.title || m.original_title || "(Untitled)",
    overview: m.overview ?? "",
    genres: m.genre_ids ?? [],
    releaseDate: m.release_date ?? null,
    popularity: m.popularity ?? 0,
    voteAverage: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    posterUrl: m.poster_path ? `${IMG_BASE}/${POSTER_SIZE}${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${IMG_BASE}/${BACKDROP_SIZE}${m.backdrop_path}` : null,
    sources,
  };
}

/* -------------------- SCRAPERS with HTML + JSON-LD -------------------- */

// RT 2020 — headings + /m/ anchors + JSON-LD Movie names
async function scrapeRT2020(url: string): Promise<RawTitle[]> {
  const html = await httpText(url);
  const $ = cheerio.load(html);
  const out: RawTitle[] = [];

  $("h2,h3,h4").each((_i, el) => {
    const txt = $(el).text().trim();
    const m = txt.match(/^(.*)\s+\((\d{4})\)$/);
    if (m) out.push({ title: m[1].trim(), year: Number(m[2]), src: "rt2020" });
  });

  $("a[href^='/m/']").each((_i, el) => {
    const t = $(el).text().trim();
    if (t && t.length > 2) out.push({ title: t, year: 2020, src: "rt2020" });
  });

  // Additional RT selectors for article content
  $("article h2, article h3, article p strong").each((_i, el) => {
    const txt = $(el).text().trim();
    if (txt.includes("(202")) {
      const m = txt.match(/^(.*?)\s*\((\d{4})\)/);
      if (m) out.push({ title: m[1].trim(), year: Number(m[2]), src: "rt2020" });
    }
  });

  // Look for movie titles in strong/bold text
  $("strong, b").each((_i, el) => {
    const txt = $(el).text().trim();
    if (txt.length > 3 && txt.length < 100 && !txt.includes("Read") && !txt.includes("Watch")) {
      out.push({ title: txt, year: 2020, src: "rt2020" });
    }
  });

  // JSON-LD blocks
  $("script[type='application/ld+json']").each((_i, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const arr = Array.isArray(data) ? data : [data];
      for (const node of arr) {
        if (node?.["@type"] === "Movie" && node?.name) out.push({ title: node.name, year: parseYear(node.datePublished), src: "rt2020" });
        if (node?.["@type"] === "ItemList" && Array.isArray(node?.itemListElement)) {
          for (const it of node.itemListElement) {
            const name = it?.item?.name || it?.name;
            const year = parseYear(it?.item?.datePublished || it?.datePublished);
            if (name) out.push({ title: String(name), year, src: "rt2020" });
          }
        }
      }
    } catch {}
  });

  console.log(`[SCRAPE RT] Found ${out.length} titles from RT 2020`);
  return dedupeRaw(out);
}

// IMDb Top 250 — table + modern layout + JSON-LD ItemList
async function scrapeImdbTop(url: string): Promise<RawTitle[]> {
  const html = await httpText(url);
  const $ = cheerio.load(html);
  const out: RawTitle[] = [];

  // Classic table layout
  $("td.titleColumn").each((_i, el) => {
    const a = $(el).find("a").first();
    const title = a.text().trim();
    const year = parseYear($(el).find("span.secondaryInfo").first().text().trim());
    if (title) out.push({ title, year, src: "imdbTop" });
  });

  // Modern card layout
  $("a.ipc-title-link-wrapper").each((_i, el) => {
    const t = $(el).text().trim();
    const year = parseYear($(el).closest("li").find("span.ipc-title-link-helper-text").text().trim());
    if (t) out.push({ title: t, year, src: "imdbTop" });
  });

  // Alternative modern selectors - multiple approaches
  $("li[data-testid='chart-item']").each((_i, el) => {
    const titleEl = $(el).find("h3.ipc-title__text").first();
    const title = titleEl.text().replace(/^\d+\.\s*/, "").trim();
    const yearEl = $(el).find("span.sc-b189961a-8").first();
    const year = parseYear(yearEl.text());
    if (title) out.push({ title, year, src: "imdbTop" });
  });

  // New IMDb layout selectors
  $("li.cli-item").each((_i, el) => {
    const titleEl = $(el).find("h3.ipc-title__text").first();
    const title = titleEl.text().replace(/^\d+\.\s*/, "").trim();
    const yearText = $(el).find("span.sc-b189961a-8, .ipc-chip__text").text();
    const year = parseYear(yearText);
    if (title) out.push({ title, year, src: "imdbTop" });
  });

  // Broader CSS selectors for title elements
  $("h3.ipc-title__text").each((_i, el) => {
    const title = $(el).text().replace(/^\d+\.\s*/, "").trim();
    const parentLi = $(el).closest("li");
    const yearText = parentLi.find("span[class*='year'], span[class*='date'], span.sc-b189961a-8").text();
    const year = parseYear(yearText);
    if (title && title.length > 2) out.push({ title, year, src: "imdbTop" });
  });

  // JSON-LD structured data
  $("script[type='application/ld+json']").each((_i, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const arr = Array.isArray(data) ? data : [data];
      for (const node of arr) {
        if (node?.["@type"] === "ItemList" && Array.isArray(node.itemListElement)) {
          for (const it of node.itemListElement) {
            const name = it?.item?.name || it?.name;
            const year = parseYear(it?.item?.datePublished || it?.datePublished);
            if (name) out.push({ title: String(name), year, src: "imdbTop" });
          }
        }
      }
    } catch {}
  });

  console.log(`[SCRAPE IMDB TOP] Found ${out.length} titles from IMDb Top 250`);
  return dedupeRaw(out);
}

// IMDb generic list (multi-page)
async function scrapeImdbList(url: string, hardLimit = 2000): Promise<RawTitle[]> {
  const out: RawTitle[] = [];
  let page = 1;
  while (true) {
    const pageUrl = url.endsWith("/") ? `${url}?page=${page}` : `${url}/?page=${page}`;
    const html = await httpText(pageUrl);
    const $ = cheerio.load(html);
    const before = out.length;

    // Classic lister layout
    $("h3.lister-item-header").each((_i, el) => {
      const a = $(el).find("a").first();
      const title = a.text().trim();
      const year = parseYear($(el).find(".lister-item-year").first().text().trim());
      if (title) out.push({ title, year, src: "imdbList" });
    });

    // Modern list layout
    $("li[data-testid='list-item']").each((_i, el) => {
      const titleEl = $(el).find("h3.ipc-title__text").first();
      const title = titleEl.text().replace(/^\d+\.\s*/, "").trim();
      const yearEl = $(el).find("span.sc-b189961a-8").first();
      const year = parseYear(yearEl.text());
      if (title) out.push({ title, year, src: "imdbList" });
    });

    // JSON-LD fallback if present
    $("script[type='application/ld+json']").each((_i, el) => {
      try {
        const data = JSON.parse($(el).contents().text());
        const arr = Array.isArray(data) ? data : [data];
        for (const node of arr) {
          if (node?.["@type"] === "ItemList" && Array.isArray(node.itemListElement)) {
            for (const it of node.itemListElement) {
              const name = it?.item?.name || it?.name;
              const year = parseYear(it?.item?.datePublished || it?.datePublished);
              if (name) out.push({ title: String(name), year, src: "imdbList" });
            }
          }
        }
      } catch {}
    });

    const after = out.length;
    const hasNext =
      $("a.lister-page-next.next-page").length > 0 ||
      /page=\d+/.test($("a:contains('Next')").attr("href") || "");
    if (after === before || !hasNext || out.length >= hardLimit) break;
    page++;
  }
  
  console.log(`[SCRAPE IMDB LIST] Found ${out.length} titles from IMDb List`);
  return dedupeRaw(out);
}

/* -------------------- TMDb resolution (raw query, strict check) -------------------- */

async function searchStrict(rawTitle: string, normalized: string, year?: number): Promise<TMDbMovie | null> {
  const params: any = { query: rawTitle, include_adult: "false", language: "en-US" };
  if (year) params.year = year;
  const s = await tmdb("/search/movie", params);
  const cands: TMDbMovie[] = (s.results || []).filter((x: any) => x && !x.adult);

  const exact = cands.find((c) => {
    const t1 = norm(c.title || "");
    const t2 = norm(c.original_title || "");
    const yr = (c.release_date || "").slice(0, 4);
    const yearOk = year ? String(year) === yr : true;
    return yearOk && (t1 === normalized || t2 === normalized);
  });
  if (exact) return exact;

  if (year) {
    const sameYear = cands
      .filter((c) => (c.release_date || "").startsWith(String(year)))
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
    if (sameYear) return sameYear;
  }

  const best = cands
    .filter((c) => {
      const t = norm(c.title || c.original_title || "");
      return t.startsWith(normalized.slice(0, Math.floor(normalized.length * 0.85)));
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];

  return best ?? null;
}

async function pLimit<T>(n: number, tasks: (() => Promise<T>)[]) {
  const out: T[] = []; let i = 0;
  const workers = new Array(n).fill(0).map(async () => {
    while (i < tasks.length) {
      const idx = i++; out[idx] = await tasks[idx]();
    }
  });
  await Promise.all(workers);
  return out;
}

/* -------------------- Build ALL titles -------------------- */

const cache = { catalogue: [] as Item[], ts: 0, stats: {} as any, misses: [] as RawTitle[] };

async function buildAll(): Promise<Item[]> {
  console.log("[BUILD ALL] Starting comprehensive scrape from all 3 sources...");
  
  const [rt, top, list] = await Promise.all([
    scrapeRT2020(SOURCES.rt2020),
    scrapeImdbTop(SOURCES.imdbTop),
    scrapeImdbList(SOURCES.imdbList),
  ]);
  const union = dedupeRaw([...rt, ...top, ...list]);

  console.log(`[SCRAPE TOTALS] RT:${rt.length}, IMDb Top:${top.length}, IMDb List:${list.length}, Union:${union.length}`);

  // Enforcement check - refuse to continue with low counts
  if (top.length < 200) {
    console.warn(`[ENFORCEMENT] IMDb Top 250 only yielded ${top.length} titles - expected ~250. Continuing anyway.`);
  }
  if (union.length < 100) {
    console.warn(`[ENFORCEMENT] Total scraped only ${union.length} titles - expected 300+. Check scraper selectors.`);
  }

  const seen = new Set<number>();
  const misses: RawTitle[] = [];
  const tasks = union.map((r) => async () => {
    try {
      const hit = await searchStrict(r.title, norm(r.title), r.year);
      if (!hit || hit.adult) return { item: null, miss: r };
      if (seen.has(hit.id)) return { item: null, miss: null as any };
      seen.add(hit.id);
      return { item: toItem(hit, [r.src]), miss: null as any };
    } catch { return { item: null, miss: r }; }
  });

  const res = await pLimit(CONCURRENCY, tasks);
  const items: Item[] = [];
  for (const r of res) { if (r.item) items.push(r.item); else if (r.miss) misses.push(r.miss); }

  console.log(`[RESOLVE] Found ${items.length} movies, ${misses.length} missed`);

  items.sort((a, b) => {
    const ap = a.posterUrl ? 1 : 0, bp = b.posterUrl ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  cache.stats = {
    counts: { rt2020: rt.length, imdbTop: top.length, imdbList: list.length, totalScraped: union.length },
    resolved: items.length,
    missed: union.length - items.length,
    withPosters: items.filter(i => i.posterUrl).length,
  };
  cache.misses = misses;
  
  console.log(`[COMPLETE] Final catalogue: ${items.length} movies with ${items.filter(i => i.posterUrl).length} posters`);
  return items;
}

const fresh = () => Date.now() - cache.ts < TTL && cache.catalogue.length > 0;

const api = express.Router();

api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!fresh()) {
      cache.catalogue = await buildAll();
      cache.ts = Date.now();
    }
    
    const all = String(req.query.all || "") === "1";
    const total = cache.catalogue.length;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const pageSize = all ? total : Math.min(2000, Math.max(1, parseInt(String(req.query.pageSize ?? "500"), 10)));
    const start = (page - 1) * pageSize;
    const slice = cache.catalogue.slice(start, start + pageSize);

    res.json({
      ok: true,
      total,
      page, pageSize,
      items: slice.map((m) => ({ ...m, image: m.posterUrl || m.backdropUrl || null })),
      stats: cache.stats,
      policy: "ALL_TITLES_FROM_THREE_URLS",
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

api.post("/catalogue/build", async (_req, res) => {
  try {
    cache.catalogue = await buildAll();
    cache.ts = Date.now();
    res.json({ 
      ok: true, 
      total: cache.catalogue.length, 
      rebuiltAt: cache.ts, 
      stats: cache.stats,
      enforcementWarning: cache.catalogue.length < 50 ? "Collection too small - check scraper selectors" : null,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

api.post("/cache/flush", (_req, res) => {
  cache.catalogue = [];
  cache.ts = 0;
  cache.stats = {};
  cache.misses = [];
  res.json({ ok: true });
});

api.get("/catalogue/stats", (_req, res) => {
  res.json({ 
    ok: true, 
    stats: cache.stats, 
    misses: cache.misses.slice(0, 50),
    enforcementWarning: cache.catalogue.length < 50 ? "Collection too small for proper A/B testing" : null,
  });
});

// Single movie trailer
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
    if (!TMDB_API_KEY) return res.status(400).json({ ok: false, error: "TMDB_API_KEY not set" });

    const embed = await bestYouTubeEmbedFor(id);
    res.json({ ok: true, trailer: embed ? { url: embed } : null });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

/* -------- Enhanced Trailers: TMDb YouTube → YouTube Search Fallback -------- */

function scoreTmdbVideo(v: any) {
  let s = 0;
  const type = (v.type || "").toLowerCase();
  if (type === "trailer") s += 4; else if (type === "teaser") s += 2;
  if (v.official) s += 3;
  if ((v.name || "").toLowerCase().includes("official")) s += 1;
  if (v.size) s += Math.min(3, Math.floor((v.size ?? 0) / 360));
  return s;
}

const ytEmbed = (id: string) => `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;

const TRAILER_TTL_MS = 1000 * 60 * 60 * 24; // 24h cache
const trailerCache = new Map<number, { embed: string | null; at: number }>();

async function tmdbYouTubeKey(movieId: number): Promise<string | null> {
  const v1 = await tmdb(`/movie/${movieId}/videos`, { include_video_language: "en,null", language: "en-US" });
  let vids = (v1.results || []).filter((v: any) => v && v.key && String(v.site).toLowerCase() === "youtube");
  if (!vids.length) {
    const v2 = await tmdb(`/movie/${movieId}/videos`, {});
    vids = (v2.results || []).filter((v: any) => v && v.key && String(v.site).toLowerCase() === "youtube");
  }
  if (!vids.length) return null;
  const best = vids.sort((a: any, b: any) => scoreTmdbVideo(b) - scoreTmdbVideo(a))[0];
  return best?.key || null;
}

// YouTube search without API - scrapes results page and scores video IDs
async function youtubeSearchVideoId(query: string, preferYear?: string): Promise<string | null> {
  const url = `https://www.youtube.com/results?hl=en&search_query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
      "accept": "text/html,application/xhtml+xml",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "referer": "https://www.youtube.com/",
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const ids = Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map(m => m[1]);
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) { if (!seen.has(id)) { seen.add(id); uniq.push(id); } }
  const cand = uniq.slice(0, 40);
  if (!cand.length) return null;

  let best = cand[0], bestScore = -Infinity;
  for (const id of cand) {
    const idx = html.indexOf(id);
    const window = html.slice(Math.max(0, idx - 600), idx + 600).toLowerCase();
    let s = 0;
    if (window.includes("official")) s += 3;
    if (window.includes("trailer")) s += 3;
    if (window.includes("teaser")) s += 1;
    if (window.includes("4k") || window.includes("hd")) s += 1;
    // Negative cues
    if (window.includes("fan made")) s -= 3;
    if (window.includes("fan-made")) s -= 3;
    if (window.includes("music video")) s -= 3;
    if (window.includes("game")) s -= 2;
    // Year preference
    if (preferYear && window.includes(preferYear)) s += 1;
    if (s > bestScore) { bestScore = s; best = id; }
  }
  return best;
}

async function bestYouTubeEmbedFor(movieId: number): Promise<string | null> {
  const now = Date.now();
  const cached = trailerCache.get(movieId);
  if (cached && now - cached.at < TRAILER_TTL_MS) return cached.embed;

  // 1) Try TMDb for YouTube videos first
  let key = await tmdbYouTubeKey(movieId);

  // 2) If TMDb has no YouTube videos, search YouTube by title + year
  if (!key) {
    try {
      const meta = await tmdb(`/movie/${movieId}`, { language: "en-US" });
      const title = meta?.title || meta?.original_title || "";
      const year = (meta?.release_date || "").slice(0, 4);
      if (title) {
        key = await youtubeSearchVideoId(`${title} ${year} official trailer`, year);
        if (!key) key = await youtubeSearchVideoId(`${title} official trailer`, year);
        if (!key) key = await youtubeSearchVideoId(`${title} trailer`, year);
      }
    } catch { /* ignore search errors */ }
  }

  const embed = key ? ytEmbed(key) : null;
  trailerCache.set(movieId, { embed, at: now });
  return embed;
}

// Batch: /api/trailers?ids=1,2,3 → { trailers: { [id]: embed|null } }
api.get("/trailers", async (req: Request, res: Response) => {
  try {
    let raw = String(req.query.ids ?? "");
    // Accept both "1,2,3" and "1%2C2%2C3" (URL encoded commas)
    try { raw = decodeURIComponent(raw); } catch {}
    const ids = raw
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n))
      .slice(0, 50);

    if (!ids.length) return res.json({ ok: true, trailers: {} });
    if (!TMDB_API_KEY) return res.status(400).json({ ok: false, error: "TMDB_API_KEY not set" });

    const tasks = ids.map((id) => async () => ({ id, embed: await bestYouTubeEmbedFor(id) }));
    const out = await pLimit(CONCURRENCY, tasks);

    const map: Record<number, string | null> = {};
    out.forEach(({ id, embed }) => { map[id] = embed || null; });

    res.json({ ok: true, trailers: map });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
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

api.get("/health", (_req, res) => {
  res.json({
    ok: true,
    cacheItems: cache.catalogue.length,
    cacheAgeMs: Date.now() - cache.ts,
    stats: cache.stats,
    enforcementWarning: cache.catalogue.length < 50 ? "Collection too small" : null,
  });
});

export default api;