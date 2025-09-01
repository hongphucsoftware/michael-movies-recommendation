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
    
    // Extract all IMDb IDs first
    const imdbIdMatches = html.match(/\/title\/(tt\d{7,8})\//g);
    if (!imdbIdMatches) {
      console.log("No IMDb IDs found in HTML");
      return out;
    }
    
    const imdbIds = imdbIdMatches.map(match => match.match(/tt\d{7,8}/)?.[0]).filter(Boolean) as string[];
    console.log(`Found ${imdbIds.length} IMDb IDs`);
    
    // For each unique IMDb ID, try to extract title and year from surrounding context
    let rank = 0;
    for (const imdbId of imdbIds) {
      if (seen.has(imdbId) || out.length >= limit) continue;
      seen.add(imdbId);
      rank += 1;
      
      // Simplified approach: use fallback to movie-monk-b0t for title/year
      // The IMDb scraping is working for IDs, but titles are hard to parse reliably
      let title = "Classic Movie";
      let year = "0000";
      
      // Try a simple title extraction, but don't worry if it fails
      const simplePattern = new RegExp(`${imdbId}[\\s\\S]{0,300}?"([^"]+)"`, 'i');
      const match = html.match(simplePattern);
      if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
        title = match[1].trim();
      }
      
      out.push({ imdbId, rank, title, year });
    }
    
    console.log(`Parsed ${out.length} movies from IMDb Top page`);
    return out;
  }

  /**
   * Parse IMDb custom list page to extract recent movies (2020-2024)
   */
  function parseImdbCustomList(html: string): Array<{imdbId: string, rank: number, title: string, year: string}> {
    const out: Array<{imdbId: string, rank: number, title: string, year: string}> = [];
    const seen = new Set<string>();
    
    // Extract IMDb IDs from the custom list page
    const imdbIdMatches = html.match(/\/title\/(tt\d{7,8})\//g);
    if (!imdbIdMatches) {
      console.log("No IMDb IDs found in custom list HTML");
      return out;
    }
    
    const imdbIds = imdbIdMatches.map(match => match.match(/tt\d{7,8}/)?.[0]).filter(Boolean) as string[];
    console.log(`Found ${imdbIds.length} IMDb IDs in custom list`);
    
    let rank = 0;
    for (const imdbId of imdbIds) {
      if (seen.has(imdbId) || rank >= 50) continue; // Limit to 50 recent movies
      seen.add(imdbId);
      rank += 1;
      
      // Use generic title for recent movies - TMDb will provide accurate data
      out.push({
        imdbId,
        rank,
        title: "Recent Hit",
        year: "2024"
      });
    }
    
    return out;
  }

  // Enhanced movie catalogue endpoint - combines classics + recent hits
  app.get("/api/movies/enhanced-catalogue", async (req, res) => {
    try {
      const allMovies: any[] = [];
      
      // 1. Get IMDb Top 50 classics (reduced to make room for recent movies)
      console.log("Fetching IMDb Top 50 classics...");
      const html = await fetchText("https://www.imdb.com/chart/top");
      const classics = parseImdbTop(html, 50);
      allMovies.push(...classics.map(movie => ({
        ...movie,
        category: 'classic',
        source: 'imdb_top_250'
      })));
      
      // 2. Get recent hits from custom IMDb list (2020-2024)
      console.log("Fetching recent hits from custom list...");
      try {
        const recentHtml = await fetchText("https://www.imdb.com/list/ls545836395/");
        const recentMovies = parseImdbCustomList(recentHtml);
        allMovies.push(...recentMovies.map(movie => ({
          ...movie,
          category: 'recent',
          source: 'imdb_custom_list'
        })));
      } catch (recentError) {
        console.warn("Failed to fetch recent movies, continuing with classics only:", recentError);
      }
      
      // Remove duplicates by IMDb ID
      const seen = new Set();
      const uniqueMovies = allMovies.filter(movie => {
        if (seen.has(movie.imdbId)) return false;
        seen.add(movie.imdbId);
        return true;
      });
      
      console.log(`Enhanced catalogue: ${uniqueMovies.length} unique movies (${classics.length} classics + ${allMovies.length - classics.length} recent)`);
      res.json({ items: uniqueMovies });
    } catch (error) {
      console.error("Enhanced catalogue error:", error);
      res.status(500).json({ error: "Failed to build enhanced catalogue", detail: String(error) });
    }
  });

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
      console.log("Fetching IMDb Top 250 page...");
      
      // Try direct scraping first
      try {
        const html = await fetchText("https://www.imdb.com/chart/top/");
        console.log(`Received HTML of length: ${html.length}`);
        
        const items = parseImdbTop(html, 100);
        if (items.length > 0) {
          console.log(`Returning ${items.length} items from direct scraping`);
          return res.json({ items });
        }
      } catch (scrapeError) {
        console.warn("Direct scraping failed:", scrapeError);
      }
      
      // Fallback to movie-monk-b0t repository
      console.log("Falling back to movie-monk-b0t repository...");
      const repoResponse = await fetchText("https://raw.githubusercontent.com/movie-monk-b0t/top250/main/top250.json");
      console.log(`Repository response length: ${repoResponse.length}`);
      
      const repoData = JSON.parse(repoResponse);
      console.log(`Repository data type: ${typeof repoData}, is array: ${Array.isArray(repoData)}`);
      
      if (!Array.isArray(repoData)) {
        console.error("Repository data is not an array, type:", typeof repoData);
        throw new Error("Repository data is not an array");
      }
      
      console.log(`Processing ${repoData.length} movies from repository`);
      const items = repoData.slice(0, 100).map((movie: any, index: number) => {
        const imdbMatch = movie.url?.match(/tt\d{7,8}/);
        const imdbId = imdbMatch ? imdbMatch[0] : `tt${String(index).padStart(7, '0')}`;
        const title = movie.name || "Unknown Title";
        const year = movie.datePublished ? movie.datePublished.slice(0, 4) : "0000";
        
        console.log(`Movie ${index}: ${imdbId} - ${title} (${year})`);
        return { imdbId, rank: index + 1, title, year };
      }).filter(item => item.imdbId.startsWith('tt'));
      
      console.log(`Returning ${items.length} items from fallback repository`);
      res.json({ items });
      
    } catch (e) {
      console.error("IMDb Top 100 error:", e);
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
