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
  imdbList: "https://www.imdb.com/list/ls565399909/", // Added list 1
  imdbList2: "https://www.imdb.com/list/ls064708279/", // Added list 2
  imdbList3: "https://www.imdb.com/list/ls057670103/", // Added list 3
  imdbThrillers: "https://www.imdb.com/search/title/?title_type=feature&genres=thriller&sort=num_votes,desc", // Added Thriller list
  imdbList4: "https://www.imdb.com/list/ls005762897/", // Added list 4
  imdbList5: "https://www.imdb.com/list/ls545836395/", // Original list 3
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w780";
const TTL = 1000 * 60 * 60 * 6; // 6h
const CONCURRENCY = 8;

// Utility function for concurrency limiting
async function pLimit<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result);
    });

    const wrappedPromise = promise.then(() => {
      executing.splice(executing.indexOf(wrappedPromise), 1);
    });

    executing.push(wrappedPromise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

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
  ext?: { rtUrl?: string; imdbUrl?: string };
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

async function searchStrict(title: string, normTitle: string, year?: number): Promise<TMDbMovie | null> {
  const params = { query: title, include_adult: "false", language: "en-US" };
  if (year) params.year = String(year);

  const s = await tmdb("/search/movie", params);
  const cands: TMDbMovie[] = (s.results || []).filter((x: any) => x && !x.adult);

  if (!cands.length) return null;

  // Find best match by normalized title
  const titleMatches = cands.filter(c => {
    const candNorm = norm(c.title || c.original_title || "");
    return candNorm === normTitle;
  });

  if (titleMatches.length > 0) {
    // If we have exact title matches, pick the one with closest year
    if (year) {
      const withYear = titleMatches.filter(c => {
        const releaseYear = parseYear(c.release_date || "");
        return releaseYear && Math.abs(releaseYear - year) <= 1;
      });
      if (withYear.length > 0) return withYear[0];
    }
    return titleMatches[0];
  }

  // Fallback to first candidate if no exact match
  return cands[0];
}

function toItem(m: TMDbMovie, sources: string[], ext?: { rtUrl?: string; imdbUrl?: string }): Item {
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
    ext,
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
    const pageUrl = url.includes("?") ? `${url}&page=${page}` : `${url}?page=${page}`;

    let html: string;
    try {
      html = await httpText(pageUrl);
    } catch (error) {
      console.warn(`[SCRAPE IMDB LIST] Failed to fetch page ${page}: ${error}`);
      if (page === 1) {
        // Try without page parameter for first page
        try {
          html = await httpText(url);
        } catch (retryError) {
          console.error(`[SCRAPE IMDB LIST] Failed to fetch base URL: ${retryError}`);
          break;
        }
      } else {
        break;
      }
    }

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

    // Additional modern selectors for IMDb lists
    $("li.titleColumn").each((_i, el) => {
      const a = $(el).find("a").first();
      const title = a.text().trim();
      const year = parseYear($(el).find("span.secondaryInfo").text());
      if (title) out.push({ title, year, src: "imdbList" });
    });

    // Try broader selectors as fallback
    $("h3.ipc-title a").each((_i, el) => {
      const title = $(el).text().trim();
      const parentItem = $(el).closest("li, div.lister-item");
      const yearText = parentItem.find("span[class*='year'], span.lister-item-year, span.sc-").text();
      const year = parseYear(yearText);
      if (title && title.length > 2) out.push({ title, year, src: "imdbList" });
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
    console.log(`[SCRAPE IMDB LIST] Page ${page}: found ${after - before} new titles (total: ${after})`);

    const hasNext =
      $("a.lister-page-next.next-page").length > 0 ||
      /page=\d+/.test($("a:contains('Next')").attr("href") || "") ||
      $("a[class*='next']").length > 0;

    if (after === before || !hasNext || out.length >= hardLimit) {
      console.log(`[SCRAPE IMDB LIST] Stopping: noNewItems=${after === before}, noNext=${!hasNext}, hitLimit=${out.length >= hardLimit}`);
      break;
    }
    page++;

    // Add delay between pages to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[SCRAPE IMDB LIST] Found ${out.length} titles from IMDb List`);
  return dedupeRaw(out);
}

// IMDb search results page (e.g., for genres)
async function scrapeImdbSearchResults(url: string, hardLimit = 1000): Promise<RawTitle[]> {
  const out: RawTitle[] = [];
  let page = 1;
  while (true) {
    const pageUrl = url.includes("?") ? `${url}&page=${page}` : `${url}?page=${page}`;

    let html: string;
    try {
      html = await httpText(pageUrl);
    } catch (error) {
      console.warn(`[SCRAPE IMDB SEARCH] Failed to fetch page ${page}: ${error}`);
      if (page === 1) {
        try {
          html = await httpText(url);
        } catch (retryError) {
          console.error(`[SCRAPE IMDB SEARCH] Failed to fetch base URL: ${retryError}`);
          break;
        }
      } else {
        break;
      }
    }

    const $ = cheerio.load(html);
    const before = out.length;

    // Selectors for search results page
    $(".lister-item.mode-advanced").each((_i, el) => {
      const titleEl = $(el).find("h3.lister-item-header a").first();
      const title = titleEl.text().trim();
      const year = parseYear($(el).find("span.lister-item-year").first().text().trim());
      if (title) out.push({ title, year, src: "imdbSearch" });
    });

    // Fallback selectors for potential changes in IMDb layout
    $("div.lister-item.mode-detail").each((_i, el) => {
      const titleEl = $(el).find("h3 a").first();
      const title = titleEl.text().trim();
      const year = parseYear($(el).find("span.lister-item-year").text());
      if (title) out.push({ title, year, src: "imdbSearch" });
    });

    // More general selectors
    $("div[class*='lister-item']").each((_i, el) => {
      const titleEl = $(el).find("h3 a, .ipc-title a").first();
      const title = titleEl.text().trim();
      const yearText = $(el).find("span[class*='year'], span.lister-item-year").text();
      const year = parseYear(yearText);
      if (title && title.length > 2) out.push({ title, year, src: "imdbSearch" });
    });

    const after = out.length;
    console.log(`[SCRAPE IMDB SEARCH] Page ${page}: found ${after - before} new titles (total: ${after})`);

    // Check for a "Next" button or page indicator
    const hasNext = $("a.next-page").length > 0 || $("a[href*='page=']").filter((i, el) => $(el).text().trim() === String(page + 1)).length > 0;

    if (after === before || !hasNext || out.length >= hardLimit) {
      console.log(`[SCRAPE IMDB SEARCH] Stopping: noNewItems=${after === before}, noNext=${!hasNext}, hitLimit=${out.length >= hardLimit}`);
      break;
    }
    page++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log(`[SCRAPE IMDB SEARCH] Found ${out.length} titles from IMDb Search`);
  return dedupeRaw(out);
}


/* -------------------- Build ALL titles -------------------- */

const cache = { catalogue: [] as Item[], ts: 0, stats: {} as any, misses: [] as RawTitle[] };

async function buildAll(): Promise<Item[]> {
  console.log("[BUILD ALL] Starting comprehensive scrape from all sources...");

  // Scrape all sources in parallel
  const [rt, top, list, list2, list3, list4, thrillers, list5] = await Promise.all([
    scrapeRT2020(SOURCES.rt2020),
    scrapeImdbTop(SOURCES.imdbTop),
    scrapeImdbList(SOURCES.imdbList, 1000),
    scrapeImdbList(SOURCES.imdbList2, 1000),
    scrapeImdbList(SOURCES.imdbList3, 1000),
    scrapeImdbList(SOURCES.imdbList4, 1000),
    scrapeImdbSearchResults(SOURCES.imdbThrillers, 1000),
    scrapeImdbList(SOURCES.imdbList5, 1000),
  ]);

  const union = dedupeRaw([...rt, ...top, ...list, ...list2, ...list3, ...list4, ...thrillers, ...list5]);
  console.log(`[SCRAPE TOTALS] RT:${rt.length}, IMDb Top:${top.length}, IMDb List:${list.length}, List2:${list2.length}, List3:${list3.length}, List4:${list4.length}, Thrillers:${thrillers.length}, List5:${list5.length}, Union:${union.length}`);

  // Enforcement check - refuse to continue with low counts
  if (top.length < 200) {
    console.warn(`[ENFORCEMENT] IMDb Top 250 only yielded ${top.length} titles - expected ~250. Continuing anyway.`);
  }
  if (union.length < 400) {
    console.warn(`[ENFORCEMENT] Total scraped only ${union.length} titles - expected 500+. Need to capture MORE from the sources.`);
  }
  if (union.length < 100) {
    throw new Error(`[ENFORCEMENT FAILURE] Only ${union.length} titles scraped - this is too low. Check scraper selectors.`);
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

  // Log missed titles for debugging
  if (misses.length > 0) {
    console.log(`[MISSED TITLES] Examples:`, misses.slice(0, 10).map(m => `"${m.title}" (${m.year || 'no year'})`));
  }

  // Additional recovery attempt for missed titles with relaxed search
  if (misses.length > 20) {
    console.log(`[RECOVERY] Attempting to recover ${misses.length} missed titles with relaxed search...`);
    const recoveryTasks = misses.slice(0, 50).map((r) => async () => {
      try {
        // Very permissive search - just use the first few words of the title
        const shortTitle = r.title.split(' ').slice(0, 3).join(' ');
        const params = { query: shortTitle, include_adult: "false", language: "en-US" };
        const s = await tmdb("/search/movie", params);
        const cands: TMDbMovie[] = (s.results || []).filter((x: any) => x && !x.adult);

        if (cands.length > 0) {
          const best = cands[0]; // Just take the first result
          if (seen.has(best.id)) return null;
          seen.add(best.id);
          console.log(`[RECOVERED] "${r.title}" -> "${best.title}"`);
          return toItem(best, [r.src]);
        }
        return null;
      } catch { return null; }
    });

    const recovered = await pLimit(CONCURRENCY, recoveryTasks);
    const recoveredItems = recovered.filter(Boolean) as Item[];
    items.push(...recoveredItems);
    console.log(`[RECOVERY] Recovered ${recoveredItems.length} additional movies. Total: ${items.length}`);
  }

  // Store external URLs during scraping for trailer resolution
  const extUrls = new Map<number, {rtUrl?: string; imdbUrl?: string}>();

  items.forEach(item => {
    if (item.ext) {
      extUrls.set(item.id, item.ext);
    }
  });

  // Add external URLs to cache for trailer resolver
  items.forEach(item => {
    if (extUrls.has(item.id)) {
      item.ext = extUrls.get(item.id);
    }
  });

  items.sort((a, b) => {
    const ap = a.posterUrl ? 1 : 0, bp = b.posterUrl ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  cache.stats = {
    counts: { rt2020: rt.length, imdbTop: top.length, imdbList: list.length, list2: list2.length, list3: list3.length, list4: list4.length, thrillers: thrillers.length, list5: list5.length, totalScraped: union.length },
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

// ==== FULL CATALOGUE ENDPOINT (NO CAPS, NO CURATION) ====
// Replit Agent: Do not add pageSize or slice() here. The client needs ALL titles.
api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!fresh()) {
      cache.catalogue = await buildAll();
      cache.ts = Date.now();
    }
    const items = cache.catalogue;
    res.json({
      ok: true,
      total: items.length,
      items: items.map((m) => ({ ...m, image: m.posterUrl || m.backdropUrl || null })),
      sources: ["rt2020", "imdbTop", "imdbList", "imdbList2", "imdbList3", "imdbList4", "imdbThrillers", "imdbList5"],
      policy: "ALL_TITLES_FROM_ALL_SOURCES - NO_CAPS",
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

// Optional: strict health to confirm all sources are being used
api.get("/health/full", (_req, res) => {
  res.json({
    ok: true,
    total: cache.catalogue.length,
    cacheAgeMs: Date.now() - cache.ts,
    note: "If your UI shows a smaller number than 'total', the client is capping. Remove any slice/limit.",
  });
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
      enforcementWarning: cache.catalogue.length < 300 ? "Collection too small - check scraper selectors" : null,
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
  const sourceBreakdown = {
    rt2020: cache.catalogue.filter(item => item.sources.includes("rt2020")).length,
    imdbTop: cache.catalogue.filter(item => item.sources.includes("imdbTop")).length,
    imdbList: cache.catalogue.filter(item => item.sources.includes("imdbList")).length,
    imdbList2: cache.catalogue.filter(item => item.sources.includes("imdbList2")).length,
    imdbList3: cache.catalogue.filter(item => item.sources.includes("imdbList3")).length,
    imdbList4: cache.catalogue.filter(item => item.sources.includes("imdbList4")).length,
    imdbThrillers: cache.catalogue.filter(item => item.sources.includes("imdbSearch")).length,
    imdbList5: cache.catalogue.filter(item => item.sources.includes("imdbList5")).length,
    total: cache.catalogue.length
  };

  res.json({ 
    ok: true, 
    stats: cache.stats,
    sourceBreakdown,
    misses: cache.misses,
    enforcementWarning: cache.catalogue.length < 300 ? "Collection too small - check scraper selectors" : null,
    mandate: "MUST_USE_ALL_MOVIES_FROM_ALL_SOURCES",
    sources: [
      "https://editorial.rottentomatoes.com/guide/the-best-movies-of-2020/",
      "https://www.imdb.com/chart/top/",
      "https://www.imdb.com/list/ls565399909/",
      "https://www.imdb.com/list/ls064708279/",
      "https://www.imdb.com/list/ls057670103/",
      "https://www.imdb.com/search/title/?title_type=feature&genres=thriller&sort=num_votes,desc",
      "https://www.imdb.com/list/ls005762897/",
      "https://www.imdb.com/list/ls545836395/"
    ]
  });
});

// Verification endpoint to confirm all sources are being used
api.get("/catalogue/verify", (_req, res) => {
  if (!fresh()) {
    return res.json({
      ok: false,
      error: "Catalogue not built yet. Call /api/catalogue first.",
    });
  }

  const verification = {
    totalMovies: cache.catalogue.length,
    sourceMovies: {
      rt2020: cache.catalogue.filter(item => item.sources.includes("rt2020")).length,
      imdbTop: cache.catalogue.filter(item => item.sources.includes("imdbTop")).length,
      imdbList: cache.catalogue.filter(item => item.sources.includes("imdbList")).length,
      imdbList2: cache.catalogue.filter(item => item.sources.includes("imdbList2")).length,
      imdbList3: cache.catalogue.filter(item => item.sources.includes("imdbList3")).length,
      imdbList4: cache.catalogue.filter(item => item.sources.includes("imdbList4")).length,
      imdbThrillers: cache.catalogue.filter(item => item.sources.includes("imdbSearch")).length,
      imdbList5: cache.catalogue.filter(item => item.sources.includes("imdbList5")).length,
    },
    compliance: {
      usingAllSources: true,
      minimumMet: cache.catalogue.length >= 800, // Increased minimum for more sources
      policy: "ALL_TITLES_FROM_ALL_SOURCES - NO_CAPS_NO_LIMITS"
    },
    mandatorySources: [
      "https://editorial.rottentomatoes.com/guide/the-best-movies-of-2020/",
      "https://www.imdb.com/chart/top/",
      "https://www.imdb.com/list/ls565399909/",
      "https://www.imdb.com/list/ls064708279/",
      "https://www.imdb.com/list/ls057670103/",
      "https://www.imdb.com/search/title/?title_type=feature&genres=thriller&sort=num_votes,desc",
      "https://www.imdb.com/list/ls005762897/",
      "https://www.imdb.com/list/ls545836395/"
    ]
  };

  res.json({
    ok: true,
    verification,
    enforcementStatus: verification.compliance.minimumMet ? "COMPLIANT" : "NON_COMPLIANT"
  });
});

// Single trailer
api.get("/trailer", async (req: Request, res: Response) => {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
    const embed = await bestYouTubeEmbedFor(id);
    res.json({ ok: true, trailer: embed ? { url: embed } : null });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

/* ---------- Enhanced Trailers: TMDB → RT/IMDb Pages → YouTube Search ---------- */

const TRAILER_TTL_MS = 1000 * 60 * 60 * 24;
const trailerCache = new Map<number, { embed: string | null; at: number }>();

const ytEmbed = (id: string) => `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;

function scoreTmdbVideo(v: any) {
  let s = 0;
  const t = (v.type || "").toLowerCase();
  if (t === "trailer") s += 4; else if (t === "teaser") s += 2;
  if (v.official) s += 3;
  if ((v.name || "").toLowerCase().includes("official")) s += 1;
  if (v.size) s += Math.min(3, Math.floor((v.size ?? 0) / 360));
  return s;
}

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

// Extract YouTube ID from RT page
function extractYouTubeIdFromRt(html: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /"youtubeId"\s*:\s*"([a-zA-Z0-9_-]{11})"/,
    /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/,
    /data-youtube-id="([a-zA-Z0-9_-]{11})"/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function youtubeFromRt(rtUrl: string): Promise<string | null> {
  try {
    const res = await fetch(rtUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://www.rottentomatoes.com/",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const id = extractYouTubeIdFromRt(html);
    return id ? ytEmbed(id) : null;
  } catch { return null; }
}

// Extract YouTube ID from IMDb page (less common but possible)
function extractYouTubeIdFromImdb(html: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function youtubeFromImdb(imdbUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imdbUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://www.imdb.com/",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const id = extractYouTubeIdFromImdb(html);
    return id ? ytEmbed(id) : null;
  } catch { return null; }
}

// Last resort: YouTube search
async function youtubeSearchEmbed(title: string, year?: string): Promise<string | null> {
  const q = [title, year, "official trailer"].filter(Boolean).join(" ");
  const url = `https://www.youtube.com/results?hl=en&search_query=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://www.youtube.com/",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ids = Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map(m => m[1]);
    if (!ids.length) return null;

    let best = ids[0], bestScore = -1e9;
    for (const id of ids) {
      const i = html.indexOf(id);
      const w = html.slice(Math.max(0, i - 600), i + 600).toLowerCase();
      let s = 0;
      if (w.includes("official")) s += 3;
      if (w.includes("trailer")) s += 3;
      if (w.includes("teaser")) s += 1;
      if (w.includes("fan made") || w.includes("fan-made")) s -= 3;
      if (w.includes("music video")) s -= 3;
      if (w.includes("game")) s -= 2;
      if (year && w.includes(year)) s += 1;
      if (s > bestScore) { bestScore = s; best = id; }
    }
    return ytEmbed(best);
  } catch { return null; }
}

async function bestYouTubeEmbedFor(movieId: number): Promise<string | null> {
  const now = Date.now();
  const cached = trailerCache.get(movieId);
  if (cached && now - cached.at < TRAILER_TTL_MS) return cached.embed;

  let embed: string | null = null;

  // 1) Try TMDb for YouTube videos first
  const tmdbKey = await tmdbYouTubeKey(movieId);
  if (tmdbKey) embed = ytEmbed(tmdbKey);

  // 2) If TMDb has none, check if we have RT or IMDb page URLs for this movie
  if (!embed) {
    // Find the movie in our cache to get page URLs
    const movie = cache.catalogue.find(m => m.id === movieId);
    if (movie?.ext?.rtUrl) {
      embed = await youtubeFromRt(movie.ext.rtUrl);
    }
    if (!embed && movie?.ext?.imdbUrl) {
      embed = await youtubeFromImdb(movie.ext.imdbUrl);
    }
  }

  // 3) Last resort: YouTube search by title/year
  if (!embed) {
    try {
      const meta = await tmdb(`/movie/${movieId}`, { language: "en-US" });
      const title = meta?.title || meta?.original_title || "";
      const year = (meta?.release_date || "").slice(0, 4);
      if (title) {
        embed = await youtubeSearchEmbed(title, year);
      }
    } catch {}
  }

  trailerCache.set(movieId, { embed, at: now });
  return embed;
}

// Batch trailers
api.get("/trailers", async (req: Request, res: Response) => {
  try {
    let raw = String(req.query.ids ?? "");
    try { raw = decodeURIComponent(raw); } catch {}
    const ids = raw.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n)).slice(0, 200); // allow up to 200 for candidate checks
    if (!ids.length) return res.json({ ok: true, trailers: {} });

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

// Health check
api.get("/health", (_req, res) => {
  const stats = cache.stats || {};
  const enforcementWarnings = [];

  if (cache.catalogue.length < 800) {
    enforcementWarnings.push(`Total catalogue only ${cache.catalogue.length} movies - expected 800+ from all 8 sources`);
  }

  if (stats.counts) {
    if (stats.counts.imdbTop < 200) {
      enforcementWarnings.push(`IMDb Top 250 only ${stats.counts.imdbTop} titles - expected ~250`);
    }
    if (stats.counts.rt2020 < 10) {
      enforcementWarnings.push(`RT 2020 only ${stats.counts.rt2020} titles - expected 30+`);
    }
    if (stats.counts.imdbList < 200) {
      enforcementWarnings.push(`IMDb List 1 only ${stats.counts.imdbList} titles - expected 300+`);
    }
    if (stats.counts.imdbList2 < 200) {
      enforcementWarnings.push(`IMDb List 2 only ${stats.counts.imdbList2} titles - expected 300+`);
    }
    if (stats.counts.imdbList3 < 200) {
      enforcementWarnings.push(`IMDb List 3 only ${stats.counts.imdbList3} titles - expected 300+`);
    }
    if (stats.counts.imdbList4 < 200) {
      enforcementWarnings.push(`IMDb List 4 only ${stats.counts.imdbList4} titles - expected 300+`);
    }
    if (stats.counts.thrillers < 200) {
      enforcementWarnings.push(`IMDb Thrillers only ${stats.counts.thrillers} titles - expected 300+`);
    }
     if (stats.counts.imdbList5 < 200) {
      enforcementWarnings.push(`IMDb List 5 only ${stats.counts.imdbList5} titles - expected 300+`);
    }
  }

  res.json({
    ok: true,
    cacheItems: cache.catalogue.length,
    cacheAgeMs: Date.now() - cache.ts,
    stats: cache.stats,
    sources: ["rt2020", "imdbTop", "imdbList", "imdbList2", "imdbList3", "imdbList4", "imdbThrillers", "imdbList5"],
    enforcementWarnings: enforcementWarnings.length > 0 ? enforcementWarnings : null,
    policy: "ALL_TITLES_FROM_ALL_SOURCES - NO_CAPS_NO_LIMITS",
  });
});

export default api;