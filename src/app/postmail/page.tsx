'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import StickerGroup from '@/components/StickerGroup';
import StickerPeel from '@/components/StickerPeel';
import './page.css';

interface StickerDefinition {
  id: string;
  label: string;
  image: string;
  width: number;
  className: string;
  initialRotation: number;
}

interface PlacedSticker {
  id: string;
  definitionId: string;
  x: number;
  y: number;
  rotation: number;
}

const MAX_PLACED_STICKERS = 6;

const createTextStickerImage = (
  text: string,
  {
    background,
    color,
    accent,
    fontSize = 52,
  }: { background: string; color: string; accent: string; fontSize?: number }
) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
    <defs>
      <linearGradient id="shine" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0.9)" />
        <stop offset="0.65" stop-color="rgba(255,255,255,0.25)" />
        <stop offset="1" stop-color="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <rect x="12" y="12" width="296" height="296" rx="40" ry="40" fill="${background}" stroke="${accent}" stroke-width="12" />
    <rect x="12" y="12" width="296" height="148" fill="url(#shine)" opacity="0.85" />
    <text x="160" y="180" font-size="${fontSize}" font-family="'Gill Sans', 'Trebuchet MS', sans-serif" font-weight="700" fill="${color}" text-anchor="middle" dominant-baseline="middle">
      ${text}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const STICKER_DEFINITIONS: StickerDefinition[] = [
  {
    id: 'hello',
    label: 'Greeting',
    image: createTextStickerImage('HELLO!', {
      background: '#fff4e3',
      color: '#a6583c',
      accent: '#f4c493',
      fontSize: 60,
    }),
    width: 140,
    className: 'postmail-sticker postmail-sticker--hello',
    initialRotation: -6,
  },
  {
    id: 'priority',
    label: 'Priority',
    image: createTextStickerImage('PRIORITY', {
      background: '#e6f0ff',
      color: '#1a3f8b',
      accent: '#bcd0ff',
      fontSize: 48,
    }),
    width: 132,
    className: 'postmail-sticker postmail-sticker--priority',
    initialRotation: 4,
  },
  {
    id: 'duck',
    label: 'Duck courier',
    image: '/sticker.png',
    width: 120,
    className: 'postmail-sticker postmail-sticker--duck',
    initialRotation: -12,
  },
  {
    id: 'sunny',
    label: 'Sunny skies',
    image: '/sticker.png',
    width: 118,
    className: 'postmail-sticker postmail-sticker--sunny',
    initialRotation: 8,
  },
  {
    id: 'aurora',
    label: 'Aurora',
    image: '/sticker.png',
    width: 118,
    className: 'postmail-sticker postmail-sticker--aurora',
    initialRotation: -18,
  },
  {
    id: 'mint',
    label: 'Mint leaf',
    image: '/sticker.png',
    width: 118,
    className: 'postmail-sticker postmail-sticker--mint',
    initialRotation: 14,
  },
];

const STICKER_MAP = STICKER_DEFINITIONS.reduce<Record<string, StickerDefinition>>((acc, sticker) => {
  acc[sticker.id] = sticker;
  return acc;
}, {});

const clampCoordinate = (value: number, containerSize: number, stickerSize: number) => {
  const half = stickerSize / 2;
  if (containerSize <= stickerSize) {
    return containerSize / 2;
  }
  return Math.min(Math.max(value, half), containerSize - half);
};

const clampPosition = (
  x: number,
  y: number,
  containerRect: DOMRect,
  stickerWidth: number
) => {
  const relativeX = x - containerRect.left;
  const relativeY = y - containerRect.top;
  return {
    x: clampCoordinate(relativeX, containerRect.width, stickerWidth),
    y: clampCoordinate(relativeY, containerRect.height, stickerWidth),
  };
};

