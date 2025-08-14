import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { Readable } from "stream";

export async function registerRoutes(app: Express): Promise<Server> {
  // TMDb Configuration
  const TMDB_KEY = "5806f2f63f3875fd9e1755ce864ee15f";
  const TMDB_IMG_BASE = "https://image.tmdb.org";
  const TMDB_API_BASE = "https://api.themoviedb.org/3";

  // Helper function for proxying JSON from TMDb API
  async function proxyJSON(url: string, res: any) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) {
        return res.status(response.status).send(await response.text());
      }
      res.set("Cache-Control", "public, max-age=300"); // 5 min cache
      res.type("application/json");
      const data = await response.text();
      res.send(data);
    } catch (e) {
      res.status(502).json({ error: "Upstream error", detail: String(e) });
    }
  }

  // Helper function to fetch text from URLs
  async function fetchText(url: string): Promise<string> {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return r.text();
  }

  /**
   * Parse IMDb Top page HTML and return [{imdbId, rank, title, year}]
   * We target links like /title/tt1234567/ and read the visible title & year nearby.
   */
  function parseImdbTop(html: string, limit = 100) {
    const out: Array<{imdbId: string, rank: number, title: string, year: string}> = [];
    const seen = new Set<string>();
    // Fallback-friendly: match title links and capture a window of text to extract name/year
    const re = /\/title\/(tt\d{7,8})\/[^>]*>([^<]+)<\/a>[\s\S]{0,120}?\((\d{4})\)/g;
    let m, rank = 0;
    while ((m = re.exec(html)) && out.length < limit) {
      const imdbId = m[1];
      const title = m[2].trim();
      const year = m[3];
      if (seen.has(imdbId)) continue;
      seen.add(imdbId);
      rank += 1;
      out.push({ imdbId, rank, title, year });
    }
    return out;
  }

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Test endpoint for image proxy (known working TMDb poster)
  app.get("/imgtest", async (req, res) => {
    try {
      const demoUrl = "https://image.tmdb.org/t/p/w500/6DrHO1jr3qVrViUO6s6kFiAGM7.jpg";
      console.log(`[imgtest] Fetching: ${demoUrl}`);
      const response = await fetch(demoUrl);
      
      if (!response.ok) {
        console.log(`[imgtest] Upstream error: ${response.status}`);
        return res.status(response.status).send("Upstream error (imgtest)");
      }
      
      res.set("Cache-Control", "public, max-age=86400");
      res.set("Content-Type", response.headers.get("content-type") || "image/jpeg");
      
      // Use buffer approach for simplicity in testing
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`[imgtest] Image buffered, size: ${buffer.length} bytes`);
      res.end(buffer);
    } catch (error) {
      console.error(`[imgtest] Error:`, error);
      res.status(502).send(`Proxy error (imgtest): ${error}`);
    }
  });

  // TMDb API Proxies (hide API key + avoid CORS)
  app.get("/api/trending/:type", async (req, res) => {
    const { type } = req.params; // movie|tv
    const url = `${TMDB_API_BASE}/trending/${encodeURIComponent(type)}/week?api_key=${TMDB_KEY}&language=en-US`;
    await proxyJSON(url, res);
  });

  app.get("/api/videos/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    const url = `${TMDB_API_BASE}/${encodeURIComponent(type)}/${encodeURIComponent(id)}/videos?api_key=${TMDB_KEY}&language=en-US`;
    await proxyJSON(url, res);
  });

  // NEW: List endpoints with pagination for massive catalogue expansion
  app.get("/api/list/:kind/:type/:page", async (req, res) => {
    // kind: popular | top_rated | upcoming | now_playing | airing_today | on_the_air
    // type: movie | tv
    const { kind, type, page } = req.params;
    const safeKind = encodeURIComponent(kind);
    const safeType = encodeURIComponent(type);
    const safePage = Number(page) || 1;
    const url = `${TMDB_API_BASE}/${safeType}/${safeKind}?api_key=${TMDB_KEY}&language=en-US&page=${safePage}`;
    await proxyJSON(url, res);
  });

  /**
   * GET /api/imdb/top100
   * Scrapes IMDb Top 250 page and returns top 100 basic entries
   * Source: https://www.imdb.com/chart/top/
   */
  app.get("/api/imdb/top100", async (req, res) => {
    try {
      const html = await fetchText("https://www.imdb.com/chart/top/");
      const items = parseImdbTop(html, 100);
      if (!items.length) {
        // try the "simple" view as a fallback
        const html2 = await fetchText("https://www.imdb.com/chart/top/?mode=simple");
        const items2 = parseImdbTop(html2, 100);
        return res.json({ items: items2 });
      }
      res.json({ items });
    } catch (e) {
      res.status(502).json({ error: "Failed to fetch IMDb Top 100", detail: String(e) });
    }
  });

  /**
   * GET /api/tmdb/find/:imdbId
   * Map an IMDb ID to TMDb movie via /find
   */
  app.get("/api/tmdb/find/:imdbId", async (req, res) => {
    const { imdbId } = req.params;
    try {
      const url = `${TMDB_API_BASE}/find/${encodeURIComponent(imdbId)}?api_key=${TMDB_KEY}&external_source=imdb_id`;
      const r = await fetch(url, { redirect: "follow" });
      if (!r.ok) return res.status(r.status).send(await r.text());
      const data = await r.json() as any;
      // Prefer movie_results; fall back if ever needed
      const movie = (data.movie_results && data.movie_results[0]) || null;
      res.json({ movie });
    } catch (e) {
      res.status(502).json({ error: "Failed to map IMDb → TMDb", detail: String(e) });
    }
  });

  // Legacy find endpoint for backwards compatibility
  app.get("/api/find/:imdb_id", async (req, res) => {
    const { imdb_id } = req.params;
    const url = `${TMDB_API_BASE}/find/${encodeURIComponent(imdb_id)}?external_source=imdb_id&api_key=${TMDB_KEY}&language=en-US`;
    await proxyJSON(url, res);
  });

  // Image proxy for TMDb posters (bulletproof image loading)
  app.get("/img/*", async (req, res) => {
    try {
      const imagePath = (req.params as any)['0'] || '';
      const upstream = `${TMDB_IMG_BASE}/${imagePath}`; // e.g. t/p/w500/xxx.jpg
      console.log(`Proxying image: ${upstream}`);
      
      const response = await fetch(upstream, { redirect: "follow" });
      if (!response.ok) {
        return res.status(response.status).send("Upstream error");
      }
      
      res.set("Cache-Control", "public, max-age=86400"); // 1 day cache
      res.set("Access-Control-Allow-Origin", "*"); // CORS header for embeds
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.set("Content-Type", contentType);
      
      // Use simpler buffer approach for reliability  
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`[img-proxy] Image buffered, size: ${buffer.length} bytes for ${imagePath}`);
      res.end(buffer);
    } catch (e) {
      console.error("Image proxy error:", e);
      res.status(502).send("Proxy error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
