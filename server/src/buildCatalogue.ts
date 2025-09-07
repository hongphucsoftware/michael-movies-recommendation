import * as cheerio from "cheerio";
import { IMDB_LISTS } from "./config/lists";
import type { BasicImdbItem, CatalogueMovie } from "./types";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const TMDB_KEY = process.env.TMDB_API_KEY as string;
if (!TMDB_KEY) throw new Error("Missing TMDB_API_KEY");

function extractYear(s: string): number | null {
  const m = s?.match?.(/(\d{4})/);
  return m ? Number(m[0]) : null;
}

async function scrapeImdbListAll(listId: string): Promise<BasicImdbItem[]> {
  let page = 1;
  const out: BasicImdbItem[] = [];
  while (true) {
    const url = `https://www.imdb.com/list/${listId}/?mode=detail&page=${page}`;
    const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (PickAFlick/1.0)" } }).then(r => r.text());
    const $ = cheerio.load(html);
    const oldRows = $(".lister-item").toArray();
    const newRows = $(".ipc-metadata-list-summary-item").toArray();
    if (oldRows.length === 0 && newRows.length === 0) break;

    if (oldRows.length) {
      for (const el of oldRows) {
        const title = $(el).find(".lister-item-header a").first().text().trim();
        const year = extractYear($(el).find(".lister-item-year").first().text());
        if (title) out.push({ title, year });
      }
    } else {
      for (const el of newRows) {
        const title = $(el).find("a.ipc-title-link-wrapper").first().text().trim();
        const year = extractYear($(el).find(".cli-title-metadata-item").toArray().map(n => $(n).text().trim()).join(" "));
        if (title) out.push({ title, year });
      }
    }
    page++;
  }
  return out;
}

async function tmdbSearchOne(title: string, year: number | null) {
  const q = new URLSearchParams({ query: title, include_adult: "false", language: "en-US", page: "1" });
  if (year) q.set("year", String(year));
  const url = `${TMDB_API}/search/movie?${q}&api_key=${TMDB_KEY}`;
  const json = await fetch(url).then(r => r.json());
  return json?.results?.[0] ?? null;
}

async function tmdbDetails(id: number) {
  const url = `${TMDB_API}/movie/${id}?append_to_response=credits&language=en-US&api_key=${TMDB_KEY}`;
  return fetch(url).then(r => r.json());
}

function img(kind: "poster"|"backdrop", path?: string|null) {
  if (!path) return null;
  return kind === "poster" ? `${TMDB_IMG}/w500${path}` : `${TMDB_IMG}/w780${path}`;
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
  const copy = [...arr];
  shuffleInPlace(copy);
  return copy.slice(0, n);
}

export type BuiltState = {
  all: CatalogueMovie[];
  byList: Record<string, CatalogueMovie[]>;
  postersByList: Record<string, CatalogueMovie[]>;
  postersFlat: CatalogueMovie[];
  recPool: CatalogueMovie[];
  builtAt: number;
};

export async function buildCatalogue(): Promise<BuiltState> {
  const all: CatalogueMovie[] = [];
  const byList: Record<string, CatalogueMovie[]> = {};

  for (const list of IMDB_LISTS) {
    const scraped = await scrapeImdbListAll(list.id);
    const movies: CatalogueMovie[] = [];
    for (const r of scraped) {
      const hit = await tmdbSearchOne(r.title, r.year);
      if (!hit) continue;
      const det = await tmdbDetails(hit.id);
      const movie: CatalogueMovie = {
        id: det.id,
        title: det.title ?? hit.title ?? "",
        year: det.release_date ? Number(det.release_date.slice(0, 4)) : r.year,
        overview: det.overview ?? null,
        posterUrl: img("poster", det.poster_path ?? hit.poster_path ?? null),
        backdropUrl: img("backdrop", det.backdrop_path ?? hit.backdrop_path ?? null),
        genres: Array.isArray(det.genres) ? det.genres.map((g: any) => ({ id: g.id, name: g.name })) : [],
        sourceListId: list.id,
        sourceListUrl: list.url,
      };
      movies.push(movie);
      all.push(movie);
    }
    byList[list.id] = movies;
  }

  const postersByList: Record<string, CatalogueMovie[]> = {};
  for (const l of IMDB_LISTS) postersByList[l.id] = sample(byList[l.id] || [], 15);
  const postersFlat = Object.values(postersByList).flat();
  const postersSet = new Set(postersFlat.map(m => m.id));
  const recPool = all.filter(m => !postersSet.has(m.id));

  return { all, byList, postersByList, postersFlat, recPool, builtAt: Date.now() };
}