// Parallax canvas demo
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// match canvas display size (CSS) to drawing buffer for crisp rendering
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
}
window.addEventListener('resize', () => {
  resizeCanvas();
  // on resize we should recreate layers so their vertical alignment is correct
  // we'll simply restart createLayers which will wait for images to be ready.
  createLayers();
});
resizeCanvas();

// grab images from the DOM (preloaded in index.html)
const images = [
  document.getElementById('layer1'),
  document.getElementById('layer2'),
  document.getElementById('layer3'),
  document.getElementById('layer4'),
  document.getElementById('layer5'),
];

class Layer {
  constructor(image, speedModifier, y = 0) {
    this.image = image;
    this.speedModifier = speedModifier;
    this.width = image.width;
    this.height = image.height;
    // use a continuous offset that wraps with modulo to avoid gap-causing discrete resets
    this.offset = 0; // how far the layer has moved to the left
    this.y = y;
  }

  update(gameSpeed) {
    const speed = gameSpeed * this.speedModifier;
    this.offset += speed; // accumulate distance moved
    // keep offset within [0, width) to avoid large numbers
    if (this.offset >= this.width) this.offset = this.offset % this.width;
  }

  draw(ctx) {
    // Draw enough copies horizontally to cover the canvas width.
    // Use integer positions to avoid subpixel seams/cracks on some browsers
    const shift = this.offset % this.width;
    // starting x (rounded) - negative shift
    let startX = Math.round(-shift);
    // compute number of tiles needed to cover canvas (add +2 as safety buffer)
    const tiles = Math.ceil(canvas.width / this.width) + 2;
    for (let i = 0; i < tiles; i++) {
      const x = startX + i * this.width;
      // draw at integer coordinates
      ctx.drawImage(this.image, x, Math.round(this.y), this.width, this.height);
    }
  }
}

// create layer instances after images have loaded (ensure widths available)
function createLayers() {
  // If images haven't loaded yet, wait
  if (images.some(img => !img.complete || img.naturalWidth === 0)) {
    setTimeout(createLayers, 50);
    return;
  }

  // The user requested this front-to-back order:
  // 1) Ground (closest)
  // 2) Grass
  // 3) HugeTree
  // 4) TheTreeBehind1
  // 5) TheTreeBehind2 (farthest)
  // Our `images` array is currently [layer1, layer2, layer3, layer4, layer5]
  // Map them to the desired order (indexes): Ground=layer2, Grass=layer1, HugeTree=layer3, TreeBehind1=layer4, TreeBehind2=layer5
  const order = [1, 0, 2, 3, 4]; // indexes into the `images` array

  // speed modifiers: larger = moves faster (closer to camera)
  const speedModifiers = [3.0, 2.5, 1.4, 0.7, 0.3];

  // vertical offsets (pixels) for fine-tuning layer vertical positions
  // Positive moves the layer down, negative moves it up.
  // Order matches the `order` array above: Ground, Grass, HugeTree, TreeBehind1, TreeBehind2
  const yOffsets = [50, 10, 10, -30, -40];

  const layers = order.map((imgIndex, i) => {
    const img = images[imgIndex];
    // base Y aligns image bottom to canvas bottom, then apply offset
    const baseY = canvas.height - img.height;
    const y = Math.round(baseY + (yOffsets[i] || 0));
    return new Layer(img, speedModifiers[i] ?? 1, y);
  });

  startAnimation(layers);
}

let animationId = null;

function startAnimation(layers) {
  const speedRange = document.getElementById('speedRange');
  const speedValue = document.getElementById('speedValue');
  let gameSpeed = Number(speedRange.value) || 2;
  speedValue.textContent = gameSpeed;

  speedRange.addEventListener('input', e => {
    gameSpeed = Number(e.target.value);
    speedValue.textContent = gameSpeed.toFixed(1);
  });

  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // draw layers back-to-front (last in array is background?)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      // scale vertically if needed: we keep original width but draw with img width
      layer.update(gameSpeed);
      layer.draw(ctx);
    }

    animationId = requestAnimationFrame(animate);
  }

  if (animationId) cancelAnimationFrame(animationId);
  animate();
}

createLayers();
