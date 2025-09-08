import express, { type Request, Response, NextFunction } from "express";
import api from "./routes-simple";
import { setupVite, serveStatic, log } from "./vite";
import * as cheerio from "cheerio";

const IMDB_LISTS = [
  { id: "ls094921320", name: "Best Movies of All Time" },
  { id: "ls003501243", name: "Top Rated Movies" },
  { id: "ls002065120", name: "Most Popular Movies" },
  { id: "ls000873904", name: "Classic Movies" },
  { id: "ls005747458", name: "Recent Hits" }
];

const PER_LIST_LIMIT = 200;
const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_KEY = "5806f2f63f3875fd9e1755ce864ee15f";

type Row = { imdbId: string | null; title: string; year: number | null };

function extractYear(text: string): number | null {
  const match = text.match(/\((\d{4})\)/);
  return match ? parseInt(match[1]) : null;
}

function pickImdbId(href: string | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/title\/(tt\d+)/);
  return m ? m[1] : null;
}

async function scrapeImdbListAll(listId: string) {
  let page = 1;
  const rows: Row[] = [];

  while (rows.length < PER_LIST_LIMIT) {
    const url = `https://www.imdb.com/list/${listId}/?mode=detail&page=${page}`;
    const html = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (PickAFlick/1.0)" }
    }).then(r => r.text());

    const $ = cheerio.load(html);
    const oldRows = $(".lister-list .lister-item").toArray();
    const newRows = $(".ipc-page-content-container .ipc-metadata-list-summary-item").toArray();

    if (oldRows.length) {
      for (const el of oldRows) {
        const a = $(el).find(".lister-item-header a").first();
        const href = a.attr("href") || "";
        const imdbId = pickImdbId(href);
        if (!imdbId) continue;
        const title = a.text().trim();
        const year = extractYear($(el).find(".lister-item-year").first().text());
        if (title) rows.push({ imdbId, title, year });
        if (rows.length >= PER_LIST_LIMIT) break;
      }
    } else {
      for (const el of newRows) {
        const a = $(el).find("a.ipc-title-link-wrapper").first();
        const href = a.attr("href") || "";
        const imdbId = pickImdbId(href);
        if (!imdbId) continue;
        const title = a.text().trim();
        const meta = $(el).find(".cli-title-metadata-item").toArray()
          .map(n => $(n).text().trim()).join(" ");
        const year = extractYear(meta);
        if (title) rows.push({ imdbId, title, year });
        if (rows.length >= PER_LIST_LIMIT) break;
      }
    }

    if (oldRows.length === 0 && newRows.length === 0) break;
    page++;
  }

  return rows;
}

async function tmdbFindByImdb(imdbId: string) {
  const url = `${TMDB_API}/find/${imdbId}?external_source=imdb_id&api_key=${TMDB_KEY}`;
  const j = await fetch(url).then(r => r.json());
  const hit = Array.isArray(j?.movie_results) ? j.movie_results[0] : null;
  return hit ?? null;
}

async function tmdbSearchFallback(title: string, year: number | null) {
  const tryOne = async (y: number | null) => {
    const q = new URLSearchParams({
      query: title,
      include_adult: "false",
      language: "en-US",
      page: "1"
    });
    if (y) q.set("year", String(y));

    const url = `${TMDB_API}/search/movie?${q}&api_key=${TMDB_KEY}`;
    const j = await fetch(url).then(r => r.json());
    return j?.results?.[0] ?? null;
  };

  return (await tryOne(year)) ||
         (await tryOne(year ? year + 1 : null)) ||
         (await tryOne(year ? year - 1 : null));
}

// Need to add tmdbDetails and img functions if they are not defined elsewhere
// Assuming tmdbDetails fetches movie details from TMDb API by ID
// Assuming img formats image URLs
async function tmdbDetails(id: number) {
  const url = `${TMDB_API}/movie/${id}?api_key=${TMDB_KEY}`;
  return fetch(url).then(r => r.json());
}

function img(type: "poster" | "backdrop", path: string | null) {
  if (!path) return "";
  const size = type === "poster" ? "w500" : "w1280";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // CRITICAL: All API routes must be defined BEFORE any catch-all middleware
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Mount API routes with explicit path protection
  app.use("/api", (req, res, next) => {
    // Force JSON responses for all /api/* routes
    res.setHeader('Content-Type', 'application/json');
    next();
  }, api);

  // Explicit catch-all for unknown API routes (must come before Vite)
  app.all("/api/*", (req, res) => {
    log(`404 API endpoint: ${req.method} ${req.path}`);
    res.status(404).json({ ok: false, error: "API endpoint not found" });
  });

  // Only now setup static/Vite serving (which has catch-all behavior)
  if (app.get("env") === "development") {
    await setupVite(app, app);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  app.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
    log(`API endpoints: /api/health, /api/ab/round, /api/score-round`);
  });
})();