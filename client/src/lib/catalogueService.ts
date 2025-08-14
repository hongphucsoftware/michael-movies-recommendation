import type { Movie } from "@/hooks/useMovieData";

// TMDb API service for massive catalogue expansion
export class CatalogueService {
  private baseUrl = '';

  // API helpers
  private async fetchJSON(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  async list(kind: string, type: string, page: number = 1) {
    return this.fetchJSON(`/api/list/${kind}/${type}/${page}`);
  }

  async trending(type: string) {
    return this.fetchJSON(`/api/trending/${type}`);
  }

  async videos(type: string, id: string) {
    return this.fetchJSON(`/api/videos/${type}/${id}`);
  }

  // Genre mappings for feature vectors
  private GENRES = {
    Comedy: 35, Drama: 18, Action: 28, Thriller: 53, SciFi: 878, 
    Fantasy: 14, Documentary: 99, Animation: 16, Horror: 27, 
    Crime: 80, Adventure: 12, Family: 10751, Romance: 10749, Mystery: 9648
  };

  // Generate 12-dimensional feature vector
  private generateFeatureVector(genreIds: number[], type: string): number[] {
    const hasGenre = (id: number) => genreIds.includes(id) ? 1 : 0;
    
    const comedy = hasGenre(this.GENRES.Comedy);
    const drama = hasGenre(this.GENRES.Drama);
    const action = hasGenre(this.GENRES.Action);
    const thriller = hasGenre(this.GENRES.Thriller) || hasGenre(this.GENRES.Mystery) || hasGenre(this.GENRES.Crime);
    const scifi = hasGenre(this.GENRES.SciFi);
    const fantasy = hasGenre(this.GENRES.Fantasy) || hasGenre(this.GENRES.Animation);
    const documentary = hasGenre(this.GENRES.Documentary);
    
    const lightTone = Math.min(1, comedy * 0.8 + fantasy * 0.4 + hasGenre(this.GENRES.Family) * 0.6 + hasGenre(this.GENRES.Romance) * 0.4);
    const darkTone = Math.min(1, thriller * 0.6 + drama * 0.4 + hasGenre(this.GENRES.Horror) * 0.8 + hasGenre(this.GENRES.Crime) * 0.5);
    const fastPace = Math.min(1, action * 0.8 + thriller * 0.6 + scifi * 0.4 + fantasy * 0.3);
    const slowPace = Math.min(1, drama * 0.6 + documentary * 0.4);
    const episodeLengthShort = (type === "tv" && comedy) ? 1 : 0;
    
    return [comedy, drama, action, thriller, scifi, fantasy, documentary, lightTone, darkTone, fastPace, slowPace, episodeLengthShort];
  }

  // Get genre label from ID
  private getGenreLabel(id: number): string {
    for (const [name, genreId] of Object.entries(this.GENRES)) {
      if (genreId === id) return name.replace("SciFi", "Sci-Fi");
    }
    return "Genre";
  }

  // Robust poster using YouTube thumbnail
  private posterFromYouTube(ytKey: string): string {
    return `https://i.ytimg.com/vi/${ytKey}/sddefault.jpg`;
  }

  // Build massive catalogue from multiple endpoints
  async buildCatalogue(): Promise<Movie[]> {
    const buckets = [
      ["popular", "movie", 1], ["popular", "movie", 2], ["popular", "movie", 3],
      ["top_rated", "movie", 1], ["top_rated", "movie", 2],
      ["now_playing", "movie", 1], ["upcoming", "movie", 1],
      ["popular", "tv", 1], ["popular", "tv", 2], ["popular", "tv", 3],
      ["top_rated", "tv", 1], ["top_rated", "tv", 2],
      ["airing_today", "tv", 1], ["on_the_air", "tv", 1]
    ];

    const allMovies: Movie[] = [];
    const seenIds = new Set<string>();

    // Fetch from all buckets with small delays
    for (const [kind, type, page] of buckets) {
      try {
        const data = await this.list(kind as string, type as string, page as number);
        
        for (const item of (data.results || [])) {
          const id = `${type}_${item.id}`;
          if (seenIds.has(id)) continue;
          
          // Fetch trailer for this title
          try {
            const videoData = await this.videos(type as string, item.id.toString());
            const trailer = (videoData.results || []).find((v: any) => 
              v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
            );
            
            if (!trailer) continue;
            
            const poster = this.posterFromYouTube(trailer.key);
            const name = item.title || item.name || "Untitled";
            const year = (item.release_date || item.first_air_date || "????").slice(0, 4);
            const tags: string[] = [];
            
            if (type === "tv") tags.push("Series");
            (item.genre_ids || []).slice(0, 3).forEach((genreId: number) => {
              tags.push(this.getGenreLabel(genreId));
            });

            const movie: Movie = {
              id,
              name,
              year,
              poster,
              youtube: trailer.key,
              isSeries: type === "tv",
              tags,
              features: this.generateFeatureVector(item.genre_ids || [], type as string)
            };

            allMovies.push(movie);
            seenIds.add(id);
          } catch (videoError) {
            // Skip if no trailer available
            continue;
          }
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error fetching ${kind} ${type} page ${page}:`, error);
        continue;
      }
    }

    // Also include trending
    try {
      const trendingMovies = await this.trending("movie");
      const trendingTV = await this.trending("tv");
      
      for (const item of [...(trendingMovies.results || []), ...(trendingTV.results || [])]) {
        const type = item.media_type || (item.title ? "movie" : "tv");
        const id = `${type}_${item.id}`;
        if (seenIds.has(id)) continue;
        
        try {
          const videoData = await this.videos(type, item.id.toString());
          const trailer = (videoData.results || []).find((v: any) => 
            v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
          );
          
          if (!trailer) continue;
          
          const poster = this.posterFromYouTube(trailer.key);
          const name = item.title || item.name || "Untitled";
          const year = (item.release_date || item.first_air_date || "????").slice(0, 4);
          const tags: string[] = [];
          
          if (type === "tv") tags.push("Series");
          (item.genre_ids || []).slice(0, 3).forEach((genreId: number) => {
            tags.push(this.getGenreLabel(genreId));
          });

          const movie: Movie = {
            id,
            name,
            year,
            poster,
            youtube: trailer.key,
            isSeries: type === "tv",
            tags,
            features: this.generateFeatureVector(item.genre_ids || [], type)
          };

          allMovies.push(movie);
          seenIds.add(id);
        } catch (videoError) {
          continue;
        }
      }
    } catch (error) {
      console.error("Error fetching trending:", error);
    }

    // Sort and shuffle for variety
    allMovies.sort((a, b) => a.name.localeCompare(b.name) || a.year.localeCompare(b.year));
    
    // Fisher-Yates shuffle
    for (let i = allMovies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allMovies[i], allMovies[j]] = [allMovies[j], allMovies[i]];
    }

    return allMovies.slice(0, 250); // Cap at 250 for performance
  }
}

export const catalogueService = new CatalogueService();