
import React, { useState, useEffect } from 'react';

interface DataBannerProps {
  totalMovies?: number;
  currentPhase?: string;
}

export default function DataBanner({ totalMovies = 0, currentPhase = "Loading" }: DataBannerProps) {
  const [total, setTotal] = useState<number>(totalMovies);

  useEffect(() => {
    setTotal(totalMovies);
  }, [totalMovies]);

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-50">
      <div>Phase: {currentPhase}</div>
      <div>Movies: {total}</div>
    </div>
  );
}
