import React from "react";
import { useEnhancedCatalogue, useLearnedVector, bestImageUrl } from "../hooks/useEnhancedCatalogue";
import { useQuickPicks } from "../hooks/useQuickPicks";
import TrailerReel from "./TrailerReel";

export default function PosterPair() {
  const { items, loading, error } = useEnhancedCatalogue();
  const { learned, like, skip, resetLearning } = useLearnedVector(12);
  const { pair, choose, done, progress, reset } = useQuickPicks(items, 12);

  if (loading) return <div className="opacity-80">Loading catalogue…</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!items.length) return <div>No titles found.</div>;

  function pick(side: "left" | "right") {
    const result = choose(side);
    if (!result) return;
    const { chosen, other } = result;
    like(chosen as any);
    skip(other as any);
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
            <h2 className="text-lg font-semibold">Thanks — reel ready!</h2>
            <button
              onClick={() => reset()}
              className="text-xs rounded-full px-3 py-1 bg-white/10 hover:bg-white/20 transition"
              title="New round with fresh pairs"
            >
              New Round
            </button>
            <button
              onClick={() => resetLearning()}
              className="text-xs rounded-full px-3 py-1 bg-red-500/20 hover:bg-red-500/30 transition"
              title="Reset learned preferences"
            >
              Reset Learning
            </button>
          </div>

          <TrailerReel 
            items={items} 
            learnedVec={learned} 
            onSave={(movieId) => {
              const movie = items.find(item => item.id === movieId);
              if (movie) like(movie);
            }}
            onSkip={(movieId) => {
              const movie = items.find(item => item.id === movieId);
              if (movie) skip(movie);
            }}
          />
        </div>
      )}
    </div>
  );
}