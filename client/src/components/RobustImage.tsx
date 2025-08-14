import { useState, useRef } from "react";

interface RobustImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function RobustImage({
  src,
  alt,
  className = "",
  fallbackSrc,
  onLoad,
  onError,
}: RobustImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    console.log(`✓ Image loaded successfully: ${currentSrc}`);
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    console.log(`✗ Image failed to load: ${currentSrc}`);
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback if available and not already using it
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      console.log(`Trying fallback: ${fallbackSrc}`);
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      setHasError(false);
      return;
    }
    
    onError?.();
  };

  const PlaceholderSvg = () => (
    <div className={`bg-netflix-gray/20 flex items-center justify-center ${className}`}>
      <svg
        width="60"
        height="60"
        viewBox="0 0 24 24"
        fill="none"
        className="text-gray-500"
      >
        <path
          d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M8 8H8.01M3 7C3 5.343 4.343 4 6 4H18C19.657 4 21 5.343 21 7V17C21 18.657 19.657 20 18 20H6C4.343 20 3 18.657 3 17V7Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  if (hasError && (!fallbackSrc || currentSrc === fallbackSrc)) {
    return <PlaceholderSvg />;
  }

  return (
    <div className="relative">
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
      {isLoading && (
        <div className={`absolute inset-0 bg-netflix-gray/20 animate-pulse ${className}`} />
      )}
    </div>
  );
}