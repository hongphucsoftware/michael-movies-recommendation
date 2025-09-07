import { MovieHydrated, UserState } from "./types.js";
import { dot, sigmoid, sub, mmrSelect } from "./util/math.js";
import { POSTER_BASE } from "./constants.js";
export function updateContentWeights(user:UserState,xA:number[],xB:number[],winner:'A'|'B',lr=0.08,l2=1e-4){
  const y=winner==='A'?1:0; const delta=sub(xA,xB); const p=sigmoid(dot(user.w,delta));
  const L=Math.max(user.w.length,delta.length); const wNew:number[]=new Array(L).fill(0);
  for(let i=0;i<L;i++){const wi=user.w[i]||0; const di=delta[i]||0; wNew[i]=wi+lr*(((y-p)*di)-l2*wi);} user.w=wNew;}
function expected(rA:number,rB:number){return 1/(1+Math.pow(10,(rB-rA)/400));}
export function updateElo(user:UserState,aId:string,bId:string,winner:'A'|'B'){
  const a=user.ratings.get(aId)||{r:1200,comps:0,wins:0,losses:0}; const b=user.ratings.get(bId)||{r:1200,comps:0,wins:0,losses:0};
  const eA=expected(a.r,b.r); const sA=winner==='A'?1:0; const baseK=32; const kA=baseK*(1/Math.sqrt(1+a.comps)); const kB=baseK*(1/Math.sqrt(1+b.comps));
  a.r=a.r+kA*(sA-eA); b.r=b.r+kB*((1-sA)-(1-eA)); a.comps++; b.comps++; if(winner==='A')a.wins++;else a.losses++; if(winner==='B')b.wins++;else b.losses++;
  user.ratings.set(aId,a); user.ratings.set(bId,b);}
function pairKey(a:string,b:string){return [a,b].sort().join("|");}
function gaussian(){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
export function chooseNextPair(user:UserState,pool:MovieHydrated[]){
  const allowed=pool.filter(m=>!user.blocked.has(m.imdbId)&&!user.seen.has(m.imdbId)&&!user.recentlyShown.includes(m.imdbId)); if(allowed.length<2)return null;
  const sampled=allowed.map(m=>{const r=user.ratings.get(m.imdbId)?.r||1200; const comps=user.ratings.get(m.imdbId)?.comps||0; const sigma=1/Math.sqrt(1+comps);
    return {m,mu:r,sigma,sampled:r+gaussian()*sigma};}).sort((a,b)=>b.sampled-a.sampled);
  const champion=sampled[0];
  let challenger=sampled.slice(1).filter(x=>!user.pairsShown.has(pairKey(champion.m.imdbId,x.m.imdbId)))
    .sort((a,b)=>(Math.abs(a.mu-champion.mu)-0.6*a.sigma)-(Math.abs(b.mu-champion.mu)-0.6*b.sigma))[0]||sampled[1];
  user.recentlyShown.unshift(champion.m.imdbId,challenger.m.imdbId); user.recentlyShown=Array.from(new Set(user.recentlyShown)).slice(0,8);
  user.pairsShown.add(pairKey(champion.m.imdbId,challenger.m.imdbId));
  return {a:champion.m,b:challenger.m};}
export function scoreForRec(user:UserState,m:MovieHydrated){const r=user.ratings.get(m.imdbId)?.r||1200; const wdot=dot(user.w,m.features||[]); return 0.5*wdot+0.4*r+0.1*0;}
export function getTopRecommendations(user:UserState,pool:MovieHydrated[],k:number){
  const cand=pool.filter(m=>!user.blocked.has(m.imdbId)&&!user.seen.has(m.imdbId));
  const scored=cand.map(m=>({m,s:scoreForRec(user,m)})).sort((x,y)=>y.s-x.s);
  const selected=mmrSelect(scored,k,(a,b)=>{const fa=a.m.features||[],fb=b.m.features||[];const num=fa.reduce((s,ai,i)=>s+ai*(fb[i]||0),0);
    const da=Math.sqrt(fa.reduce((s,ai)=>s+ai*ai,0))||1e-9; const db=Math.sqrt(fb.reduce((s,bi)=>s+bi*bi,0))||1e-9; return num/(da*db);},x=>x.s);
  return selected.map(x=>({imdbId:x.m.imdbId,title:x.m.title,posterUrl:x.m.posterPath?("https://image.tmdb.org/t/p/w500"+x.m.posterPath):null,trailerKey:x.m.trailerKey||null,reason:"Based on your pairwise picks"}));
}