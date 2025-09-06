import express, { Request, Response } from "express";
import * as cheerio from "cheerio";
import { z } from "zod";

/* ====================== Config ====================== */
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
if (!TMDB_API_KEY) console.warn("[TMDB] Missing TMDB_API_KEY");
const LIST_IDS = (process.env.IMDB_LISTS || "ls094921320,ls003501243,ls002065120,ls000873904,ls005747458")
  .split(",").map(s => s.trim()).filter(Boolean);
const AB_PER_LIST = Number(process.env.AB_PER_LIST || 15);
const PER_LIST_LIMIT = Number(process.env.PER_LIST_LIMIT || 100);
const CONCURRENCY = Number(process.env.TMDB_CONCURRENCY || 3);
const CATALOGUE_TTL_MS = 1000 * 60 * 60 * Number(process.env.CATALOGUE_TTL_HOURS || 24);

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const POSTER = "w500", BACKDROP = "w780";

/* ====================== Types ====================== */
type Weights = Record<string, number>;
type Raw = { title: string; year?: number; srcList: string };
type Item = {
  id: number;
  title: string;
  year?: number;
  genres: number[];
  directors: string[]; // normalized names
  actors: string[];    // top 3
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  sources: string[];   // imdb list ids
};

/* ====================== Session & no-cache helpers ====================== */
type GenreId = number;
type GenreProfile = { genreScores: Record<GenreId, number>; rounds: number; seenPairs: Set<string> };
const PROFILES = new Map<string, GenreProfile>();

function sess(req: Request): GenreProfile {
  const sid = (req.headers["x-session-id"] as string) || (req.query.sid as string) || "anon";
  let p = PROFILES.get(sid);
  if (!p) { p = { genreScores: {}, rounds: 0, seenPairs: new Set() }; PROFILES.set(sid, p); }
  return p;
}

function noStore(res: express.Response) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Vary", "x-session-id");
}

/* ====================== Caches ====================== */
let CATALOGUE: Item[] = [];
let AB_SET = new Set<number>();
let BUILT_AT = 0;

/* ====================== Utils ====================== */
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));
async function pLimit<T>(n:number, jobs:(()=>Promise<T>)[]) {
  const res:T[] = []; const running:Promise<void>[] = [];
  for (const job of jobs) {
    const p = (async()=>{ res.push(await job()); })();
    running.push(p);
    if (running.length >= n) await Promise.race(running);
  }
  await Promise.all(running);
  return res;
}
const normName = (s:string)=>s.normalize("NFKC").replace(/\s+/g," ").trim();
const decadeOf = (y?:number)=> y ? Math.floor(y/10)*10 : undefined;

/* ====================== TMDb with proper genre fetching ====================== */
type TMDbSearchHit = {
  id:number; title?:string; original_title?:string; release_date?:string;
  poster_path?:string|null; backdrop_path?:string|null; vote_average?:number;
  vote_count?:number; popularity?:number; adult?:boolean; genre_ids?:number[]
};

type TMDbDetails = {
  id:number; title?:string; original_title?:string; overview?:string;
  release_date?:string; poster_path?:string|null; backdrop_path?:string|null;
  vote_average?:number; vote_count?:number; popularity?:number;
  genres?: { id:number; name:string }[];
};

async function tmdbSearch(title: string, year?: number): Promise<TMDbSearchHit|null> {
  const u = `${TMDB}/search/movie?api_key=${encodeURIComponent(TMDB_API_KEY)}&query=${encodeURIComponent(title)}${year?`&year=${year}`:""}`;
  const r = await fetch(u); if (!r.ok) return null;
  const j:any = await r.json(); const hits:TMDbSearchHit[] = j?.results || [];
  if (!hits.length) return null;
  const exact = year ? hits.find(h => (h.release_date||"").startsWith(String(year))) : null;
  return exact || hits[0];
}

async function tmdbDetails(id:number): Promise<TMDbDetails|null> {
  const u = `${TMDB}/movie/${id}?api_key=${encodeURIComponent(TMDB_API_KEY)}&append_to_response=credits`;
  const r = await fetch(u); if (!r.ok) return null;
  return await r.json();
}

async function tmdbCredits(id:number): Promise<{directors:string[]; actors:string[]}> {
  const url = `${TMDB}/movie/${id}/credits?api_key=${encodeURIComponent(TMDB_API_KEY)}`;
  const r = await fetch(url); if (!r.ok) return { directors:[], actors:[] };
  const j:any = await r.json();
  const directors = (j?.crew||[])
    .filter((c:any)=> String(c?.job).toLowerCase()==="director")
    .slice(0,2).map((c:any)=>normName(c.name));
  const actors = (j?.cast||[]).slice(0,3).map((c:any)=>normName(c.name));
  return { directors, actors };
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/53.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}

