'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { HonkMessage } from '@/types';
import ParallaxCanvas from '@/components/ParallaxCanvas';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'motion/react';

interface PostcardData extends HonkMessage {
  sender_username?: string;
}

const DRAG_BUFFER = 50;
const VELOCITY_THRESHOLD = 500;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

export function InboxCarousel() {
  const { user } = useAuth();
  const router = useRouter();
  const [postcards, setPostcards] = useState<PostcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  // Motion values for smooth animations
  const x = useMotionValue(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Hide swipe hint after first interaction or 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Hide swipe hint on any interaction
  const hideSwipeHint = useCallback(() => {
    setShowSwipeHint(false);
  }, []);

  // Forest parallax layers
  const PARALLAX_LAYERS = useMemo(() => [
    { src: "/forest/background1/Plan-5.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
    { src: "/forest/background1/Plan-4.png", speed: 0.3, yOffset: 0, alt: "Layer 4" },
    { src: "/forest/background1/Plan-3.png", speed: 0.5, yOffset: 0, alt: "Layer 3" },
    { src: "/forest/background1/Plan-2.png", speed: 0.7, yOffset: 0, alt: "Layer 2" },
    { src: "/forest/background1/Plan-1.png", speed: 0.9, yOffset: 0, alt: "Layer 1" },
  ], []);

  const fetchPostcards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = Cookies.get('honk_auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/messages/inbox?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch postcards');
      }

      const data = await response.json();
      setPostcards(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching postcards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPostcards();
    }
  }, [user, fetchPostcards]);

  const handlePrevious = useCallback(() => {
    if (postcards.length === 0) return;
    hideSwipeHint();
    // Loop around: if at start, go to end
    setCurrentIndex((prev) => (prev - 1 + postcards.length) % postcards.length);
  }, [postcards.length, hideSwipeHint]);

  const handleNext = useCallback(() => {
    if (postcards.length === 0) return;
    hideSwipeHint();
    // Loop around: if at end, go to start
    setCurrentIndex((prev) => (prev + 1) % postcards.length);
  }, [postcards.length, hideSwipeHint]);

  // Handle drag end with velocity and offset
  const handleDragEnd = useCallback((_: any, info: any) => {
    hideSwipeHint();
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      // Swiped left -> next (loops around)
      setCurrentIndex((prev) => (prev + 1) % postcards.length);
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      // Swiped right -> previous (loops around)
      setCurrentIndex((prev) => (prev - 1 + postcards.length) % postcards.length);
    }
  }, [postcards.length, hideSwipeHint]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevious, handleNext]);

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-journal-paper to-journal-paper-alt">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Please log in</h2>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-journal-accent text-white rounded-full font-semibold hover:bg-journal-accent/90 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const cardWidth = 520;
  const gap = 40;
  const trackOffset = cardWidth + gap;

  return (
    <div className="h-screen w-screen fixed inset-0 overflow-hidden">
      {/* CSS for perspective and smooth animations */}
      <style jsx>{`
        @keyframes swipeHint {
          0%, 100% { transform: translateX(0); opacity: 0.6; }
          50% { transform: translateX(-10px); opacity: 1; }
        }
        .swipe-hint {
          animation: swipeHint 2s ease-in-out infinite;
        }
      `}</style>

      {/* Parallax Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0">
          <ParallaxCanvas layers={PARALLAX_LAYERS} />
        </div>
        {/* Glass overlay */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
      </div>

      {/* Main Content */}
      <div className="relative h-full w-full flex items-center justify-center pointer-events-auto" style={{ zIndex: 1 }}>
        {loading ? (
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bounce">📬</div>
            <div className="text-2xl font-bold text-gray-700">Loading your postcards...</div>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="text-8xl mb-6">❌</div>
            <div className="text-2xl font-bold text-red-600 mb-4">{error}</div>
            <button
              onClick={fetchPostcards}
              className="px-6 py-3 bg-journal-accent text-white rounded-full font-semibold hover:bg-journal-accent/90 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : postcards.length === 0 ? (
          <div className="text-center max-w-md">
            <div className="text-9xl mb-8">📮</div>
            <h2 className="text-4xl font-bold text-gray-700 mb-6">Your mailbox is empty!</h2>
            <p className="text-gray-500 mb-8 text-xl">
              Send your first postcard to friends and start collecting memories!
            </p>
            <button
              onClick={() => router.push('/postcard')}
              className="px-8 py-4 bg-journal-accent text-white rounded-full font-bold text-lg hover:bg-journal-accent/90 transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-3 mx-auto"
            >
              <span className="text-2xl">✉️</span>
              <span>Create Your First Postcard</span>
            </button>
          </div>
        ) : (
          <>
            {/* Left Arrow */}
            <button
              onClick={handlePrevious}
              className="absolute left-8 z-20 w-16 h-16 bg-white/80 hover:bg-white border-3 border-journal-accent rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center group"
              aria-label="Previous postcard"
            >
              <ChevronLeft className="w-8 h-8 text-journal-accent group-hover:scale-125 transition-transform" />
            </button>

            {/* Carousel with Motion */}
            <div className="relative overflow-hidden" style={{ width: cardWidth, height: '400px', perspective: '1000px' }}>
              <motion.div
                ref={carouselRef}
                drag="x"
                dragConstraints={{
                  left: -(trackOffset * (postcards.length - 1)),
                  right: 0
                }}
                style={{
                  display: 'flex',
                  gap: `${gap}px`,
                  x,
                  cursor: 'grab'
                }}
                onDragEnd={handleDragEnd}
                animate={{ x: -(currentIndex * trackOffset) }}
                transition={SPRING_OPTIONS}
                whileTap={{ cursor: 'grabbing' }}
              >
                {postcards.map((postcard, index) => {
                  const isCenter = index === currentIndex;

                  return (
                    <PostcardItem
                      key={postcard.id}
                      postcard={postcard}
                      index={index}
                      trackOffset={trackOffset}
                      cardWidth={cardWidth}
                      x={x}
                      isCenter={isCenter}
                      onClick={() => {
                        if (isCenter) {
                          console.log('Open postcard:', postcard);
                          // TODO: Navigate to postcard detail
                        } else {
                          setCurrentIndex(index);
                          hideSwipeHint();
                        }
                      }}
                    />
                  );
                })}
              </motion.div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={handleNext}
              className="absolute right-8 z-20 w-16 h-16 bg-white/80 hover:bg-white border-3 border-journal-accent rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center group"
              aria-label="Next postcard"
            >
              <ChevronRight className="w-8 h-8 text-journal-accent group-hover:scale-125 transition-transform" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {postcards.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    hideSwipeHint();
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'bg-journal-accent'
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                  animate={{
                    width: index === currentIndex ? 32 : 12,
                    height: 12,
                    scale: index === currentIndex ? 1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  aria-label={`Go to postcard ${index + 1}`}
                />
              ))}
            </div>

            {/* Counter */}
            <div className="absolute top-8 right-8 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border-2 border-journal-accent/30 shadow-lg">
              <span className="font-bold text-journal-accent">
                {currentIndex + 1} / {postcards.length}
              </span>
            </div>

            {/* Swipe hint */}
            {showSwipeHint && postcards.length > 1 && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full border-2 border-journal-accent/30 shadow-lg swipe-hint z-20">
                <div className="flex items-center gap-2 text-journal-accent font-semibold">
                  <span className="text-xl">👆</span>
                  <span>Swipe or drag to browse</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Postcard Item Component - Handles the motion transform
function PostcardItem({
  postcard,
  index,
  trackOffset,
  cardWidth,
  x,
  isCenter,
  onClick,
}: {
  postcard: PostcardData;
  index: number;
  trackOffset: number;
  cardWidth: number;
  x: any;
  isCenter: boolean;
  onClick: () => void;
}) {
  // Create the 3D rotation transform - must be at top level!
  const range = [
    -(index + 1) * trackOffset,
    -index * trackOffset,
    -(index - 1) * trackOffset
  ];
  const outputRange = [45, 0, -45];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      style={{
        width: cardWidth,
        flexShrink: 0,
        rotateY: rotateY,
      }}
      onClick={onClick}
    >
      <PostcardDisplay
        postcard={postcard}
        isCenter={isCenter}
      />
    </motion.div>
  );
}

// Postcard Display Component
function PostcardDisplay({
  postcard,
  isCenter,
}: {
  postcard: PostcardData;
  isCenter: boolean;
}) {
  // Parse sticker data if it's a string
  const stickers = typeof postcard.sticker_data === 'string' 
    ? JSON.parse(postcard.sticker_data) 
    : postcard.sticker_data || [];

  return (
    <div
      className={`bg-white rounded-2xl shadow-2xl overflow-hidden cursor-pointer transition-all duration-500 ${
        isCenter 
          ? 'hover:shadow-3xl scale-100' 
          : 'hover:scale-105 scale-90 opacity-70'
      }`}
      style={{
        width: '520px',
        height: '380px',
        boxShadow: isCenter 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="relative h-full w-full bg-gradient-to-br from-journal-paper to-white">
        {/* Postcard border effect - Red and Blue stripes like actual postcard */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            border: '8px solid transparent',
            borderRadius: '16px',
            borderImage: `repeating-linear-gradient(
              45deg,
              #FF0000,
              #FF0000 8px,
              #0000FF 8px,
              #0000FF 16px
            ) 8`,
          }}
        />
        
        {/* Content Area - matching original postcard layout */}
        <div className="relative h-full w-full p-8 flex flex-col">
          {/* Message area - positioned like original */}
          <div className="flex-1 relative">
            <textarea 
              readOnly
              value={postcard.content || postcard.title}
              className="w-full h-full resize-none bg-transparent border-none outline-none"
              style={{ 
                fontFamily: '"Comic Sans MS", "Marker Felt", cursive',
                fontSize: isCenter ? '16px' : '14px',
                lineHeight: '1.8',
                color: '#2c3e50',
                padding: '8px',
              }}
            />
          </div>

          {/* Placed Stickers - render in exact positions */}
          {stickers.length > 0 && stickers.map((sticker: any, index: number) => (
            <div
              key={sticker.id || `sticker-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: sticker.x - 32, // Center the sticker (64px / 2)
                top: sticker.y - 32,
                transform: `rotate(${sticker.rotation || 0}deg)`,
                filter: sticker.hueRotate ? `hue-rotate(${sticker.hueRotate}deg)` : 'none',
                zIndex: 10,
              }}
            >
              <img 
                src={sticker.imageUrl || '/sticker.png'} 
                alt={sticker.name || 'sticker'}
                style={{
                  width: `${sticker.size || 64}px`,
                  height: `${sticker.size || 64}px`,
                  transform: `scale(${sticker.scale || 1})`,
                }}
              />
            </div>
          ))}

          {/* Bottom section - sender info */}
          <div className="pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center relative z-20">
            <div className="flex items-center gap-2">
              <span className="text-xl">📮</span>
              <span 
                className="font-semibold text-journal-accent"
                style={{ fontFamily: '"Comic Sans MS", cursive' }}
              >
                From: {postcard.sender_username || 'Anonymous'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(postcard.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Corner fold effect */}
        <div 
          className="absolute top-0 right-0 w-16 h-16 opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.05) 100%)',
            borderRadius: '0 16px 0 100%',
          }}
        />
      </div>
    </div>
  );
}
