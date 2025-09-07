export type BasicImdbItem = { title: string; year: number | null };

export type CatalogueMovie = {
  id: number; // TMDb id
  title: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: Array<{ id: number; name: string }>;
  sourceListId: string;
  sourceListUrl: string;
};