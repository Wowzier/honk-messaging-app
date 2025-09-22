import React, { useCallback, useRef, useState } from 'react';
import StickerPeel from './StickerPeel';
import { gsap } from 'gsap';

interface StickerGroupProps {
  stickers: Array<{
    image: string;
    initialRotation?: number;
  }>;
  onDragEnd?: (x: number, y: number, index: number) => void;
}

interface StickerPosition {
  x: number;
  y: number;
}

const StickerGroup: React.FC<StickerGroupProps> = ({ stickers, onDragEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<StickerPosition[]>(
    stickers.map((_, index) => ({
      x: index * 110,
      y: 0
    }))
  );

  // Update positions when a sticker is dragged
  const updateStickerPosition = useCallback((index: number, x: number, y: number) => {
    setPositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = { x, y };
      return newPositions;
    });
  }, []);

  const handleDragStart = (index: number) => {
    // Optional: Add any drag start logic here
  };

  const handleDragEnd = (x: number, y: number, index: number) => {
    const result = onDragEnd?.(x, y, index);
    
    if (!result) {
      // If not dropped on postcard, animate back to original position
      gsap.to(`#sticker-${index}`, {
        x: index * 110,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.75)"
      });
      updateStickerPosition(index, index * 110, 0);
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        flexWrap: 'wrap',
        position: 'relative',
        minHeight: '200px'
      }}
    >
      {stickers.map((sticker, index) => (
        <div
          key={index}
          id={`sticker-${index}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${positions[index].x}px, ${positions[index].y}px)`,
            touchAction: 'none',
            willChange: 'transform'
          }}
        >
          <StickerPeel
            imageSrc={sticker.image}
            rotate={sticker.initialRotation || (Math.random() * 40 - 20)}
            width={100}
            positionMode="relative"
            shadowIntensity={0.3}
            peelBackHoverPct={20}
            peelBackActivePct={30}
            lightingIntensity={0.08}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={(x, y) => handleDragEnd(x, y, index)}
          />
        </div>
      ))}
    </div>
  );
};

export default StickerGroup;