'use client';

import React, { useRef, useEffect } from 'react';
import SpriteSheet, { SpriteSheetRef } from './SpriteSheet';

export interface CharacterAnimation {
  /** Path to the sprite sheet for this animation */
  src: string;
  /** Width of each frame */
  frameWidth: number;
  /** Height of each frame */
  frameHeight: number;
  /** Total number of frames in this animation */
  totalFrames: number;
  /** Frames per second */
  fps?: number;
  /** Whether this animation should loop */
  loop?: boolean;
}

export interface CharacterAnimations {
  idle: CharacterAnimation;
  walking?: CharacterAnimation;
  running?: CharacterAnimation;
  jumping?: CharacterAnimation;
  [key: string]: CharacterAnimation | undefined;
}

export interface CharacterProps {
  /** Animation configurations for different states */
  animations: CharacterAnimations;
  /** Current animation state */
  currentAnimation: string;
  /** Scale factor for the character */
  scale?: number;
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Whether character is facing right (true) or left (false) */
  facingRight?: boolean;
  /** CSS class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Callback when animation state changes */
  onAnimationChange?: (animation: string) => void;
  /** Callback when animation completes (for non-looping animations) */
  onAnimationComplete?: (animation: string) => void;
}

export interface CharacterRef {
  setAnimation: (animation: string) => void;
  getCurrentAnimation: () => string;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

const Character = React.forwardRef<CharacterRef, CharacterProps>(
  (
    {
      animations,
      currentAnimation,
      scale = 1,
      x = 0,
      y = 0,
      facingRight = true,
      className,
      style,
      onAnimationChange,
      onAnimationComplete,
    },
    ref
  ) => {
    const spriteSheetRef = useRef<SpriteSheetRef>(null);
    const currentAnimationRef = useRef(currentAnimation);

  // Update animation when it changes
  useEffect(() => {
    if (currentAnimationRef.current !== currentAnimation) {
      currentAnimationRef.current = currentAnimation;
      onAnimationChange?.(currentAnimation);
    }
  }, [currentAnimation, onAnimationChange]);    // Get current animation config
    const animationConfig = animations[currentAnimation] || animations.idle;

    // Handle animation complete
    const handleAnimationComplete = () => {
      onAnimationComplete?.(currentAnimation);
    };

    // Expose control methods
    React.useImperativeHandle(ref, () => ({
      setAnimation: (animation: string) => {
        if (animations[animation]) {
          currentAnimationRef.current = animation;
        }
      },
      getCurrentAnimation: () => currentAnimationRef.current,
      play: () => spriteSheetRef.current?.play(),
      pause: () => spriteSheetRef.current?.pause(),
      stop: () => spriteSheetRef.current?.stop(),
    }));

    return (
      <div
        className={className}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: facingRight ? 'none' : 'scaleX(-1)',
          transformOrigin: 'center',
          pointerEvents: 'none',
          ...style,
        }}
      >
        <SpriteSheet
          ref={spriteSheetRef}
          src={animationConfig.src}
          frameWidth={animationConfig.frameWidth}
          frameHeight={animationConfig.frameHeight}
          totalFrames={animationConfig.totalFrames}
          fps={animationConfig.fps || 12}
          loop={animationConfig.loop !== false} // Default to true
          autoPlay={true} // Always auto-play
          scale={scale}
          onAnimationComplete={handleAnimationComplete}
        />
      </div>
    );
  }
);

Character.displayName = 'Character';

export default Character;