import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import StickerPeel from './StickerPeel';
import { gsap } from 'gsap';

interface StickerGroupProps {
  stickers: Array<{
    image: string;
    initialRotation?: number;
    width?: number;
    className?: string;
  }>;
  onDragEnd?: (x: number, y: number, index: number) => void;
  /** Horizontal spacing between palette stickers */
  spacing?: number;
}

interface StickerPosition {
  x: number;
  y: number;
}

const DEFAULT_SPACING = 130;

const StickerGroup: React.FC<StickerGroupProps> = ({ stickers, onDragEnd, spacing = DEFAULT_SPACING }) => {
  const idPrefixRef = useRef(`sticker-group-${Math.random().toString(36).slice(2, 11)}`);

  const basePositions = useMemo<StickerPosition[]>(() => {
    return stickers.map((_, index) => ({
      x: index * spacing,
      y: 0
    }));
  }, [spacing, stickers]);

  useLayoutEffect(() => {
    basePositions.forEach((position, index) => {
      const elementId = `#${idPrefixRef.current}-${index}`;
      gsap.set(elementId, { x: position.x, y: position.y });
    });
  }, [basePositions]);

  const resetSticker = useCallback(
    (index: number) => {
      const base = basePositions[index];
      if (!base) return;

      const elementId = `#${idPrefixRef.current}-${index}`;
      gsap.to(elementId, {
        x: base.x,
        y: base.y,
        duration: 0.5,
        ease: 'elastic.out(1, 0.75)'
      });
    },
    [basePositions]
  );

  const handleDragEnd = useCallback(
    (x: number, y: number, index: number) => {
      const result = onDragEnd?.(x, y, index);
      resetSticker(index);
      return result;
    },
    [onDragEnd, resetSticker]
  );

  const containerWidth = useMemo(() => {
    if (!stickers.length) return spacing;
    const widestSticker = Math.max(
      ...stickers.map(sticker => sticker.width ?? 120)
    );
    return (stickers.length - 1) * spacing + widestSticker;
  }, [spacing, stickers]);

  return (
    <div
      style={{
        position: 'relative',
        width: containerWidth,
        margin: '0 auto',
        minHeight: 160,
        touchAction: 'none'
      }}
    >
      {stickers.map((sticker, index) => (
        <div
          key={`${idPrefixRef.current}-${index}`}
          id={`${idPrefixRef.current}-${index}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            willChange: 'transform'
          }}
        >
          <StickerPeel
            imageSrc={sticker.image}
            rotate={sticker.initialRotation ?? Math.random() * 40 - 20}
            width={sticker.width ?? 110}
            positionMode="relative"
            shadowIntensity={0.3}
            peelBackHoverPct={20}
            peelBackActivePct={30}
            lightingIntensity={0.08}
            className={sticker.className}
            onDragEnd={(dragX, dragY) => handleDragEnd(dragX, dragY, index)}
          />
        </div>
      ))}
    </div>
  );
};

export default StickerGroup;