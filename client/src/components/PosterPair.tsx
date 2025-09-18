// UI LOCK: DO NOT MODIFY — controlled layout for A/B testing
// Replit Agent: This component must render TWO posters per round,
// randomise their left/right position, and call like()/skip() on click.

import React, { useState } from "react";
import { useEnhancedCatalogue, useLearnedVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";
import { useQuickPicks } from "../hooks/useQuickPicks";
import { useABHistory } from "../hooks/useABHistory";
import TrailerPlayer from "./TrailerPlayer";

function genreName(id: number): string {
  switch (id) {
    case 28: return "Action";
    case 12: return "Adventure";
    case 16: return "Animation";
    case 35: return "Comedy";
    case 80: return "Crime";
    case 99: return "Documentary";
    case 18: return "Drama";
    case 10751: return "Family";
    case 14: return "Fantasy";
    case 36: return "History";
    case 27: return "Horror";
    case 10402: return "Music";
    case 9648: return "Mystery";
    case 10749: return "Romance";
    case 878: return "Sci-Fi";
    case 53: return "Thriller";
    case 10752: return "War";
    case 37: return "Western";
    default: return "Genre";
  }
}

export default function PosterPair() {
  const { items, total, loading, error, stats } = useEnhancedCatalogue();
  const { learned, like, skip, resetLearning } = useLearnedVector(12);
  const { pair, choose, done, progress, reset } = useQuickPicks(items, 12);
  const { chosen: chosenIds, seen: seenIds, record, reset: resetAB } = useABHistory();
  const [rebuilding, setRebuilding] = useState(false);

  if (loading) return <div className="opacity-80">Loading catalogue…</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!items.length) return <div>No titles found.</div>;

  function pick(side: "left" | "right") {
    const result = choose(side);
    if (!result) return;
    const { chosen, other } = result;
    like(chosen as any);
    skip(other as any);
    record((chosen as any).id, (other as any).id);  // Track A/B history for personalized reel
  }

  async function doRebuild() {
    try { 
      setRebuilding(true); 
      await fetch("/api/catalogue/build", { method: "POST" }); 
      window.location.reload(); 
    } finally { 
      setRebuilding(false); 
    }
  }

  async function newRound() {
    try {
      // Call API to switch to next seed
      const response = await fetch('/api/next-seed', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }
      
      const result = await response.json();
      
      if (result.ok) {
        console.log(`Switched to ${result.seedName}, seedIndex: ${result.seedIndex}`);
        // Store the new seed index in localStorage
        localStorage.setItem('currentSeedIndex', result.seedIndex.toString());
        console.log(`[NewRound] Stored seedIndex ${result.seedIndex} in localStorage`);
        // Instead of reloading, trigger a refresh of the catalogue data
        window.location.href = `/?seedIndex=${result.seedIndex}`;
      } else {
        console.error('Failed to switch seed:', result.error);
      }
    } catch (error) {
      console.error('Error switching seed:', error);
      // Fallback: just reload the page anyway
      console.log('Falling back to page reload...');
      window.location.reload();
    }
  }

  function hardReset() { 
    resetLearning(); 
    resetAB(); 
    reset(); 
  }

  return (
    <div className="space-y-6">
      {/* Progress + controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm">Learning Progress</div>
        <div className="text-xs opacity-80">{progress.current} / {progress.total}</div>
      </div>
      <div className="w-full h-2 rounded bg-gray-800 overflow-hidden">
        <div
          className="h-2 bg-cyan-400 transition-all"
          style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
        />
      </div>

      {/* The A/B cards */}
      {!done && pair && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            className="rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition"
            onClick={() => pick("left")}
          >
            <img
              src={bestImageUrl(pair.left as any) || ""}
              alt={(pair.left as any).title}
              className="w-full h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 text-center">
              <div className="font-medium">{(pair.left as any).title}</div>
              <div className="text-xs opacity-70">{(pair.left as any).releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>

          <button
            className="rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition"
            onClick={() => pick("right")}
          >
            <img
              src={bestImageUrl(pair.right as any) || ""}
              alt={(pair.right as any).title}
              className="w-full h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 text-center">
              <div className="font-medium">{(pair.right as any).title}</div>
              <div className="text-xs opacity-70">{(pair.right as any).releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>
        </div>
      )}

      {/* When the deck is done, reveal the Trailer Reel */}
      {done && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Perfect! Your personalised Trailer Reel</h2>
            <button
              onClick={newRound}
              className="text-xs rounded-full px-3 py-1 bg-white/10 hover:bg-white/20 transition"
              title="New round with fresh A/B pairs from next seed list"
            >
              New Round
            </button>
            <button
              onClick={hardReset}
              className="text-xs rounded-full px-3 py-1 bg-red-500/20 hover:bg-red-500/30 transition"
              title="Reset all learned preferences and A/B history"
            >
              Reset All Learning
            </button>
          </div>

          {/* You feel like watching … (top 3 genres from chosen) */}
          {(() => {
            const chosenSet = new Set(chosenIds);
            const chosen = items.filter((t: any) => chosenSet.has(t.id));
            const counts = new Map<number, number>();
            for (const t of chosen) for (const g of (t.genres || [])) counts.set(g, (counts.get(g) || 0) + 1);
            const top = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([g])=>g);
            if (!top.length) return null;
            return (
              <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                <div className="text-sm opacity-80 mb-2">You feel like watching…</div>
                <div className="flex flex-wrap gap-2">
                  {top.map((g) => (
                    <span key={g} className="px-3 py-1 rounded-full text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                      {genreName(g)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <TrailerPlayer items={items} learnedVec={learned} recentChosenIds={chosenIds} avoidIds={seenIds} count={5} />
        </div>
      )}
    </div>
  );
}