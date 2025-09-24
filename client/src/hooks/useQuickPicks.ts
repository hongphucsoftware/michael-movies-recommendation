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
  // Use all available items and ensure we have enough for 12 pairs
  const shuffled = shuffle(allItems);
  
  // If we have enough movies, use them directly
  if (shuffled.length >= 24) {
    const deck: number[] = [];
    for (let i = 0; i < 24; i += 2) {
      if (i + 1 < shuffled.length) {
        deck.push(shuffled[i].id, shuffled[i + 1].id);
      }
    }
    return deck;
  }
  
  // If not enough movies, return empty array (will be handled by API)
  return [];
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
    console.log(`[useQuickPicks] Built deck with ${deck.length} movies, need 24 for 12 pairs`);
    // Ensure we always have exactly 24 movies (12 pairs)
    if (deck.length >= 24) {
      deckRef.current = deck.slice(0, 24);
      console.log(`[useQuickPicks] Using exactly 24 movies for 12 pairs`);
    } else {
      // If we don't have enough movies, pad with duplicates or use all available
      deckRef.current = deck.length > 0 ? deck : [];
      console.log(`[useQuickPicks] WARNING: Only ${deck.length} movies available, may not complete 12 pairs`);
    }
    setRound(0);
    setDone(false);
  }, [items, rounds]);

  // Compute current pair with side randomization
  useEffect(() => {
    const ids = deckRef.current;
    const idx = round * 2;
    
    // Only complete after exactly 12 rounds (24 movies)
    if (round >= 12) {
      setPair(null);
      setDone(true);
      return;
    }
    
    // Don't complete early - ensure we have enough movies for 12 pairs
    if (idx + 1 >= ids.length || ids.length < 24) {
      setPair(null);
      setDone(false); // Don't complete if we don't have enough movies
      return;
    }
    
    const a = items.find((x) => x.id === ids[idx]);
    const b = items.find((x) => x.id === ids[idx + 1]);
    if (!a || !b) {
      setPair(null);
      setDone(false); // Don't complete if we can't find movies
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

  const progress = { current: Math.min(round, 12), total: 12 };
  return { pair, round, done, choose, reset, progress };
}