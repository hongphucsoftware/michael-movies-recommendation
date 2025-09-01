// UI LOCK — TrailerPlayer shows ONE trailer at a time. No grids, no poster walls.
// Replit Agent: Do NOT replace this component with a grid view.
// It must queue 5 trailers chosen by the A/B signal and play them sequentially.

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Title } from "../hooks/useEnhancedCatalogue";
import { toFeatureVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";

// Math helpers
const l2 = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v*v, 0));
const cosine = (a: number[], b: number[]) => {
  const la = l2(a), lb = l2(b); 
  if (!la || !lb) return 0;
  let dot = 0; 
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i]*b[i];
  return dot / (la * lb);
};

// Server call for trailer embeds
async function fetchTrailerEmbeds(ids: number[]): Promise<Record<number, string|null>> {
  if (!ids.length) return {};
  const r = await fetch(`/api/trailers?ids=${ids.join(",")}`);
  if (!r.ok) return {};
  const j = await r.json();
  const out: Record<number, string|null> = {};
  Object.keys(j?.trailers || {}).forEach(k => (out[Number(k)] = j.trailers[k]));
  return out;
}

// Weighted sample without replacement using softmax
function softmaxSample<T>(items: T[], getScore: (t: T)=>number, k: number, temperature = 0.65): T[] {
  const pool = items.slice();
  const out: T[] = [];
  for (let pick = 0; pick < k && pool.length; pick++) {
    const scores = pool.map(getScore);
    const max = Math.max(...scores);
    const exps = scores.map(s => Math.exp((s - max) / Math.max(temperature, 1e-6)));
    const sum = exps.reduce((a,b)=>a+b, 0) || 1;
    let r = Math.random() * sum;
    let idx = 0;
    for (; idx < exps.length; idx++) { r -= exps[idx]; if (r <= 0) break; }
    const chosen = pool.splice(Math.min(idx, pool.length-1), 1)[0];
    out.push(chosen);
  }
  return out;
}

type Props = {
  items: Title[];            
  learnedVec: number[];      
  recentChosenIds: number[]; 
  avoidIds?: number[];       
  count?: number;            
};

