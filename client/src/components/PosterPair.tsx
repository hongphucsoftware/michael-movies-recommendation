import React from "react";
import { useStatelessAB } from "../hooks/useStatelessAB";
import TrailerResults from "./TrailerResults";

export default function PosterPair() {
  const hookResult = useStatelessAB();

  // Handle case where hook is not ready
  if (!hookResult) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">
          <div className="text-lg font-semibold mb-2">Initializing A/B Testing...</div>
          <div className="text-sm text-gray-400">Setting up movie pairs</div>
        </div>
      </div>
    );
  }

  const { 
    currentPair,
    progress = { current: 0, total: 12 }, // Add default fallback
    isComplete,
    loading,
    error,
    choose,
    reset,
    recommendations,
    isScoring
  } = hookResult;

  if (loading) return <div className="opacity-80">Loading A/B pairs…</div>;
  if (error) return (
    <div className="text-center py-8">
      <div className="text-red-400 mb-4">Error: {error}</div>
      <button 
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  );

  function pick(side: "left" | "right") {
    if (!currentPair) return;
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
              src={currentPair.left?.posterUrl || currentPair.left?.backdropUrl || "/placeholder-poster.jpg"}
              alt={currentPair.left?.title || "Movie"}
              className="w-full h-[520px] object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder-poster.jpg";
              }}
            />
            <div className="p-3 text-center">
              <div className="font-medium">{currentPair.left?.title || "Unknown"}</div>
              <div className="text-xs opacity-70">{currentPair.left?.releaseDate?.slice(0,4) || ""}</div>
            </div>
          </button>

          <button
            className="rounded-2xl overflow-hidden bg-black/20 shadow hover:shadow-lg ring-2 ring-transparent hover:ring-cyan-400 transition"
            onClick={() => pick("right")}
            data-testid="button-pick-right"
          >
            <img
              src={currentPair.right?.posterUrl || currentPair.right?.backdropUrl || "/placeholder-poster.jpg"}
              alt={currentPair.right?.title || "Movie"}
              className="w-full h-[520px] object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder-poster.jpg";
              }}
            />
            <div className="p-3 text-center">
              <div className="font-medium">{currentPair.right?.title || "Unknown"}</div>
              <div className="text-xs opacity-70">{currentPair.right?.releaseDate?.slice(0,4) || ""}</div>
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

      {/* Debug info */}
      {!currentPair && !loading && (
        <div className="text-center py-8">
          <div className="text-red-400">No pairs available. Check server logs.</div>
          <button 
            onClick={reset}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}