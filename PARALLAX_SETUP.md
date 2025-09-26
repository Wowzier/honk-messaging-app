Parallax Canvas integration

What I added

- `src/components/ParallaxCanvas.tsx` (client component) — adapts the original vanilla JS canvas parallax demo to a React client component with resize handling, animation loop cleanup, and a speed control.
- `src/components/ParallaxCanvas.module.css` — component styles adapted from the demo's `style.css`.
- `src/app/postcard/page.tsx` — now renders `<ParallaxCanvas />` as a fixed background layer.

Required assets

Copy the images from `parralax-code-from-js/layers/` into your Next.js `public` folder under `public/parallax/` so they are available at runtime.

From PowerShell (run in project root `honk`):

```
mkdir -Force public\parallax; Copy-Item -Path .\parralax-code-from-js\layers\* -Destination .\public\parallax\
```

Or manually copy the files:
- `Grass.png`
- `Ground.png`
- `HugeTree.png`
- `TheTreeBehind1.png`
- `TheTreeBehind2.png`

Notes

- The component expects images at `/parallax/<name>.png`. If you prefer a different path, pass a `layers` prop to `ParallaxCanvas` with the `src` values you want.
- The component is a client component (`"use client"`) and must be used only inside client contexts (pages/components that render on the client). It's already imported into `src/app/postcard/page.tsx` which is a client page.
- Edge cases handled: images not loaded (waits briefly and retries), window resize (resets layers), component unmount cancels animation frame.

Testing

1. Ensure images are in `public/parallax/`.
2. Run your dev server (from `honk` directory):

```
# if you use npm
npm run dev

# or pnpm
pnpm dev
```

3. Open `http://localhost:3000/postcard` and you should see the parallax canvas animating in the background. Use the range slider to change speed.

If something doesn't work, check browser console for errors (missing image 404s will prevent some layout until images are available).