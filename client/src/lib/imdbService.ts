import type { Movie } from "@/types/movie";

// TMDb genre ID mappings for feature vectors
const GENRE_MAP: { [key: number]: string } = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

// Helper to get genre label from TMDb ID
function genreLabel(genreId: number): string {
  return GENRE_MAP[genreId] || "Unknown";
}

// IMDb Top 100 integration service using server endpoints
export class IMDbService {
  // Genre mappings for feature vectors
  private GENRES = {
    Comedy: [35],
    Drama: [18],
    Action: [28],
    Thriller: [53, 9648, 80],
    SciFi: [878],
    Fantasy: [14, 12],
    Documentary: [99],
    Animation: [16],
    Horror: [27],
    Romance: [10749],
    Family: [10751],
    War: [10752],
    Western: [37],
    Biography: [], // Will need to infer from other signals
    History: [36],
    Music: [10402],
    Sport: [] // Will need to infer from other signals
  };

  // Generate 12-dimensional feature vector from TMDb genre IDs
  private generateFeatureVector(genreIds: number[]): number[] {
    const hasGenre = (genreList: number[]) => 
      genreList.some(g => genreIds.includes(g)) ? 1 : 0;
    
    const comedy = hasGenre(this.GENRES.Comedy);
    const drama = hasGenre(this.GENRES.Drama);
    const action = hasGenre(this.GENRES.Action);
    const thriller = hasGenre(this.GENRES.Thriller);
    const scifi = hasGenre(this.GENRES.SciFi);
    const fantasy = hasGenre(this.GENRES.Fantasy);
    const documentary = hasGenre(this.GENRES.Documentary);
    
    const lightTone = Math.min(1, comedy * 0.8 + fantasy * 0.4 + hasGenre(this.GENRES.Family) * 0.6 + hasGenre(this.GENRES.Romance) * 0.4);
    const darkTone = Math.min(1, thriller * 0.6 + drama * 0.4 + hasGenre(this.GENRES.Horror) * 0.8 + hasGenre(this.GENRES.War) * 0.5);
    const fastPace = Math.min(1, action * 0.8 + thriller * 0.6 + scifi * 0.4 + fantasy * 0.3);
    const slowPace = Math.min(1, drama * 0.6 + documentary * 0.4 + hasGenre(this.GENRES.History) * 0.4);
    const episodeLengthShort = 0; // Movies are not episodic
    
    return [comedy, drama, action, thriller, scifi, fantasy, documentary, lightTone, darkTone, fastPace, slowPace, episodeLengthShort];
  }

  // Helper to call our server endpoints
  private async fetchJSON(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // Map IMDb ID to TMDb movie using our new endpoint
  private async mapImdbToTmdb(imdbId: string): Promise<any | null> {
    try {
      const data = await this.fetchJSON(`/api/tmdb/find/${imdbId}`);
      return data.movie && data.movie.id ? data.movie : null;
    } catch (error) {
      console.warn(`Failed to map IMDb ${imdbId} to TMDb:`, error);
      return null;
    }
  }

  // Get YouTube trailer for a TMDb movie
  private async getYouTubeTrailer(tmdbId: number): Promise<string | null> {
    try {
      const videosData = await this.fetchJSON(`/api/videos/movie/${tmdbId}`);
      const trailer = (videosData.results || []).find((v: any) => 
        v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
      );
      return trailer ? trailer.key : null;
    } catch (error) {
      console.warn(`Failed to get trailer for TMDb ${tmdbId}:`, error);
      return null;
    }
  }

  // Use YouTube thumbnail for bulletproof posters
  private posterFromYouTube(ytKey: string): string {
    return `https://i.ytimg.com/vi/${ytKey}/sddefault.jpg`;
  }

  // Build Top 100 IMDb movies catalogue using server endpoints
  async buildCatalogue(): Promise<Movie[]> {
    try {
      // Get the Top 100 IMDb items from our server
      const { items } = await this.fetchJSON("/api/imdb/top100");
      
      const out: Movie[] = [];
      const seen = new Set<string>();

      // For each IMDb ID, map to TMDb movie, then get a trailer, then build entry
      for (const row of items) {
        const { imdbId, title: fallbackName, year: fallbackYear } = row;

        // Map to TMDb
        const tmdbMovie = await this.mapImdbToTmdb(imdbId);
        if (!tmdbMovie) continue;

        const tmdbId = tmdbMovie.id;
        const id = `movie_${tmdbId}`;
        if (seen.has(id)) continue;

        // Find a YouTube Trailer/Teaser
        const youtubeKey = await this.getYouTubeTrailer(tmdbId);
        if (!youtubeKey) continue; // Skip if no trailer available

        // Poster: use YouTube thumb (rock-solid)
        const poster = this.posterFromYouTube(youtubeKey);

        const name = tmdbMovie.title || fallbackName || "Untitled";
        const year = (tmdbMovie.release_date || fallbackYear || "????").slice(0, 4);
        const genreIds = Array.isArray(tmdbMovie.genre_ids) ? tmdbMovie.genre_ids : [];

        const tags: string[] = [];
        genreIds.slice(0, 3).forEach((gid: number) => tags.push(genreLabel(gid)));

        const movie: Movie = {
          id,
          name,
          year,
          poster,
          youtube: youtubeKey,
          isSeries: false,
          tags,
          features: this.generateFeatureVector(genreIds)
        };

        out.push(movie);
        seen.add(id);
        
        // Tiny pacing so we don't hammer APIs
        await new Promise(res => setTimeout(res, 20));
      }

      // Keep IMDb order (no shuffle) — this preserves the Top ranking feel
      console.log(`Successfully processed ${out.length} movies from IMDb Top 100`);
      return out.slice(0, 100);
      
    } catch (error) {
      console.error('Error building IMDb catalogue:', error);
      return [];
    }
  }
}

export const imdbService = new IMDbService();