import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import api from "./routes/api.js";
import { tryLoadCache, getCatalogue, setCatalogue, getHydrated, setHydrated } from "./store.js";
import { fetchImdbList } from "./imdb.js";
import { hydrateOne } from "./tmdb.js";
import { buildFeatures } from "./features.js";
import { IMDB_LISTS } from "./constants.js";
import { MovieHydrated } from "./types.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());

// ✅ 1) API FIRST
app.use("/api", api);

// ✅ 2) Serve built client (robust path finder)
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const candidates = [
  path.resolve(__dirname, "../../dist/client"),  // typical vite outDir: dist/client
  path.resolve(__dirname, "../../dist/public"),  // some zips use dist/public
];
const clientDir = 
  candidates.find(p => fs.existsSync(path.join(p, "index.html"))) || candidates[0];

app.use(express.static(clientDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

async function buildCatalogue() {
  tryLoadCache(); 
  if (getHydrated().length) {
    console.log("[catalogue] Loaded from cache:", getHydrated().length);
    return;
  }
  console.log("[catalogue] Fetching IMDb lists…"); 
  const all: Map<string, {imdbId: string; title: string; year?: number}> = new Map();
  for (const url of IMDB_LISTS) {
    try {
      const items = await fetchImdbList(url); 
      items.forEach(m => all.set(m.imdbId, m));
    } catch {
      console.warn("Failed list", url);
    }
  }
  const basics = Array.from(all.values()); 
  setCatalogue(basics); 
  console.log("[catalogue] Found", basics.length, "unique items.");
  console.log("[hydrate] Hydrating via TMDb…"); 
  const hydrated: MovieHydrated[] = []; 
  for (const m of basics) {
    try {
      const h = await hydrateOne(m); 
      h.features = buildFeatures(h); 
      hydrated.push(h);
    } catch {}
  }
  setHydrated(hydrated); 
  console.log("[hydrate] Hydrated", hydrated.length, "items.");
}

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server on", PORT, "clientDir:", clientDir);
  buildCatalogue().catch(() => {});
});