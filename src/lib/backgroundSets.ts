// ============================================================================
// PARALLAX BACKGROUND SYSTEM CONFIGURATION
// ============================================================================

export interface ParallaxLayer {
  src: string;          // Image path (relative to /public)
  speed: number;        // Parallax speed (0.1 = slow/far, 1.0 = fast/close)
  yOffset: number;      // Vertical positioning offset
  alt: string;          // Alt text for accessibility
  scaleToFit?: boolean; // Whether to scale image to fit screen
}

export interface CharacterSettings {
  zIndex: number;       // Layer depth (higher = more in front)
  yOffset: number;      // Vertical position offset from game physics
}

export interface BackgroundSet {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  background: ParallaxLayer[];   // Layers behind character
  foreground?: ParallaxLayer[];  // Layers in front of character  
  characterSettings: CharacterSettings; // Duck positioning
}

// ============================================================================
// FOREST LAYER GENERATOR
// ============================================================================
// Automatically creates forest background layers from Plan-X.png files
// Higher plan numbers = deeper layers (slower parallax)

function createForestLayers(backgroundNumber: number): { background: ParallaxLayer[], foreground: ParallaxLayer[] } {
  const basePath = `/forest/background ${backgroundNumber}`;
  
  // Background 1 has 5 plans, others have 6
  const maxPlans = backgroundNumber === 1 ? 5 : 6;
  
  const background: ParallaxLayer[] = [];
  const foreground: ParallaxLayer[] = [];
  
  // Process plans from highest to lowest number
  for (let plan = maxPlans; plan >= 1; plan--) {
    const layer: ParallaxLayer = {
      src: `${basePath}/Plan-${plan}.png`,
      speed: 0.1 + (plan * 0.1), // Higher plan = slower (deeper)
      yOffset: plan === maxPlans ? 0 : (maxPlans - plan) * -10,
      alt: `Forest ${backgroundNumber} Plan ${plan}`,
      scaleToFit: plan === maxPlans, // Scale deepest layer to fit
    };
    
    // Layer distribution:
    // Plans 4-6: Background (behind character)
    // Plans 1-3: Foreground (in front of character)
    if (plan >= 4) {
      background.push(layer);
    } else {
      foreground.push(layer);
    }
  }
  
  return { background, foreground };
}

// ============================================================================
// BACKGROUND SETS CONFIGURATION
// ============================================================================
// Customize parallax layers, character positioning, and more for each scene

export const BACKGROUND_SETS: BackgroundSet[] = [
  
  // ========================================
  // NATURE VALLEY (Original)
  // ========================================
  {
    id: "nature_5",
    name: "Nature Valley",
    
    // Background Layers (Behind Character)
    background: [
      { 
        src: "/nature_5/sky.png", 
        speed: 0.2,           // Slow (far away)
        yOffset: 0,           // No vertical offset
        alt: "Sky", 
        scaleToFit: true      // Fill screen
      },
      { 
        src: "/nature_5/clouds.png", 
        speed: 0.4,           // Medium speed
        yOffset: 10,          // Slightly up
        alt: "Clouds" 
      },
      { 
        src: "/nature_5/grass.png", 
        speed: 0.3,           // Medium-slow
        yOffset: -20,         // Slightly down
        alt: "Grass" 
      },
    ],
    
    // Foreground Layers (In Front of Character)
    foreground: [
      { 
        src: "/nature_5/grass-and-trees.png", 
        speed: 0.8,           // Fast (close to camera)
        yOffset: -60,         // Lower positioning
        alt: "Grass and Trees" 
      },
    ],
    
    // Character Settings
    characterSettings: {
      zIndex: 10,             // Between background and foreground
      yOffset: 25,            // Original duck height
    },
  },

  // ========================================
  // FOREST SCENE 1 (5 Plans)
  // ========================================
  {
    id: "forest_1",
    name: "Forest Scene 1",
    ...createForestLayers(1),
    
    // Character Settings
    characterSettings: {
      zIndex: 15,             // Slightly in front
      yOffset: 40,            // Higher position
    },
  },

  // ========================================
  // FOREST SCENE 2 (6 Plans)
  // ========================================
  {
    id: "forest_2", 
    name: "Forest Scene 2",
    ...createForestLayers(2),
    
    // Character Settings  
    characterSettings: {
      zIndex: 8,              // Behind some foreground elements
      yOffset: 10,            // Lower position
    },
  },

  // ========================================
  // FOREST SCENE 3 (6 Plans)
  // ========================================
  {
    id: "forest_3",
    name: "Forest Scene 3", 
    ...createForestLayers(3),
    
    // Character Settings
    characterSettings: {
      zIndex: 12,             // Middle positioning
      yOffset: 60,            // Higher up in scene
    },
  },

  // ========================================
  // FOREST SCENE 4 (6 Plans)  
  // ========================================
  {
    id: "forest_4",
    name: "Forest Scene 4",
    ...createForestLayers(4),
    
    // Character Settings
    characterSettings: {
      zIndex: 18,             // Very much in front
      yOffset: -10,           // Lower, grounded position
    },
  },

  // ========================================
  // ADD MORE BACKGROUNDS HERE
  // ========================================
  // Copy the structure above to add new backgrounds
  // {
  //   id: "custom_background",
  //   name: "My Custom Scene",
  //   background: [
  //     { src: "/path/to/layer.png", speed: 0.3, yOffset: 0, alt: "Layer" }
  //   ],
  //   foreground: [],
  //   characterSettings: { zIndex: 10, yOffset: 25 }
  // },
];

