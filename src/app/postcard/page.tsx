'use client';

import React, { useState } from 'react';
import StickerPeel from '../../components/StickerPeel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LogoLoop from '@/components/ui/LogoLoop';
import { calculatePostcardLineCount, POSTCARD_MAX_LINES } from '@/utils/postcard';

export default function PostcardPage() {
  const [message, setMessage] = useState<string>('');
  const [locationSharing, setLocationSharing] = useState<'state' | 'country' | 'anonymous'>('state');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [showLineLimitNotice, setShowLineLimitNotice] = useState(false);



  // Handle message change with precise line counting
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const nextLineCount = calculatePostcardLineCount(text);

    if (nextLineCount <= POSTCARD_MAX_LINES) {
      setMessage(text);
      if (showLineLimitNotice) {
        setShowLineLimitNotice(false);
      }
    } else {
      setShowLineLimitNotice(true);
      if (textareaRef.current) {
        textareaRef.current.value = message;
      }
    }
  };
  const [placedStickers, setPlacedStickers] = useState<Array<{
    id: string;
    x: number;
    y: number;
    rotation: number;
    hueRotate: number;
    originalIndex: number;
  }>>([]);
  const [postcardRef, setPostcardRef] = useState<HTMLDivElement | null>(null);

  const stickerLogos = [
    { src: "/sticker.png", alt: "Sticker 1" },
    { src: "/sticker.png", alt: "Sticker 2" },
    { src: "/sticker.png", alt: "Sticker 3" },
    { src: "/sticker.png", alt: "Sticker 4" },
    { src: "/sticker.png", alt: "Sticker 5" },
    { src: "/sticker.png", alt: "Sticker 6" },
  ];

  // Sticker data with random rotations for scattered effect
  const stickerData = [
    { rotation: -15, hueRotate: 0 },
    { rotation: 25, hueRotate: 60 },
    { rotation: -8, hueRotate: 120 },
    { rotation: 18, hueRotate: 180 },
    { rotation: -22, hueRotate: 240 },
    { rotation: 12, hueRotate: 300 },
  ];

  const handleStickerDrop = (x: number, y: number, stickerIndex: number) => {
    if (!postcardRef) return;

    const postcardRect = postcardRef.getBoundingClientRect();

    console.log('Drop attempt:', { x, y, postcardRect });

    // Check if dropped on postcard
    if (
      x >= postcardRect.left &&
      x <= postcardRect.right &&
      y >= postcardRect.top &&
      y <= postcardRect.bottom
    ) {
      // Calculate relative position within postcard
      const relativeX = x - postcardRect.left;
      const relativeY = y - postcardRect.top;

      console.log('Valid drop on postcard:', { relativeX, relativeY });

      const newSticker = {
        id: `sticker-${Date.now()}-${stickerIndex}`,
        x: relativeX,
        y: relativeY,
        rotation: Math.random() * 30 - 15, // Random rotation between -15 and 15
        hueRotate: stickerData[stickerIndex].hueRotate,
        originalIndex: stickerIndex,
      };

      console.log('Adding sticker:', newSticker);
      setPlacedStickers(prev => [...prev, newSticker]);
    } else {
      console.log('Drop outside postcard');
    }
  };

  const handlePlacedStickerMove = (stickerId: string, x: number, y: number) => {
    if (!postcardRef) return;

    const postcardRect = postcardRef.getBoundingClientRect();

    // Check if still on postcard
    if (
      x >= postcardRect.left &&
      x <= postcardRect.right &&
      y >= postcardRect.top &&
      y <= postcardRect.bottom
    ) {
      const relativeX = x - postcardRect.left;
      const relativeY = y - postcardRect.top;

      setPlacedStickers(prev =>
        prev.map(sticker =>
          sticker.id === stickerId
            ? { ...sticker, x: relativeX, y: relativeY }
            : sticker
        )
      );
    } else {
      // Remove sticker if dragged off postcard
      setPlacedStickers(prev => prev.filter(sticker => sticker.id !== stickerId));
    }
  };

  const lineCount = React.useMemo(() => calculatePostcardLineCount(message), [message]);
  const isAtLineLimit = lineCount >= POSTCARD_MAX_LINES;

  const handleSendPostcard = async () => {
    if (!message.trim()) return;

    if (lineCount > POSTCARD_MAX_LINES) {
      setShowLineLimitNotice(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Fall Postcard',
          content: message.trim(),
          locationSharing,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send postcard');
      }

      const result = await response.json();

      // Success! Clear the form
      setMessage('');
      setPlacedStickers([]);
      setShowLineLimitNotice(false);

      // Show success message (you could add a toast notification here)
      alert('Your fall postcard is flying! 🍂✈️');

    } catch (error) {
      console.error('Error sending postcard:', error);
      alert('Failed to send postcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Hide scrollbars for WebKit browsers */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div
        className="h-screen w-full overflow-hidden"
        style={{
          backgroundImage: "url('/background.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Craft Table Container */}
        <div className="relative w-full h-screen flex justify-center p-8 overflow-visible">

          {/* Postcard in the center */}
          <div className="relative flex items-center">
            {/* All 6 stickers on the left side in a single column */}
            <div className="absolute -left-80 top-0 w-80 h-screen overflow-visible flex flex-col">
              <div className="text-center pt-8 pb-4" style={{ fontFamily: 'cursive, "Comic Sans MS", sans-serif' }}>
                  <h1 className="text-6xl font-bold" style={{ color: '#5a3825', textShadow: '2px 2px 0px #fff, -2px -2px 0px #fff, 2px -2px 0px #fff, -2px 2px 0px #fff' }}>Stickers!</h1>
                  <p className="text-xl" style={{ color: '#5a3825' }}>drag and drop!</p>
              </div>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'linear-gradient(to top, rgba(255, 221, 193, 0.5), transparent)'}}>
                <LogoLoop
                  logos={stickerLogos}
                  speed={120}
                  direction="up"
                  logoWidth={192}
                  gap={40}
                  pauseOnHover
                  scaleOnHover
                  fadeOut
                  fadeOutColor="#fbf9f4"
                  ariaLabel="Stickers"
                />
              </div>
            </div>
            {/* Postcard */}
            <div
              ref={setPostcardRef}
              className="bg-white border border-gray-400 relative"
              style={{
                width: '600px',
                height: '400px',
                borderImage: `repeating-linear-gradient(
                  45deg,
                  #FF0000,
                  #FF0000 15px,
                  #0000FF 15px,
                  #0000FF 30px
                ) 20`,
              }}
            >
              {/* Postcard content area */}
              <div className="w-full h-full flex flex-col">
                {/* Main message area with Animal Crossing style padding */}
                <div className="flex-1 flex items-center justify-center p-12">
                  <textarea
                    ref={textareaRef}
                    placeholder="What are you doing this fall?"
                    className="resize-none border-none outline-none text-center text-lg font-handwriting no-scrollbar"
                    rows={6}
                    style={{
                      width: '100%',
                      height: '100%',
                      maxWidth: '450px', // Limit width like Animal Crossing
                      maxHeight: '200px', // Limit height for 6 lines
                      padding: '20px', // Internal padding within the text area
                      lineHeight: '1.8em',
                      fontFamily: 'cursive, "Comic Sans MS", sans-serif',
                      color: '#2c3e50',
                      background: 'transparent',
                      overflow: 'hidden', // Hide scrollbars completely
                      scrollbarWidth: 'none', // Firefox
                      msOverflowStyle: 'none', // IE/Edge
                    }}
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isAtLineLimit) {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>

                {/* Bottom section with location sharing, recipient and character count */}
                <div className="px-5 pb-4 space-y-3">
                  {/* Location sharing row */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Location:
                    </div>
                    <Select
                      value={locationSharing}
                      onValueChange={(value: 'state' | 'country' | 'anonymous') => setLocationSharing(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm border-none bg-transparent" style={{
                        fontFamily: 'cursive, "Comic Sans MS", sans-serif',
                        color: '#2c3e50',
                        borderBottom: '1px dotted #ccc',
                      }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="state">Share State</SelectItem>
                        <SelectItem value="country">Share Country</SelectItem>
                        <SelectItem value="anonymous">Anonymous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stats and recipient row */}
                  <div className="flex justify-between items-end">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span>
                        Lines: {lineCount}/{POSTCARD_MAX_LINES}
                      </span>
                      {isAtLineLimit && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          Max reached
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{message.length} chars</span>
                      <input
                        type="text"
                        placeholder="To: Someone Special"
                        className="text-sm border-none outline-none text-right w-32 bg-transparent"
                        style={{
                          fontFamily: 'cursive, "Comic Sans MS", sans-serif',
                          color: '#2c3e50',
                          borderBottom: '1px dotted #ccc',
                        }}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                      <span>Honk Air Mail</span>
                    </div>
                    <Button
                      onClick={handleSendPostcard}
                      disabled={!message.trim() || isLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {isLoading ? 'Sending...' : 'Send Postcard'}
                    </Button>
                  </div>
                  {showLineLimitNotice && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Your note is limited to six postcard lines. Try shortening a sentence or removing a line break.
                    </p>
                  )}
                </div>
              </div>

              {/* Placed stickers on postcard - now movable */}
              {placedStickers.map((sticker) => (
                <div
                  key={sticker.id}
                  style={{
                    position: 'absolute',
                    left: sticker.x - 64,
                    top: sticker.y - 64,
                    filter: `hue-rotate(${sticker.hueRotate}deg)`,
                  }}
                >
                  <StickerPeel
                    imageSrc="/sticker.png"
                    width={128}
                    rotate={sticker.rotation}
                    peelBackHoverPct={15}
                    peelBackActivePct={30}
                    shadowIntensity={0.4}
                    lightingIntensity={0.05}
                    initialPosition="center"
                    className={`placed-sticker-${sticker.id}`}
                    onDragEnd={(x, y) => handlePlacedStickerMove(sticker.id, x, y)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}