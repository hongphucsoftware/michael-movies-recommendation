import { useEffect, useMemo, useRef, useState } from "react";

export type QuickPickItem = { id: number; [k: string]: any };

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a deck of unique IDs and yield them in randomized pairs.
 * - Each title appears at most once per session (no repeats).
 * - Each round randomizes which item is left/right to remove side bias.
 */
export function useQuickPicks(items: QuickPickItem[], rounds = 12) {
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [pair, setPair] = useState<{ left: QuickPickItem; right: QuickPickItem } | null>(null);
  const deckRef = useRef<number[]>([]); // unique ids in random order

  // Rebuild deck when items change
  useEffect(() => {
    const uniqueIds = Array.from(new Set(items.map((t) => t.id)));
    const need = Math.min(uniqueIds.length, rounds * 2);
    deckRef.current = shuffle(uniqueIds).slice(0, need);
    setRound(0);
    setDone(false);
  }, [items, rounds]);

  // Compute current pair with side randomization
  useEffect(() => {
    const ids = deckRef.current;
    const idx = round * 2;
    if (idx + 1 >= ids.length) {
      setPair(null);
      setDone(true);
      return;
    }
    const a = items.find((x) => x.id === ids[idx]);
    const b = items.find((x) => x.id === ids[idx + 1]);
    if (!a || !b) {
      setPair(null);
      setDone(true);
      return;
    }
    // coin flip: which goes left/right this round
    if (Math.random() < 0.5) setPair({ left: a, right: b });
    else setPair({ left: b, right: a });
  }, [round, items]);

  function choose(side: "left" | "right") {
    if (!pair || done) return null;
    const chosen = side === "left" ? pair.left : pair.right;
    const other = side === "left" ? pair.right : pair.left;
    setRound((r) => r + 1);
    return { chosen, other };
  }

  function reset() {
    setRound(0);
    setDone(false);
  }

  const progress = { current: Math.min(round, Math.floor(deckRef.current.length / 2)), total: Math.floor(deckRef.current.length / 2) };
  return { pair, round, done, choose, reset, progress };
}