// ============================================================================
// CUSTOMIZATION GUIDE
// ============================================================================
/*
  PARALLAX SPEEDS:
  - 0.1 - 0.3: Far background (sky, mountains)
  - 0.4 - 0.6: Mid background (clouds, distant objects)  
  - 0.7 - 0.9: Near background (close objects)
  - 1.0+: Foreground (very close objects)

  Y-OFFSETS:
  - Positive values: Move layer UP
  - Negative values: Move layer DOWN
  - 0: No vertical adjustment

  CHARACTER Z-INDEX:
  - 1-5: Behind most layers
  - 6-10: Behind foreground, in front of most background
  - 11-15: In front of most layers  
  - 16-20: In front of all layers

  CHARACTER Y-OFFSET:
  - Positive values: Duck higher up
  - Negative values: Duck lower down
  - 0: Use default physics position
*/

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get a background set by ID
export function getBackgroundSet(id: string): BackgroundSet | undefined {
  return BACKGROUND_SETS.find(set => set.id === id);
}

// Get the next background set (for cycling forward)
export function getNextBackgroundSet(currentId: string): BackgroundSet {
  const currentIndex = BACKGROUND_SETS.findIndex(set => set.id === currentId);
  const nextIndex = (currentIndex + 1) % BACKGROUND_SETS.length;
  return BACKGROUND_SETS[nextIndex];
}

// Get the previous background set (for cycling backward)
export function getPreviousBackgroundSet(currentId: string): BackgroundSet {
  const currentIndex = BACKGROUND_SETS.findIndex(set => set.id === currentId);
  const prevIndex = currentIndex === 0 ? BACKGROUND_SETS.length - 1 : currentIndex - 1;
  return BACKGROUND_SETS[prevIndex];
}

// ============================================================================
// EASY LAYER CREATION HELPERS
// ============================================================================

// Create a simple background layer
export function createBackgroundLayer(
  src: string, 
  speed: number = 0.3, 
  yOffset: number = 0,
  alt: string = "Background Layer"
): ParallaxLayer {
  return { src, speed, yOffset, alt };
}

// Create a sky layer (scaled to fit)
export function createSkyLayer(
  src: string,
  speed: number = 0.2,
  alt: string = "Sky"
): ParallaxLayer {
  return { src, speed, yOffset: 0, alt, scaleToFit: true };
}

// Create a foreground layer
export function createForegroundLayer(
  src: string,
  speed: number = 0.8,
  yOffset: number = -60,
  alt: string = "Foreground"
): ParallaxLayer {
  return { src, speed, yOffset, alt };
}