import { useState, useEffect, useCallback } from "react";

export type ABPair = {
  left: {
    id: number;
    title: string;
    overview: string;
    genres: number[];
    releaseDate: string | null;
    popularity: number;
    voteAverage: number;
    voteCount: number;
    posterUrl: string | null;
    backdropUrl: string | null;
  };
  right: {
    id: number;
    title: string;
    overview: string;
    genres: number[];
    releaseDate: string | null;
    popularity: number;
    voteAverage: number;
    voteCount: number;
    posterUrl: string | null;
    backdropUrl: string | null;
  };
};

export type Vote = {
  winnerId: number;
  loserId: number;
};

export type Recommendation = {
  movies: Array<{
    id: number;
    title: string;
    overview: string;
    genres: number[];
    releaseDate: string | null;
    popularity: number;
    voteAverage: number;
    voteCount: number;
    posterUrl: string | null;
    backdropUrl: string | null;
  }>;
  trailers: Record<number, string | null>;
  explanation: {
    topGenres: Array<{ id: number; name: string; count: number }>;
    topActors: Array<{ id: number; name: string; count: number }>;
    topDirectors: Array<{ id: number; name: string; count: number }>;
    topEra: { bucket: string; count: number } | null;
  };
};

export function useStatelessAB() {
  const [pairs, setPairs] = useState<ABPair[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  
  const isComplete = votes.length >= 12;
  const currentPair = pairs[currentPairIndex] || null;
  const progress = {
    current: votes.length,
    total: 12
  };

  // Fetch initial A/B pairs
  useEffect(() => {
    let cancelled = false;
    
    const fetchPairs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/ab/round');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        if (cancelled) return;
        
        setPairs(data.pairs || []);
        setCurrentPairIndex(0);
        setVotes([]);
        setRecommendations(null);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchPairs();
    
    return () => { cancelled = true; };
  }, []);

  // Make a choice between left and right
  const choose = useCallback((side: "left" | "right") => {
    if (!currentPair) return null;
    
    const winner = currentPair[side];
    const loser = currentPair[side === "left" ? "right" : "left"];
    
    const newVote: Vote = {
      winnerId: winner.id,
      loserId: loser.id
    };
    
    const newVotes = [...votes, newVote];
    setVotes(newVotes);
    
    // Move to next pair
    setCurrentPairIndex(prev => prev + 1);
    
    return {
      chosen: winner,
      other: loser
    };
  }, [currentPair, votes]);

  // Score the round and get recommendations
  const scoreRound = useCallback(async () => {
    if (votes.length !== 12) {
      setError("Need exactly 12 votes to score");
      return;
    }
    
    try {
      setIsScoring(true);
      setError(null);
      
      // Get all movie IDs that were used in A/B testing
      const excludeIds = pairs.flatMap(pair => [pair.left.id, pair.right.id]);
      
      const response = await fetch('/api/score-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          votes,
          excludeIds
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      setRecommendations(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsScoring(false);
    }
  }, [votes, pairs]);

  // Auto-score when we have 12 votes
  useEffect(() => {
    if (votes.length === 12 && !recommendations && !isScoring) {
      scoreRound();
    }
  }, [votes.length, recommendations, isScoring, scoreRound]);

  // Reset everything for a new round
  const reset = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRecommendations(null);
    setVotes([]);
    setCurrentPairIndex(0);
    
    try {
      const response = await fetch('/api/ab/round');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      setPairs(data.pairs || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // A/B Testing state
    currentPair,
    progress,
    isComplete,
    loading,
    error,
    
    // Actions
    choose,
    reset,
    
    // Results
    recommendations,
    isScoring
  };
}