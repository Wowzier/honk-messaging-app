"use client";
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from 'react-dom';

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    width: '100%',
    height: '100%'
  },
  canvas: {
    background: 'transparent',
    border: '2px solid rgba(255,255,255,0.06)',
    maxWidth: '100%',
    display: 'block'
  }
};

type LayerSpec = {
  src: string;
  speed: number;
  yOffset?: number;
  alt?: string;
  scaleToFit?: boolean;
  customScale?: number;
  noTile?: boolean;
  centered?: boolean; // Add flag for center positioning
};

class Layer {
  image: HTMLImageElement;
  speedModifier: number;
  width: number;
  height: number;
  offset: number;
  y: number;
  scaleToFit: boolean;
  scale: number;

  customScale: number;

  noTile: boolean;
  centered: boolean;

  constructor(image: HTMLImageElement, speedModifier: number, y = 0, scaleToFit = false, customScale = 1, noTile = false, centered = false) {
    this.image = image;
    this.speedModifier = speedModifier;
    this.width = image.width;
    this.height = image.height;
    this.offset = 0;
    this.y = y;
    this.scaleToFit = scaleToFit;
    this.scale = 1;
    this.customScale = customScale;
    this.noTile = noTile;
    this.centered = centered;
  }

  updateScale(canvasWidth: number, canvasHeight: number) {
    if (this.scaleToFit) {
      // Calculate scale to cover the entire canvas
      const scaleX = canvasWidth / this.width;
      const scaleY = canvasHeight / this.height;
      // Use the larger scale to ensure full coverage with extra overlap for seamless tiling
      this.scale = Math.max(scaleX, scaleY) * 1.5; // Increased to 50% extra to ensure no gaps
    } else {
      // For regular layers, scale proportionally to canvas height
      this.scale = (canvasHeight / this.height) * this.customScale;
    }
  }

  update(gameSpeed: number) {
    const speed = gameSpeed * this.speedModifier;
    this.offset += speed;
    const scaledWidth = this.width * this.scale;
    if (this.offset >= scaledWidth) this.offset = this.offset % scaledWidth;
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    const scaledWidth = this.width * this.scale;
    const scaledHeight = this.height * this.scale;
    const shift = this.offset % scaledWidth;
    
    // Calculate Y position to align bottom of image with bottom of canvas
    const yPos = this.scaleToFit ? 0 : Math.max(0, canvasHeight - scaledHeight + (this.y * this.scale));
    
    if (this.noTile) {
      // For non-tiling sprites (like the duck)
      let x;
      if (this.centered) {
        // Center the sprite horizontally
        x = Math.round((canvasWidth - scaledWidth) / 2);
      } else {
        // Normal movement for non-centered sprites
        x = Math.round(-shift);
        if (x < -scaledWidth) {
          x = canvasWidth;
        }
      }
      ctx.drawImage(
        this.image,
        x,
        Math.round(yPos),
        Math.round(scaledWidth),
        Math.round(scaledHeight)
      );
    } else {
      // For tiling backgrounds
      let startX = Math.round(-shift - scaledWidth);
      const tiles = Math.ceil(canvasWidth / scaledWidth) + 3;
      for (let i = 0; i < tiles; i++) {
        const x = startX + i * scaledWidth;
        ctx.drawImage(
          this.image,
          Math.round(x),
          Math.round(yPos),
          Math.round(scaledWidth),
          Math.round(scaledHeight)
        );
      }
    }
  }
}

