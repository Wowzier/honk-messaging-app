'use client';

import React, { useState, useEffect } from 'react';
import ParallaxCanvas from '@/components/ParallaxCanvas';
import Character, { CharacterAnimations } from '@/components/Character';
import BackgroundSwitcher from '@/components/BackgroundSwitcher';
import { usePlatformGame } from '@/hooks/usePlatformGame';
import { BACKGROUND_SETS, BackgroundSet } from '@/lib/backgroundSets';

// Character position and animation settings
const CHARACTER_CONFIG = {
  x: 600,        // Horizontal position (center of screen)
  // yOffset now comes from currentBackground.characterSettings.yOffset
  scale: 2,      // Character size
  facingRight: true,
};

// Character animations using your walk.png sprite sheet (4 frames, 64px frame distance)
const CHARACTER_ANIMATIONS: CharacterAnimations = {
  idle: {
    src: "/sprites/characters/walk.png", // Using your walk sprite sheet
    frameWidth: 64, // Frame distance from your sprite editor
    frameHeight: 64, // Assuming square frames based on your character
    totalFrames: 4, // Test: Use all 4 frames for idle too to see if animation works
    fps: 6, // Slower for idle
    loop: true,
  },
  walking: {
    src: "/sprites/characters/walk.png", // Your walking sprite sheet
    frameWidth: 64, // Frame distance: 64px from your settings
    frameHeight: 64, // Height to match your character proportions
    totalFrames: 4, // 4 frames as specified in your sprite editor
    fps: 6, // FPS: 6 from your settings
    loop: true,
  },
};

export default function PlatformPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<BackgroundSet>(BACKGROUND_SETS[0]); // Start with nature_5
  
  const { gameState, getCurrentAnimation } = usePlatformGame({
    moveSpeed: 6,
    jumpForce: 18,
    gravity: 0.9,
    groundLevel: 120, // Adjust based on your background
    characterWidth: 64,
    characterHeight: 64,
  });

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-blue-400 to-green-400">
        {/* Background parallax layers */}
        <div className="absolute inset-0 z-0">
          <ParallaxCanvas 
            key={`loading-background-${currentBackground.id}`}
            layers={currentBackground.background} 
          />
        </div>
        {/* Foreground parallax layers */}
        {currentBackground.foreground && (
          <div className="absolute inset-0 z-20">
            <ParallaxCanvas 
              key={`loading-foreground-${currentBackground.id}`}
              layers={currentBackground.foreground} 
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-blue-400 to-green-400">
      {/* Background Switcher UI */}
      <div className="absolute top-4 left-4 z-30">
        <BackgroundSwitcher 
          currentBackground={currentBackground}
          onBackgroundChange={setCurrentBackground}
        />
      </div>

      {/* Character Settings Display */}
      <div className="absolute top-4 right-4 z-30 bg-black/20 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
        <div className="font-medium mb-1">Duck Settings:</div>
        <div>Z-Index: {currentBackground.characterSettings.zIndex}</div>
        <div>Y-Offset: {currentBackground.characterSettings.yOffset}</div>
      </div>
      
      {/* Background parallax layers - behind character */}
      <div className="absolute inset-0 z-0">
        <ParallaxCanvas 
          key={`background-${currentBackground.id}`}
          layers={currentBackground.background} 
        />
      </div>
      
      {/* Animated character - always playing walking animation */}
      <Character
        animations={CHARACTER_ANIMATIONS}
        currentAnimation="walking"
        x={CHARACTER_CONFIG.x}
        y={gameState.character.y + currentBackground.characterSettings.yOffset}
        facingRight={CHARACTER_CONFIG.facingRight}
        scale={CHARACTER_CONFIG.scale}
        style={{ 
          zIndex: currentBackground.characterSettings.zIndex 
        }}
      />
      
      {/* Foreground parallax layers - in front of character */}
      {currentBackground.foreground && (
        <div className="absolute inset-0 z-20">
          <ParallaxCanvas 
            key={`foreground-${currentBackground.id}`}
            layers={currentBackground.foreground} 
          />
        </div>
      )}
    </div>
  );
}
