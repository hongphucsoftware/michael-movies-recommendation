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

  // Build focused Top 100 movies catalogue
  async buildCatalogue(): Promise<Movie[]> {
    const pages = [1, 2, 3, 4, 5]; // 5 × 20 = 100 top movies
    const out: Movie[] = [];
    const seen = new Set<string>();

    for (const page of pages) {
      try {
        const data = await this.list("top_rated", "movie", page);
        for (const r of (data.results || [])) {
          const id = `movie_${r.id}`;
          if (seen.has(id)) continue;

          // Find a YouTube trailer/teaser
          let vs;
          try {
            vs = await this.videos("movie", r.id);
          } catch {
            vs = { results: [] };
          }
          
          const v = (vs.results || []).find((x: any) => 
            x.site === "YouTube" && (x.type === "Trailer" || x.type === "Teaser")
          );
          if (!v) continue;

          // Reliable poster: YouTube thumbnail
          const poster = this.posterFromYouTube(v.key);
          if (!poster) continue;

          const name = r.title || "Untitled";
          const year = (r.release_date || "????").slice(0, 4);
          const tags: string[] = [];
          (r.genre_ids || []).slice(0, 3).forEach((gid: number) => tags.push(this.getGenreLabel(gid)));

          out.push({
            id,
            name,
            year,
            poster,
            youtube: v.key,
            isSeries: false,
            tags,
            features: this.generateFeatureVector(r.genre_ids || [], "movie")
          });

          seen.add(id);
        }
        // Short delay to be nice to the API
        await new Promise(res => setTimeout(res, 25));
      } catch (error) {
        console.warn(`Failed to fetch page ${page}:`, error);
        continue;
      }
    }

    // Return top 100 movies in TMDb ranking order
    return out.slice(0, 100);
  }
}

export const catalogueService = new CatalogueService();