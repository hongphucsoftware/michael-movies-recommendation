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
  genres?: any[]; // Added for richer data
  actors?: any[]; // Added for richer data
  director?: any; // Added for richer data
  era?: string; // Added for richer data
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

// ---------- State Store ----------
type AppState = {
  all: TMDbMovie[]; // All movies ever fetched/processed
  ts: number;
};
const stateCache: AppState = { all: [], ts: 0 };

async function getState(): Promise<AppState> {
  if (Date.now() - stateCache.ts < CATALOGUE_TTL_MS && stateCache.all.length > 0) {
    return stateCache;
  }
  // If cache is stale or empty, rebuild it from catalogue
  // Note: This is a simplified approach. A more robust system would use a persistent store.
  if (!isCatalogueFresh()) {
    cache.catalogue = await curatedCatalogue();
    cache.ts = Date.now();
  }

  // Enrich catalogue items with more details from TMDb if missing
  stateCache.all = await Promise.all(cache.catalogue.map(async (item) => {
    if (!item.posterUrl && !item.backdropUrl) { // Only fetch if we don't have basic image data
      try {
        const movieDetails = await tmdb(`/movie/${item.id}`, { append_to_response: "videos,credits,release_dates" });
        const enrichedItem: TMDbMovie = {
          ...item,
          title: movieDetails.title || item.title,
          overview: movieDetails.overview || item.overview,
          release_date: movieDetails.release_date || item.releaseDate,
          popularity: movieDetails.popularity || item.popularity,
          vote_average: movieDetails.vote_average || item.voteAverage,
          vote_count: movieDetails.vote_count || item.voteCount,
          genres: movieDetails.genres || [],
          actors: (movieDetails.credits?.cast || []).slice(0, 5).map((c: any) => ({ id: c.id, name: c.name, character: c.character })),
          director: (movieDetails.credits?.crew || []).find((c: any) => c.job === "Director"),
          poster_path: movieDetails.poster_path || (item.posterUrl ? item.posterUrl.replace(`${IMG_BASE}/${POSTER_SIZE}`, "") : null),
          backdrop_path: movieDetails.backdrop_path || (item.backdropUrl ? item.backdropUrl.replace(`${IMG_BASE}/${BACKDROP_SIZE}`, "") : null),
          era: getEra(movieDetails.release_date),
        };
        return enrichedItem;
      } catch (e) {
        console.error(`Error fetching details for movie ID ${item.id}:`, e);
        // Fallback to existing item if enrichment fails
        return { ...item, genres: [], actors: [], director: null, era: getEra(item.releaseDate) };
      }
    }
    // If basic image data exists, try to add era and director if not already present
    const enrichedItem: TMDbMovie = {
      ...item,
      genres: item.genres || [], // Ensure genres is an array
      actors: item.actors || [], // Ensure actors is an array
      director: item.director || null, // Ensure director is an object or null
      era: item.era || getEra(item.releaseDate), // Add era if missing
    };
    return enrichedItem;
  }));
  stateCache.ts = Date.now();
  return stateCache;
}

function getEra(releaseDate: string | null): string | undefined {
  if (!releaseDate) return undefined;
  const year = parseInt(releaseDate.slice(0, 4), 10);
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "90s";
  if (year >= 1980) return "80s";
  if (year >= 1970) return "70s";
  if (year >= 1960) return "60s";
  if (year >= 1950) return "50s";
  return "pre-50s";
}


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
  stateCache.all = []; // Also flush the enriched state
  stateCache.ts = 0;
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
    stateItems: stateCache.all.length,
    stateAgeMs: Date.now() - stateCache.ts,
  });
});

