'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PlatformCharacter {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facingRight: boolean;
  isOnGround: boolean;
  isMoving: boolean;
  width: number;
  height: number;
}

export interface PlatformGameConfig {
  /** Character movement speed */
  moveSpeed?: number;
  /** Jump force */
  jumpForce?: number;
  /** Gravity strength */
  gravity?: number;
  /** Ground level (Y position) */
  groundLevel?: number;
  /** Left boundary */
  leftBoundary?: number;
  /** Right boundary */
  rightBoundary?: number;
  /** Character dimensions */
  characterWidth?: number;
  characterHeight?: number;
}

export interface PlatformGameState {
  character: PlatformCharacter;
  keys: { [key: string]: boolean };
  isGameActive: boolean;
}

const DEFAULT_CONFIG: Required<PlatformGameConfig> = {
  moveSpeed: 5,
  jumpForce: 15,
  gravity: 0.8,
  groundLevel: 100, // Distance from bottom of screen
  leftBoundary: 0,
  rightBoundary: 1200, // Will be updated based on screen width
  characterWidth: 64,
  characterHeight: 64,
};

export function usePlatformGame(config: PlatformGameConfig = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [gameState, setGameState] = useState<PlatformGameState>(() => ({
    character: {
      x: 100,
      y: typeof window !== 'undefined' 
        ? window.innerHeight - fullConfig.groundLevel - fullConfig.characterHeight
        : 500, // Default fallback for SSR
      velocityX: 0,
      velocityY: 0,
      facingRight: true,
      isOnGround: true,
      isMoving: false,
      width: fullConfig.characterWidth,
      height: fullConfig.characterHeight,
    },
    keys: {},
    isGameActive: true,
  }));

  const gameLoopRef = useRef<number | null>(null);

  // Initialize character position on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGameState(prev => ({
        ...prev,
        character: {
          ...prev.character,
          y: window.innerHeight - fullConfig.groundLevel - fullConfig.characterHeight,
        }
      }));
      fullConfig.rightBoundary = window.innerWidth - fullConfig.characterWidth;
    }
  }, [fullConfig.groundLevel, fullConfig.characterHeight, fullConfig.characterWidth]);

  // Update boundaries when window resizes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateBoundaries = () => {
      setGameState(prev => ({
        ...prev,
        character: {
          ...prev.character,
          // Keep character in bounds
          x: Math.min(prev.character.x, window.innerWidth - fullConfig.characterWidth),
        }
      }));
      fullConfig.rightBoundary = window.innerWidth - fullConfig.characterWidth;
    };

    window.addEventListener('resize', updateBoundaries);
    updateBoundaries(); // Initial call

    return () => window.removeEventListener('resize', updateBoundaries);
  }, [fullConfig.characterWidth]);

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    setGameState(prev => ({
      ...prev,
      keys: { ...prev.keys, [event.code]: true }
    }));
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setGameState(prev => ({
      ...prev,
      keys: { ...prev.keys, [event.code]: false }
    }));
  }, []);

  // Set up keyboard listeners
  useEffect(() => {
    if (!gameState.isGameActive) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isGameActive, handleKeyDown, handleKeyUp]);

  // Game loop
  useEffect(() => {
    if (!gameState.isGameActive) return;

    const gameLoop = () => {
      setGameState(prev => {
        const newCharacter = { ...prev.character };
        const keys = prev.keys;

        // No movement controls - character stays in place
        newCharacter.velocityX = 0;
        newCharacter.isMoving = false;

        // No jumping - character stays on ground

        // Update position (only horizontal movement)
        newCharacter.x += newCharacter.velocityX;
        // Y position stays fixed on ground

        // Boundary checking
        if (newCharacter.x < fullConfig.leftBoundary) {
          newCharacter.x = fullConfig.leftBoundary;
        }
        if (newCharacter.x > fullConfig.rightBoundary) {
          newCharacter.x = fullConfig.rightBoundary;
        }

        // Keep character on ground
        if (typeof window !== 'undefined') {
          const groundY = window.innerHeight - fullConfig.groundLevel - fullConfig.characterHeight;
          newCharacter.y = groundY;
        }
        newCharacter.velocityY = 0;
        newCharacter.isOnGround = true;

        return {
          ...prev,
          character: newCharacter,
        };
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isGameActive, fullConfig]);

  // Utility functions
  const resetCharacter = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      character: {
        ...prev.character,
        x: 100,
        y: typeof window !== 'undefined' 
          ? window.innerHeight - fullConfig.groundLevel - fullConfig.characterHeight
          : 500,
        velocityX: 0,
        velocityY: 0,
        isOnGround: true,
        isMoving: false,
      }
    }));
  }, [fullConfig.groundLevel, fullConfig.characterHeight]);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isGameActive: false }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isGameActive: true }));
  }, []);

  const setCharacterPosition = useCallback((x: number, y: number) => {
    setGameState(prev => ({
      ...prev,
      character: { ...prev.character, x, y }
    }));
  }, []);

  // Determine current animation based on character state
  const getCurrentAnimation = useCallback((): string => {
    const { character } = gameState;
    
    if (character.isMoving) {
      return 'walking';
    } else {
      return 'idle';
    }
  }, [gameState]);

  return {
    gameState,
    getCurrentAnimation,
    resetCharacter,
    pauseGame,
    resumeGame,
    setCharacterPosition,
    config: fullConfig,
  };
}