/* ====================== IMDb Top 250 scrape ====================== */
async function fetchTop250(): Promise<Raw[]> {
  const url = "https://www.imdb.com/chart/top/";
  const out: Raw[] = [];

  try {
    const html = await fetch(url, {
      headers: {
        "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "accept-language":"en-US,en;q=0.9"
      }
    }).then(r=>r.text());

    const $ = cheerio.load(html);

    // New IMDb Top 250 layout
    $("li[data-testid='cvitem-top-chartmeter-titlecard']").each((_i, el) => {
      const titleLink = $(el).find("h3.ipc-title__text").first();
      let title = titleLink.text().trim();

      // Remove ranking number like "1. The Shawshank Redemption"
      title = title.replace(/^\d+\.\s*/, "");

      // Get year from metadata
      const yearText = $(el).find("span[data-testid='title-card-metadata'] span").first().text();
      const yearMatch = yearText.match(/(19|20)\d{2}/);
      const year = yearMatch ? Number(yearMatch[0]) : undefined;

      if (title) {
        out.push({ title, year, srcList: "imdbTop250" });
        console.log(`[IMDB] Top 250: "${title}" (${year || 'no year'})`);
      }
    });

    // Fallback for older layout
    if (out.length < 50) {
      $("td.titleColumn").each((_i, el) => {
        const titleLink = $(el).find("a").first();
        const title = titleLink.text().trim();
        const yearText = $(el).find("span.secondaryInfo").text();
        const yearMatch = yearText.match(/\((\d{4})\)/);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        if (title) {
          out.push({ title, year, srcList: "imdbTop250" });
          console.log(`[IMDB] Top 250 (fallback): "${title}" (${year || 'no year'})`);
        }
      });
    }

  } catch (error) {
    console.error(`[IMDB] Error fetching Top 250:`, error);
  }

  console.log(`[IMDB] Top 250 total: ${out.length} titles`);
  return out.slice(0, 100); // Take top 100
}