// Score a round
api.post("/score-round", async (req: Request, res: Response) => {
  const { votes, excludeIds } = req.body as {
    votes: Array<{ winnerId: number; loserId: number }>;
    excludeIds: number[];
  };

  try {
    const st = await getState();
    const byId = Object.fromEntries(st.all.map(m => [m.id, m]));

    // ===== 1) Build the single preference map from exclusive differences =====
    const featureScore = new Map<string, number>(); // winner-only features +1, loser-only features -1

    const tokenMovie = (m: any): string[] => {
      const toks: string[] = [];
      for (const g of m.genres || []) toks.push(`g:${g.id}`);
      if (m.era) toks.push(`e:${m.era}`);
      for (const a of m.actors || []) toks.push(`a:${a.id}`);
      if (m.director) toks.push(`d:${m.director.id}`);
      return toks;
    };

    const exclusive = (A: Set<string>, B: Set<string>) => {
      const Ao: string[] = []; const Bo: string[] = [];
      for (const t of A) if (!B.has(t)) Ao.push(t);
      for (const t of B) if (!A.has(t)) Bo.push(t);
      return { Ao, Bo };
    };

    for (const v of (votes || [])) {
      const w = byId[v.winnerId]; const l = byId[v.loserId];
      if (!w || !l) continue;
      const wSet = new Set(tokenMovie(w));
      const lSet = new Set(tokenMovie(l));
      const { Ao, Bo } = exclusive(wSet, lSet);
      for (const t of Ao) featureScore.set(t, (featureScore.get(t) || 0) + 1);
      for (const t of Bo) featureScore.set(t, (featureScore.get(t) || 0) - 1);
    }

    // ===== 2) Build human rationale directly from featureScore (positives only) =====
    const posByType = {
      genres: [] as Array<{id:number,name:string,score:number}>,
      actors: [] as Array<{id:number,name:string,score:number}>,
      directors: [] as Array<{id:number,name:string,score:number}>,
      eras: [] as Array<{bucket:string,score:number}>,
    };

    for (const [tok, sc] of featureScore) {
      if (sc <= 0) continue; // only positive drivers
      if (tok.startsWith("g:")) {
        const id = Number(tok.slice(2));
        const genre = st.all.find(m => m.genres?.some(g => g.id === id))?.genres?.find(g => g.id === id);
        posByType.genres.push({ id, name: genre?.name || `Genre ${id}`, score: sc });
      } else if (tok.startsWith("a:")) {
        const id = Number(tok.slice(2));
        const actor = st.all.find(m => m.actors?.some(a => a.id === id))?.actors?.find(a => a.id === id);
        posByType.actors.push({ id, name: actor?.name || `Actor ${id}`, score: sc });
      } else if (tok.startsWith("d:")) {
        const id = Number(tok.slice(2));
        const director = st.all.find(m => m.director?.id === id)?.director;
        posByType.directors.push({ id, name: director?.name || `Director ${id}`, score: sc });
      } else if (tok.startsWith("e:")) {
        const bucket = tok.slice(2); posByType.eras.push({ bucket, score: sc });
      }
    }
    posByType.genres.sort((a,b)=>b.score-a.score);
    posByType.actors.sort((a,b)=>b.score-a.score);
    posByType.directors.sort((a,b)=>b.score-a.score);
    posByType.eras.sort((a,b)=>b.score-a.score);

    // Short summary text from the same signals we rank with
    const parts: string[] = [];
    if (posByType.genres[0]) parts.push(`**${posByType.genres.slice(0,2).map(g=>`${g.name} (+${g.score})`).join(" & ")}**`);
    if (posByType.actors[0]) parts.push(`**${posByType.actors.slice(0,2).map(a=>`${a.name} (+${a.score})`).join(" & ")}**`);
    if (posByType.directors[0]) parts.push(`films by **${posByType.directors[0].name} (+${posByType.directors[0].score})**`);
    if (posByType.eras[0]) parts.push(`from the **${posByType.eras[0].bucket} (+${posByType.eras[0].score})**`);

    const summaryText = parts.length
      ? `Based on your picks, you leaned toward ${parts.join(", ")}.`
      : `Your picks were mixed, so we chose 6 well-liked options with a similar overall feel.`;

    // ===== 3) Score candidates using the SAME featureScore =====
    const excluded = new Set<number>(excludeIds || []);
    const normPop = (p:number) => {
      const popularities = st.all.map(m => m.popularity || 0);
      const min = Math.min(...popularities);
      const max = Math.max(...popularities);
      if (max <= min) return 0.5;
      return (p - min) / (max - min);
    };

    const scoreMovie = (m: any) => {
      const gVals = (m.genres || []).map((g: any) => featureScore.get(`g:${g.id}`) || 0);
      const aVals = (m.actors || []).map((a: any) => featureScore.get(`a:${a.id}`) || 0);
      const dVal  = m.director ? (featureScore.get(`d:${m.director.id}`) || 0) : 0;
      const eVal  = m.era ? (featureScore.get(`e:${m.era}`) || 0) : 0;
      const mean = (xs:number[]) => xs.length ? xs.reduce((s,x)=>s+x,0)/xs.length : 0;
      const core = 1.0*mean(gVals) + 0.9*dVal + 0.7*mean(aVals) + 0.5*eVal;
      const prior = 0.10 * normPop(m.popularity || 0);
      const jitter = ((m.id * 2654435761 % 97) / 97) * 0.001;
      return core + prior + jitter;
    };

    const pool = st.all.filter(m => !excluded.has(m.id));
    pool.sort((a,b)=>scoreMovie(b)-scoreMovie(a));

    // ===== 4) Alignment guarantee: pick at least 4 that match top positive features =====
    const topFeatureTokens = new Set<string>([
      ...posByType.genres.slice(0,3).map(g=>`g:${g.id}`),
      ...posByType.actors.slice(0,3).map(a=>`a:${a.id}`),
      ...posByType.directors.slice(0,2).map(d=>`d:${d.id}`),
      ...(posByType.eras[0] ? [`e:${posByType.eras[0].bucket}`] : []),
    ]);

    const matchesTop = (m:any) => {
      if (topFeatureTokens.size === 0) return false;
      for (const t of tokenMovie(m)) if (topFeatureTokens.has(t)) return true;
      return false;
    };

    const aligned = pool.filter(matchesTop);
    const nonAligned = pool.filter(m => !matchesTop(m));

    const selected: any[] = [];
    for (const m of aligned) { if (selected.length < 4) selected.push(m); else break; }
    for (const m of nonAligned) { if (selected.length < 6) selected.push(m); else break; }
    while (selected.length < 6 && pool.length) selected.push(pool.shift()!);

    // ===== 5) Per-movie reasons (so UI can display exact matching features) =====
    const reasonsPerMovie: Record<number, Array<{kind:"genre"|"actor"|"director"|"era", label:string, score:number}>> = {};
    for (const m of selected) {
      const reasons: Array<{kind:"genre"|"actor"|"director"|"era", label:string, score:number}> = [];
      for (const g of m.genres || []) {
        const s = featureScore.get(`g:${g.id}`) || 0;
        if (s > 0) reasons.push({ kind:"genre", label:g.name, score:s });
      }
      for (const a of m.actors || []) {
        const s = featureScore.get(`a:${a.id}`) || 0;
        if (s > 0) reasons.push({ kind:"actor", label:a.name, score:s });
      }
      if (m.director) {
        const s = featureScore.get(`d:${m.director.id}`) || 0;
        if (s > 0) reasons.push({ kind:"director", label:m.director.name, score:s });
      }
      if (m.era) {
        const s = featureScore.get(`e:${m.era}`) || 0;
        if (s > 0) reasons.push({ kind:"era", label:m.era, score:s });
      }
      reasons.sort((a,b)=>b.score-a.score);
      reasonsPerMovie[m.id] = reasons.slice(0,3); // top 3 reasons per movie
    }

    // ===== 6) Fetch trailer URLs =====
    const trailers: Record<number,string|null> = {};
    for (const m of selected) {
      try {
        const r = await fetch(`${TMDB_BASE}/movie/${m.id}/videos?language=en-US&api_key=${TMDB_API_KEY}`);
        if (r.ok) {
          const data = await r.json();
          const vids = Array.isArray(data?.results) ? data.results : [];
          const yt = vids.find((v:any)=> v.site==="YouTube" && /Trailer|Teaser|Official|Clip/i.test(`${v.type} ${v.name}`) && v.key);
          trailers[m.id] = yt ? `https://www.youtube.com/embed/${yt.key}` : null;
        } else {
          trailers[m.id] = null;
        }
      } catch { trailers[m.id] = null; }
    }

    res.json({
      ok: true,
      movies: selected,
      trailers,
      explanation: {
        topGenres: posByType.genres.slice(0,2),
        topActors: posByType.actors.slice(0,2),
        topDirectors: posByType.directors.slice(0,1),
        topEra: posByType.eras[0] || null,
        summaryText
      },
      reasonsPerMovie
    });
  } catch (error) {
    console.error("[/score-round] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to score round" });
  }
});

export default api;