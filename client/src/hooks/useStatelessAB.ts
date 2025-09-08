
import { useState, useEffect, useCallback } from 'react';

export type Movie = {
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
  sourceListId: string;
};

export type ABPair = {
  left: Movie;
  right: Movie;
};

export type Vote = {
  winnerId: number;
  loserId: number;
};

export type Recommendation = {
  movies: Movie[];
  trailers: Record<number, string | null>;
  explanation: string;
};

export function useStatelessAB() {
  const [pairs, setPairs] = useState<ABPair[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
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
        
        console.log('Fetching A/B pairs from /api/ab/round...');
        const response = await fetch('/api/ab/round', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          console.error('A/B round response not OK:', response.status, response.statusText);
          const text = await response.text();
          console.error('Response body:', text.substring(0, 200));
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Expected JSON but got:', contentType, text.substring(0, 200));
          throw new Error(`Server returned HTML instead of JSON. Check server logs.`);
        }
        
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError);
          const text = await response.text();
          console.error('Invalid JSON response:', text.substring(0, 500));
          throw new Error('Server returned invalid JSON. Check server logs.');
        }
        console.log('A/B pairs response:', data);
        
        if (cancelled) return;
        
        if (!data.ok) {
          throw new Error(data.error || 'API returned error');
        }
        
        if (!Array.isArray(data.pairs) || data.pairs.length === 0) {
          throw new Error('No pairs received from API');
        }
        
        setPairs(data.pairs);
        setCurrentPairIndex(0);
        setVotes([]);
        setRecommendations(null);
        setIsScoring(false);
        setInitialized(true);
      } catch (err: any) {
        console.error('Failed to fetch A/B pairs:', err);
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

  // Process scoring when we have 12 votes
  useEffect(() => {
    if (votes.length === 12 && !isScoring && !recommendations) {
      let cancelled = false;
      
      const processScoring = async () => {
        try {
          setIsScoring(true);
          
          const excludeIds = votes.flatMap(v => [v.winnerId, v.loserId]);
          
          console.log('Submitting votes for scoring:', votes);
          const response = await fetch('/api/score-round', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              votes,
              excludeIds
            })
          });
          
          if (!response.ok) {
            const text = await response.text();
            console.error('Score round response not OK:', response.status, text.substring(0, 200));
            throw new Error(`Scoring failed: ${response.status}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Expected JSON but got:', contentType, text.substring(0, 200));
            throw new Error(`Scoring API returned HTML instead of JSON. Check server logs.`);
          }
          
          let data;
          try {
            data = await response.json();
          } catch (parseError) {
            console.error('Failed to parse scoring JSON:', parseError);
            const text = await response.text();
            console.error('Invalid scoring response:', text.substring(0, 500));
            throw new Error('Scoring API returned invalid JSON. Check server logs.');
          }
          console.log('Scoring response:', data);
          
          if (cancelled) return;
          
          if (!data.ok) {
            throw new Error(data.error || 'Scoring failed');
          }
          
          setRecommendations({
            movies: data.movies || [],
            trailers: data.trailers || {},
            explanation: data.explanation || 'Based on your preferences'
          });
        } catch (err: any) {
          console.error('Scoring failed:', err);
          if (!cancelled) {
            setError(`Scoring failed: ${err.message}`);
          }
        } finally {
          if (!cancelled) {
            setIsScoring(false);
          }
        }
      };
      
      processScoring();
      
      return () => { cancelled = true; };
    }
  }, [votes.length, isScoring, recommendations]);

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

  // Reset everything for a new round
  const reset = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRecommendations(null);
    setVotes([]);
    setCurrentPairIndex(0);
    setIsScoring(false);
    
    try {
      console.log('Resetting - fetching new A/B pairs...');
      const response = await fetch('/api/ab/round', {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Reset A/B round response not OK:', response.status, text.substring(0, 200));
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 200));
        throw new Error(`Expected JSON response but got ${contentType}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Reset JSON parse failed:', parseError);
        const text = await response.text();
        console.error('Invalid reset response:', text.substring(0, 500));
        throw new Error('Reset API returned invalid JSON. Check server logs.');
      }
      console.log('Reset A/B pairs response:', data);
      
      if (!data.ok) {
        throw new Error(data.error || 'API returned error');
      }
      
      if (!Array.isArray(data.pairs) || data.pairs.length === 0) {
        throw new Error('No pairs received from reset API');
      }
      
      setPairs(data.pairs);
      setCurrentPairIndex(0);
    } catch (err: any) {
      console.error('Reset failed:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Return null if not properly initialized to prevent hook errors
  if (!initialized && !loading && !error) {
    return null;
  }

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
