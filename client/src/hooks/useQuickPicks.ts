// UI LOCK: DO NOT MODIFY — QuickPick engine (no repeats, left/right debias)

import { useEffect, useRef, useState } from "react";

export type QuickPickItem = { id: number; title?: string; year?: number; director?: string; [k: string]: any };

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toKey(title?: string, year?: number) {
  return `${(title || "").toLowerCase().trim()}|${year || ""}`;
}

const CURATED_50_TITLES: Array<{ title: string; year: number }> = [
  // 1980s (10)
  { title: "The Shining", year: 1980 },
  { title: "Raiders of the Lost Ark", year: 1981 },
  { title: "Blade Runner", year: 1982 },
  { title: "The Thing", year: 1982 },
  { title: "This Is Spinal Tap", year: 1984 },
  { title: "The Princess Bride", year: 1987 },
  { title: "Die Hard", year: 1988 },
  { title: "Do the Right Thing", year: 1989 },
  { title: "When Harry Met Sally…", year: 1989 },
  { title: "Aliens", year: 1986 },
  // 1990s (10)
  { title: "The Silence of the Lambs", year: 1991 },
  { title: "Groundhog Day", year: 1993 },
  { title: "Jurassic Park", year: 1993 },
  { title: "Pulp Fiction", year: 1994 },
  { title: "Se7en", year: 1995 },
  { title: "Heat", year: 1995 },
  { title: "Fargo", year: 1996 },
  { title: "The Big Lebowski", year: 1998 },
  { title: "The Matrix", year: 1999 },
  { title: "Before Sunrise", year: 1995 },
  // 2000s (10)
  { title: "Spirited Away", year: 2001 },
  { title: "City of God", year: 2002 },
  { title: "Lost in Translation", year: 2003 },
  { title: "Eternal Sunshine of the Spotless Mind", year: 2004 },
  { title: "Pan’s Labyrinth", year: 2006 },
  { title: "The Departed", year: 2006 },
  { title: "No Country for Old Men", year: 2007 },
  { title: "There Will Be Blood", year: 2007 },
  { title: "Superbad", year: 2007 },
  { title: "The Dark Knight", year: 2008 },
  // 2010s (10)
  { title: "The Social Network", year: 2010 },
  { title: "Drive", year: 2011 },
  { title: "Her", year: 2013 },
  { title: "The Grand Budapest Hotel", year: 2014 },
  { title: "Whiplash", year: 2014 },
  { title: "Mad Max: Fury Road", year: 2015 },
  { title: "Get Out", year: 2017 },
  { title: "Call Me by Your Name", year: 2017 },
  { title: "Spider-Man: Into the Spider-Verse", year: 2018 },
  { title: "Parasite", year: 2019 },
  // 2020s (10)
  { title: "Dune", year: 2021 },
  { title: "Everything Everywhere All at Once", year: 2022 },
  { title: "Top Gun: Maverick", year: 2022 },
  { title: "The Banshees of Inisherin", year: 2022 },
  { title: "Aftersun", year: 2022 },
  { title: "The Menu", year: 2022 },
  { title: "Past Lives", year: 2023 },
  { title: "Oppenheimer", year: 2023 },
  { title: "Barbie", year: 2023 },
  { title: "The Northman", year: 2022 },
];

function buildLanePairs(allItems: QuickPickItem[], rounds: number) {
  // Restrict to curated 50 by title+year
  const byKey = new Map<string, QuickPickItem>();
  for (const it of allItems) byKey.set(toKey(it.title, Number((it as any).year) || Number((it as any).releaseDate?.slice?.(0,4))), it);
  const curated: QuickPickItem[] = [];
  for (const t of CURATED_50_TITLES) {
    const found = byKey.get(toKey(t.title, t.year));
    if (found) curated.push(found);
  }
  const pool = curated.length ? curated : allItems;

  // Shuffle and lane split
  const shuffled = shuffle(pool);
  const laneA = shuffled.filter(x => (Number((x as any).year) || Number((x as any).releaseDate?.slice?.(0,4))) >= 1980 && (Number((x as any).year) || Number((x as any).releaseDate?.slice?.(0,4))) <= 2004);
  const laneB = shuffled.filter(x => (Number((x as any).year) || Number((x as any).releaseDate?.slice?.(0,4))) >= 2005 && (Number((x as any).year) || Number((x as any).releaseDate?.slice?.(0,4))) <= 2025);

  const neededPairs = Math.min(rounds, 12);
  const pairs: Array<{ left: QuickPickItem; right: QuickPickItem }> = [];

  let aIdx = 0, bIdx = 0;
  while (pairs.length < neededPairs && (aIdx < laneA.length || bIdx < laneB.length)) {
    let a = aIdx < laneA.length ? laneA[aIdx++] : null as any;
    let b = bIdx < laneB.length ? laneB[bIdx++] : null as any;

    if (!a || !b) {
      // if one lane ran out, pair remaining randomly
      const remaining = shuffled.filter(m => !pairs.some(p => p.left.id === m.id || p.right.id === m.id) && (!a || m.id !== a.id) && (!b || m.id !== b.id));
      if (!a && remaining.length) a = remaining.shift()!;
      if (!b && remaining.length) b = remaining.shift()!;
    }
    if (!a || !b || a.id === b.id) break;

    // Avoid same-director matchup by swapping B with next different director if possible
    if (a.director && b.director && a.director === b.director) {
      let swapped = false;
      for (let j = bIdx; j < laneB.length; j++) {
        if (laneB[j].director && laneB[j].director !== a.director) {
          const tmp = laneB[j];
          laneB[j] = b;
          b = tmp;
          swapped = true;
          bIdx = j + 1; // advance past swapped
          break;
        }
      }
      if (!swapped) {
        // try swap A instead
        for (let i = aIdx; i < laneA.length; i++) {
          if (laneA[i].director && laneA[i].director !== b.director) {
            const tmp = laneA[i];
            laneA[i] = a;
            a = tmp;
            aIdx = i + 1;
            break;
          }
        }
      }
    }

    pairs.push({ left: a, right: b });
  }

  // Flatten into deck order [L1, R1, L2, R2, ...]
  const deck: number[] = [];
  for (const p of pairs) { deck.push(p.left.id, p.right.id); }
  return deck;
}

/**
 * Build a deck of unique IDs and yield them in randomised pairs.
 * Each title appears at most once per session (no repeats).
 */
export function useQuickPicks(items: QuickPickItem[], rounds = 12) {
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [pair, setPair] = useState<{ left: QuickPickItem; right: QuickPickItem } | null>(null);
  const deckRef = useRef<number[]>([]); // ordered ids: L1,R1,L2,R2,...

  // Rebuild deck when items change
  useEffect(() => {
    const deck = buildLanePairs(items, rounds);
    const need = Math.min(deck.length, rounds * 2);
    deckRef.current = deck.slice(0, need);
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