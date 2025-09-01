// UI LOCK: DO NOT MODIFY — A/B history used to personalise Trailer Reel
// Replit Agent: This persists which titles the user saw/chose during A/B rounds.
// The reel uses this to avoid repeats and bias recommendations appropriately.

import { useEffect, useState } from "react";

const CHOSEN_KEY = "pf_ab_chosen_v1";
const SEEN_KEY   = "pf_ab_seen_v1";

function load(key: string, def: number[] = []) {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
  return def;
}
function save(key: string, val: number[]) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

export function useABHistory() {
  const [chosen, setChosen] = useState<number[]>(() => load(CHOSEN_KEY));
  const [seen, setSeen]     = useState<number[]>(() => load(SEEN_KEY));

  useEffect(() => save(CHOSEN_KEY, chosen), [chosen]);
  useEffect(() => save(SEEN_KEY, seen), [seen]);

  function record(chosenId: number, otherId: number) {
    setChosen((a) => Array.from(new Set([...a, chosenId])));
    setSeen((a) => Array.from(new Set([...a, chosenId, otherId])));
  }
  function reset() { setChosen([]); setSeen([]); }

  return { chosen, seen, record, reset };
}