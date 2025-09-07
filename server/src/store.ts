import fs from "fs"; import path from "path"; import { MovieHydrated, MovieLite, UserState } from "./types.js"; import { CACHE_DIR } from "./constants.js"; import { v4 as uuidv4 } from "uuid";
const catPath=path.join(CACHE_DIR,"catalogue.json"); const hydPath=path.join(CACHE_DIR,"hydrated.json");
let catalogue:MovieLite[]=[]; let hydrated:MovieHydrated[]=[];
export function getCatalogue(){return catalogue;} export function getHydrated(){return hydrated;}
export function setCatalogue(c:MovieLite[]){catalogue=c;fs.writeFileSync(catPath,JSON.stringify(c,null,2));}
export function setHydrated(h:MovieHydrated[]){hydrated=h;fs.writeFileSync(hydPath,JSON.stringify(h,null,2));}
export function tryLoadCache(){try{if(fs.existsSync(catPath))catalogue=JSON.parse(fs.readFileSync(catPath,"utf-8")); if(fs.existsSync(hydPath))hydrated=JSON.parse(fs.readFileSync(hydPath,"utf-8"));}catch{}}
const users:Map<string,UserState>=new Map();
export function getOrCreateUser(id?:string):UserState{const uid=id||uuidv4();let u=users.get(uid);
  if(!u){const dim=(hydrated[0]?.features?.length||128);u={id:uid,w:new Array(dim).fill(0),recentlyShown:[],pairsShown:new Set(),ratings:new Map(),winners:new Set(),blocked:new Set(),seen:new Set()};users.set(uid,u);} return u;}