
import { Router } from "express";
import { getState } from "../state";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY as string;

const r = Router();
const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = <T>(arr: T[], n: number) => shuffle([...arr]).slice(0, Math.min(n, arr.length));

type Vid = { site?: string, type?: string, name?: string, key?: string };

const best = (vs: Vid[]) => {
  const ys = vs.filter(v => (v.site || "").toLowerCase() === "youtube" && v.key);
  if (!ys.length) return null;
  const rank = (v: Vid) => {
    const t = (v.type || "").toLowerCase(), n = (v.name || "").toLowerCase();
    let s = 0;
    if (t.includes("trailer")) s += 100;
    if (t.includes("teaser")) s += 60;
    if (t.includes("clip")) s += 40;
    if (n.includes("official")) s += 10;
    return s;
  }
  ys.sort((a, b) => rank(b) - rank(a));
  return ys[0] || null;
}

async function trailerUrl(id: number) {
  const f = async (p: string) => {
    try {
      const j = await fetch(`${TMDB_API}${p}&api_key=${TMDB_KEY}`).then(r => r.json());
      if (Array.isArray(j?.results)) return j.results as Vid[];
      if (Array.isArray(j?.videos?.results)) return j.videos.results as Vid[];
      return [];
    } catch { return []; }
  }
  let v = await f(`/movie/${id}/videos?`);
  if (!v.length) v = await f(`/movie/${id}?append_to_response=videos&include_video_language=en,null`);
  const b = best(v);
  return b?.key ? `https://www.youtube.com/embed/${b.key}` : null;
}

r.post("/score-round", async (req, res) => {
  try {
    const st = await getState();
    const ex = new Set<number>((req.body?.excludeIds || []) as number[]);
    const pool = st.catalogue.filter(m => !ex.has(m.id));
    const recs = sample(pool, 6);
    
    // Add trailer URLs to each movie
    const moviesWithTrailers = [];
    for (const m of recs) {
      const trailerEmbedUrl = await trailerUrl(m.id);
      moviesWithTrailers.push({
        ...m,
        trailerUrl: trailerEmbedUrl
      });
    }
    
    res.json({
      ok: true,
      movies: moviesWithTrailers,
      explanation: { summaryText: "6 picks from your five IMDb lists." },
      reasonsPerMovie: {}
    });
  } catch (error) {
    console.error("Override score-round error:", error);
    res.status(500).json({ ok: false, error: "Failed to get recommendations" });
  }
});

r.get("/trailers", async (req, res) => {
  try {
    const ids = String(req.query.ids || "").split(",").map(s => Number(s.trim())).filter(Number.isFinite);
    const out: Record<number, string | null> = {};
    for (const id of ids) {
      out[id] = await trailerUrl(id);
    }
    res.json({ ok: true, trailers: out });
  } catch (error) {
    console.error("Override trailers error:", error);
    res.status(500).json({ ok: false, error: "Failed to get trailers" });
  }
});

export default r;
