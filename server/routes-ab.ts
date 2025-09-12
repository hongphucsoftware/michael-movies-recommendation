import express, { Request, Response } from "express";
import * as cheerio from "cheerio";

// TMDb config (used only for imdb_id → TMDb resolution and details)
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.TMDB_KEY || "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const TTL = 1000 * 60 * 60 * 6; // 6h
const CONCURRENCY = 5;

// IMDb lists (hard lock)
const IMDB_LISTS = [
  { id: "ls094921320", url: "https://www.imdb.com/list/ls094921320/" },
  { id: "ls003501243", url: "https://www.imdb.com/list/ls003501243/" },
  { id: "ls002065120", url: "https://www.imdb.com/list/ls002065120/" },
  { id: "ls000873904", url: "https://www.imdb.com/list/ls000873904/" },
  { id: "ls005747458", url: "https://www.imdb.com/list/ls005747458/" },
] as const;

type CatalogueItem = {
  id: number; // TMDb id
  imdbId: string; // ttID
  title: string;
  overview: string;
  genres: number[];
  year: number | null;
  era: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  topActors: string[]; // top-3
  director: string | null;
  sourceListIds: string[]; // which IMDb list ids
};

type RawListRow = {
  imdbId: string;
  title?: string;
  year?: number;
  sourceListId: string;
  poster?: string | null;
};

const api = express.Router();

// no-store on all /api responses
api.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

