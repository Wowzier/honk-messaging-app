'use client';

import React, { useRef, useEffect } from 'react';
import { HonkMessage } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PostcardGalleryProps {
  messages: (HonkMessage & { sender_username?: string })[];
  onMessageClick: (message: HonkMessage) => void;
  searchQuery?: string;
  statusFilter?: string;
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  scrollSpeed?: number;
  scrollEase?: number;
}

// Simple postcard renderer using HTML/CSS instead of WebGL
export default function PostcardGallery({
  messages,
  onMessageClick,
  searchQuery = '',
  statusFilter = 'all',
  bend = 3,
  textColor = '#ffffff',
  borderRadius = 0.05,
  scrollSpeed = 1.5,
  scrollEase = 0.1
}: PostcardGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef({ current: 0, target: 0, velocity: 0 });
  const rafRef = useRef<number>();



  // Move scroll functions outside of useEffect so they can be accessed by JSX
  const handleScrollLeft = () => {
    if (containerRef.current) {
      const cardWidth = containerRef.current.children.length > 0 ? (containerRef.current.children[0] as HTMLElement).offsetWidth + 8 : 408; // Default if no cards
      scrollRef.current.target -= cardWidth * 2; // Scroll two cards left
    }
  };

  const handleScrollRight = () => {
    if (containerRef.current) {
      const cardWidth = containerRef.current.children.length > 0 ? (containerRef.current.children[0] as HTMLElement).offsetWidth + 8 : 408; // Default if no cards
      scrollRef.current.target += cardWidth * 2; // Scroll two cards right
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let animationId: number;

    // Smooth scrolling with infinite loop
    const animate = () => {
      const current = scrollRef.current.current;
      const target = scrollRef.current.target;
      
      // Smooth interpolation
      const diff = target - current;
      scrollRef.current.current += diff * scrollEase;
      
      if (container) {
        // Dynamically calculate card width and halfWidth for infinite loop
        if (container.children.length > 0) {
          const firstCard = container.children[0] as HTMLElement;
          // Assuming 8px gap between cards, adjust if your CSS changes
          const cardWidth = firstCard.offsetWidth + 8;
          // Determine the number of original messages (before duplication)
          const numOriginalMessages = messages.length;
          const halfWidth = numOriginalMessages * cardWidth;

          // Infinite loop logic - when we reach the end, jump to beginning
          if (scrollRef.current.current >= halfWidth) {
            scrollRef.current.current -= halfWidth;
            scrollRef.current.target -= halfWidth;
          } else if (scrollRef.current.current < 0) {
            scrollRef.current.current += halfWidth;
            scrollRef.current.target += halfWidth;
          }
        }
        
        container.scrollLeft = scrollRef.current.current;
      }
      
      animationId = requestAnimationFrame(animate);
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      startScrollLeft = scrollRef.current.current;
      container.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
      isDown = false;
      container.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
      isDown = false;
      container.style.cursor = 'grab';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * scrollSpeed;
      scrollRef.current.target = startScrollLeft - walk;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollRef.current.target += e.deltaY * 0.8;
    };

    // Initialize
    scrollRef.current.current = 0;
    scrollRef.current.target = 0;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel);

    // Start animation
    animationId = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationId);
    };
  }, [scrollSpeed, scrollEase, messages.length]);

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'flying': return '✈️';
      case 'delivered': return '📬';
      case 'read': return '👀';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'flying': return 'bg-blue-100 border-blue-300';
      case 'delivered': return 'bg-green-100 border-green-300';
      case 'read': return 'bg-gray-100 border-gray-300';
      default: return 'bg-white border-gray-200';
    }
  };

  // Filter function for search
  const filterPostcard = (postcard: any, isDummy = false) => {
    const content = postcard.content.toLowerCase();
    const title = postcard.title.toLowerCase();
    const sender = isDummy ? postcard.sender.toLowerCase() : (postcard.sender_username || '').toLowerCase();
    const status = postcard.status;
    
    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return content.includes(query) || title.includes(query) || sender.includes(query);
    }
    
    return true;
  };

  // Filter messages
  const filteredMessages = messages.filter(msg => filterPostcard(msg, false));

  // Create duplicated arrays for endless loop
  const displayMessages = filteredMessages.length > 0 ? [...filteredMessages, ...filteredMessages] : [];

  const renderPostcard = (message: any, index: number, isDummy = false, keyPrefix = '') => {
    const rotation = Math.sin(index * 0.5) * bend;
    const marginTop = Math.sin(index * 0.3) * 20;
    
    return (
      <div
        key={`${keyPrefix}${isDummy ? 'dummy-' : ''}${isDummy ? index : message.id}`}
        className="flex-shrink-0 transform transition-transform duration-300 hover:scale-105"
        style={{
          transform: `rotate(${rotation}deg)`,
          marginTop: `${marginTop}px`
        }}
        onClick={() => isDummy ? console.log(`Clicked dummy postcard ${index + 1}`) : onMessageClick(message)}
      >
        <div
          className="relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
          style={{
            width: '420px',
            height: '290px',
            borderRadius: '6px',
            border: '4px solid #8B4513',
            background: `
              radial-gradient(circle at 85% 15%, #FFF8DC 0%, transparent 25%),
              radial-gradient(circle at 15% 85%, #F5DEB3 0%, transparent 25%),
              radial-gradient(circle at 1px 1px, rgba(139, 69, 19, 0.1) 1px, transparent 0),
              linear-gradient(90deg, rgba(139, 69, 19, 0.03) 50%, transparent 50%),
              linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 30%, #F5DEB3 100%)
            `,
            backgroundSize: '100px 100px, 100px 100px, 15px 15px, 2px 2px, 100% 100%',
            boxShadow: `
              8px 8px 16px rgba(139, 69, 19, 0.3),
              inset 0 0 0 1px rgba(255, 248, 220, 0.8),
              inset 2px 2px 4px rgba(255, 248, 220, 0.5),
              inset -2px -2px 4px rgba(139, 69, 19, 0.1)
            `,
            // Warm autumn glow
            filter: 'drop-shadow(0 0 6px rgba(255, 140, 0, 0.2)) drop-shadow(2px 2px 4px rgba(139, 69, 19, 0.15))',
            position: 'relative'
          }}
        >
          {/* Cozy Fall status indicator */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '4px 8px',
            background: 'linear-gradient(135deg, #F5DEB3 0%, #DEB887 100%)',
            border: '2px solid #8B4513',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: '"ChicagoFLF", "Chicago", monospace',
            boxShadow: `
              2px 2px 4px rgba(139, 69, 19, 0.3),
              inset 1px 1px 2px rgba(255, 248, 220, 0.7)
            `,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#2F1B14'
          }}>
            <span>
              {isDummy 
                ? (message.status === 'flying' ? '✈️' : 
                   message.status === 'delivered' ? '📬' : 
                   message.status === 'read' ? '👀' : '📝')
                : getStatusEmoji(message.status)
              }
            </span>
            <span style={{ fontSize: '9px', color: '#666' }}>
              {isDummy ? message.status : message.status}
            </span>
          </div>

          {/* Main content area */}
          <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Message content */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '16px',
                  lineHeight: '1.4',
                  zIndex: 10,
                  fontFamily: '"ChicagoFLF", "Chicago", monospace',
                  color: '#000',
                  maxHeight: '140px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  padding: '8px',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '2px'
                }}
              >
                {message.content}
              </div>

              {/* Render stickers if this is a postcard */}
              {!isDummy && message.message_type === 'postcard' && message.sticker_data && message.sticker_data.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {message.sticker_data.map((sticker: any, stickerIndex: number) => {
                    // PostcardMaker dimensions: 600x375px total container
                    // PostcardGallery dimensions: 400x280px total container
                    // Both have 24px padding, so coordinates are relative to the full container
                    
                    const MAKER_TOTAL_WIDTH = 600;
                    const MAKER_TOTAL_HEIGHT = 375;
                    const GALLERY_TOTAL_WIDTH = 400;
                    const GALLERY_TOTAL_HEIGHT = 280;
                    
                    // Calculate exact scaling ratios
                    const scaleX = GALLERY_TOTAL_WIDTH / MAKER_TOTAL_WIDTH;
                    const scaleY = GALLERY_TOTAL_HEIGHT / MAKER_TOTAL_HEIGHT;
                    
                    // Position: scale the coordinates proportionally
                    const scaledX = sticker.x * scaleX;
                    const scaledY = sticker.y * scaleY;
                    
                    // Size: scale the size proportionally (using average scale to maintain aspect ratio)
                    const avgScale = (scaleX + scaleY) / 2;
                    const baseSize = sticker.size || 40;
                    const originalSize = baseSize * (sticker.scale || 1);
                    const scaledSize = originalSize * avgScale;
                    
                    // Debug logging for first sticker
                    if (stickerIndex === 0) {
                      console.log('Sticker scaling debug:', {
                        originalX: sticker.x,
                        originalY: sticker.y,
                        scaledX: scaledX,
                        scaledY: scaledY,
                        scaleX: scaleX,
                        scaleY: scaleY,
                        originalSize: originalSize,
                        scaledSize: scaledSize,
                        rotation: sticker.rotation
                      });
                    }
                    
                    return (
                      <div
                        key={`sticker-${stickerIndex}`}
                        style={{
                          position: 'absolute',
                          left: `${scaledX}px`,
                          top: `${scaledY}px`,
                          width: `${scaledSize}px`,
                          height: `${scaledSize}px`,
                          transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: sticker.emoji ? `${scaledSize * 0.8}px` : undefined,
                          zIndex: 5,
                          lineHeight: 1,
                          overflow: 'visible',
                          // Sticker peel effect
                          filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.15))',
                          borderRadius: '2px'
                        }}
                      >
                        {/* Sticker background with peel effect */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: sticker.imageUrl 
                              ? `url(${sticker.imageUrl})` 
                              : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.8) 100%)',
                            backgroundSize: sticker.imageUrl ? 'contain' : 'auto',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            borderRadius: '2px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            // Peel corner effect
                            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
                            boxShadow: 'inset -1px -1px 2px rgba(0,0,0,0.05)'
                          }}
                        />
                        
                        {/* Corner peel highlight */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '0px',
                            right: '0px',
                            width: '4px',
                            height: '4px',
                            background: 'linear-gradient(225deg, rgba(255,255,255,0.8) 0%, rgba(200,200,200,0.3) 100%)',
                            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            borderRadius: '0 2px 0 0',
                            zIndex: 1
                          }}
                        />
                        
                        {/* Emoji or content */}
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            pointerEvents: 'none'
                          }}
                        >
                          {sticker.emoji && !sticker.imageUrl ? sticker.emoji : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom section - Mac-style sender info */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '12px',
                  color: '#333',
                  fontFamily: '"ChicagoFLF", "Chicago", monospace',
                  padding: '6px 12px',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #ccc',
                  borderRadius: '2px',
                  display: 'inline-block',
                  boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.1)'
                }}>
                  📮 From: <strong>{isDummy ? message.sender : (message.sender_username || 'Anonymous')}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Vintage Mac decorative corners */}
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '12px',
            height: '12px',
            border: '1px solid #ccc',
            borderRight: 'none',
            borderBottom: 'none',
            opacity: 0.3
          }} />
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '12px',
            height: '12px',
            border: '1px solid #ccc',
            borderLeft: 'none',
            borderBottom: 'none',
            opacity: 0.3
          }} />
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '4px',
            width: '12px',
            height: '12px',
            border: '1px solid #ccc',
            borderRight: 'none',
            borderTop: 'none',
            opacity: 0.3
          }} />
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '12px',
            height: '12px',
            border: '1px solid #ccc',
            borderLeft: 'none',
            borderTop: 'none',
            opacity: 0.3
          }} />

          {/* Corner peel effect for the entire postcard */}
          <div
            style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              width: '12px',
              height: '12px',
              background: 'linear-gradient(225deg, rgba(255,255,255,0.7) 0%, rgba(200,200,200,0.3) 100%)',
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
              borderRadius: '0 4px 0 0',
              zIndex: 15
            }}
          />

          {/* Mac-style highlight effect */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%)',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Mac-style Left Arrow */}
      <button
        onClick={handleScrollLeft}
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          backgroundColor: '#f0f0f0',
          border: '2px solid #333',
          borderRadius: '0',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '3px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)',
          fontSize: '16px',
          fontFamily: '"ChicagoFLF", "Chicago", monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.1s ease'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.3)';
          e.currentTarget.style.backgroundColor = '#e0e0e0';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)';
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)';
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
      >
        ◀
      </button>

      {/* Mac-style Right Arrow */}
      <button
        onClick={handleScrollRight}
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          backgroundColor: '#f0f0f0',
          border: '2px solid #333',
          borderRadius: '0',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '3px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)',
          fontSize: '16px',
          fontFamily: '"ChicagoFLF", "Chicago", monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.1s ease'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.3)';
          e.currentTarget.style.backgroundColor = '#e0e0e0';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)';
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.3), inset 1px 1px 0px rgba(255,255,255,0.5)';
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
      >
        ▶
      </button>

      <div
        ref={containerRef}
        className="flex gap-8 h-full overflow-x-auto overflow-y-hidden cursor-grab"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: '120px',
          paddingBottom: '40px',
          paddingLeft: '40px',
          paddingRight: '40px',
          alignItems: 'center'
        }}
      >
        {/* Real messages (duplicated for endless loop) */}
        {displayMessages.map((message, index) => renderPostcard(message, index, false))}

        {/* Mac-style Empty state when no messages */}
        {messages.length === 0 && (
          <div style={{ 
            flexShrink: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '420px', 
            height: '290px' 
          }}>
            <div style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#ffffff',
              border: '3px solid #333',
              borderRadius: '4px',
              boxShadow: '6px 6px 12px rgba(0,0,0,0.25)',
              fontFamily: '"ChicagoFLF", "Chicago", monospace'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>�</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', marginBottom: '8px' }}>
                Your mailbox is empty
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                No postcards have arrived yet
              </div>
              <div style={{
                fontSize: '11px',
                color: '#888',
                padding: '8px',
                backgroundColor: '#f8f8f8',
                border: '1px solid #ccc',
                borderRadius: '2px'
              }}>
                💡 Send your first postcard to get started!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}