const DEFAULT_LAYERS: LayerSpec[] = [
  { src: "/nature_5/sky.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
  { src: "/nature_5/clouds.png", speed: 0.4, yOffset: 10, alt: "Clouds" },
  { src: "/nature_5/grass-and-trees.png", speed: 0.8, yOffset: 20, alt: "Grass and Trees" },
  { src: "/nature_5/grass.png", speed: 0.3, yOffset: 0, alt: "Grass" },
];

export default function ParallaxCanvas({
  layers = DEFAULT_LAYERS,
  initialSpeed = 2,
  fullScreen = false,
}: {
  layers?: LayerSpec[];
  initialSpeed?: number;
  fullScreen?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameSpeed] = useState<number>(initialSpeed);
  const animRef = useRef<number | null>(null);
  const layerObjsRef = useRef<Layer[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const c = canvas as HTMLCanvasElement;
    const context = ctx as CanvasRenderingContext2D;

    let isMounted = true;

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      
      // Always use full viewport dimensions
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      c.width = Math.floor(cssWidth * dpr);
      c.height = Math.floor(cssHeight * dpr);
      c.style.width = `${cssWidth}px`;
      c.style.height = `${cssHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      // Update scales for all layers when canvas resizes
      const displayWidth = cssWidth;
      const displayHeight = cssHeight;
      layerObjsRef.current.forEach(layer => {
        layer.updateScale(displayWidth, displayHeight);
      });
    }

    // Load images
    const imgElements: HTMLImageElement[] = layers.map(spec => {
      const img = new Image();
      img.src = spec.src;
      img.alt = spec.alt || "";
      return img;
    });

    function createLayers() {
      if (imgElements.some(img => !img.complete || img.naturalWidth === 0)) {
        setTimeout(createLayers, 50);
        return;
      }

      const canvasHeight = c.height / (window.devicePixelRatio || 1);
      const canvasWidth = c.width / (window.devicePixelRatio || 1);

      layerObjsRef.current = layers.map((layerSpec, index) => {
        const img = imgElements[index];
        if (!img) return null;
        
        const layer = new Layer(
          img, 
          layerSpec.speed ?? 1, 
          layerSpec.yOffset || 0,
          layerSpec.scaleToFit || false,
          layerSpec.customScale || 1,
          layerSpec.noTile || false,
          layerSpec.centered || false
        );
        layer.updateScale(canvasWidth, canvasHeight);
        return layer;
      }).filter((l): l is Layer => l !== null);

      // Start animation
      function animate() {
        if (!isMounted) return;
        
        const displayWidth = c.width / (window.devicePixelRatio || 1);
        const displayHeight = c.height / (window.devicePixelRatio || 1);
        
        context.clearRect(0, 0, c.width, c.height);
        
        // Draw layers back to front
        for (let i = 0; i < layerObjsRef.current.length; i++) {
          const layer = layerObjsRef.current[i];
          layer.update(gameSpeed);
          layer.draw(context, displayWidth, displayHeight);
        }
        animRef.current = requestAnimationFrame(animate);
      }

      if (animRef.current) cancelAnimationFrame(animRef.current);
      animate();
    }

    // Initial setup
    resizeCanvas();
    createLayers();

    const onResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", onResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [layers, gameSpeed]);

  // Portal container for fullScreen mode
  const portalRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!fullScreen) return;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '0';
    container.style.pointerEvents = 'none';
  // container.style.overflow = 'hidden';
    container.style.background = 'transparent';
    portalRef.current = container;
    document.body.appendChild(container);
    
    // Ensure body doesn't have scrollbars when full screen
  // const originalOverflow = document.body.style.overflow;
  // document.body.style.overflow = 'hidden';
    
    return () => {
  // document.body.style.overflow = originalOverflow;
      if (portalRef.current && portalRef.current.parentNode) {
        portalRef.current.parentNode.removeChild(portalRef.current);
      }
      portalRef.current = null;
    };
  }, [fullScreen]);

  const content = (
    <div
      style={
        fullScreen
          ? { 
              position: 'fixed' as const, 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              padding: 0, 
              margin: 0,
              // overflow: 'hidden'
            }
          : { 
              position: 'absolute' as const, 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              padding: 0, 
              margin: 0 
            }
      }
    >
      <canvas
        ref={canvasRef}
        id="myCanvas"
        style={
          fullScreen
            ? { 
                position: 'absolute' as const, 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                display: 'block',
                border: 'none'
              }
            : { 
                position: 'absolute' as const, 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                display: 'block',
                border: 'none'
              }
        }
      />
    </div>
  );

  if (fullScreen && portalRef.current) {
    return createPortal(content, portalRef.current);
  }

  return content;
}