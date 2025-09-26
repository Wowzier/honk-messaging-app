# Parallax Canvas Demo

This small demo implements a parallax-scrolling background on an HTML5 canvas using the image files in the `layers/` folder:

- `Grass.png` (foreground)
- `Ground.png`
- `HugeTree.png`
- `TheTreeBehind1.png`
- `TheTreeBehind2.png` (farthest background)

How it works
- `index.html` contains a `canvas#myCanvas`, a speed slider, and hidden `<img>` tags that preload the layers.
- `script.js` defines a `Layer` class with `update()` and `draw()` methods and animates a pair of copies per layer for seamless horizontal scrolling.
- `style.css` contains layout and sizing rules.

Quick start
1. Open `c:/Users/minic/Downloads/parralax/index.html` in a browser (double-click or use a local server for best results).
2. Use the "Global Speed" slider to change the scrolling speed.

Notes and edge cases
- Images must be available in `layers/` and have reasonable widths; the demo draws images at their natural sizes.
- If you resize the window, the canvas will adjust its drawing buffer size, but images are not rescaled in this simple demo. For best results use images that match the canvas height.
- If you see gaps when scrolling, try using image widths divisible by the move speed, or set the slider so speed is a factor of the width — the implementation also attempts to avoid gaps by recomputing reset positions.

Next steps (optional)
- Scale layers to fit canvas width and height while preserving aspect ratio.
- Add a player sprite and move camera to show parallax with character movement.
- Implement horizontal panning with keyboard input.
