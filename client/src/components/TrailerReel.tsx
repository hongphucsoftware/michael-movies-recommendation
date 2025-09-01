// UI LOCK: DO NOT MODIFY — Reel uses ALL titles + learned preferences (A/B) + MMR diversity
// Replit Agent: Do not replace with static lists or "curated 50". This ranks the FULL catalogue.

import { useEffect, useMemo, useState } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { bestImageUrl, toFeatureVector } from "../hooks/useEnhancedCatalogue";

type Props = {
  items: Title[];
  learnedVec: number[];
  count?: number;
  recentChosenIds?: number[];  // A/B choices to steer toward "more like this"
  avoidIds?: number[];         // Anything shown during A/B this round (don't repeat)
};

function l2(x: number[]) { return Math.sqrt(x.reduce((s, v) => s + v*v, 0)); }
function cosine(a: number[], b: number[]) {
  const la = l2(a), lb = l2(b);
  if (la === 0 || lb === 0) return 0;
  let dot = 0; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i]*b[i];
  return dot / (la * lb);
}

function seededJitter(id: number) {
  // small repeatable jitter by id (keeps results from being identical each time)
  const x = Math.sin(id * 99991) * 10000;
  return (x - Math.floor(x)) * 0.01; // +/- up to 0.01
}

function mmrPick(pool: Title[], userVec: number[], k = 12, lambda = 0.75) {
  const chosen: Title[] = [];
  const feats = new Map<number, number[]>();
  const getF = (t: Title) => feats.get(t.id) || (feats.set(t.id, t.feature || toFeatureVector(t)), feats.get(t.id)!);

  while (chosen.length < k && pool.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      const f = getF(t);
      const rel = cosine(f, userVec);
      const div = chosen.length === 0 ? 0 : Math.max(...chosen.map(c => cosine(f, getF(c))));
      const score = lambda * rel - (1 - lambda) * div + seededJitter(t.id);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    if (bestIdx < 0) break;
    const [pick] = pool.splice(bestIdx, 1);
    chosen.push(pick);
  }
  return chosen;
}

async function getTrailerUrl(tmdbId: number): Promise<string | null> {
  const res = await fetch(`/api/trailer?id=${tmdbId}`);
  if (!res.ok) return null;
  const json = await res.json();
  const t = json?.trailer;
  return t ? (t.url as string) : null;
}

export default function TrailerReel({ items, learnedVec, count = 12, recentChosenIds = [], avoidIds = [] }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Build the candidate pool from ALL items (with images), then:
  // 1) compute preference score (cosine with learnedVec)
  // 2) soft bias toward "more like" recent A/B choices
  // 3) remove items we just showed during A/B (avoidIds)
  // 4) take top-N and run MMR for diversity
  const { picks } = useMemo(() => {
    const pool0 = items.filter(t => bestImageUrl(t));                 // image gate for UX
    const avoid = new Set<number>(avoidIds || []);
    const pool = pool0.filter(t => !avoid.has(t.id));                  // don't re-show A/B pair immediately

    // If user vector is almost zero (brand new), sample a large diverse set
    const strength = l2(learnedVec);
    const fmap = new Map<number, number[]>();
    const getF = (t: Title) => fmap.get(t.id) || (fmap.set(t.id, t.feature || toFeatureVector(t)), fmap.get(t.id)!);

    // "More like what you chose" — boost titles similar to recent chosen items
    const chosenF = recentChosenIds
      .map(id => pool.find(p => p.id === id))
      .filter(Boolean)
      .map(t => getF(t as Title));

    function likeBoost(f: number[]) {
      if (!chosenF.length) return 0;
      const s = chosenF.reduce((acc, cf) => acc + Math.max(0, cosine(f, cf)), 0) / chosenF.length;
      return 0.15 * s; // small nudge toward what you picked
    }

    // Score every candidate
    const scored = pool.map(t => {
      const f = getF(t);
      const base = cosine(f, learnedVec);       // -1..1
      const lb = likeBoost(f);                   // 0..~0.15
      const pop = Math.min(1, (t.popularity || 0) / 100); // keep a little popularity signal
      const score = base + lb + 0.05 * pop + seededJitter(t.id);
      return { t, score };
    });

    // If very weak signal, don't let popular classics dominate — take a big randomised slice
    if (strength < 0.15) {
      const shuffled = scored.sort((a, b) => b.score - a.score);
      const slice = shuffled.slice(0, Math.min(400, shuffled.length)).map(x => x.t);
      const mmr = mmrPick(slice, learnedVec, count, 0.65);
      return { picks: mmr };
    }

    // Normal path: take top 400 most relevant, then MMR for diversity
    const top = scored.sort((a, b) => b.score - a.score).slice(0, Math.min(400, scored.length)).map(x => x.t);
    const mmr = mmrPick(top, learnedVec, count, 0.75);
    return { picks: mmr };
  }, [items, learnedVec, count, recentChosenIds, avoidIds]);

  useEffect(() => { setActiveIdx(null); setActiveUrl(null); }, [picks]);

  async function play(i: number) {
    setLoading(true);
    setActiveIdx(i);
    const url = await getTrailerUrl(picks[i].id);
    setActiveUrl(url);
    setLoading(false);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Personalized Trailer Reel</h2>
        <div className="text-xs opacity-70">
          Based on your A/B choices • {picks.length} curated from {items.length} movies
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {picks.map((t, i) => (
          <button
            key={t.id}
            onClick={() => play(i)}
            className={`rounded-xl overflow-hidden shadow hover:shadow-lg transition ${i === activeIdx ? "ring-2 ring-cyan-400" : ""}`}
            title={`Play trailer: ${t.title}`}
          >
            <img src={bestImageUrl(t) || ""} alt={t.title} className="w-full h-64 object-cover" loading="lazy" />
            <div className="p-2 text-sm font-medium text-left">{t.title}</div>
          </button>
        ))}
      </div>

      {/* Player */}
      <div className="mt-6">
        {loading && <div className="text-sm opacity-80">Loading trailer…</div>}
        {!loading && activeUrl && isYouTube(activeUrl) && (
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-xl"
              src={toYouTubeEmbed(activeUrl)}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
        {!loading && activeUrl && !isYouTube(activeUrl) && (
          <div className="text-sm">
            Trailer URL:{" "}
            <a className="underline" href={activeUrl} target="_blank" rel="noreferrer">Open in new tab</a>
          </div>
        )}
        {!loading && activeIdx !== null && !activeUrl && (
          <div className="text-sm opacity-80">No trailer available for this title.</div>
        )}
      </div>
    </div>
  );
}

function isYouTube(u: string) { return /youtube\.com|youtu\.be/.test(u); }
function toYouTubeEmbed(u: string) {
  const m = u.match(/v=([^&]+)/);
  const id = m ? m[1] : u.split("/").pop();
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}