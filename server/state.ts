export type CatalogueItem = {
  id: number;
  title: string;
  overview: string;
  genres: number[];
  releaseDate: string | null;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  posterUrl: string | null;
  backdropUrl: string | null;
};

export type BuiltState = {
  catalogue: CatalogueItem[];
  builtAt: number;
};

let state: BuiltState | null = null;
let building: Promise<void> | null = null;

const TTL_HOURS = Number(process.env.CATALOGUE_TTL_HOURS ?? 24);
const TTL_MS = TTL_HOURS * 3600 * 1000;

function isStale() {
  return !state || (Date.now() - (state?.builtAt ?? 0) > TTL_MS);
}

// We'll set this function from routes-simple.ts
let buildCatalogueFunction: (() => Promise<CatalogueItem[]>) | null = null;

export function setBuildFunction(fn: () => Promise<CatalogueItem[]>) {
  buildCatalogueFunction = fn;
}

async function buildCatalogue(): Promise<BuiltState> {
  if (!buildCatalogueFunction) {
    throw new Error("Build function not set");
  }
  
  const catalogue = await buildCatalogueFunction();
  
  return {
    catalogue,
    builtAt: Date.now()
  };
}

export async function ensureCatalogue(): Promise<void> {
  if (!isStale()) return;
  if (!building) {
    building = (async () => {
      try {
        state = await buildCatalogue();
      } finally {
        building = null;
      }
    })();
  }
  await building;
}

export async function getState(): Promise<BuiltState> {
  await ensureCatalogue();
  return state!;
}

export function getBuildStatus() {
  return {
    ok: !!state,
    building: !!building,
    builtAt: state?.builtAt ?? null
  };
}

export function clearState() {
  state = null;
}

export async function forceRebuild() {
  state = null;
  building = null;
  await ensureCatalogue();
}