const PostmailPage: React.FC = () => {
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState('');
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);

  const paletteStickers = useMemo(
    () =>
      STICKER_DEFINITIONS.map(sticker => ({
        image: sticker.image,
        initialRotation: sticker.initialRotation,
        width: sticker.width,
        className: sticker.className,
      })),
    []
  );

  const handlePaletteDrop = useCallback(
    (clientX: number, clientY: number, index: number) => {
      const dropZone = dropZoneRef.current;
      const definition = STICKER_DEFINITIONS[index];
      if (!dropZone || !definition) return false;

      const rect = dropZone.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return false;
      }

      const { x, y } = clampPosition(clientX, clientY, rect, definition.width);

      setPlacedStickers(prev => {
        const nextSticker: PlacedSticker = {
          id: `placed-${definition.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          definitionId: definition.id,
          x,
          y,
          rotation: definition.initialRotation + (Math.random() * 10 - 5),
        };

        const next = [...prev, nextSticker];
        if (next.length > MAX_PLACED_STICKERS) {
          next.shift();
        }
        return next;
      });

      return true;
    },
    []
  );

  const bringStickerToFront = useCallback((stickerId: string) => {
    setPlacedStickers(prev => {
      const index = prev.findIndex(sticker => sticker.id === stickerId);
      if (index === -1) return prev;
      const next = [...prev];
      const [sticker] = next.splice(index, 1);
      next.push(sticker);
      return next;
    });
  }, []);

  const handlePlacedStickerMove = useCallback((stickerId: string, clientX: number, clientY: number) => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const rect = dropZone.getBoundingClientRect();

    setPlacedStickers(prev => {
      const sticker = prev.find(item => item.id === stickerId);
      if (!sticker) return prev;
      const definition = STICKER_MAP[sticker.definitionId];
      if (!definition) return prev;

      const { x, y } = clampPosition(clientX, clientY, rect, definition.width);

      return prev.map(item =>
        item.id === stickerId
          ? {
              ...item,
              x,
              y,
            }
          : item
      );
    });
  }, []);

  return (
    <div className="postmail-page">
      <div className="postmail-content">
        <header className="postmail-header">
          <h1>Postmail Studio</h1>
          <p>Draft a quick hello and decorate the envelope with draggable stickers.</p>
        </header>

        <section className="postmail-tray">
          <div className="postmail-tray-text">
            <h2>Sticker Palette</h2>
            <p>Drag any of the six stickers onto the postmail. They&rsquo;ll stay put once dropped.</p>
          </div>
          <div className="postmail-tray-group">
            <StickerGroup stickers={paletteStickers} onDragEnd={handlePaletteDrop} spacing={140} />
          </div>
        </section>

        <section className="postmail-workspace">
          <div className="postmail-note">
            <h3>Your message</h3>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Write a friendly note or jot a reminder for your future self..."
              rows={7}
            />
            <div className="postmail-note-footer">
              <span>{message.length} characters</span>
              <span>Stickers placed: {placedStickers.length}/{MAX_PLACED_STICKERS}</span>
            </div>
          </div>

          <div className="postmail-canvas">
            <div
              className={`postmail-dropzone ${placedStickers.length ? 'postmail-dropzone--active' : ''}`}
              ref={dropZoneRef}
            >
              <div className="postmail-dropzone-guide">
                <span>Drop stickers anywhere on the postmail</span>
              </div>
              {placedStickers.map((sticker, index) => {
                const definition = STICKER_MAP[sticker.definitionId];
                if (!definition) return null;
                const half = definition.width / 2;
                return (
                  <div
                    key={sticker.id}
                    className="postmail-placed-sticker"
                    style={{
                      left: sticker.x - half,
                      top: sticker.y - half,
                      width: definition.width,
                      zIndex: 20 + index,
                    }}
                  >
                    <StickerPeel
                      imageSrc={definition.image}
                      width={definition.width}
                      rotate={sticker.rotation}
                      peelBackHoverPct={15}
                      peelBackActivePct={28}
                      shadowIntensity={0.35}
                      lightingIntensity={0.06}
                      positionMode="relative"
                      className={`${definition.className} postmail-placed`}
                      onDragStart={() => bringStickerToFront(sticker.id)}
                      onDragEnd={(x, y) => handlePlacedStickerMove(sticker.id, x, y)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PostmailPage;
