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

  const dummyMessages = [
    { content: "Hey! How's your fall going? I've been enjoying the crisp weather and all the beautiful leaves changing colors.", sender: "Alice", title: "Fall Vibes", status: "delivered" },
    { content: "Just wanted to say hi and see how you're doing. Hope you're having a great day!", sender: "Bob", title: "Quick Hello", status: "flying" },
    { content: "Remember when we used to send postcards during our travels? Those were the days! Missing those adventures.", sender: "Charlie", title: "Travel Memories", status: "delivered" },
    { content: "The weather here is absolutely perfect for hiking. You should come visit sometime soon!", sender: "Diana", title: "Perfect Weather", status: "read" },
    { content: "I found this amazing coffee shop downtown. Their autumn latte is incredible! You'd love it.", sender: "Eve", title: "Coffee Discovery", status: "delivered" },
    { content: "Thinking of you and hoping you're doing well. Let's catch up soon over dinner!", sender: "Frank", title: "Catch Up Soon", status: "flying" },
    { content: "The sunset tonight was absolutely breathtaking. Wish you could have seen it with me!", sender: "Grace", title: "Beautiful Sunset", status: "delivered" },    { content: "Just finished reading that book you recommended. It was amazing! Thanks for the suggestion.", sender: "Henry", title: "Book Recommendation", status: "read" },
    { content: "Planning a weekend getaway and thought you might want to join. Let me know if you're interested!", sender: "Ivy", title: "Weekend Plans", status: "delivered" },
    { content: "Hope your week is going smoothly. Sending you positive vibes and good energy!", sender: "Jack", title: "Good Vibes", status: "flying" }
  ];

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
          const numOriginalMessages = messages.length > 0 ? messages.length : dummyMessages.length;
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
  }, [scrollSpeed, scrollEase, messages.length, dummyMessages.length]);

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

  // Filter messages and dummy messages
  const filteredMessages = messages.filter(msg => filterPostcard(msg, false));
  const filteredDummyMessages = dummyMessages.filter(msg => filterPostcard(msg, true));

  // Create duplicated arrays for endless loop
  const displayMessages = filteredMessages.length > 0 ? [...filteredMessages, ...filteredMessages] : [];
  const displayDummyMessages = filteredDummyMessages.length > 0 ? [...filteredDummyMessages, ...filteredDummyMessages] : [];

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
          className={`relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
            isDummy 
              ? (message.status === 'flying' ? 'bg-blue-100 border-blue-300' :
                 message.status === 'delivered' ? 'bg-green-100 border-green-300' :
                 message.status === 'read' ? 'bg-gray-100 border-gray-300' :
                 'bg-white border-gray-200')
              : getStatusColor(message.status)
          }`}
          style={{
            width: '400px',
            height: '280px',
            borderRadius: `${borderRadius * 100}px`,
            borderWidth: '3px',
            borderStyle: 'solid',
            borderImage: `repeating-linear-gradient(
              45deg,
              #FF0000,
              #FF0000 10px,
              #0000FF 10px,
              #0000FF 20px
            ) 3`,
            background: 'white',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}
        >
          {/* Status indicator */}
          <div className="absolute top-3 right-3 text-2xl">
            {isDummy 
              ? (message.status === 'flying' ? '✈️' : 
                 message.status === 'delivered' ? '📬' : 
                 message.status === 'read' ? '👀' : '📝')
              : getStatusEmoji(message.status)
            }
          </div>

          {/* Main content area */}
          <div className="p-6 h-full flex flex-col">
            {/* Message content */}
            <div className="flex-1 flex items-center justify-center">
              <div
                className="text-center text-lg leading-relaxed"
                style={{
                  fontFamily: 'cursive, "Comic Sans MS", sans-serif',
                  color: '#2c3e50',
                  maxHeight: '140px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {message.content}
              </div>
            </div>

            {/* Bottom section */}
            <div className="mt-4 space-y-2">
              {/* From/To info */}
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>From: {isDummy ? message.sender : (message.sender_username || 'Anonymous')}</div>
                <div>
                  {isDummy 
                    ? new Date(Date.now() - index * 86400000).toLocaleDateString()
                    : new Date(message.created_at).toLocaleDateString()
                  }
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <div
                  className="font-bold text-lg"
                  style={{
                    fontFamily: 'cursive, "Comic Sans MS", sans-serif',
                    color: '#2c3e50'
                  }}
                >
                  {message.title}
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-2 left-2 w-4 h-4 bg-red-500 rounded-full opacity-20"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 bg-blue-500 rounded-full opacity-20"></div>
          <div className="absolute top-1/2 left-1 w-2 h-2 bg-yellow-500 rounded-full opacity-30"></div>

          {/* Shadow/reflection effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
              borderRadius: `${borderRadius * 100}px`
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Left Arrow */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10 shadow-lg transition-all duration-300"
        onClick={handleScrollLeft}
      >
        <ChevronLeft size={24} />
      </button>

      {/* Right Arrow */}
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10 shadow-lg transition-all duration-300"
        onClick={handleScrollRight}
      >
        <ChevronRight size={24} />
      </button>

      <div
        ref={containerRef}
        className="flex gap-8 h-full overflow-x-auto overflow-y-hidden cursor-grab"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' },
          paddingTop: '120px',
          paddingBottom: '40px',
          paddingLeft: '40px',
          paddingRight: '40px',
          alignItems: 'center'
        }}
      >
        {/* Real messages (duplicated for endless loop) */}
        {displayMessages.map((message, index) => renderPostcard(message, index, false))}

        {/* Dummy postcards for testing when no messages (tripled for endless loop) */}
        {messages.length === 0 && displayDummyMessages.map((dummy, index) => renderPostcard(dummy, index, true, 'loop-'))}
      </div>
    </div>
  );
}