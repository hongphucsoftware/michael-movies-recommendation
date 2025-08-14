interface RobustImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'>
     <rect width='100%' height='100%' fill='#0f141b'/>
     <text x='50%' y='50%' fill='#6f7d92' font-size='22' font-family='Arial' text-anchor='middle'>Poster unavailable</text>
   </svg>`
);

export default function RobustImage({ 
  src, 
  alt, 
  className = '', 
  onLoad,
  onError 
}: RobustImageProps) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`✗ Image failed to load: ${src}`);
    const img = e.target as HTMLImageElement;
    if (img.src !== PLACEHOLDER) {
      img.src = PLACEHOLDER;
    }
    onError?.();
  };

  const handleLoad = () => {
    console.log(`✓ Image loaded successfully: ${src}`);
    onLoad?.();
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}