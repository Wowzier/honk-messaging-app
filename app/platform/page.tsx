'use client';

import ParallaxCanvas from '@/components/ParallaxCanvas';

const CUSTOM_LAYERS = [
  { src: "/nature_5/sky.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
  { src: "/nature_5/clouds.png", speed: 0.4, yOffset: 10, alt: "Clouds" },
  { src: "/nature_5/grass.png", speed: 0.3, yOffset: -20, alt: "Grass" },
  { src: "/nature_5/duck.png", speed: 0, yOffset: -345, alt: "Duck", customScale: 0.2, noTile: true, centered: true },
  { src: "/nature_5/grass-and-trees.png", speed: 0.8, yOffset: -60, alt: "Grass and Trees" },
];

export default function PlatformPage() {
  return (
    <ParallaxCanvas layers={CUSTOM_LAYERS} fullScreen />
  );
}
