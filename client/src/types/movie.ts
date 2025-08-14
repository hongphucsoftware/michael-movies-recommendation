export interface Movie {
  id: string;
  name: string;
  year: number;
  poster: string;
  yt: string;
  isSeries: boolean;
  lenShort: number;
  tags: string[];
  x: number[]; // 12-dimensional feature vector
  rating?: number;
  duration?: string;
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
