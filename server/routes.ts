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

  // Image proxy for TMDb posters (bulletproof image loading)
  app.get("/img/*", async (req, res) => {
    try {
      const imagePath = req.params['0'] || '';
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
