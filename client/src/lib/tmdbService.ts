import { Movie } from "@/types/movie";

const TMDB_KEY = "5806f2f63f3875fd9e1755ce864ee15f";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const POSTER_SIZES = ["w500", "w342", "w780", "original"]; // try multiple sizes for reliability
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'>
     <rect width='100%' height='100%' fill='#0f141b'/>
     <text x='50%' y='50%' fill='#6f7d92' font-size='22' font-family='Arial' text-anchor='middle'>No Poster</text>
   </svg>`
);

interface TMDbMovie {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  genre_ids?: number[];
  popularity?: number;
  media_type?: string;
  vote_average?: number;
}

interface TMDbVideo {
  key: string;
  site: string;
  type: string;
}

const GENRE = {
  Comedy: 35,
  Drama: 18,
  Action: 28,
  Thriller: 53,
  SciFi: 878,
  Fantasy: 14,
  Documentary: 99,
  Animation: 16,
  Horror: 27,
  Crime: 80,
  Adventure: 12,
  Family: 10751,
  Romance: 10749,
  Mystery: 9648
};

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchTrending(mediaType: 'movie' | 'tv') {
  const url = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${TMDB_KEY}&language=en-US`;
  return fetchJSON(url);
}

async function fetchVideos(mediaType: 'movie' | 'tv', id: number) {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`;
  return fetchJSON(url);
}

// Robust poster resolution with fallback and preflight test
async function resolvePosterPath(poster_path: string | null, backdrop_path: string | null): Promise<string | null> {
  const basePath = poster_path || backdrop_path;
  if (!basePath) return PLACEHOLDER;
  
  for (const size of POSTER_SIZES) {
    const url = `${TMDB_IMG}/${size}${basePath}`;
    const isValid = await quickImgCheck(url);
    if (isValid) return url;
  }
  return PLACEHOLDER;
}

function quickImgCheck(url: string): Promise<boolean> {
  // Using <img> load events is more reliable than HEAD on many CDNs
  return new Promise(resolve => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.loading = "eager";
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function featureFromGenres(genre_ids: number[], mediaType: string): number[] {
  const g = (id: number) => genre_ids.includes(id) ? 1 : 0;
  
  const comedy = g(GENRE.Comedy);
  const drama = g(GENRE.Drama);
  const action = g(GENRE.Action);
  const thriller = g(GENRE.Thriller) || g(GENRE.Mystery) || g(GENRE.Crime);
  const scifi = g(GENRE.SciFi);
  const fantasy = g(GENRE.Fantasy) || g(GENRE.Animation);
  const doc = g(GENRE.Documentary);

  // Tone & pace heuristics
  const lightTone = Math.min(1, comedy * 0.8 + fantasy * 0.4 + g(GENRE.Family) * 0.6 + g(GENRE.Romance) * 0.4);
  const darkTone = Math.min(1, thriller * 0.6 + drama * 0.4 + g(GENRE.Horror) * 0.8 + g(GENRE.Crime) * 0.5);
  const fastPace = Math.min(1, action * 0.8 + thriller * 0.6 + scifi * 0.4 + fantasy * 0.3);
  const slowPace = Math.min(1, drama * 0.6 + doc * 0.4);

  // Short-episode heuristic: TV comedies are often short; otherwise 0
  const epLenShort = (mediaType === "tv" && comedy) ? 1 : 0;

  return [
    comedy, drama, action, thriller, scifi, fantasy, doc,
    lightTone, darkTone, fastPace, slowPace, epLenShort
  ];
}

function genreLabel(id: number): string {
  switch (id) {
    case GENRE.Comedy: return "Comedy";
    case GENRE.Drama: return "Drama";
    case GENRE.Action: return "Action";
    case GENRE.Thriller: return "Thriller";
    case GENRE.SciFi: return "Sci-Fi";
    case GENRE.Fantasy: return "Fantasy";
    case GENRE.Documentary: return "Doc";
    case GENRE.Animation: return "Animation";
    case GENRE.Horror: return "Horror";
    case GENRE.Crime: return "Crime";
    case GENRE.Adventure: return "Adventure";
    case GENRE.Family: return "Family";
    case GENRE.Romance: return "Romance";
    case GENRE.Mystery: return "Mystery";
    default: return "Genre";
  }
}

export async function buildCatalogue(onProgress?: (message: string, stats?: { ok: number; failed: number }) => void): Promise<Movie[]> {
  try {
    let imgOk = 0;
    let imgFail = 0;

    onProgress?.("Fetching trending movies...");
    const moviesData = await fetchTrending("movie");
    
    onProgress?.("Fetching trending TV shows...");
    const tvData = await fetchTrending("tv");

    // Combine and sort by popularity
    const combined = [...(moviesData.results || []), ...(tvData.results || [])]
      .filter((r: TMDbMovie) => r)
      .sort((a: TMDbMovie, b: TMDbMovie) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 36);

    onProgress?.("Resolving posters & trailers...");
    const movies: Movie[] = [];
    
    for (const r of combined) {
      const mediaType = r.media_type || (r.title ? "movie" : "tv");
      
      // Robust poster resolution with fallback checks
      const posterUrl = await resolvePosterPath(r.poster_path, r.backdrop_path);
      if (posterUrl === PLACEHOLDER) {
        imgFail++;
      } else {
        imgOk++;
      }
      onProgress?.(`Resolving posters & trailers...`, { ok: imgOk, failed: imgFail });

      try {
        const vidsData = await fetchVideos(mediaType as 'movie' | 'tv', r.id);
        const trailer = (vidsData.results || []).find((v: TMDbVideo) => 
          v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
        );
        
        if (!trailer) continue;

        const name = r.title || r.name || "Untitled";
        const year = (r.release_date || r.first_air_date || "").slice(0, 4) || "Unknown";
        const tags: string[] = [];
        
        if (mediaType === "tv") tags.push("Series");
        (r.genre_ids || []).slice(0, 3).forEach((id: number) => tags.push(genreLabel(id)));

        movies.push({
          id: `${mediaType}_${r.id}`,
          name,
          year: parseInt(year) || 2024,
          poster: posterUrl || PLACEHOLDER,
          yt: trailer.key,
          isSeries: mediaType === "tv",
          lenShort: (mediaType === "tv" && (r.genre_ids || []).includes(GENRE.Comedy)) ? 1 : 0,
          tags,
          x: featureFromGenres(r.genre_ids || [], mediaType),
          rating: Math.round((r.vote_average || 0) * 10) / 10,
          duration: mediaType === "tv" ? "Series" : "Film"
        });

        // Small delay to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 40));
      } catch (e) {
        console.warn(`Failed to fetch trailer for ${r.title || r.name}:`, e);
        continue;
      }
    }

    return movies;
  } catch (error) {
    console.error("Failed to build catalogue:", error);
    return [];
  }
}