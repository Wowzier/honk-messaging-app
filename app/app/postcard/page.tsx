'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StickerPeel from '@/components/StickerPeel';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { JourneyTransition } from '@/components/JourneyTransition';
import './page.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StickerGroup from '@/components/StickerGroup';
import { calculatePostcardLineCount, POSTCARD_MAX_LINES } from '@/utils/postcard';

export default function PostcardPage() {
  const { user, loading } = useRequireAuth();
  const [message, setMessage] = useState<string>('');
  const [locationSharing, setLocationSharing] = useState<'state' | 'country' | 'anonymous'>('state');
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [recipientUsername, setRecipientUsername] = useState<string>('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [showLineLimitNotice, setShowLineLimitNotice] = useState(false);
  const [placedStickers, setPlacedStickers] = useState<Array<{
    id: string;
    x: number;
    y: number;
    rotation: number;
    hueRotate: number;
    originalIndex: number;
  }>>([]);
  const [postcardRef, setPostcardRef] = useState<HTMLDivElement | null>(null);
  const lineCount = React.useMemo(() => calculatePostcardLineCount(message), [message]);
  const isAtLineLimit = lineCount >= POSTCARD_MAX_LINES;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect to login
  }

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

  // Sticker data with random rotations for scattered effect
  const stickerData = [
    { rotation: -15, hueRotate: 0 },
    { rotation: 25, hueRotate: 72 },
    { rotation: -8, hueRotate: 144 },
    { rotation: 18, hueRotate: 216 },
    { rotation: -22, hueRotate: 288 },
  ];

  const MAX_PLACED_STICKERS = 6; // Maximum stickers allowed on a postcard at once

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
      setPlacedStickers(prev => {
        if (prev.length < MAX_PLACED_STICKERS) return [...prev, newSticker];
        // If at max capacity, remove the oldest sticker (FIFO) and append the new one
        const next = prev.slice(1);
        next.push(newSticker);
        return next;
      });
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


  const handleSendPostcard = async () => {
    if (!message.trim()) {
      return;
    }

    const lineCount = calculatePostcardLineCount(message.trim());
    if (lineCount > POSTCARD_MAX_LINES) {
      setShowLineLimitNotice(true);
      return;
    }

    // Use Tailwind Algorithm to automatically find recipient
    setIsLoading(true);
    
    try {
      // Transform placed stickers to match StickerData interface
      const stickerData = placedStickers.map((sticker, index) => ({
        id: sticker.id,
        name: `sticker-${index}`,
        emoji: '🎨',
        imageUrl: '/sticker.png',
        type: 'default' as const,
        x: sticker.x,
        y: sticker.y,
        size: 64,
        rotation: sticker.rotation,
        scale: 1,
      }));

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Fall Postcard',
          content: message.trim(),
          locationSharing,
          message_type: 'postcard',
          sticker_data: stickerData,
          // Don't pass recipient_id - let Tailwind Algorithm choose
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send postcard');
      }

      const result = await response.json();

      // Success! Clear the form and show transition
      setMessage('');
      setPlacedStickers([]);
      setShowLineLimitNotice(false);
      setMessageId(result.message.id);
      setRecipientUsername(result.message.recipient_username || 'Someone');
      setShowTransition(true);

    } catch (error) {
      console.error('Error sending postcard:', error);
      alert('Failed to send postcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransitionComplete = () => {
    // Redirect to platform page to see duck flight
    if (messageId) {
      window.location.href = `/app/platform?messageId=${messageId}`;
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
        className="fixed inset-0 w-full h-full"
        style={{
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: "url('/background.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>
      <div
        className="relative w-full h-screen"
        style={{
          pointerEvents: 'all',
          zIndex: 1
        }}
      >
        {/* Craft Table Container */}
        <div className="relative w-full h-screen flex justify-center p-8 overflow-visible">

          {/* Postcard in the center */}
          <div className="relative flex items-center">
            {/* All 5 stickers on the left side in a single column */}
            <div className="absolute -left-80 top-0 w-80 h-screen overflow-visible flex flex-col" style={{ zIndex: 20 }}>
              <div className="text-center pt-8 pb-4" style={{ fontFamily: 'cursive, "Comic Sans MS", sans-serif' }}>
                  <h1 className="text-6xl font-bold" style={{ color: '#5a3825', textShadow: '2px 2px 0px #fff, -2px -2px 0px #fff, 2px -2px 0px #fff, -2px 2px 0px #fff' }}>Stickers!</h1>
                  <p className="text-xl" style={{ color: '#5a3825' }}>drag and drop!</p>
              </div>
              <div style={{ 
                  flex: 1, 
                  position: 'relative', 
                  background: 'linear-gradient(to top, rgba(255, 221, 193, 0.5), transparent)',
                  padding: '20px'
                }}>
                <StickerGroup
                  stickers={[
                    { image: "/sticker.png" },
                    { image: "/sticker.png" },
                    { image: "/sticker.png" },
                    { image: "/sticker.png" },
                    { image: "/sticker.png" },
                    { image: "/sticker.png" }
                  ]}
                  onDragEnd={(x, y, index) => {
                    if (postcardRef) {
                      const postcardRect = postcardRef.getBoundingClientRect();
                      if (
                        x >= postcardRect.left &&
                        x <= postcardRect.right &&
                        y >= postcardRect.top &&
                        y <= postcardRect.bottom
                      ) {
                        // Calculate relative position within postcard
                        const relativeX = x - postcardRect.left;
                        const relativeY = y - postcardRect.top;
                        
                        // Add the sticker to the placed stickers with a random rotation
                        const newSticker = {
                          id: `sticker-${Date.now()}-${index}`,
                          x: relativeX,
                          y: relativeY,
                          rotation: Math.random() * 30 - 15,
                          hueRotate: stickerData[index % stickerData.length].hueRotate,
                          originalIndex: index,
                        };
                        
                        setPlacedStickers(prev => {
                          if (prev.length < MAX_PLACED_STICKERS) return [...prev, newSticker];
                          const next = prev.slice(1);
                          next.push(newSticker);
                          return next;
                        });
                        
                        // Return true to indicate successful placement
                        return true;
                      }
                    }
                    // Return false to indicate sticker should teleport back
                    return false;
                  }}
                />
              </div>
            </div>

            {/* Postcard */}
            <div
              ref={setPostcardRef}
              className="postcard-area bg-white border border-gray-400 relative"
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
                    left: sticker.x - 32,
                    top: sticker.y - 32,
                    filter: `hue-rotate(${sticker.hueRotate}deg)`,
                    zIndex: 10,
                  }}
                >
                  <StickerPeel
                    imageSrc="/sticker.png"
                    width={64}
                    rotate={sticker.rotation}
                    peelBackHoverPct={15}
                    peelBackActivePct={30}
                    shadowIntensity={0.4}
                    lightingIntensity={0.05}
                    initialPosition="center"
                    className={`placed-sticker-${sticker.id}`}
                    positionMode="absolute"
                    onDragEnd={(x, y) => handlePlacedStickerMove(sticker.id, x, y)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Journey Transition Overlay */}
      {showTransition && (
        <JourneyTransition
          onComplete={handleTransitionComplete}
          recipientUsername={recipientUsername}
        />
      )}
    </>
  );
}