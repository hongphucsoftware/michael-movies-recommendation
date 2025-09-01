import { useEffect, useMemo, useRef, useState } from "react";

export type QuickPickItem = {
  id: number;
  title: string;
  image?: string | null;
  [k: string]: any;
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a deck of unique items and yield them in pairs.
 * A title appears at most once per deck (no repeats).
 */
export function useQuickPicks(items: QuickPickItem[], rounds = 12) {
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const deckRef = useRef<number[]>([]);
  const [pair, setPair] = useState<QuickPickItem[] | null>(null);

  // rebuild deck whenever items change
  useEffect(() => {
    const ids = Array.from(new Set(items.map((t) => t.id)));
    const count = Math.min(ids.length, rounds * 2); // enough for the requested rounds
    const pick = shuffle(ids).slice(0, count);
    deckRef.current = pick;
    setRound(0);
    setDone(false);
  }, [items, rounds]);

  useEffect(() => {
    if (deckRef.current.length < 2) {
      setPair(null);
      setDone(true);
      return;
    }
    const idx = round * 2;
    if (idx + 1 >= deckRef.current.length) {
      setDone(true);
      setPair(null);
      return;
    }
    const idA = deckRef.current[idx];
    const idB = deckRef.current[idx + 1];
    const a = items.find((t) => t.id === idA);
    const b = items.find((t) => t.id === idB);
    if (a && b) setPair([a, b]);
    else setPair(null);
  }, [round, items]);

  function choose(side: "left" | "right") {
    if (done) return;
    setRound((r) => r + 1);
    return side;
  }

  function reset() {
    setRound(0);
    setDone(false);
  }

  return { pair, round, done, choose, reset };
}