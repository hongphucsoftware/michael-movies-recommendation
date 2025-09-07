import axios from "axios"; import { MovieHydrated, MovieLite } from "./types.js";
const tmdb=axios.create({baseURL:"https://api.themoviedb.org/3",headers:{Authorization:`Bearer ${process.env.TMDB_API_READ||process.env.TMDB_API_KEY||""}`}});
export async function hydrateOne(base:MovieLite):Promise<MovieHydrated>{
  const r:MovieHydrated={...base,keywords:[],people:[],decade:null,pace:null,vibe_tags:[]};
  try{
    const find=await tmdb.get(`/find/${base.imdbId}`,{params:{external_source:"imdb_id"}}); const movie=find.data.movie_results?.[0]||null; if(!movie) return r;
    const tmdbId=movie.id; const details=await tmdb.get(`/movie/${tmdbId}`,{params:{append_to_response:"videos,keywords,credits"}}); const d=details.data;
    r.tmdbId=tmdbId; r.posterPath=d.poster_path||null; r.backdropPath=d.backdrop_path||null; r.runtime=d.runtime??null; r.decade=(d.release_date&&d.release_date.length>=4)?`${d.release_date.slice(0,3)}0s`:null;
    const vids=d.videos?.results||[]; const trailer=vids.find((v:any)=>v.site==="YouTube"&&/Trailer/i.test(v.type))||vids.find((v:any)=>v.site==="YouTube"); r.trailerKey=trailer?trailer.key:null;
    const kw=(d.keywords?.keywords||d.keywords||[]).map((k:any)=>(k.name||"").toLowerCase()).filter(Boolean); r.keywords=Array.from(new Set(kw)).slice(0,20);
    const cast=(d.credits?.cast||[]).slice(0,5).map((c:any)=>c.name).filter(Boolean); const crew=(d.credits?.crew||[]).filter((c:any)=>c.job==="Director").map((c:any)=>c.name); r.people=Array.from(new Set([...cast,...crew]));
    if(typeof d.runtime==="number"&&d.runtime>0){r.pace=d.runtime<=100?"fast":d.runtime<=130?"medium":"slow";}
    const vibes=new Set<string>(), ks=r.keywords||[], has=(s:string)=>ks.some(k=>k.includes(s));
    if(has("crime")||has("noir")||has("gritty")||has("revenge")||has("assassin"))vibes.add("dark");
    if(has("feel good")||has("friendship")||has("heartwarming")||has("family"))vibes.add("feel-good");
    if(has("quirky")||has("indie")||has("eccentric"))vibes.add("quirky");
    if(has("violent")||has("gore")||has("brutal")||has("war"))vibes.add("violent");
    if(has("romance")||has("love")||has("wedding"))vibes.add("rom-com");
    if(has("dystopian")||has("moody")||has("brooding"))vibes.add("moody");
    if(has("epic")||has("saga")||has("sweeping"))vibes.add("epic");
    r.vibe_tags=Array.from(vibes); return r;
  }catch{return r;}
}