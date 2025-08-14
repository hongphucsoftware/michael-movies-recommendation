import type { Movie } from "@/types/movie";

// IMDb Top 250 integration service
export class IMDbService {
  private baseUrl = '';

  // Genre mappings for feature vectors
  private GENRES = {
    Comedy: ["Comedy"],
    Drama: ["Drama"],
    Action: ["Action"],
    Thriller: ["Thriller", "Mystery", "Crime"],
    SciFi: ["Sci-Fi"],
    Fantasy: ["Fantasy", "Adventure"],
    Documentary: ["Documentary"],
    Animation: ["Animation"],
    Horror: ["Horror"],
    Romance: ["Romance"],
    Family: ["Family"],
    War: ["War"],
    Western: ["Western"],
    Biography: ["Biography"],
    History: ["History"],
    Music: ["Music"],
    Sport: ["Sport"]
  };

  // Generate 12-dimensional feature vector
  private generateFeatureVector(genres: string[]): number[] {
    const hasGenre = (genreList: string[]) => 
      genreList.some(g => genres.includes(g)) ? 1 : 0;
    
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
    const slowPace = Math.min(1, drama * 0.6 + documentary * 0.4 + hasGenre(this.GENRES.Biography) * 0.4);
    const episodeLengthShort = 0; // Movies are not episodic
    
    return [comedy, drama, action, thriller, scifi, fantasy, documentary, lightTone, darkTone, fastPace, slowPace, episodeLengthShort];
  }

  // Extract IMDb ID from URL
  private extractImdbId(url: string): string {
    const match = url.match(/tt\d+/);
    return match ? match[0] : '';
  }

  // Get YouTube trailer from TMDb using IMDb ID
  private async getTrailerFromTMDb(imdbId: string): Promise<string | null> {
    try {
      // First get movie details from TMDb using IMDb ID
      const findResponse = await fetch(`/api/find/${imdbId}`);
      if (!findResponse.ok) return null;
      
      const findData = await findResponse.json();
      const movieResults = findData.movie_results || [];
      if (movieResults.length === 0) return null;
      
      const tmdbId = movieResults[0].id;
      
      // Then get videos for this movie
      const videosResponse = await fetch(`/api/videos/movie/${tmdbId}`);
      if (!videosResponse.ok) return null;
      
      const videosData = await videosResponse.json();
      const trailer = (videosData.results || []).find((v: any) => 
        v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
      );
      
      return trailer ? trailer.key : null;
    } catch (error) {
      console.warn(`Failed to get trailer for ${imdbId}:`, error);
      return null;
    }
  }

  // Build focused Top 100 IMDb movies catalogue
  async buildCatalogue(): Promise<Movie[]> {
    try {
      // Fetch the real IMDb Top 250 data
      const response = await fetch('https://raw.githubusercontent.com/movie-monk-b0t/top250/main/top250.json');
      if (!response.ok) throw new Error('Failed to fetch IMDb Top 250');
      
      const imdbData = await response.json();
      const movies: Movie[] = [];
      const processedCount = { current: 0 };
      
      // Process first 100 movies from the authentic IMDb Top 250
      for (let i = 0; i < Math.min(100, imdbData.length); i++) {
        const item = imdbData[i];
        
        try {
          const imdbId = this.extractImdbId(item.url);
          if (!imdbId) continue;
          
          // Get YouTube trailer
          const youtubeKey = await this.getTrailerFromTMDb(imdbId);
          if (!youtubeKey) continue; // Skip if no trailer available
          
          const name = item.name || "Untitled";
          const year = item.datePublished ? item.datePublished.slice(0, 4) : "Unknown";
          const genres = item.genre || [];
          const poster = `https://i.ytimg.com/vi/${youtubeKey}/sddefault.jpg`;
          
          const movie: Movie = {
            id: `imdb_${imdbId}`,
            name,
            year,
            poster,
            youtube: youtubeKey,
            isSeries: false,
            tags: genres.slice(0, 3), // First 3 genres as tags
            features: this.generateFeatureVector(genres)
          };

          movies.push(movie);
          processedCount.current++;
          
          // Small delay to be respectful to APIs
          if (i > 0 && i % 10 === 0) {
            await new Promise(res => setTimeout(res, 100));
          }
          
        } catch (error) {
          console.warn(`Failed to process movie ${i}:`, error);
          continue;
        }
      }
      
      console.log(`Successfully processed ${movies.length} movies from IMDb Top 250`);
      return movies;
      
    } catch (error) {
      console.error('Error building IMDb catalogue:', error);
      return [];
    }
  }
}

export const imdbService = new IMDbService();