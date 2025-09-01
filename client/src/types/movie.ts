export interface Movie {
  id: string;
  name: string;
  year: string;
  poster: string;
  youtube: string; // YouTube video ID for trailers
  isSeries: boolean;
  tags: string[];
  features: number[]; // 12-dimensional feature vector
  rating?: number;
  duration?: string;
  imdbRank?: number; // Authentic IMDb Top 250 ranking
  category?: string; // 'classic' or 'recent'
  source?: string; // 'imdb_top_250' or 'imdb_custom_list'
}

export interface UserPreferences {
  w: number[]; // weight vector for ML
  explored: Set<string>;
  hidden: Set<string>;
  likes: Set<string>;
  choices: number;
  eps: number; // exploration parameter
}

export interface MLState {
  preferences: UserPreferences;
  queue: Movie[];
  currentPair: [Movie, Movie] | null;
  onboardingComplete: boolean;
}
