'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface SpriteSheetProps {
  /** Path to the sprite sheet image */
  src: string;
  /** Width of each frame in pixels */
  frameWidth: number;
  /** Height of each frame in pixels */
  frameHeight: number;
  /** Number of frames in the sprite sheet */
  totalFrames: number;
  /** Frames per second for animation */
  fps?: number;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Whether to play the animation automatically */
  autoPlay?: boolean;
  /** Scale factor for rendering */
  scale?: number;
  /** Current animation frame (for external control) */
  currentFrame?: number;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** CSS class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

export interface SpriteSheetRef {
  play: () => void;
  pause: () => void;
  stop: () => void;
  setFrame: (frame: number) => void;
  getCurrentFrame: () => number;
}

const SpriteSheet = React.forwardRef<SpriteSheetRef, SpriteSheetProps>(
  (
    {
      src,
      frameWidth,
      frameHeight,
      totalFrames,
      fps = 12,
      loop = true,
      autoPlay = false,
      scale = 1,
      currentFrame,
      onAnimationComplete,
      className,
      style,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const animationRef = useRef<number | null>(null);
    const [frame, setFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const lastFrameTimeRef = useRef(0);

    // Use external frame control if provided, otherwise use internal frame
    const effectiveFrame = currentFrame !== undefined ? currentFrame : frame;

    // Load the sprite sheet image
    useEffect(() => {
      const image = new Image();
      image.onload = () => {
        imageRef.current = image;
        // Trigger initial render
        drawFrame(effectiveFrame);
      };
      image.src = src;

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [src]);

    // Animation loop
    useEffect(() => {
      if (!isPlaying || currentFrame !== undefined) return;

      const frameInterval = 1000 / fps; // milliseconds per frame

      const animate = (currentTime: number) => {
        if (currentTime - lastFrameTimeRef.current >= frameInterval) {
          setFrame((prevFrame) => {
            const nextFrame = prevFrame + 1;
            if (nextFrame >= totalFrames) {
              if (loop) {
                return 0;
              } else {
                setIsPlaying(false);
                onAnimationComplete?.();
                return prevFrame;
              }
            }
            return nextFrame;
          });
          lastFrameTimeRef.current = currentTime;
        }

        if (isPlaying) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isPlaying, fps, totalFrames, loop, onAnimationComplete, currentFrame]);

    // Draw current frame
    const drawFrame = (frameIndex: number) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate source position
      const framesPerRow = Math.floor(image.width / frameWidth);
      const row = Math.floor(frameIndex / framesPerRow);
      const col = frameIndex % framesPerRow;
      const sx = col * frameWidth;
      const sy = row * frameHeight;

      // Draw the frame
      ctx.drawImage(
        image,
        sx,
        sy,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth * scale,
        frameHeight * scale
      );
    };

    // Update canvas when frame changes
    useEffect(() => {
      drawFrame(effectiveFrame);
    }, [effectiveFrame, scale]);

    // Expose control methods
    React.useImperativeHandle(ref, () => ({
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      stop: () => {
        setIsPlaying(false);
        setFrame(0);
      },
      setFrame: (frameIndex: number) => {
        setFrame(Math.max(0, Math.min(frameIndex, totalFrames - 1)));
      },
      getCurrentFrame: () => effectiveFrame,
    }));

    return (
      <canvas
        ref={canvasRef}
        width={frameWidth * scale}
        height={frameHeight * scale}
        className={className}
        style={{
          imageRendering: 'pixelated', // Preserve pixel art
          ...style,
        }}
      />
    );
  }
);

SpriteSheet.displayName = 'SpriteSheet';

export default SpriteSheet;