/* ====================== IMDb list scrape (title, year) ====================== */
async function fetchListTitles(listId: string, maxPages=3): Promise<Raw[]> {
  const out: Raw[] = [];
  const seenTitles = new Set<string>(); // Track unique titles to detect loops

  for (let page=1; page<=maxPages; page++) {
    const url = `https://www.imdb.com/list/${listId}/?st_dt=&mode=detail&sort=listOrder,asc&page=${page}`;
    try {
      const html = await fetch(url, {
        headers: {
          "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "accept-language":"en-US,en;q=0.9"
        }
      }).then(r=>r.text());

      const $ = cheerio.load(html);

      // Try multiple selectors for different IMDB list layouts
      let rows = $(".lister-list .lister-item").toArray();
      if (!rows.length) {
        rows = $(".titleColumn").toArray();
      }
      if (!rows.length) {
        rows = $("[data-testid='title-card']").toArray();
      }
      if (!rows.length) {
        rows = $(".ipc-title").toArray();
      }

      console.log(`[IMDB] List ${listId} page ${page}: found ${rows.length} items`);

      if (!rows.length) break;

      let newItemsThisPage = 0;
      for (const r of rows) {
        // Try multiple title selectors
        let t = $(r).find(".lister-item-header a").first().text().trim();
        if (!t) t = $(r).find(".titleColumn a").first().text().trim();
        if (!t) t = $(r).find("[data-testid='title-card-title'] a").first().text().trim();
        if (!t) t = $(r).find(".ipc-title a").first().text().trim();
        if (!t) t = $(r).find("h3 a").first().text().trim();

        // Clean title - remove list numbers like "1. Title"
        t = t.replace(/^\d+\.\s*/, "").trim();

        // Try multiple year selectors - look in the same row and nearby elements
        let yText = $(r).find(".lister-item-year").first().text() || "";
        if (!yText) yText = $(r).find(".secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find(".titleColumn .secondaryInfo").first().text() || "";
        if (!yText) yText = $(r).find("[data-testid='title-card-metadata']").first().text() || "";
        if (!yText) yText = $(r).find("span").filter((_i, el) => !!$(el).text().match(/\(.*\d{4}.*\)/)).first().text() || "";

        // More aggressive year extraction - look for any 4-digit year in parentheses
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

      // If we didn't find any new unique items, we're in a loop - stop
      if (newItemsThisPage === 0) {
        console.log(`[IMDB] No new unique items on page ${page}, stopping pagination (found ${out.length} total)`);
        break;
      }

      console.log(`[IMDB] Added ${newItemsThisPage} new items from page ${page}`);

      // be a good citizen; IMDb is prickly
      await sleep(300);
    } catch (error) {
      console.error(`[IMDB] Error fetching list ${listId} page ${page}:`, error);
      break;
    }
  }

  console.log(`[IMDB] Total unique titles from list ${listId}: ${out.length}`);
  return out.slice(0, PER_LIST_LIMIT); // Use your limit
}
api.post("/api/ab/vote", express.json(), async (req:Request, res:Response) => {
  noStore(res);
  await buildAll();

  const { leftId, rightId, chosenId } = req.body as { leftId:number; rightId:number; chosenId:number };
  const p = sess(req);
  const chosen = CATALOGUE.find(i => i.id === chosenId);

  if (!chosen) {
    return res.status(400).json({ ok:false, error:"bad chosenId" });
  }

  // Genre-only learning - simple increment for chosen genres
  for (const g of (chosen.genres || [])) {
    p.genreScores[g] = (p.genreScores[g] || 0) + 1;
  }
  p.rounds += 1;

  console.log(`[A/B VOTE] Session ${req.headers["x-session-id"] || req.query.sid || "anon"}: chose ${chosen.title} (Round ${p.rounds})`);
  console.log(`[VOTE] Genre scores:`, Object.entries(p.genreScores).sort((a,b)=>b[1]-a[1]).slice(0,5));

  // Return fresh genre-based recs with rotation
  const recItems = rankRecsByGenre(p, 20).map(t => ({
    id: t.id,
    title: t.title,
    year: t.year,
    image: t.posterUrl || t.backdropUrl,
    posterUrl: t.posterUrl,
    backdropUrl: t.backdropUrl,
    genres: t.genres
  }));

  console.log(`[VOTE] Returning ${recItems.length} fresh recs. Top 3:`, recItems.slice(0,3).map(r => r.title));

  return res.json({
    ok: true,
    rounds: p.rounds,
    topGenres: Object.entries(p.genreScores).sort((a,b)=>b[1]-a[1]).slice(0,5),
    recs: recItems
  });
});

// Recommendations ranked for the current user
api.get("/recs", async (req:Request, res:Response) => {
  noStore(res);
  await buildAll();
  const p = sess(req);
  const sid = (req.headers["x-session-id"] as string) || (req.query.sid as string) || "anon";

  console.log(`[RECS] Session ${sid}: ${p.rounds} rounds completed, ${Object.keys(p.genreScores).length} genres learned`);

  const top = rankRecsByGenre(p, Number(req.query.top||60));
  console.log(`[RECS] Returning ${top.length} recommendations. Top 3:`, top.slice(0,3).map(t => `${t.title} (${t.year})`));

  res.json({
    ok:true,
    rounds: p.rounds,
    items: top.map(t=>({
      id:t.id, title:t.title, year:t.year,
      image: t.posterUrl || t.backdropUrl,
      posterUrl: t.posterUrl, backdropUrl: t.backdropUrl,
      overview: t.overview, genres: t.genres, sources: t.sources
    })),
    topGenres: Object.entries(p.genreScores).sort((a,b)=>b[1]-a[1]).slice(0,6)
  });
});

// Trailers with no-cache headers
api.get("/trailers", async (req:Request, res:Response) => {
  noStore(res);
  const ids = String(req.query.ids||"")
    .split(",").map(s=>Number(s.trim())).filter(n=>Number.isFinite(n));
  const out: Record<number,string|null> = {};
  await Promise.all(ids.slice(0,200).map(async id=>{
    const url = `${TMDB}/movie/${id}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
    try {
      const r = await fetch(url); const j:any = await r.json();
      const vids:any[] = j?.results || [];
      const yt = vids.find(v=>v.site==="YouTube" && /(Trailer|Teaser)/i.test(v.name)) || vids.find(v=>v.site==="YouTube");
      out[id] = yt ? `https://www.youtube.com/embed/${yt.key}` : null;
    } catch { out[id]=null; }
  }));
  res.json({ ok:true, trailers: out });
});

// Individual trailer endpoint (for compatibility)
api.get("/trailer", async (req:Request, res:Response) => {
  const id = Number(req.query.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok:false, error:"Invalid id" });

  const url = `${TMDB}/movie/${id}/videos?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;
  try {
    const r = await fetch(url);
    const j:any = await r.json();
    const vids:any[] = j?.results || [];
    const yt = vids.find(v=>v.site==="YouTube" && /(Trailer|Teaser)/i.test(v.name)) || vids.find(v=>v.site==="YouTube");
    const trailer = yt ? { url: `https://www.youtube.com/embed/${yt.key}` } : null;
    res.json({ ok:true, trailer });
  } catch {
    res.json({ ok:true, trailer: null });
  }
});

export default api;