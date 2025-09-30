'use client';

import React from 'react';
import { BACKGROUND_SETS, BackgroundSet } from '@/lib/backgroundSets';

interface BackgroundSwitcherProps {
  currentBackground: BackgroundSet;
  onBackgroundChange: (background: BackgroundSet) => void;
  className?: string;
}

export default function BackgroundSwitcher({ 
  currentBackground, 
  onBackgroundChange, 
  className = "" 
}: BackgroundSwitcherProps) {
  const handlePrevious = () => {
    const currentIndex = BACKGROUND_SETS.findIndex(set => set.id === currentBackground.id);
    const prevIndex = currentIndex === 0 ? BACKGROUND_SETS.length - 1 : currentIndex - 1;
    onBackgroundChange(BACKGROUND_SETS[prevIndex]);
  };

  const handleNext = () => {
    const currentIndex = BACKGROUND_SETS.findIndex(set => set.id === currentBackground.id);
    const nextIndex = (currentIndex + 1) % BACKGROUND_SETS.length;
    onBackgroundChange(BACKGROUND_SETS[nextIndex]);
  };

  return (
    <div className={`flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-lg p-3 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        className="bg-white/10 hover:bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        title="Previous Background"
      >
        ←
      </button>
      
      {/* Current Background Info */}
      <div className="text-white text-center min-w-[120px]">
        <div className="text-sm font-medium">{currentBackground.name}</div>
        <div className="text-xs opacity-70">
          {BACKGROUND_SETS.findIndex(set => set.id === currentBackground.id) + 1} / {BACKGROUND_SETS.length}
        </div>
      </div>
      
      {/* Next Button */}
      <button
        onClick={handleNext}
        className="bg-white/10 hover:bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        title="Next Background"
      >
        →
      </button>
    </div>
  );
}