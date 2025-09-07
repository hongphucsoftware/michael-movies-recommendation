import { buildCatalogue, type BuiltState } from "./buildCatalogue";
let state: BuiltState | null = null;
const TTL_HOURS = Number(process.env.CATALOGUE_TTL_HOURS ?? 24);
const TTL_MS = TTL_HOURS * 3600 * 1000;

export async function getState(): Promise<BuiltState> {
  if (!state || Date.now() - state.builtAt > TTL_MS) {
    state = await buildCatalogue();
  }
  return state;
}