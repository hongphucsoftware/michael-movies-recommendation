import { useEffect, useState } from "react";
import { posterFromTMDbPaths, youtubeThumb } from "../lib/videoPick";

export type Movie = {
  id: string;
  name: string;
  year: number;
  poster: string;
  ytKeys: string[];      // all candidate video keys
  genre_ids: number[];
  features: number[];    // 12-dim vector
  category: "classic" | "recent";
};

const GENRES = {
  Comedy: 35, Drama: 18, Action: 28, Thriller: 53, SciFi: 878, Fantasy: 14,
  Documentary: 99, Animation: 16, Horror: 27, Crime: 80, Adventure: 12, Family: 10751, Romance: 10749, Mystery: 9648
};

function fVec(genre_ids: number[], year: number): number[] {
  const has = (...ids: number[]) => ids.some(g => genre_ids.includes(g)) ? 1 : 0;
  const comedy = has(GENRES.Comedy), drama = has(GENRES.Drama), action = has(GENRES.Action);
  const thrill = has(GENRES.Thriller, GENRES.Mystery, GENRES.Crime);
  const scifi = has(GENRES.SciFi), fanim = has(GENRES.Fantasy, GENRES.Animation);
  const docu = has(GENRES.Documentary);
  const light = Math.min(1, comedy*.8 + fanim*.4 + has(GENRES.Family)*.6 + has(GENRES.Romance)*.4);
  const dark = Math.min(1, thrill*.6 + drama*.4 + has(GENRES.Horror)*.8 + has(GENRES.Crime)*.5);
  const fast = Math.min(1, action*.8 + thrill*.6 + scifi*.4 + fanim*.3);
  const slow = Math.min(1, drama*.6 + docu*.4);
  const recent = year >= 2020 ? 1 : 0; // 12th slot = era
  return [comedy,drama,action,thrill,scifi,fanim,docu,light,dark,fast,slow,recent];
}

export function useEnhancedCatalogueNew() {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // hit the new big catalogue
        const r = await fetch("/api/movies/catalogue");
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        const data = await r.json();
        const out: Movie[] = (data.items || []).map((m: any) => {
          const poster = posterFromTMDbPaths(m) || youtubeThumb(m.ytKeys?.[0] || '');
          const year = Number(m.year) || Number((m.release_date || "0").slice(0,4)) || 0;
          return {
            id: `movie_${m.id}`,
            name: m.name,
            year,
            poster,
            ytKeys: m.ytKeys || [],
            genre_ids: m.genre_ids || [],
            features: fVec(m.genre_ids || [], year),
            category: year >= 2020 ? "recent" : "classic"
          };
        });
        // lightweight shuffle to avoid same-order bias on first render
        for (let i=out.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
        setItems(out);
        console.log(`Enhanced catalogue loaded: ${out.length} movies, ${out.filter(m => m.category === 'recent').length} recent, ${out.filter(m => m.category === 'classic').length} classics`);
      } catch (error) {
        console.error("Failed to load catalogue:", error);
        // Create fallback dataset with proper poster paths
        const fallbackItems: Movie[] = [
          {
            id: "movie_569094",
            name: "Spider-Man: Across the Spider-Verse", 
            year: 2023,
            poster: "/img/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
            ytKeys: ["cqGjhVJWtEg"],
            genre_ids: [28, 12, 16],
            features: [0,0,1,0,0,1,0,0.8,0,0.8,0,1],
            category: "recent"
          },
          {
            id: "movie_278",
            name: "The Shawshank Redemption",
            year: 1994, 
            poster: "/img/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
            ytKeys: ["6hB3S9bIaco"],
            genre_ids: [18, 80],
            features: [0,1,0,0,0,0,0,0,0.6,0,0.8,0],
            category: "classic"
          }
        ];
        setItems(fallbackItems);
        console.log(`Fallback catalogue loaded: ${fallbackItems.length} movies`);
      }
      setLoading(false);
    })();
  }, []);

  return { items, loading };
}