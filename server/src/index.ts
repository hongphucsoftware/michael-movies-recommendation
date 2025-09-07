import express from "express"; import cors from "cors"; import cookieParser from "cookie-parser";
import { IMDB_LISTS, DEFAULT_REC_LIMIT, POSTER_BASE } from "./constants.js";
import { fetchImdbList } from "./imdb.js"; import { hydrateOne } from "./tmdb.js"; import { buildFeatures } from "./features.js";
import { getOrCreateUser, tryLoadCache, getCatalogue, setCatalogue, getHydrated, setHydrated } from "./store.js";
import { chooseNextPair, updateContentWeights, updateElo, getTopRecommendations } from "./model.js"; import { MovieHydrated } from "./types.js";

const app=express(); app.use(cors({origin:true,credentials:true})); app.use(express.json()); app.use(cookieParser());
function getSid(req:any,res:any){let sid=req.cookies["sid"]; if(!sid){sid=Math.random().toString(36).slice(2);res.cookie("sid",sid,{httpOnly:false,sameSite:"lax"});} return sid;}

app.get("/api/health",(req,res)=>{res.json({ok:true,counts:{catalogue:getCatalogue().length,hydrated:getHydrated().length}});});
app.get("/api/catalogue/status",(req,res)=>{const hyd=getHydrated();const ready=hyd.filter(x=>x.posterPath||x.trailerKey);res.json({total:hyd.length,ready:ready.length});});
app.get("/api/pair",(req,res)=>{const sid=getSid(req,res);const user=getOrCreateUser(sid);const pool=getHydrated();const pair=chooseNextPair(user,pool);
  if(!pair)return res.status(400).json({error:"Not enough items to pair."}); const f=(m:MovieHydrated)=>({imdbId:m.imdbId,title:m.title,posterUrl:m.posterPath?(POSTER_BASE+m.posterPath):null,trailerKey:m.trailerKey||null}); res.json({a:f(pair.a),b:f(pair.b)});});
app.post("/api/vote",(req,res)=>{const sid=getSid(req,res);const user=getOrCreateUser(sid);const {a,b,winner}=req.body as {a:string;b:string;winner:'A'|'B'};
  const pool=getHydrated();const mA=pool.find(x=>x.imdbId===a);const mB=pool.find(x=>x.imdbId===b);if(!mA||!mB)return res.status(400).json({error:"Unknown movie(s)"});
  if(mA.features&&mB.features)updateContentWeights(user,mA.features,mB.features,winner); updateElo(user,a,b,winner); if(winner==='A')user.winners.add(a); else user.winners.add(b); res.json({ok:true});});
app.get("/api/recommendations",(req,res)=>{const sid=getSid(req,res);const user=getOrCreateUser(sid);const limit=parseInt((req.query.limit as string)||String(DEFAULT_REC_LIMIT),10)||DEFAULT_REC_LIMIT;
  const recs=getTopRecommendations(user,getHydrated(),limit); res.json({items:recs});});
app.post("/api/feedback",(req,res)=>{const sid=getSid(req,res);const user=getOrCreateUser(sid);const {movieId,action}=req.body as {movieId:string;action:'seen'|'block'|'like'|'dislike'};
  if(action==='seen')user.seen.add(movieId); if(action==='block')user.blocked.add(movieId); res.json({ok:true});});

async function buildCatalogue(){tryLoadCache(); if(getHydrated().length){console.log("[catalogue] Loaded from cache:",getHydrated().length);return;}
  console.log("[catalogue] Fetching IMDb lists…"); const all:Map<string,{imdbId:string;title:string;year?:number}>=new Map();
  for(const url of IMDB_LISTS){try{const items=await fetchImdbList(url); items.forEach(m=>all.set(m.imdbId,m));}catch{console.warn("Failed list",url);}}
  const basics=Array.from(all.values()); setCatalogue(basics); console.log("[catalogue] Found",basics.length,"unique items.");
  console.log("[hydrate] Hydrating via TMDb…"); const hydrated:MovieHydrated[]=[]; for(const m of basics){try{const h=await hydrateOne(m); h.features=buildFeatures(h); hydrated.push(h);}catch{}}
  setHydrated(hydrated); console.log("[hydrate] Hydrated",hydrated.length,"items.");}

const PORT=process.env.PORT||3001; app.listen(PORT,()=>{console.log("PickAFlick server listening on",PORT); buildCatalogue().catch(()=>{});});