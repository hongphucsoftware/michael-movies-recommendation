import { MovieHydrated } from "./types.js";
const VIBE_VOCAB=['dark','feel-good','quirky','violent','rom-com','moody','epic'] as const;
const PACE_VOCAB=['slow','medium','fast'] as const;
const DECADE_VOCAB=['1970s','1980s','1990s','2000s','2010s','2020s'] as const;
function multiHot(values:string[]|undefined,v:readonly string[]){const a=new Array(v.length).fill(0);(values||[]).forEach(t=>{const i=v.indexOf(t);if(i>=0)a[i]=1;});return a;}
function oneHot(value:string|undefined|null,v:readonly string[]){const a=new Array(v.length).fill(0);if(!value)return a;const i=v.indexOf(value);if(i>=0)a[i]=1;return a;}
function hashToVec(tokens:string[]|undefined,dim=64){const vec=new Array(dim).fill(0);(tokens||[]).forEach(t=>{let h=0;for(let i=0;i<t.length;i++)h=((h<<5)-h)+t.charCodeAt(i);const idx=Math.abs(h)%dim;vec[idx]+=1;});const n=Math.sqrt(vec.reduce((s,x)=>s+x*x,0))||1;return vec.map(x=>x/n);}
export function buildFeatures(m:MovieHydrated){return[
  ...multiHot(m.vibe_tags,VIBE_VOCAB),
  ...oneHot(m.pace,PACE_VOCAB),
  ...oneHot(m.decade||undefined,DECADE_VOCAB),
  ...hashToVec(m.keywords,64),
  ...hashToVec(m.people,32)
];}