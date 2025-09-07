import axios from "axios"; import * as cheerio from "cheerio"; import { MovieLite } from "./types.js";
export async function fetchImdbList(listUrl:string):Promise<MovieLite[]>{
  const res=await axios.get(listUrl,{headers:{"Accept-Language":"en-US,en;q=0.9","User-Agent":"Mozilla/5.0"}});
  const $=cheerio.load(res.data); const out:MovieLite[]=[];
  $("a[href*='/title/tt']").each((_,el)=>{const href=$(el).attr("href")||"";const m=href.match(/\/title\/(tt\d{7,8})/);if(!m)return;
    const imdbId=m[1]; const title=$(el).text().trim(); if(!title)return;
    let year: number|undefined=undefined; const parent=$(el).closest(".lister-item, .ipc-metadata-list-summary-item, .lister-item-content");
    const yt=parent.find(".lister-item-year, .cli-title-metadata-item").first().text().trim(); const ym=yt&&yt.match(/(19\d{2}|20\d{2})/); if(ym)year=parseInt(ym[1],10);
    if(!out.some(x=>x.imdbId===imdbId)) out.push({imdbId,title,year}); });
  return out.filter((m,i,a)=>a.findIndex(z=>z.imdbId===m.imdbId)===i);
}