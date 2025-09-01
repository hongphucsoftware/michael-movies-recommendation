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
      // Check for cached catalogue first (30 minute cache)
      const cacheKey = 'ts_enhanced_catalogue_v2';
      const timestampKey = 'ts_enhanced_timestamp_v2';
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(timestampKey);
      const cacheAge = Date.now() - (parseInt(cacheTime || '0'));
      
      // Use cache if less than 30 minutes old
      if (cachedData && cacheAge < 30 * 60 * 1000) {
        console.log("✓ Using cached enhanced catalogue (classics + recent hits)");
        return JSON.parse(cachedData);
      }
      
      console.log("Building fresh enhanced catalogue (classics + recent hits)...");
      
      // Get the enhanced catalogue (Top 50 classics + 50 recent hits)
      const { items } = await this.fetchJSON("/api/movies/enhanced-catalogue");
      
      const out: Movie[] = [];
      const seen = new Set<string>();

      // Process first 15 movies for immediate display
      const quickBatch = items.slice(0, 15);
      const quickMovies = await this.processBatch(quickBatch, seen);
      out.push(...quickMovies);
      
      // Cache the quick batch immediately for instant loading
      localStorage.setItem(cacheKey, JSON.stringify(out));
      localStorage.setItem(timestampKey, Date.now().toString());
      
      console.log(`✓ Quick start: ${out.length} movies ready for immediate use`);
      
      // Process remaining movies in background (don't await)
      this.processRemainingMovies(items.slice(15), out, seen, cacheKey, timestampKey);
      
      return out;
      
    } catch (error) {
      console.error('Error building IMDb catalogue:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  // Process a batch of movies efficiently
  private async processBatch(items: any[], seen: Set<string>): Promise<Movie[]> {
    const movies: Movie[] = [];
    
    for (const row of items) {
      try {
        const { imdbId, title: fallbackName, year: fallbackYear, rank } = row;

        // Map to TMDb
        const tmdbMovie = await this.mapImdbToTmdb(imdbId);
        if (!tmdbMovie) continue;

        const tmdbId = tmdbMovie.id;
        const id = `movie_${tmdbId}`;
        if (seen.has(id)) continue;

        // Find a YouTube Trailer/Teaser with quality control
        const youtubeKey = await this.getQualityYouTubeTrailer(tmdbId);
        if (!youtubeKey) continue;

        // Poster: use YouTube thumb (rock-solid reliability)
        const poster = this.posterFromYouTube(youtubeKey);

        // Use TMDb title as primary source
        const name = tmdbMovie.title || tmdbMovie.original_title || fallbackName || "Classic Movie";
        const year = (tmdbMovie.release_date || fallbackYear || "0000").slice(0, 4);
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
          features: this.generateFeatureVector(genreIds),
          imdbRank: rank,
          category: row.category || 'classic',
          source: row.source || 'imdb_top_250'
        };

        movies.push(movie);
        seen.add(id);
        
      } catch (error) {
        console.warn(`Failed to process movie ${row.imdbId}:`, error);
        continue;
      }
    }
    
    return movies;
  }

  // Process remaining movies in background
  private async processRemainingMovies(
    remainingItems: any[], 
    existingMovies: Movie[], 
    seen: Set<string>,
    cacheKey: string,
    timestampKey: string
  ) {
    try {
      console.log(`Processing remaining ${remainingItems.length} movies in background...`);
      
      // Process in chunks of 10 for better performance
      const chunkSize = 10;
      for (let i = 0; i < remainingItems.length; i += chunkSize) {
        const chunk = remainingItems.slice(i, i + chunkSize);
        const chunkMovies = await this.processBatch(chunk, seen);
        
        existingMovies.push(...chunkMovies);
        
        // Update cache with expanded catalogue
        localStorage.setItem(cacheKey, JSON.stringify(existingMovies));
        localStorage.setItem(timestampKey, Date.now().toString());
        
        // Small delay between chunks
        await new Promise(res => setTimeout(res, 100));
      }
      
      console.log(`✓ Background processing complete: ${existingMovies.length} total movies`);
      
    } catch (error) {
      console.error('Background processing failed:', error);
    }
  }

  // Find YouTube trailer key for movie with quality control
  async getQualityYouTubeTrailer(tmdbId: number): Promise<string | null> {
    try {
      const data = await this.fetchJSON(`/api/videos/movie/${tmdbId}`);
      const results = data?.results || [];
      
      // Filter for YouTube trailers and teasers
      const youtubeVideos = results.filter((v: any) => 
        v.site === 'YouTube' && 
        (v.type === 'Trailer' || v.type === 'Teaser') &&
        v.key
      );
      
      if (youtubeVideos.length === 0) return null;
      
      // Prioritize by quality indicators
      const prioritized = youtubeVideos.sort((a: any, b: any) => {
        // Prefer official trailers over teasers
        if (a.type === 'Trailer' && b.type === 'Teaser') return -1;
        if (a.type === 'Teaser' && b.type === 'Trailer') return 1;
        
        // Prefer official-sounding names and avoid problematic ones
        const aOfficial = this.isOfficialTrailer(a.name);
        const bOfficial = this.isOfficialTrailer(b.name);
        if (aOfficial && !bOfficial) return -1;
        if (!aOfficial && bOfficial) return 1;
        
        // Prefer shorter names (usually more official)
        if (a.name.length < b.name.length) return -1;
        if (a.name.length > b.name.length) return 1;
        
        return 0;
      });
      
      // Filter out clearly problematic trailers
      const filtered = prioritized.filter((v: any) => {
        const name = v.name.toLowerCase();
        return !name.includes('private') && 
               !name.includes('unavailable') &&
               !name.includes('compilation') &&
               !name.includes('anniversary');
      });
      
      return filtered[0]?.key || youtubeVideos[0]?.key || null;
    } catch (error) {
      console.warn(`No trailer found for TMDb ID ${tmdbId}`);
      return null;
    }
  }

  // Check if trailer name suggests it's official and high quality
  private isOfficialTrailer(name: string): boolean {
    const officialTerms = ['official', 'trailer', 'teaser', 'final', 'main'];
    const avoidTerms = ['compilation', 'anniversary', 'celebration', 'mashup', 'fan', 'reaction', 'private', 'years'];
    
    const nameLower = name.toLowerCase();
    const hasOfficial = officialTerms.some(term => nameLower.includes(term));
    const hasAvoid = avoidTerms.some(term => nameLower.includes(term));
    
    // Also avoid anniversary compilation trailers that say "50 years" etc
    const hasNumberYears = /\d+\s*years?/.test(nameLower);
    
    return hasOfficial && !hasAvoid && !hasNumberYears;
  }
}

export const imdbService = new IMDbService();