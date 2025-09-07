import { Router } from "express";
import { getState } from "../state";
const api = Router();

function noStore(res: any) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Vary", "x-session-id");
}
function shuffleInPlace<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample<T>(arr: T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const a = [...arr];
  shuffleInPlace(a);
  return a.slice(0, n);
}

api.get("/health", async (_req, res) => {
  const st = await getState();
  res.json({
    ok: true,
    counts: { all: st.all.length, posters: st.postersFlat.length, recPool: st.recPool.length },
    builtAt: st.builtAt
  });
});

api.get("/catalogue", async (req, res) => {
  noStore(res);
  const st = await getState();
  if (req.query.grouped === "1") return res.json({ ok: true, lists: st.postersByList });
  res.json({ ok: true, items: st.postersFlat });
});

api.get("/catalogue-all", async (_req, res) => {
  noStore(res);
  const st = await getState();
  const perListCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(st.byList)) perListCounts[k] = v.length;
  res.json({
    ok: true,
    totals: { all: st.all.length, posters: st.postersFlat.length, recPool: st.recPool.length, perListCounts }
  });
});

api.get("/recs", async (req, res) => {
  noStore(res);
  const st = await getState();
  const limit = Number(req.query.limit ?? 6);
  res.json({ ok: true, recs: sample(st.recPool, limit) });
});

api.get("/trailers", async (req, res) => {
  noStore(res);
  const TMDB_API = "https://api.themoviedb.org/3";
  const TMDB_KEY = process.env.TMDB_API_KEY as string;
  const ids = String(req.query.ids ?? "")
    .split(",").map(s => s.trim()).filter(Boolean).map(Number).filter(n => Number.isFinite(n));
  const out: Record<number, string|null> = {};
  for (const id of ids) {
    try {
      const data = await fetch(`${TMDB_API}/movie/${id}/videos?language=en-US&api_key=${TMDB_KEY}`).then(r => r.json());
      const vids = Array.isArray(data?.results) ? data.results : [];
      const yt = vids.find((v: any) =>
        v.site === "YouTube" && /Trailer|Teaser|Official|Clip/i.test(`${v.type} ${v.name}`) && v.key
      );
      out[id] = yt ? `https://www.youtube.com/embed/${yt.key}` : null;
    } catch { out[id] = null; }
  }
  res.json({ ok: true, trailers: out });
});

/* Optional compatibility for old UI: safe no-ops. Remove later if unused. */
api.get("/ab/next", async (_req, res) => {
  const st = await getState();
  const [left, right] = sample(st.postersFlat, 2);
  res.json({ ok: true, left, right });
});
api.post("/ab/vote", async (_req, res) => {
  const st = await getState();
  res.json({ ok: true, rounds: 1, recs: sample(st.recPool, 6) });
});

export default api;