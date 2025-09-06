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
type Vote = {
  leftId: number;
  rightId: number;
  chosenId: number;    // one of left/right
};

/* ====================== Caches ====================== */
let CATALOGUE: Item[] = [];
let AB_SET = new Set<number>();
let BUILT_AT = 0;

/* Per-session in-memory profiles (swap to Redis later if needed) */
type Profile = {
  w: Record<string, number>;          // feature weights
  seenPairs: Set<string>;             // "idA|idB" canonicalized
  rounds: number;
};
const PROFILES = new Map<string, Profile>();

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
/* We fetch list pages in "detail" mode with sort by list order; paginate until exhausted. */
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

/* ====================== TMDb resolution (title→id→credits) ====================== */
async function tmdbSearch(title: string, year?: number) {
  const url = `${TMDB}/search/movie?api_key=${encodeURIComponent(TMDB_API_KEY)}&query=${encodeURIComponent(title)}${year?`&year=${year}`:""}`;
  const r = await fetch(url); if (!r.ok) return null;
  const j:any = await r.json(); const hits:any[] = j?.results || [];
  if (!hits.length) return null;
  const exact = year ? hits.find(h => (h.release_date||"").startsWith(String(year))) : null;
  return exact || hits[0];
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
async function resolveRaw(raw: Raw): Promise<Item|null> {
  try {
    const hit = await tmdbSearch(raw.title, raw.year);
    if (!hit || hit.adult) {
      console.log(`[TMDB] No hit for: "${raw.title}" (${raw.year})`);
      return null;
    }

    const { directors, actors } = await tmdbCredits(hit.id);
    const resolved = {
      id: hit.id,
      title: hit.title || hit.original_title || raw.title,
      year: raw.year,
      genres: Array.isArray(hit.genre_ids) ? hit.genre_ids.slice() : [],
      directors, actors,
      posterUrl: hit.poster_path? `${IMG}/${POSTER}${hit.poster_path}` : null,
      backdropUrl: hit.backdrop_path? `${IMG}/${BACKDROP}${hit.backdrop_path}` : null,
      overview: hit.overview || "",
      popularity: hit.popularity || 0,
      voteAverage: hit.vote_average || 0,
      voteCount: hit.vote_count || 0,
      sources: [raw.srcList]
    };

    console.log(`[TMDB] Resolved: "${raw.title}" → "${resolved.title}" (ID: ${resolved.id})`);
    return resolved;
  } catch (error) {
    console.error(`[TMDB] Error resolving "${raw.title}":`, error);
    return null;
  }
}

/* ====================== Build catalogue & AB (15 per list) ====================== */
function chooseAB15(items: Item[]): number[] {
  // 5 by genre variety + 5 by era spread + 5 by popularity
  const byId = new Map(items.map(i=>[i.id,i]));
  const picks = new Set<number>();

  // 1) genre variety
  const byGenre: Record<string, Item[]> = {};
  for (const it of items) {
    const g = (it.genres[0] ?? -1).toString();
    (byGenre[g] ||= []).push(it);
  }
  for (const g in byGenre) byGenre[g].sort((a,b)=>b.popularity-a.popularity);
  for (const g of Object.keys(byGenre).slice(0,10)) {
    if (picks.size>=5) break;
    picks.add(byGenre[g][0].id);
  }

  // 2) era spread
  const eraBuckets: Record<string, Item[]> = {};
  for (const it of items) {
    const d = (decadeOf(it.year) ?? 2000).toString();
    (eraBuckets[d] ||= []).push(it);
  }
  for (const d in eraBuckets) eraBuckets[d].sort((a,b)=>b.popularity-a.popularity);
  for (const d of Object.keys(eraBuckets)) {
    if (picks.size>=10) break;
    picks.add(eraBuckets[d][0].id);
  }

  // 3) popularity top-off
  const rest = items.slice().sort((a,b)=>b.popularity-a.popularity);
  for (const it of rest) {
    if (picks.size>=15) break;
    picks.add(it.id);
  }
  return Array.from(picks).slice(0,15);
}

async function buildAll(): Promise<void> {
  const now = Date.now();
  if (CATALOGUE.length && now - BUILT_AT < CATALOGUE_TTL_MS) {
    console.log(`[BUILD] Using cached catalogue: ${CATALOGUE.length} items, ${AB_SET.size} in AB set`);
    return;
  }

  // Clear cache for fresh build
  CATALOGUE = [];
  AB_SET.clear();

  console.log(`[BUILD] Starting fresh build with Top 250 + supplementary lists`);

  const rawAll: Raw[] = [];

  // Skip Top 250 - using only your specified lists

  // Then get your specified lists
  for (const id of LIST_IDS) {
    console.log(`[BUILD] Fetching IMDB list: ${id}`);
    const rows = await fetchListTitles(id);
    console.log(`[BUILD] List ${id}: ${rows.length} raw titles`);
    rawAll.push(...rows);
  }

  console.log(`[BUILD] Total raw titles across all lists: ${rawAll.length}`);

  // resolve sequentially per list to keep memory calm
  const byList = new Map<string, Item[]>();
  for (const listId of LIST_IDS) {
    const raws = rawAll.filter(r=>r.srcList===listId);
    console.log(`[BUILD] Resolving ${raws.length} titles for list ${listId}`);

    const jobs = raws.map(r => async()=> await resolveRaw(r));
    const resolved = await pLimit(CONCURRENCY, jobs);
    const items = resolved.filter(Boolean) as Item[];

    console.log(`[BUILD] List ${listId}: ${items.length}/${raws.length} titles resolved`);
    byList.set(listId, items);
  }

  // build AB set and full catalogue
  const abIds: number[] = [];
  const full: Map<number, Item> = new Map();
  Array.from(byList.entries()).forEach(([listId, items]) => {
    const picks = chooseAB15(items);
    console.log(`[BUILD] List ${listId}: selected ${picks.length} for AB testing`);
    abIds.push(...picks);
    for (const it of items) {
      const ex = full.get(it.id);
      if (!ex) full.set(it.id, it);
      else ex.sources = Array.from(new Set([...ex.sources, ...it.sources]));
    }
  });

  CATALOGUE = Array.from(full.values());
  AB_SET = new Set(abIds);
  BUILT_AT = now;

  console.log(`[BUILD] Final catalogue: ${CATALOGUE.length} total movies, ${AB_SET.size} in AB set`);
  console.log(`[BUILD] Sample AB movies:`, Array.from(AB_SET).slice(0, 5).map(id => {
    const item = CATALOGUE.find(i => i.id === id);
    return item ? `${item.title} (${item.year})` : `ID:${id}`;
  }));
}

/* ====================== Feature encoding ====================== */
function feats(it: Item): Record<string, number> {
  const f: Record<string, number> = {};
  // genres
  for (const g of it.genres) f[`g:${g}`] = 1;
  // era
  const d = decadeOf(it.year); if (d) f[`era:${d}`] = 1;
  // director(s)
  for (const dname of it.directors.slice(0,1)) f[`dir:${dname.toLowerCase()}`] = 1;
  // actors
  for (const an of it.actors.slice(0,3)) f[`act:${an.toLowerCase()}`] = 1;
  return f;
}
function dot(w:Record<string,number>, f:Record<string,number>) {
  let s=0; for (const k in f) s += (w[k]||0) * f[k]; return s;
}
function addScaled(w:Record<string,number>, f:Record<string,number>, scale:number) {
  for (const k in f) w[k] = (w[k]||0) + scale*f[k];
}

/* ====================== A/B selection & learning ====================== */
function sess(req:Request): Profile {
  const sid =
    (req.headers["x-session-id"] as string) ||
    (req.query.sid as string) ||
    "anon";
  let p = PROFILES.get(sid);
  if (!p) {
    p = { w: {}, seenPairs: new Set(), rounds: 0 };
    PROFILES.set(sid,p);
  }
  return p;
}

function noStore(res: express.Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// pick next pair: unseen, far apart in feature space, from AB set only
function nextPair(p:Profile): [Item, Item] | null {
  const pool = CATALOGUE.filter(x => AB_SET.has(x.id));
  if (pool.length < 2) return null;
  // Score uncertainty as |dot| small ⇒ more informative
  const scored = pool.map(it => {
    const s = dot(p.w, feats(it));
    const u = 1 / (1 + Math.abs(s)); // higher when close to 0
    return { it, u };
  }).sort((a,b)=> b.u - a.u);

  // greedy: take top-U as anchors and find most dissimilar partner
  for (const anchor of scored.slice(0, 30)) {
    let best: {it:Item; dist:number} | null = null;
    for (const cand of scored.slice(0, 80)) {
      if (cand.it.id === anchor.it.id) continue;
      const key = anchor.it.id < cand.it.id ? `${anchor.it.id}|${cand.it.id}` : `${cand.it.id}|${anchor.it.id}`;
      if (p.seenPairs.has(key)) continue;
      // distance = Jaccard over binary features (genres+era+people)
      const fa = feats(anchor.it), fb = feats(cand.it);
      const ka = new Set(Object.keys(fa)), kb = new Set(Object.keys(fb));
      let inter=0; Array.from(ka).forEach(k => { if (kb.has(k)) inter++; });
      const uni = new Set([...Array.from(ka), ...Array.from(kb)]).size;
      const dist = 1 - (inter/(uni||1));
      if (!best || dist>best.dist) best = { it:cand.it, dist };
    }
    if (best) {
      const a = anchor.it, b = best.it;
      const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      p.seenPairs.add(key);
      return [a,b];
    }
  }
  // fallback: random unseen
  for (let tries=0; tries<100; tries++) {
    const a = pool[Math.floor(Math.random()*pool.length)];
    const b = pool[Math.floor(Math.random()*pool.length)];
    if (a.id===b.id) continue;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (!p.seenPairs.has(key)) { p.seenPairs.add(key); return [a,b]; }
  }
  return null;
}

// one SGD step on logistic loss for (A vs B)
function updateFromVote(p:Profile, left:Item, right:Item, chosenId:number) {
  const fA = feats(left), fB = feats(right);
  const fDiff: Record<string,number> = {};
  // f = fA - fB
  Array.from(new Set([...Object.keys(fA), ...Object.keys(fB)])).forEach(k => {
    fDiff[k] = (fA[k]||0) - (fB[k]||0);
  });
  const y = (chosenId === left.id) ? 1 : 0;
  const s = dot(p.w, fDiff);
  const pHat = 1/(1+Math.exp(-s));
  const grad = (pHat - y);             // d/dw
  const lr = 0.25;                     // learning rate tuned for 12 rounds
  const l2 = 0.001;                    // small weight decay
  // w ← w - lr*(grad*f + l2*w)
  for (const k in p.w) p.w[k] = p.w[k]*(1 - lr*l2);
  addScaled(p.w, fDiff, -lr*grad);
  p.rounds += 1;
}

/* rank recs (the non-AB pool) by learned score + small popularity prior */
function recommend(p:Profile, topN=60): Item[] {
  const recPool = CATALOGUE.filter(x => !AB_SET.has(x.id));
  const scores = recPool.map(it => {
    const pref = dot(p.w, feats(it));
    const prior = (it.voteAverage||0) * Math.log(1 + (it.voteCount||1));
    const zPrior = prior / 20; // rough scale
    const s = 0.7*pref + 0.3*zPrior;   // blend; after ~12 rounds, pref dominates
    return { it, s };
  }).sort((a,b)=> b.s - a.s);
  return scores.slice(0, topN).map(x=>x.it);
}

/* ====================== Router ====================== */
const api = express.Router();

api.get("/catalogue", async (req:Request, res:Response) => {
  await buildAll();
  const wantAll = String(req.query.all||"") === "1";
  const ab = CATALOGUE.filter(x=>AB_SET.has(x.id));
  const all = CATALOGUE.slice();
  const items = wantAll ? all : ab;
  res.json({
    ok:true,
    policy: wantAll ? "ALL_FROM_IMDB_LISTS" : `AB_15_PER_LIST`,
    total: all.length,
    items: items.map(t=>({
      id: t.id,
      title: t.title,
      year: t.year,
      image: t.posterUrl || t.backdropUrl || null,
      posterUrl: t.posterUrl,
      backdropUrl: t.backdropUrl,
      overview: t.overview,
      genres: t.genres,
      sources: t.sources
    })),
  });
});

// Get next A/B pair (drives your existing PosterPair without UI changes)
api.get("/ab/next", async (req:Request, res:Response) => {
  await buildAll();
  const p = sess(req);
  const pair = nextPair(p);
  if (!pair) return res.json({ ok:true, done:true });
  const [a,b] = pair;
  res.json({
    ok:true,
    left:  { id:a.id, title:a.title, year:a.year, image:a.posterUrl || a.backdropUrl },
    right: { id:b.id, title:b.title, year:b.year, image:b.posterUrl || b.backdropUrl },
  });
});

// Record a vote (left vs right) and update profile
api.post("/ab/vote", express.json(), async (req:Request, res:Response) => {
  noStore(res);
  const schema = z.object({
    leftId: z.number(), rightId: z.number(), chosenId: z.number()
  });
  const { leftId, rightId, chosenId } = schema.parse(req.body);

  const left = CATALOGUE.find(i=>i.id===leftId);
  const right= CATALOGUE.find(i=>i.id===rightId);
  if (!left || !right || !AB_SET.has(left.id) || !AB_SET.has(right.id)) {
    return res.status(400).json({ ok:false, error:"Bad pair" });
  }
  const p = sess(req);
  updateFromVote(p, left, right, chosenId);
  
  console.log(`[A/B VOTE] Session ${req.headers["x-session-id"] || req.query.sid || "anon"}: ${left.title} vs ${right.title} → chose ${chosenId === left.id ? left.title : right.title} (Round ${p.rounds})`);
  console.log(`[VOTE] Rounds: ${p.rounds}, Features learned: ${Object.keys(p.w).length}`);
  
  // Return fresh recommendations immediately
  const recs = recommend(p, 20).map(t => ({
    id: t.id, title: t.title, year: t.year,
    image: t.posterUrl || t.backdropUrl,
    posterUrl: t.posterUrl, backdropUrl: t.backdropUrl,
    genres: t.genres
  }));
  
  res.json({ ok:true, rounds:p.rounds, recs });
});

// Recommendations ranked for the current user
api.get("/recs", async (req:Request, res:Response) => {
  noStore(res);
  await buildAll();
  const p = sess(req);
  const sid = (req.headers["x-session-id"] as string) || (req.query.sid as string) || "anon";
  
  console.log(`[RECS] Session ${sid}: ${p.rounds} rounds completed, ${Object.keys(p.w).length} features learned`);
  if (p.rounds > 0) {
    const topWeights = Object.entries(p.w).sort((a,b)=>b[1]-a[1]).slice(0,3);
    console.log(`[RECS] Top learned preferences:`, topWeights);
  }
  
  const top = recommend(p, Number(req.query.top||60));
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
    // quick rationale: top 3 positive weights
    likes: Object.entries(p.w).sort((a,b)=>b[1]-a[1]).slice(0,6)
  });
});

// Trailers unchanged (TMDb→YouTube)
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