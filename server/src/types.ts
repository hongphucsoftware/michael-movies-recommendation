export type MovieLite = { imdbId: string; title: string; year?: number; };
export type MovieHydrated = MovieLite & {
  tmdbId?: number; posterPath?: string|null; backdropPath?: string|null; trailerKey?: string|null;
  runtime?: number|null; keywords?: string[]; people?: string[]; decade?: string|null;
  pace?: 'slow'|'medium'|'fast'|null; vibe_tags?: string[]; features?: number[];
};
export type UserState = {
  id: string; w: number[]; recentlyShown: string[]; pairsShown: Set<string>;
  ratings: Map<string,{r:number;comps:number;wins:number;losses:number}>; winners: Set<string>;
  blocked: Set<string>; seen: Set<string>;
};