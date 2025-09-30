# Sprite Assets

This folder contains sprite sheets for character animations in the platform game.

## Folder Structure

- `characters/` - Character sprite sheets
  - Place your character animation files here
  - Examples: `hero-idle.png`, `hero-walk.png`, `hero-jump.png`

## Adding New Sprites

1. **Prepare your sprite sheet**: Make sure it's a PNG with consistent frame sizes
2. **Upload to the appropriate folder**: Place character sprites in `characters/`
3. **Update the game code**: Modify the `CHARACTER_ANIMATIONS` object in `/app/platform/page.tsx`

## Recommended Sprite Sheet Format

- **File Format**: PNG with transparency
- **Frame Layout**: Left-to-right, top-to-bottom grid
- **Frame Size**: 64x64 pixels (or consistent size)
- **Naming Convention**: `[character]-[animation].png` (e.g., `hero-walk.png`)

## Example Files

Currently using the existing `/nature_5/duck.png` as a placeholder. Replace with your own sprite sheets:

- `hero-idle.png` - Idle/breathing animation
- `hero-walk.png` - Walking/running animation  
- `hero-jump.png` - Jumping animation

See `SPRITE_SHEET_GUIDE.md` in the root folder for detailed instructions.