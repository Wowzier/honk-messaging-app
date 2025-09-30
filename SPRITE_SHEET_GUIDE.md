# Sprite Sheet System Documentation

## Overview
The platform game now includes a comprehensive sprite sheet animation system with the following components:

- **SpriteSheet**: Core component for rendering animated sprite sheets
- **Character**: Higher-level component for managing character animations and states
- **usePlatformGame**: Hook for platform game logic including movement, jumping, and collision detection

## Adding Your Own Sprite Sheets

### 1. Prepare Your Sprite Sheets

Place your sprite sheet images in the `/public/sprites/characters/` folder. Your sprite sheets should be organized as a grid of frames, like this:

```
Frame 1  Frame 2  Frame 3  Frame 4
Frame 5  Frame 6  Frame 7  Frame 8
...
```

### 2. Update Character Animations

In `/app/platform/page.tsx`, update the `CHARACTER_ANIMATIONS` object:

```typescript
const CHARACTER_ANIMATIONS: CharacterAnimations = {
  idle: {
    src: "/sprites/characters/your-character-idle.png",
    frameWidth: 64,    // Width of each frame in pixels
    frameHeight: 64,   // Height of each frame in pixels
    totalFrames: 4,    // Total number of frames in the sprite sheet
    fps: 2,           // Frames per second (slow for idle)
    loop: true,       // Should the animation loop?
  },
  walking: {
    src: "/sprites/characters/your-character-walk.png",
    frameWidth: 64,
    frameHeight: 64,
    totalFrames: 8,   // Walking animation with 8 frames
    fps: 12,          // Faster for smooth walking
    loop: true,
  },
  jumping: {
    src: "/sprites/characters/your-character-jump.png",
    frameWidth: 64,
    frameHeight: 64,
    totalFrames: 6,   // Jump sequence
    fps: 10,
    loop: false,      // Don't loop jump animation
  },
};
```

### 3. Animation States

The system automatically switches between animations based on character state:

- **idle**: When the character is not moving and on the ground
- **walking**: When the character is moving horizontally
- **jumping**: When the character is in the air

### 4. Sprite Sheet Specifications

For best results, ensure your sprite sheets follow these guidelines:

- **Format**: PNG with transparency
- **Frame Size**: Consistent width and height for all frames
- **Layout**: Frames arranged left-to-right, top-to-bottom
- **Naming**: Use descriptive names (e.g., `hero-idle.png`, `hero-walk.png`)

### 5. Example Sprite Sheet Layouts

#### Idle Animation (4 frames)
```
[Frame 1] [Frame 2] [Frame 3] [Frame 4]
```

#### Walking Animation (8 frames, 2 rows)
```
[Frame 1] [Frame 2] [Frame 3] [Frame 4]
[Frame 5] [Frame 6] [Frame 7] [Frame 8]  
```

## Game Controls

- **Move Left/Right**: Arrow Keys or A/D
- **Jump**: Space bar, W key, or Up Arrow
- **Character automatically faces the direction of movement**

## Configuration Options

### Platform Game Settings

You can customize the game physics in `usePlatformGame`:

```typescript
const { gameState, getCurrentAnimation } = usePlatformGame({
  moveSpeed: 6,        // Character movement speed
  jumpForce: 18,       // How high the character jumps
  gravity: 0.9,        // Gravity strength
  groundLevel: 120,    // Distance from bottom of screen
  characterWidth: 64,  // Character collision width
  characterHeight: 64, // Character collision height
});
```

### Character Display Settings

Customize character appearance:

```typescript
<Character
  animations={CHARACTER_ANIMATIONS}
  currentAnimation={getCurrentAnimation()}
  x={gameState.character.x}
  y={gameState.character.y}
  facingRight={gameState.character.facingRight}
  scale={2}           // Make character bigger/smaller
  className="z-10"    // CSS classes
/>
```

## Advanced Usage

### Custom Animation Control

You can create custom animation sequences by using the `SpriteSheet` component directly:

```typescript
import SpriteSheet from '@/components/SpriteSheet';

<SpriteSheet
  src="/sprites/custom-animation.png"
  frameWidth={128}
  frameHeight={128}
  totalFrames={12}
  fps={24}
  loop={true}
  scale={1.5}
  onAnimationComplete={() => console.log('Animation finished!')}
/>
```

### Adding New Animation States

To add new animation states (like `running`, `attacking`, etc.):

1. Add the animation to your `CharacterAnimations` object
2. Update the `getCurrentAnimation()` logic in `usePlatformGame`
3. Add the corresponding sprite sheet file

## File Structure

```
public/
  sprites/
    characters/
      hero-idle.png      # Your idle animation sprite sheet
      hero-walk.png      # Your walking animation sprite sheet  
      hero-jump.png      # Your jumping animation sprite sheet
      # Add more character sprite sheets here

src/
  components/
    SpriteSheet.tsx      # Core sprite sheet component
    Character.tsx        # Character animation manager
  hooks/
    usePlatformGame.ts   # Platform game logic
```

## Tips for Best Results

1. **Consistent Frame Timing**: Use consistent frame durations for smooth animation
2. **Power-of-2 Dimensions**: Use frame sizes like 32x32, 64x64, 128x128 for better performance
3. **Minimal File Size**: Optimize your PNG files to reduce loading times
4. **Animation Loops**: Make sure looping animations connect smoothly from last frame to first frame
5. **Character Registration**: Test your character positioning by adjusting the `groundLevel` and `scale` values

## Troubleshooting

### Animation Not Playing
- Check that the sprite sheet path is correct
- Verify `totalFrames` matches the actual number of frames in your sprite sheet
- Ensure the sprite sheet file is accessible in the `/public` folder

### Character Positioning Issues
- Adjust `groundLevel` in the game configuration
- Modify `characterWidth` and `characterHeight` for collision detection
- Use the `scale` prop to resize the character

### Performance Issues
- Reduce sprite sheet file sizes
- Lower the `fps` value for less critical animations
- Use smaller frame dimensions if possible