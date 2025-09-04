// UI LOCK: DO NOT MODIFY — controlled layout for A/B testing
// Replit Agent: This component must render TWO posters per round,
// randomise their left/right position, and call like()/skip() on click.

import React, { useState } from "react";
import { useEnhancedCatalogue, useLearnedVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";
import { useQuickPicks } from "../hooks/useQuickPicks";
import { useABHistory } from "../hooks/useABHistory";
import TrailerPlayer from "./TrailerPlayer";

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

  function hardReset() { 
    resetLearning(); 
    resetAB(); 
    reset(); 
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Progress + controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm sm:text-base font-medium">Learning Progress</div>
        <div className="text-xs sm:text-sm opacity-80 font-mono">{progress.current} / {progress.total}</div>
      </div>
      <div className="w-full h-2 sm:h-3 rounded-full bg-gray-800 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
        />
      </div>

      {/* The A/B cards */}
      {!done && pair && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <button
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition-all duration-200 active:scale-[0.98]"
            onClick={() => pick("left")}
          >
            <img
              src={bestImageUrl(pair.left as any) || ""}
              alt={(pair.left as any).title}
              className="w-full h-[400px] sm:h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 sm:p-4 text-center">
              <div className="font-medium text-sm sm:text-base">{(pair.left as any).title}</div>
              <div className="text-xs opacity-70 mt-1">{(pair.left as any).releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>

          <button
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition-all duration-200 active:scale-[0.98]"
            onClick={() => pick("right")}
          >
            <img
              src={bestImageUrl(pair.right as any) || ""}
              alt={(pair.right as any).title}
              className="w-full h-[400px] sm:h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 sm:p-4 text-center">
              <div className="font-medium text-sm sm:text-base">{(pair.right as any).title}</div>
              <div className="text-xs opacity-70 mt-1">{(pair.right as any).releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>
        </div>
      )}

      {/* When the deck is done, reveal the Trailer Reel */}
      {done && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-center sm:text-left">
              Perfect! Your personalised Trailer Reel
            </h2>
            <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start">
              <button
                onClick={() => reset()}
                className="text-xs sm:text-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 transition-colors"
                title="New round with fresh A/B pairs"
              >
                New Round
              </button>
              <button
                onClick={hardReset}
                className="text-xs sm:text-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500/20 hover:bg-red-500/30 transition-colors"
                title="Reset all learned preferences and A/B history"
              >
                Reset All
              </button>
            </div>
          </div>

          <TrailerPlayer items={items} learnedVec={learned} recentChosenIds={[...chosenIds, ...seenIds]} avoidIds={seenIds} count={5} />
        </div>
      )}
    </div>
  );
}