export default function TrailerPlayer({
  items, learnedVec, recentChosenIds, avoidIds = [], count = 5,
}: Props) {
  const [queue, setQueue] = useState<Title[]>([]);
  const [embeds, setEmbeds] = useState<Record<number, string|null>>({});
  const [idx, setIdx] = useState(0);

  console.log('[TrailerPlayer] Received items:', items.length);
  console.log('[TrailerPlayer] Learned vector length:', learnedVec.length);
  console.log('[TrailerPlayer] Recent chosen IDs:', recentChosenIds.length);

  // Build picks using the learned preferences
  const picks = useMemo(() => {
    if (!items.length) {
      console.warn('[TrailerPlayer] No items provided');
      return [];
    }

    // Filter items with valid images and convert IDs to numbers
    const withImages = items.filter(t => bestImageUrl(t)).map(t => ({
      ...t,
      id: typeof t.id === 'string' ? parseInt(t.id.replace(/\D/g, '')) : t.id
    })).filter(t => !isNaN(t.id));

    console.log('[TrailerPlayer] Items with images:', withImages.length);

    if (!withImages.length) return [];

    // If no learned vector, return random sample
    if (!learnedVec || learnedVec.length === 0 || l2(learnedVec) < 0.05) {
      console.log('[TrailerPlayer] No learned vector, using random selection');
      const shuffled = [...withImages].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }

    // Score items based on cosine similarity to learned preferences
    const scored = withImages.map(t => {
      const feature = t.feature || toFeatureVector(t);
      const similarity = cosine(feature, learnedVec);

      // Add some variety - prefer items not recently chosen
      const recentPenalty = recentChosenIds.includes(t.id) ? -0.2 : 0;
      const avoidPenalty = avoidIds.includes(t.id) ? -0.5 : 0;

      const score = similarity + recentPenalty + avoidPenalty + (Math.random() * 0.1); // small jitter

      return { item: t, score, similarity };
    });

    // Sort by score and take top candidates
    const sorted = scored.sort((a, b) => b.score - a.score);
    const topCandidates = sorted.slice(0, Math.min(50, sorted.length));

    console.log('[TrailerPlayer] Top candidate scores:', topCandidates.slice(0, 10).map(s => ({
      title: s.item.title,
      score: s.score.toFixed(3),
      similarity: s.similarity.toFixed(3)
    })));

    // Use softmax sampling for diversity
    const selected = softmaxSample(
      topCandidates, 
      candidate => candidate.score, 
      count,
      0.5 // temperature for variety
    );

    const final = selected.map(s => s.item);

    console.log('[TrailerPlayer] Final picks:', final.map(f => f.title));

    return final;
  }, [items, learnedVec, recentChosenIds, avoidIds, count]);

  // Fetch trailer embeds when picks change
  useEffect(() => {
    if (!picks.length) {
      console.log('[TrailerPlayer] No picks, clearing queue');
      setQueue([]);
      setEmbeds({});
      setIdx(0);
      return;
    }

    let mounted = true;

    (async () => {
      console.log('[TrailerPlayer] Fetching trailers for picks:', picks.length);
      const ids = picks.map(p => p.id);
      const embedMap = await fetchTrailerEmbeds(ids);

      if (!mounted) return;

      console.log('[TrailerPlayer] Received embeds for:', Object.keys(embedMap).length, 'items');

      // Filter to only items with actual trailer embeds
      const withTrailers = picks.filter(p => embedMap[p.id]);

      console.log('[TrailerPlayer] Items with trailers:', withTrailers.length);
      console.log('[TrailerPlayer] Trailer titles:', withTrailers.map(t => t.title));

      setQueue(withTrailers);
      setEmbeds(embedMap);
      setIdx(0);
    })();

    return () => { mounted = false; };
  }, [picks]);

  // Navigation handlers
  const canPrev = idx > 0;
  const canNext = idx + 1 < queue.length;

  const prev = useCallback(() => { 
    if (canPrev) setIdx(i => Math.max(0, i-1)); 
  }, [canPrev]);

  const next = useCallback(() => { 
    if (canNext) setIdx(i => Math.min(queue.length-1, i+1)); 
  }, [canNext]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === "ArrowLeft") prev(); 
      if (e.key === "ArrowRight") next(); 
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const current = queue[idx];
  const embed = current ? embeds[current.id] : null;

  console.log('[TrailerPlayer] Current state:', {
    queueLength: queue.length,
    currentIndex: idx,
    currentTitle: current?.title,
    hasEmbed: !!embed
  });

  if (!queue.length) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Your Trailer Reel</h2>
          <div className="text-xs sm:text-sm opacity-60">0 / 0</div>
        </div>
        <div className="text-center py-12">
          <div className="text-lg mb-2">Building your personalized trailer queue...</div>
          <div className="text-sm opacity-60">Please wait while we find trailers that match your taste</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Your Trailer Reel</h2>
        <div className="text-xs sm:text-sm opacity-60">{idx + 1} / {queue.length}</div>
      </div>

      {current && (
        <div className="mb-4 sm:mb-6">
          <div className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-center sm:text-left">
            {current.title}
          </div>
          <div className="aspect-video w-full rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-lg">
            {embed ? (
              <iframe
                className="w-full h-full"
                src={embed}
                title={`Trailer: ${current.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm sm:text-base opacity-80 p-4">
                <div className="text-center">
                  <div className="mb-2">No trailer found for this title</div>
                  <div className="text-xs opacity-60">Try the next recommendation</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={prev}
          disabled={!canPrev}
          className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            canPrev 
              ? "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600" 
              : "bg-neutral-900 opacity-50 cursor-not-allowed"
          }`}>
          <span className="flex items-center justify-center gap-2">
            <span>←</span>
            <span>Back</span>
          </span>
        </button>
        <button
          onClick={next}
          disabled={!canNext}
          className={`flex-1 sm:flex-none px-4 py-3 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            canNext 
              ? "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600" 
              : "bg-neutral-900 opacity-50 cursor-not-allowed"
          }`}>
          <span className="flex items-center justify-center gap-2">
            <span>Next</span>
            <span>→</span>
          </span>
        </button>
      </div>
    </div>
  );
}