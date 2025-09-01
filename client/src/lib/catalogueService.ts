
import type { Movie } from "@/hooks/useMovieData";

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

// Comprehensive catalogue service using ALL movies from the 3 mandatory sources
export class CatalogueService {
  private baseUrl = '';

  // API helpers
  private async fetchJSON(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  // Genre mappings for feature vectors (12-dimensional)
  private GENRES = {
    Comedy: [35],
    Drama: [18],
    Action: [28],
    Thriller: [53, 9648, 80], // includes Mystery, Crime
    SciFi: [878],
    Fantasy: [14, 12], // includes Adventure
    Documentary: [99],
    Animation: [16],
    Horror: [27],
    Romance: [10749],
    Family: [10751],
    War: [10752],
    Western: [37],
    History: [36],
    Music: [10402],
  };

  // Generate 12-dimensional feature vector from TMDb genre IDs
  private generateFeatureVector(genreIds: number[], releaseYear?: number): number[] {
    const hasAny = (...ids: number[]) => ids.some(g => genreIds.includes(g)) ? 1 : 0;
    
    const comedy = hasAny(...this.GENRES.Comedy);
    const drama  = hasAny(...this.GENRES.Drama);
    const action = hasAny(...this.GENRES.Action);
    const thrill = hasAny(...this.GENRES.Thriller); // Mystery, Crime, Thriller
    const scifi  = hasAny(...this.GENRES.SciFi);
    const fanim  = hasAny(...this.GENRES.Fantasy, ...this.GENRES.Animation);
    const docu   = hasAny(...this.GENRES.Documentary);

    // Composite features
    const light  = Math.min(1, comedy*0.8 + fanim*0.4 + hasAny(...this.GENRES.Family)*0.6 + hasAny(...this.GENRES.Romance)*0.4);
    const dark   = Math.min(1, thrill*0.6 + drama*0.4 + hasAny(...this.GENRES.Horror)*0.8 + hasAny(80)*0.5);
    const fast   = Math.min(1, action*0.8 + thrill*0.6 + scifi*0.4 + fanim*0.3);
    const slow   = Math.min(1, drama*0.6 + docu*0.4);

    // 12th slot: recentness (2020+ vs classics)
    const recent = releaseYear && releaseYear >= 2020 ? 1 : 0;

    return [comedy, drama, action, thrill, scifi, fanim, docu, light, dark, fast, slow, recent];
  }

  // Get genre label from ID
  private getGenreLabel(id: number): string {
    return genreLabel(id);
  }

  // Use YouTube thumbnail for reliable posters
  private posterFromYouTube(ytKey: string): string {
    return `https://i.ytimg.com/vi/${ytKey}/sddefault.jpg`;
  }

  // Build COMPLETE catalogue using ALL movies from the 3 mandatory sources
  async buildCatalogue(): Promise<Movie[]> {
    try {
      console.log("[CATALOGUE] Building from ALL 3 mandatory sources...");
      
      // Force fresh build to ensure we get ALL movies
      const cacheKey = 'comprehensive_catalogue_v1_all_sources';
      const timestampKey = 'comprehensive_timestamp_v1_all_sources';
      
      // Check cache (30 minute TTL)
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(timestampKey);
      const cacheAge = Date.now() - (parseInt(cacheTime || '0'));
      
      if (cachedData && cacheAge < 30 * 60 * 1000) {
        const cached = JSON.parse(cachedData);
        console.log(`✓ Using cached comprehensive catalogue: ${cached.length} movies`);
        return cached;
      }
      
      // Use the server's comprehensive catalogue endpoint that scrapes ALL 3 sources
      const response = await this.fetchJSON("/api/catalogue");
      if (!response.ok) {
        throw new Error("Failed to fetch comprehensive catalogue");
      }
      
      const { items, total, sources, policy } = response;
      console.log(`[CATALOGUE] Server returned ${total} movies from sources:`, sources);
      console.log(`[CATALOGUE] Policy: ${policy}`);
      
      // Verify we're getting the comprehensive catalogue
      if (total < 300) {
        console.warn(`[WARNING] Only ${total} movies - expected 300+. Server may be capping results.`);
      }
      
      const out: Movie[] = [];
      const seen = new Set<string>();
      
      // Process movies and get trailers
      for (const item of items) {
        try {
          const id = `movie_${item.id}`;
          if (seen.has(id)) continue;
          
          // Get trailer for this movie
          const trailerResponse = await this.fetchJSON(`/api/trailer?id=${item.id}`);
          const trailerUrl = trailerResponse?.trailer?.url;
          
          if (!trailerUrl) continue; // Skip movies without trailers
          
          // Extract YouTube key from embed URL
          const ytMatch = trailerUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
          if (!ytMatch) continue;
          
          const youtubeKey = ytMatch[1];
          
          // Use poster from server or fallback to YouTube thumbnail
          const poster = item.posterUrl || this.posterFromYouTube(youtubeKey);
          
          // Extract release year for feature vector
          const releaseYear = item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : undefined;
          
          // Build tags from genres
          const tags: string[] = [];
          (item.genres || []).slice(0, 3).forEach((gid: number) => {
            tags.push(this.getGenreLabel(gid));
          });
          
          const movie: Movie = {
            id,
            name: item.title || "Unknown Title",
            year: (item.releaseDate || "").slice(0, 4) || "Unknown",
            poster,
            youtube: youtubeKey,
            isSeries: false,
            tags,
            features: this.generateFeatureVector(item.genres || [], releaseYear),
            popularity: item.popularity || 0,
            voteAverage: item.voteAverage || 0,
            sources: item.sources || [],
            category: (releaseYear && releaseYear >= 2020) ? 'recent' : 'classic'
          };
          
          out.push(movie);
          seen.add(id);
          
        } catch (error) {
          console.warn(`Failed to process movie ${item.id}:`, error);
          continue;
        }
      }
      
      console.log(`✓ Built comprehensive catalogue: ${out.length} movies with trailers`);
      console.log(`Sources breakdown:`, {
        rt2020: out.filter(m => m.sources?.includes('rt2020')).length,
        imdbTop: out.filter(m => m.sources?.includes('imdbTop')).length,
        imdbList: out.filter(m => m.sources?.includes('imdbList')).length
      });
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(out));
      localStorage.setItem(timestampKey, Date.now().toString());
      
      return out;
      
    } catch (error) {
      console.error('Error building comprehensive catalogue:', error);
      // Return empty array to prevent app crash
      return [];
    }
  }
}

export const catalogueService = new CatalogueService();