// Simple image proxy to avoid mixed CORS/cert issues for IMDb images
api.get("/proxy-img", async (req: Request, res: Response) => {
  try {
    let u = String(req.query.u || "");
    if (!u) return res.status(400).end("bad url");
    try { u = decodeURIComponent(u); } catch {}
    // Allow data: URLs (SVG placeholders)
    if (u.startsWith("data:")) {
      const comma = u.indexOf(",");
      const meta = u.slice(5, comma > 0 ? comma : undefined); // e.g. image/svg+xml;utf8
      const mime = (meta.split(";")[0] || "image/svg+xml") as string;
      const payload = u.slice((comma > 0 ? comma + 1 : u.length));
      res.setHeader("Content-Type", mime);
      // payload might still be percent-encoded; try decode, else raw
      try { return res.end(decodeURIComponent(payload)); } catch {}
      return res.end(payload);
    }
    if (!/^https?:\/\//i.test(u)) return res.status(400).end("bad url");
    const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!r.ok) return res.status(502).end("upstream error");
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
    const buf = await r.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (e) {
    res.status(500).end("proxy error");
  }
});

async function httpText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

function parseYear(s: string): number | null {
  const m = s.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

function toEra(year: number | null): string | null {
  if (!year || !Number.isFinite(year)) return null;
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "1990s";
  if (year >= 1980) return "1980s";
  if (year >= 1970) return "1970s";
  return "Classic";
}

// Map IMDb genres to TMDb numeric IDs we already use on the client
const GENRE_TO_ID: Record<string, number> = {
  "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
  "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
  "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
  "Sci-Fi": 878, "TV Movie": 10770, "Thriller": 53, "War": 10752, "Western": 37
};

function hashCode(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return Math.abs(h); }

function placeholderPoster(title: string): string {
  const safe = (title || 'No Poster').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'>\n  <rect width='100%' height='100%' fill='#0f141b'/>\n  <text x='50%' y='50%' fill='#6f7d92' font-size='28' font-family='Arial' text-anchor='middle'>${safe.slice(0,40)}</text>\n</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function imdbDetails(ttid: string): Promise<{ title: string; overview: string; year: number | null; genres: number[]; topActors: string[]; director: string | null; image?: string | null } | null> {
  try {
    const url = `https://www.imdb.com/title/${ttid}/`;
    const html = await httpText(url);
    const $ = cheerio.load(html);
    // Try JSON-LD
    let name = ""; let desc = ""; let year: number | null = null; let genres: number[] = []; let actors: string[] = []; let director: string | null = null; let image: string | null = null;
    $("script[type='application/ld+json']").each((_i, el) => {
      try {
        const data = JSON.parse($(el).contents().text());
        const arr = Array.isArray(data) ? data : [data];
        for (const node of arr) {
          if ((node?.['@type'] === 'Movie' || node?.['@type'] === 'TVSeries') && node?.name) {
            name = node.name;
            desc = node?.description || desc;
            year = parseYear(String(node?.datePublished || '')) || year;
            if (Array.isArray(node?.genre)) {
              genres = node.genre.map((g: string) => GENRE_TO_ID[g] || GENRE_TO_ID[(g || '').replace('Sci-Fi', 'Science Fiction')] || null).filter(Boolean);
            }
            if (Array.isArray(node?.actor)) {
              actors = node.actor.map((a: any) => a?.name).filter(Boolean).slice(0,3);
            }
            const dir = Array.isArray(node?.director) ? node.director[0] : node?.director;
            director = dir?.name || director;
            if (node?.image && typeof node.image === 'string') image = node.image;
          }
        }
      } catch {}
    });
    // Fallbacks
    if (!name) name = $("h1").first().text().trim();
    if (!year) year = parseYear($("li[data-testid='title-details-releasedate']").text());
    if (!image) image = $(".ipc-media img").first().attr("src") || null;
    return { title: name || "(Untitled)", overview: desc || "", year: year || null, genres, topActors: actors, director, image };
  } catch {
    return null;
  }
}

// TMDb helpers (strict imdb_id → TMDb, no text search)
// TMDb functions removed - using local SEED data only

// Scrape one IMDb list (multi-page), collect ttIDs and posters
async function scrapeImdbList(listUrl: string, sourceListId: string, maxPages = 50): Promise<RawListRow[]> {
  const out: RawListRow[] = [];
  let page = 1;
  while (page <= maxPages) {
    const url = listUrl.endsWith("/") ? `${listUrl}?page=${page}` : `${listUrl}/?page=${page}`;
    const html = await httpText(url);
    const $ = cheerio.load(html);
    const before = out.length;

    // Classic list layout
    $(".lister-list .lister-item").each((_i, el) => {
      const header = $(el).find("h3.lister-item-header");
      const a = header.find("a").first();
      const href = a.attr("href") || "";
      const m = href.match(/\/title\/(tt\d+)/);
      const ttid = m ? m[1] : (header.find("a[data-tconst]").attr("data-tconst") || "");
      if (!ttid) return;
      const title = a.text().trim();
      const year = parseYear(header.find(".lister-item-year").text().trim()) || undefined;
      const poster = $(el).find(".lister-item-image img").attr("loadlate") || $(el).find(".lister-item-image img").attr("src") || null;
      out.push({ imdbId: ttid, title, year, sourceListId, poster });
    });

    // Modern list layout
    $("li[data-testid='list-item']").each((_i, el) => {
      const link = $(el).find("a[href*='/title/tt']").first();
      const href = link.attr("href") || "";
      const m = href.match(/\/title\/(tt\d+)/);
      const ttid = m ? m[1] : "";
      if (!ttid) return;
      const title = $(el).find("h3.ipc-title__text").first().text().replace(/^\d+\.\s*/, "").trim();
      const year = parseYear($(el).find("span.sc-b189961a-8, .cli-title-metadata-item").first().text().trim()) || undefined;
      const img = $(el).find("img").first();
      const poster = img.attr("srcset")?.split(" ")[0] || img.attr("src") || null;
      out.push({ imdbId: ttid, title, year, sourceListId, poster });
    });

    // JSON-LD ItemList fallback (robust across redesigns)
    $("script[type='application/ld+json']").each((_i, el) => {
      try {
        const data = JSON.parse($(el).contents().text());
        const arr = Array.isArray(data) ? data : [data];
        for (const node of arr) {
          if (node?.['@type'] === 'ItemList' && Array.isArray(node?.itemListElement)) {
            for (const it of node.itemListElement) {
              const item = it?.item || it;
              const url = String(item?.url || "");
              const m = url.match(/\/title\/(tt\d+)/);
              const ttid = m ? m[1] : "";
              if (!ttid) continue;
              const title = String(item?.name || "").trim();
              const year = parseYear(String(item?.datePublished || "")) || undefined;
              const poster = String(item?.image || "") || null;
              out.push({ imdbId: ttid, title, year, sourceListId, poster });
            }
          }
        }
      } catch {}
    });

    const after = out.length;
    const hasNext = $("a.lister-page-next.next-page").length > 0 || /page=\d+/.test($("a:contains('Next')").attr("href") || "");
    if (after === before || !hasNext) break;
    page++;
  }
  return out;
}

async function pLimit<T>(n: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  const workers = new Array(n).fill(0).map(async () => {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  });
  await Promise.all(workers);
  return results;
}

const cache = {
  catalogue: [] as CatalogueItem[],
  ts: 0,
  byList: {} as Record<string, CatalogueItem[]>,
  stats: { byList: {} as Record<string, number>, total: 0 },
};

function isFresh() { return Date.now() - cache.ts < TTL && cache.catalogue.length > 0; }

async function buildStrictCatalogue(): Promise<void> {
  console.log("[Catalogue] Building from SEED data (fast mode)");
  
  // Use SEED data directly - skip slow scraping and TMDb API calls
  const final: CatalogueItem[] = [];
    const SEED = [
      { tt: "tt1745960", title: "Top Gun: Maverick", poster: "https://m.media-amazon.com/images/M/MV5BMDBkZDNjMWEtOTdmMi00NmExLTg5MmMtNTFlYTJlNWY5YTdmXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg", trailer: "https://www.youtube.com/watch?v=g4U4BQW9OEk", year: 2022, genres: ["Action", "Drama"], director: "Joseph Kosinski", actors: ["Tom Cruise", "Miles Teller", "Jennifer Connelly"] },
      { tt: "tt11799038", title: "Civil War", poster: "https://m.media-amazon.com/images/M/MV5BYTkzMjc0YzgtY2E0Yi00NDBlLWI0MWUtODY1ZjExMDAyOWZiXkEyXkFqcGc@._V1_FMjpg_UY12000_.jpg", trailer: "https://www.youtube.com/watch?v=cA4wVhs3HC0", year: 2024, genres: ["Dystopian", "Action", "Thriller"], director: "Alex Garland", actors: ["Kirsten Dunst", "Wagner Moura", "Cailee Spaeny"] },
      { tt: "tt14807308", title: "She Said", poster: "https://m.media-amazon.com/images/M/MV5BNjVmNTk1NzktMjk3OC00NDYwLWIzMzMtY2EzZWU0YjZlMmRkXkEyXkFqcGc@._V1_FMjpg_UY8800_.jpg", trailer: "https://www.youtube.com/watch?v=WyOUd_2n3vI", year: 2022, genres: ["Drama", "Biography"], director: "Maria Schrader", actors: ["Carey Mulligan", "Zoe Kazan", "Patricia Clarkson"] },
      { tt: "tt14807309", title: "Warfare", poster: "https://m.media-amazon.com/images/M/MV5BYzEyYjE1NmEtOTFmNy00ZmQxLThlYzctOGRjNmQ0N2VjMmNmXkEyXkFqcGc@._V1_FMjpg_UY2880_.jpg", trailer: "https://www.youtube.com/watch?v=JER0Fkyy3tw", year: 2025, genres: ["War", "Action"], director: "Ray Mendoza & Alex Garland", actors: ["D'Pharaoh Woon-A-Tai", "Will Poulter", "Cosmo Jarvis"] },
      { tt: "tt9603213", title: "Mission: Impossible - The Final Reckoning", poster: "https://m.media-amazon.com/images/M/MV5BZjdiYWUwZTMtZjExNC00YTdiLWE4YWEtN2QzNzI0Mzg0NDZjXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg", trailer: "https://www.youtube.com/watch?v=fsQgc9pCyDU", year: 2023, genres: ["Action", "Spy", "Adventure"], director: "Christopher McQuarrie", actors: ["Tom Cruise", "Hayley Atwell", "Ving Rhames"] },
      { tt: "tt9764362", title: "The Menu", poster: "https://m.media-amazon.com/images/M/MV5BMDIwMDY4ZTYtMzY4Ny00YTYwLWIxMjgtODM3NGIzNzQ5OTkzXkEyXkFqcGc@._V1_FMjpg_UX1123_.jpg", trailer: "https://www.youtube.com/watch?v=Kx55Rkynhtk", year: 2022, genres: ["Black Comedy", "Horror", "Thriller"], director: "Mark Mylod", actors: ["Ralph Fiennes", "Anya Taylor-Joy", "Nicholas Hoult"] },
      { tt: "tt10706602", title: "Thirteen Lives", poster: "https://m.media-amazon.com/images/M/MV5BOTYwMmUzYmUtZjU1Mi00NjQ3LWI0NzktNTU3ZDc5NWE5NTg4XkEyXkFqcGc@._V1_FMjpg_UX988_.jpg", trailer: "https://www.youtube.com/watch?v=R068Si4eb3Y", year: 2022, genres: ["Drama", "Thriller", "Survival"], director: "Ron Howard", actors: ["Viggo Mortensen", "Colin Farrell", "Joel Edgerton"] },
      { tt: "tt13463024", title: "BlackBerry", poster: "https://m.media-amazon.com/images/M/MV5BYmI4OGQ0YmQtYjkxMS00NzBkLTk2YWUtOTYwMGMyM2YzNjliXkEyXkFqcGc@._V1_FMjpg_UY2946_.jpg", trailer: "https://www.youtube.com/watch?v=fOj0lRfKiVE", year: 2023, genres: ["Biography", "Comedy-Drama"], director: "Matt Johnson", actors: ["Jay Baruchel", "Glenn Howerton", "Matt Johnson"] },
      { tt: "tt13463025", title: "September 5", poster: "https://m.media-amazon.com/images/M/MV5BYTI3MjU4MTgtZTU0Yy00MDNhLTg3MWQtNzk1NzljOTQ1YjM1XkEyXkFqcGc@._V1_FMjpg_UX770_.jpg", trailer: "https://www.youtube.com/watch?v=y15maQtXiFY", year: 2024, genres: ["Drama", "Thriller"], director: "Santiago Mitre", actors: ["Peter Lanzani", "Ricardo Darín", "Julieta Zylberberg"] },
      { tt: "tt7405458", title: "A Man Called Otto", poster: "https://m.media-amazon.com/images/M/MV5BZDU3ZTI0MTItOTBlMS00ODY2LWI1MzctODZkZTllZDU1ZTg2XkEyXkFqcGc@._V1_FMjpg_UX900_.jpg", trailer: "https://www.youtube.com/watch?v=eoVw2f9_oi4", year: 2022, genres: ["Comedy", "Drama"], director: "Marc Forster", actors: ["Tom Hanks", "Mariana Treviño", "Rachel Keller"] },
      { tt: "tt9603212", title: "Mission: Impossible - Dead Reckoning Part One", poster: "https://m.media-amazon.com/images/M/MV5BN2U4OTdmM2QtZTkxYy00ZmQyLTg2N2UtMDdmMGJmNDhlZDU1XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg", trailer: "https://www.youtube.com/watch?v=avz06PDqDbM", year: 2023, genres: ["Action", "Spy", "Adventure"], director: "Christopher McQuarrie", actors: ["Tom Cruise", "Hayley Atwell", "Ving Rhames"] },
      { tt: "tt6723592", title: "Tenet", poster: "https://m.media-amazon.com/images/M/MV5BMTU0ZjZlYTUtYzIwMC00ZmQzLWEwZTAtZWFhMWIwYjMxY2I3XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg", trailer: "https://www.youtube.com/watch?v=L3pk_TBkihU", year: 2020, genres: ["Sci-Fi", "Action", "Thriller"], director: "Christopher Nolan", actors: ["John David Washington", "Robert Pattinson", "Elizabeth Debicki"] },
      { tt: "tt13897324", title: "The Whale", poster: "https://m.media-amazon.com/images/M/MV5BYmNhOWMyNTYtNTljNC00NTU3LWFiYmQtMDBhOGU5NWFhNGU5XkEyXkFqcGc@._V1_FMjpg_UY2863_.jpg", trailer: "https://www.youtube.com/watch?v=LM3qt-gHkWU", year: 2022, genres: ["Drama", "Psychological"], director: "Darren Aronofsky", actors: ["Brendan Fraser", "Sadie Sink", "Hong Chau"] },
      { tt: "tt3272066", title: "Reminiscence", poster: "https://m.media-amazon.com/images/M/MV5BMTQ1ODk3YjktOTJhMi00NGE1LWFjMzgtMDM2NTNhYmZiNTc4XkEyXkFqcGc@._V1_FMjpg_UX400_.jpg", trailer: "https://www.youtube.com/watch?v=lJk-952EkGA", year: 2021, genres: ["Sci-Fi", "Thriller"], director: "Lisa Joy", actors: ["Hugh Jackman", "Rebecca Ferguson", "Thandiwe Newton"] },
      { tt: "tt12724754", title: "The Covenant", poster: "https://m.media-amazon.com/images/M/MV5BMDY2NmI1YzAtYmE2OS00NTY4LWJjM2UtNjQzMDliYzc5MzUyXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg", trailer: "https://www.youtube.com/watch?v=02PPMPArNEQ", year: 2023, genres: ["Action", "War", "Thriller"], director: "Guy Ritchie", actors: ["Jake Gyllenhaal", "Dar Salim", "Antony Starr"] },
      { tt: "tt10648342", title: "Worth", poster: "https://m.media-amazon.com/images/M/MV5BNTcxNzhlMjktZWY2Ny00NzQ3LThiMmItMTkzYjFmNDU2NTU4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg", trailer: "https://www.youtube.com/watch?v=94jcW1srt_Q", year: 2020, genres: ["Drama", "Biography"], director: "Sara Colangelo", actors: ["Michael Keaton", "Stanley Tucci", "Amy Ryan"] },
      { tt: "tt1016150", title: "Operation Mincemeat", poster: "https://m.media-amazon.com/images/M/MV5BMzgzMGFiZGQtYjA0OS00NGYxLWIxMDYtOGUxMDc4YjU3ZWQxXkEyXkFqcGc@._V1_FMjpg_UY2320_.jpg", trailer: "https://www.youtube.com/watch?v=zwkSyrN0mvY", year: 2021, genres: ["War", "Drama", "History"], director: "John Madden", actors: ["Colin Firth", "Matthew Macfadyen", "Kelly Macdonald"] },
      { tt: "tt11813216", title: "The Banshees of Inisherin", poster: "https://m.media-amazon.com/images/M/MV5BOTkzMWI4OTEtMTk0MS00MTUxLWI4NTYtYmRiNWM4Zjc1MGRhXkEyXkFqcGc@._V1_FMjpg_UY5625_.jpg", trailer: "https://www.youtube.com/watch?v=uRu3zLOJN2c", year: 2022, genres: ["Dark Comedy", "Drama"], director: "Martin McDonagh", actors: ["Colin Farrell", "Brendan Gleeson", "Kerry Condon"] },
      { tt: "tt2382320", title: "No Time to Die", poster: "https://m.media-amazon.com/images/M/MV5BZGZiOGZhZDQtZmRkNy00ZmUzLTliMGEtZGU0NjExOGMxZDVkXkEyXkFqcGc@._V1_FMjpg_UY4096_.jpg", trailer: "https://www.youtube.com/watch?v=BIhNsAtPbPI", year: 2021, genres: ["Action", "Spy", "Thriller"], director: "Cary Joji Fukunaga", actors: ["Daniel Craig", "Léa Seydoux", "Rami Malek"] },
      { tt: "tt8000908", title: "Next Goal Wins", poster: "https://m.media-amazon.com/images/M/MV5BYThhZjU4MTYtNDI5Ni00NTE0LTk2NjUtZmZhMGFiNDhiNDM4XkEyXkFqcGc@._V1_FMjpg_UY2000_.jpg", trailer: "https://www.youtube.com/watch?v=pRH5u5lpArQ", year: 2023, genres: ["Comedy", "Sports", "Drama"], director: "Taika Waititi", actors: ["Michael Fassbender", "Oscar Kightley", "Kaimana"] },
      { tt: "tt13860096", title: "One Life", poster: "https://m.media-amazon.com/images/M/MV5BOTFmYTFhMTUtODI5NS00NTVkLTk1NjItY2ZkZGU2MmViMGY1XkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg", trailer: "https://www.youtube.com/watch?v=1EVPjV7Toho", year: 2023, genres: ["Biography", "Drama", "History"], director: "James Hawes", actors: ["Anthony Hopkins", "Johnny Flynn", "Helena Bonham Carter"] },
      { tt: "tt10324164", title: "Champions", poster: "https://m.media-amazon.com/images/M/MV5BMWM0OWZiZTctN2IxZi00NTY2LWEwZjctOWRiNzYzMTg3NzM0XkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg", trailer: "https://www.youtube.com/watch?v=pCHiWnj5Oek", year: 2023, genres: ["Comedy", "Sports", "Drama"], director: "Bobby Farrelly", actors: ["Woody Harrelson", "Kaitlin Olson", "Madison Tevlin"] },
      { tt: "tt14439896", title: "Conclave", poster: "https://m.media-amazon.com/images/M/MV5BYWVjYjg2MDgtODk2NC00MjVkLTk4YWItZmNkZmIyNDg2MzVkXkEyXkFqcGc@._V1_FMjpg_UX1080_.jpg", trailer: "https://www.youtube.com/watch?v=JX9jasdi3ic", year: 2024, genres: ["Thriller", "Drama"], director: "Edward Berger", actors: ["Ralph Fiennes", "Stanley Tucci", "John Lithgow"] },
      { tt: "tt14439897", title: "The Order", poster: "https://m.media-amazon.com/images/M/MV5BZWIxOGQyYjYtOGEwOC00YWNjLWJmNTktZjJlM2RmNTdjMmVlXkEyXkFqcGc@._V1_FMjpg_UY3000_.jpg", trailer: "https://www.youtube.com/watch?v=6ethollg-PI", year: 2024, genres: ["Crime", "Thriller"], director: "Justin Kurzel", actors: ["Jude Law", "Nicholas Hoult", "Tye Sheridan"] },
    ];
  // Process SEED data directly (no API calls)
  for (const s of SEED) {
    final.push({
      id: hashCode(s.tt), // Use hash as unique ID
      imdbId: s.tt,
      title: s.title,
      overview: "", // Not needed for recommendations
      genres: [], // Will be handled by recommendation system
      year: s.year,
      era: toEra(s.year),
      popularity: 50, // Default popularity
      voteAverage: 7.0, // Default rating
      voteCount: 1000, // Default vote count
      posterUrl: s.poster,
      backdropUrl: null,
      trailerUrl: s.trailer,
      topActors: s.actors,
      director: s.director,
      sourceListIds: [IMDB_LISTS[0].id],
    });
  }

  // Update cache
  cache.catalogue = final;
  cache.stats = { byList: { [IMDB_LISTS[0].id]: final.length }, total: final.length };
  cache.ts = Date.now();
  
  console.log(`[Catalogue] Built ${final.length} items in fast mode`);
}

// ------------- API: catalogue -------------
api.get("/catalogue", async (req: Request, res: Response) => {
  try {
    if (!isFresh()) await buildStrictCatalogue();
    const all = String(req.query.all || "") === "1";
    const items = all ? cache.catalogue : cache.catalogue.slice(0, Math.min(2000, cache.catalogue.length));
    res.json({
      ok: true,
      total: cache.catalogue.length,
      items: items.map((m) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        genres: m.genres,
        releaseDate: m.year ? `${m.year}-01-01` : null,
        popularity: m.popularity,
        voteAverage: m.voteAverage,
        voteCount: m.voteCount,
        posterUrl: m.posterUrl ? `/api/proxy-img?u=${encodeURIComponent(m.posterUrl)}` : null,
        backdropUrl: m.backdropUrl,
        trailerUrl: m.trailerUrl,
        image: m.posterUrl ? `/api/proxy-img?u=${encodeURIComponent(m.posterUrl)}` : (m.backdropUrl ? `/api/proxy-img?u=${encodeURIComponent(m.backdropUrl)}` : null),
      })),
      stats: cache.stats,
      lists: Object.fromEntries(Object.entries(cache.byList).map(([sid, arr]) => [sid, arr.slice(0, 15).map((m) => ({ id: m.id, posterUrl: m.posterUrl }))])),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

api.post("/catalogue/build", async (_req: Request, res: Response) => {
  try {
    await buildStrictCatalogue();
    res.json({ ok: true, total: cache.catalogue.length, stats: cache.stats });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ------------- API: audit -------------
api.get("/audit/summary", async (_req: Request, res: Response) => {
  try {
    if (!isFresh()) await buildStrictCatalogue();
    res.json({ ok: true, lists: cache.stats.byList, total: cache.stats.total });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

api.get("/audit/find", async (req: Request, res: Response) => {
  try {
    if (!isFresh()) await buildStrictCatalogue();
    const q = String(req.query.title || "").toLowerCase();
    const hits = cache.catalogue.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 20);
    res.json({ ok: true, items: hits.map((m) => ({ id: m.id, title: m.title, year: m.year, lists: m.sourceListIds })) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ------------- API: A/B round -------------
function sample<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

api.get("/ab/round", async (_req: Request, res: Response) => {
  try {
    if (!isFresh()) await buildStrictCatalogue();
    const pool = cache.catalogue.filter((m) => m.posterUrl);
    const picks = sample(pool, Math.min(24, pool.length));
    const pairs: { a: any; b: any }[] = [];
    for (let i = 0; i < 24 && i + 1 < picks.length && pairs.length < 12; i += 2) {
      const a = picks[i]; const b = picks[i + 1];
      pairs.push({ a: { id: a.id, title: a.title, posterUrl: a.posterUrl, trailerUrl: a.trailerUrl }, b: { id: b.id, title: b.title, posterUrl: b.posterUrl, trailerUrl: b.trailerUrl } });
    }
    res.json({ pairs, excludeIds: picks.map((m) => m.id) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// ------------- Recommendations (stateless) -------------
function jaccard(a: Set<string | number>, b: Set<string | number>): number {
  let inter = 0;
  a.forEach((v) => { if (b.has(v)) inter++; });
  const union = a.size + b.size - inter || 1;
  return inter / union;
}

function scoreSimilarity(winners: CatalogueItem[], candidate: CatalogueItem): number {
  const candGenres = new Set(candidate.genres.map(String));
  const candActors = new Set(candidate.topActors);
  const candDir = new Set(candidate.director ? [candidate.director] : []);
  const candEra = new Set(candidate.era ? [candidate.era] : []);

  let best = 0;
  for (const w of winners) {
    const s = 0.4 * jaccard(new Set(w.genres.map(String)), candGenres)
            + 0.3 * jaccard(new Set(w.topActors), candActors)
            + 0.2 * jaccard(new Set(w.director ? [w.director] : []), candDir)
            + 0.1 * jaccard(new Set(w.era ? [w.era] : []), candEra);
    if (s > best) best = s;
  }
  const prior = Math.min(0.1, (candidate.popularity || 0) / 1000);
  return best + prior;
}

function diversityGuard(picks: CatalogueItem[]): boolean {
  const topGenres = picks.map((p) => p.genres[0]).filter(Boolean);
  const dirCounts = new Map<string, number>();
  for (const p of picks) { if (p.director) dirCounts.set(p.director, (dirCounts.get(p.director) || 0) + 1); }
  const genreCounts = new Map<number, number>();
  for (const g of topGenres) genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
  const genreOk = Array.from(genreCounts.values()).every((c) => c <= 2);
  const dirOk = Array.from(dirCounts.values()).every((c) => c <= 1);
  return genreOk && dirOk;
}

async function bestYouTubeFor(id: number): Promise<string | null> {
  try {
    const item = cache.catalogue.find((m) => m.id === id);
    if (!item) return null;
    const yearPart = item.year ? String(item.year) : "";
    const q = [item.title, yearPart, "official trailer"].filter(Boolean).join(" ");
    const url = `https://www.youtube.com/results?hl=en&search_query=${encodeURIComponent(q)}`;
    const html = await httpText(url);
    const ids = Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map((m) => m[1]).slice(0, 40);
    if (!ids.length) return null;
    let best = ids[0], bestScore = -1e9;
    for (const vid of ids) {
      const i = html.indexOf(vid);
      const w = html.slice(Math.max(0, i - 600), i + 600).toLowerCase();
      let s = 0;
      if (w.includes("official")) s += 3;
      if (w.includes("trailer")) s += 3;
      if (w.includes("teaser")) s += 1;
      if (w.includes("fan made") || w.includes("fan-made")) s -= 3;
      if (w.includes("compilation") || w.includes("anniversary")) s -= 2;
      if (item.year && w.includes(String(item.year))) s += 1;
      if (s > bestScore) { bestScore = s; best = vid; }
    }
    return `https://www.youtube.com/watch?v=${best}`;
  } catch {
    return null;
  }
}

async function batchBestYouTube(ids: number[]): Promise<Record<number, string | null>> {
  const out: Record<number, string | null> = {};
  await Promise.all(ids.map(async (id) => { out[id] = await bestYouTubeFor(id); }));
  return out;
}

api.post("/score-round", async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const winners: number[] = Array.isArray(body.winners) ? body.winners.map((n: any) => Number(n)).filter(Number.isFinite) : [];
    const excludeIds: number[] = Array.isArray(body.excludeIds) ? body.excludeIds.map((n: any) => Number(n)).filter(Number.isFinite) : [];
    if (!winners.length) return res.status(400).json({ error: "Missing winners" });
    if (!isFresh()) await buildStrictCatalogue();

    const winnerItems = winners.map((id) => cache.catalogue.find((m) => m.id === id)).filter(Boolean) as CatalogueItem[];
    const pool = cache.catalogue.filter((m) => !winners.includes(m.id) && !excludeIds.includes(m.id));

    const scored = pool.map((c) => ({ c, s: scoreSimilarity(winnerItems, c) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);

    let recs: CatalogueItem[] = [];
    for (const cand of scored) {
      if (recs.length >= 6) break;
      const test = [...recs, cand];
      if (diversityGuard(test)) recs.push(cand);
    }
    if (recs.length < 6) {
      const fallbackPool = pool.filter((m) => m.posterUrl);
      for (const m of sample(fallbackPool, Math.min(6 - recs.length, fallbackPool.length))) {
        if (!recs.find((r) => r.id === m.id)) recs.push(m);
      }
    }

    const trailers: Record<number, string | null> = {};
    for (const rec of recs) {
      trailers[rec.id] = rec.trailerUrl || null;
    }
    res.json({ recs: recs.map((m) => ({ id: m.id, title: m.title, posterUrl: m.posterUrl, trailerUrl: m.trailerUrl })), trailers });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Compat batch endpoint
api.get("/trailers", async (req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    let raw = String(req.query.ids || "");
    try { raw = decodeURIComponent(raw); } catch {}
    const ids = raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)).slice(0, 50);
    if (!ids.length) return res.json({ ok: true, trailers: {} });
    
    // Use trailer URLs from catalogue instead of searching YouTube
    const trailers: Record<number, string | null> = {};
    for (const id of ids) {
      const item = cache.catalogue.find((m) => m.id === id);
      trailers[id] = item?.trailerUrl || null;
    }
    
    res.json({ ok: true, trailers });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// New endpoint to switch to next seed list
api.post("/next-seed", (req, res) => {
  try {
    // For local development, we'll simulate switching between lists
    // In production, this would be handled by the global variable
    const listIds = ["ls094921320", "ls003501243"];
    const currentIndex = 0; // Default to first list for now
    const nextIndex = (currentIndex + 1) % listIds.length;
    const nextListId = listIds[nextIndex];
    
    res.json({
      ok: true,
      seedIndex: nextIndex,
      seedName: `List ${nextIndex + 1}`,
      seedId: nextListId,
      message: `Switched to ${nextListId}`
    });
  } catch (e) {
    console.error('Error in /api/next-seed:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Health
api.get("/health", (_req, res) => {
  res.json({ ok: true, cacheItems: cache.catalogue.length, cacheAgeMs: Date.now() - cache.ts, lists: cache.stats.byList, total: cache.stats.total });
});

export default api;


