import * as React from 'react';
import { useStatelessAB } from "../hooks/useStatelessAB";
import TrailerResults from "./TrailerResults";

export default function PosterPair() {
  const { 
    currentPair, 
    progress, 
    isComplete, 
    loading, 
    error, 
    choose, 
    reset, 
    recommendations,
    isScoring 
  } = useStatelessAB();

  if (loading) return <div className="opacity-80">Loading A/B pairs…</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  function pick(side: "left" | "right") {
    choose(side);
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
      {!isComplete && currentPair && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            className="rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition"
            onClick={() => pick("left")}
            data-testid="button-pick-left"
          >
            <img
              src={currentPair.left.posterUrl || currentPair.left.backdropUrl || ""}
              alt={currentPair.left.title}
              className="w-full h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 text-center">
              <div className="font-medium">{currentPair.left.title}</div>
              <div className="text-xs opacity-70">{currentPair.left.releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>

          <button
            className="rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition"
            onClick={() => pick("right")}
            data-testid="button-pick-right"
          >
            <img
              src={currentPair.right.posterUrl || currentPair.right.backdropUrl || ""}
              alt={currentPair.right.title}
              className="w-full h-[520px] object-cover"
              loading="lazy"
            />
            <div className="p-3 text-center">
              <div className="font-medium">{currentPair.right.title}</div>
              <div className="text-xs opacity-70">{currentPair.right.releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>
        </div>
      )}

      {/* Scoring state */}
      {isComplete && isScoring && (
        <div className="text-center py-8">
          <div className="text-lg font-semibold mb-2">Analyzing your preferences…</div>
          <div className="text-sm text-gray-400">Finding your perfect trailers based on 12 picks</div>
        </div>
      )}

      {/* Show recommendations when ready */}
      {isComplete && recommendations && !isScoring && (
        <TrailerResults 
          recommendations={recommendations}
          onReset={reset}
        />
      )}
    </div>
  );
}