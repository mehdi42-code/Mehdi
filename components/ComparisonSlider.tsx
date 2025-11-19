import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ComparisonSliderProps {
  originalImage: string; // Data URL or URL
  generatedImage: string; // Data URL or URL
  className?: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ originalImage, generatedImage, className = "" }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  
  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : 0) - rect.left;
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(newPos);
  }, [isResizing]);

  const handleTouchMove = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : null;
    if (!touch) return;
    
    const x = touch.clientX - rect.left;
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(newPos);
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove as any);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleTouchMove]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none group cursor-ew-resize ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Base Image (Original) */}
      <img 
        src={originalImage} 
        alt="Original" 
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Overlay Image (Generated) - Clipped */}
      <div 
        className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={generatedImage} 
          alt="Generated" 
          className="absolute top-0 left-0 max-w-none h-full object-cover"
          style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }} 
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-10 flex items-center justify-center"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 -ml-[14px]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        AI RECONSTRUCTED
      </div>
      <div className="absolute top-4 right-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        ORIGINAL
      </div>
    </div>
  );
};

export default ComparisonSlider;