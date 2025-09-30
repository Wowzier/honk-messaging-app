import React, { useState, useRef, useEffect } from 'react';
import Cookies from 'js-cookie';
import { MacWindow } from './MacWindow';
import { MacButton } from './MacButton';
import { StickerUploader } from './StickerUploader';
import { useRouter } from 'next/navigation';

interface Sticker {
  id: string;
  name: string;
  emoji?: string;
  imageUrl?: string;
  type: 'default' | 'user';
  x: number;
  y: number;
  size: number;
  rotation: number;
  scale: number;
}

interface PostcardData {
  message: string;
  location: string;
  recipient: string;
  shareState: string;
}

export const PostcardMaker: React.FC = () => {
  const router = useRouter();
  const [showStickers, setShowStickers] = useState(true); // Open by default
  const [showStickerUploader, setShowStickerUploader] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'yours'>('available');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postcard, setPostcard] = useState<PostcardData>({
    message: '',
    location: '',
    recipient: 'Someone Special',
    shareState: 'Share State'
  });
  const [draggedSticker, setDraggedSticker] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<{ 
    type: 'move' | 'resize' | 'rotate', 
    startX: number, 
    startY: number,
    initialValue: number,
    centerX: number,
    centerY: number,
    initialX?: number,
    initialY?: number
  } | null>(null);
  const postcardRef = useRef<HTMLDivElement>(null);
  const [availableStickers, setAvailableStickers] = useState([
    { id: 'apple1', name: 'Apple Juice', emoji: '🧃', color: '#90EE90', type: 'default' as const },
    { id: 'apple2', name: 'Apple Juice', emoji: '🧃', color: '#98FB98', type: 'default' as const },
    { id: 'apple3', name: 'Apple Juice', emoji: '🧃', color: '#87CEEB', type: 'default' as const },
    { id: 'heart', name: 'Heart', emoji: '💖', color: '#FFB6C1', type: 'default' as const },
    { id: 'star', name: 'Star', emoji: '⭐', color: '#FFD700', type: 'default' as const },
    { id: 'leaf', name: 'Leaf', emoji: '🍂', color: '#DEB887', type: 'default' as const },
    { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', color: '#FF7F50', type: 'default' as const },
    { id: 'coffee', name: 'Coffee', emoji: '☕', color: '#D2691E', type: 'default' as const }
  ]);
  const [userStickers, setUserStickers] = useState<Array<{ id: string; name: string; imageUrl: string; type: 'user' }>>([]);

  const handleCreateUserSticker = (newSticker: { id: string; name: string; imageUrl: string; type: 'user' }) => {
    setUserStickers(prev => [...prev, newSticker]);
    setShowStickerUploader(false);
  };

  const handleStickerDragStart = (stickerId: string) => {
    setDraggedSticker(stickerId);
  };

  const handlePostcardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedSticker || !postcardRef.current) return;

    const rect = postcardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check both available stickers and user stickers
    const allStickers = [...availableStickers, ...userStickers];
    const stickerData = allStickers.find(s => s.id === draggedSticker);
    
    if (stickerData) {
      const newSticker: Sticker = {
        id: `${stickerData.id}-${Date.now()}`,
        name: stickerData.name,
        emoji: 'emoji' in stickerData ? stickerData.emoji : undefined,
        imageUrl: 'imageUrl' in stickerData ? stickerData.imageUrl : undefined,
        type: stickerData.type,
        x: Math.max(0, Math.min(x - 20, 550)), // Keep within bounds for larger postcard
        y: Math.max(0, Math.min(y - 20, 320)),
        size: 40,
        rotation: 0,
        scale: 1
      };
      setStickers(prev => [...prev, newSticker]);
    }
    setDraggedSticker(null);
  };

  const handlePostcardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeSticker = (stickerId: string) => {
    setStickers(prev => prev.filter(s => s.id !== stickerId));
    setSelectedSticker(null);
  };

  const selectSticker = (stickerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSticker(selectedSticker === stickerId ? null : stickerId);
  };

  const updateStickerProperty = (stickerId: string, property: keyof Sticker, value: any) => {
    setStickers(prev => prev.map(sticker => 
      sticker.id === stickerId 
        ? { ...sticker, [property]: value }
        : sticker
    ));
  };

  const deselectSticker = (e: React.MouseEvent) => {
    // Don't deselect if currently dragging
    if (isDragging) return;
    
    // Only deselect if clicking directly on the postcard background
    if (e.target === e.currentTarget) {
      setSelectedSticker(null);
      setIsDragging(null);
    }
  };

  // Handle mouse interactions for direct manipulation
  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize' | 'rotate', stickerId: string) => {
    e.stopPropagation();
    
    const sticker = stickers.find(s => s.id === stickerId);
    if (!sticker || !postcardRef.current) return;

    const postcardRect = postcardRef.current.getBoundingClientRect();
    const centerX = postcardRect.left + sticker.x;
    const centerY = postcardRect.top + sticker.y;
    
    setIsDragging({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialValue: type === 'resize' ? sticker.scale : sticker.rotation,
      centerX,
      centerY,
      initialX: type === 'move' ? sticker.x : undefined,
      initialY: type === 'move' ? sticker.y : undefined
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectedSticker || !postcardRef.current) return;

      if (isDragging.type === 'move') {
        const deltaX = e.clientX - isDragging.startX;
        const deltaY = e.clientY - isDragging.startY;
        const newX = (isDragging.initialX || 0) + deltaX;
        const newY = (isDragging.initialY || 0) + deltaY;
        
        updateStickerProperty(selectedSticker, 'x', newX);
        updateStickerProperty(selectedSticker, 'y', newY);
      } else if (isDragging.type === 'resize') {
        const deltaX = e.clientX - isDragging.startX;
        const scaleFactor = 1 + (deltaX / 200); // Smooth scaling
        const newScale = Math.max(0.3, Math.min(3, isDragging.initialValue * scaleFactor));
        updateStickerProperty(selectedSticker, 'scale', newScale);
      } else if (isDragging.type === 'rotate') {
        // Calculate current angle from center to mouse
        const currentAngle = Math.atan2(
          e.clientY - isDragging.centerY,
          e.clientX - isDragging.centerX
        ) * (180 / Math.PI);
        
        // Calculate initial angle
        const initialAngle = Math.atan2(
          isDragging.startY - isDragging.centerY,
          isDragging.startX - isDragging.centerX
        ) * (180 / Math.PI);
        
        // Calculate rotation difference and apply to initial rotation
        const angleDiff = currentAngle - initialAngle;
        const newRotation = (isDragging.initialValue + angleDiff + 360) % 360;
        updateStickerProperty(selectedSticker, 'rotation', newRotation);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, selectedSticker]);

  // Keyboard shortcuts for selected sticker
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedSticker) return;
      
      const sticker = stickers.find(s => s.id === selectedSticker);
      if (!sticker) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          updateStickerProperty(selectedSticker, 'rotation', (sticker.rotation - 15 + 360) % 360);
          break;
        case 'ArrowRight':
          e.preventDefault();
          updateStickerProperty(selectedSticker, 'rotation', (sticker.rotation + 15) % 360);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateStickerProperty(selectedSticker, 'scale', Math.min(3, sticker.scale + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateStickerProperty(selectedSticker, 'scale', Math.max(0.3, sticker.scale - 0.1));
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          removeSticker(selectedSticker);
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedSticker(null);
          setIsDragging(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedSticker, stickers]);

  const clearPostcard = () => {
    setStickers([]);
    setSelectedSticker(null);
    setPostcard({
      message: '',
      location: '',
      recipient: 'Someone Special',
      shareState: 'Share State'
    });
  };

  const handleSendPostcard = async () => {
    if (!postcard.message.trim()) {
      alert('Please write a message before sending your postcard!');
      return;
    }

    setIsLoading(true);
    try {
      const authToken = Cookies.get('honk_auth_token') || localStorage.getItem('auth_token');
      if (!authToken) {
        alert('You must be logged in to send a postcard');
        return;
      }

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Fall Postcard',
          content: postcard.message.trim(),
          locationSharing: 'state', // Default for testing
          message_type: 'postcard',
          sticker_data: stickers.map(sticker => ({
            id: sticker.id,
            name: sticker.name,
            emoji: sticker.emoji,
            imageUrl: sticker.imageUrl,
            type: sticker.type,
            x: sticker.x,
            y: sticker.y,
            size: sticker.size,
            rotation: sticker.rotation,
            scale: sticker.scale
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send postcard');
      }

      const result = await response.json();

      // Success! Clear the form
      clearPostcard();

      // Navigate to inbox
      router.push('/inbox');

    } catch (error) {
      console.error('Error sending postcard:', error);
      alert('Failed to send postcard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wrapper" style={{ 
      margin: 0, 
      padding: 0, 
      height: "100vh", 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: `
        linear-gradient(45deg, #8B4513 1px, transparent 1px),
        linear-gradient(-45deg, #8B4513 1px, transparent 1px),
        linear-gradient(45deg, transparent 35%, #D2691E 35%, #D2691E 70%, transparent 70%),
        linear-gradient(-45deg, transparent 35%, #CD853F 35%, #CD853F 70%, transparent 70%),
        linear-gradient(135deg, #DEB887 25%, #F4A460 25%, #F4A460 50%, #DEB887 50%, #DEB887 75%, #F4A460 75%, #F4A460)
      `,
      backgroundSize: '40px 40px, 40px 40px, 80px 80px, 80px 80px, 20px 20px',
      backgroundPosition: '0 0, 0 0, 0 0, 0 0, 0 0',
      minHeight: '100vh',
      position: 'relative'
    }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/@sakun/system.css"
      />
      
      {/* Cozy Fall Floating Leaves */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1
      }}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              fontSize: `${20 + Math.random() * 15}px`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animation: `fallLeaves ${8 + Math.random() * 4}s linear infinite`,
              color: ['🍂', '🍁', '🌰', '🎃'][Math.floor(Math.random() * 4)] === '🎃' ? '#FF6B35' : '#8B4513'
            }}
          >
            {['🍂', '🍁', '🌰', '🎃', '🍄'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes fallLeaves {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'flex-start',
        maxWidth: '100vw',
        padding: '20px',
        zIndex: 2,
        position: 'relative'
      }}>
        {/* Cozy Fall Sticker Panel */}
        {showStickers && (
          <MacWindow title="🍂 Fall Stickers!" width="280px" height="520px">
            <div style={{
              padding: '12px',
              fontSize: '11px',
              textAlign: 'center',
              marginBottom: '8px',
              fontFamily: '"ChicagoFLF", "Chicago", monospace',
              color: '#2F1B14',
              backgroundColor: '#F5DEB3',
              border: '2px solid #8B4513',
              borderRadius: '2px'
            }}>
              🎨 Drag cozy stickers to your autumn postcard! 🍁
            </div>
            
            {/* Cozy Fall Create Sticker Button */}
            <div style={{
              padding: '0 12px',
              marginBottom: '12px'
            }}>
              <MacButton
                onClick={() => setShowStickerUploader(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontFamily: '"ChicagoFLF", "Chicago", monospace',
                  backgroundColor: '#D2691E',
                  color: '#FFF8DC',
                  fontWeight: 'bold',
                  border: '2px solid #8B4513',
                  boxShadow: '2px 2px 4px rgba(139, 69, 19, 0.3)'
                }}
              >
                <span style={{ fontSize: '16px' }}>🍁</span>
                Create Fall Sticker
              </MacButton>
            </div>

            {/* Cozy Fall Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #8B4513',
              marginBottom: '8px',
              backgroundColor: '#CD853F'
            }}>
              <button
                onClick={() => setActiveTab('available')}
                style={{
                  flex: 1,
                  fontSize: '11px',
                  padding: '8px 12px',
                  backgroundColor: activeTab === 'available' ? '#FFF8DC' : '#CD853F',
                  color: activeTab === 'available' ? '#8B4513' : '#FFF8DC',
                  border: '2px solid #8B4513',
                  borderBottom: activeTab === 'available' ? '2px solid #FFF8DC' : '2px solid #8B4513',
                  borderRadius: '0',
                  fontFamily: '"ChicagoFLF", "Chicago", monospace',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  position: 'relative',
                  zIndex: activeTab === 'available' ? 2 : 1,
                  marginBottom: activeTab === 'available' ? '-2px' : '0'
                }}
              >
                🎃 Fall Collection
              </button>
              <button
                onClick={() => setActiveTab('yours')}
                style={{
                  flex: 1,
                  fontSize: '11px',
                  padding: '8px 12px',
                  backgroundColor: activeTab === 'yours' ? '#FFF8DC' : '#CD853F',
                  color: activeTab === 'yours' ? '#8B4513' : '#FFF8DC',
                  border: '2px solid #8B4513',
                  borderBottom: activeTab === 'yours' ? '2px solid #FFF8DC' : '2px solid #8B4513',
                  borderRadius: '0',
                  fontFamily: '"ChicagoFLF", "Chicago", monospace',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  position: 'relative',
                  zIndex: activeTab === 'yours' ? 2 : 1,
                  marginBottom: activeTab === 'yours' ? '-2px' : '0'
                }}
              >
                � Your Creations
              </button>
            </div>

            {/* Clean Sticker Grid */}
            <div style={{
              height: '350px',
              border: '3px solid #8B4513',
              backgroundColor: '#FFF8DC',
              position: 'relative',
              borderRadius: '4px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '12px',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                // Custom scrollbar styles
                scrollbarWidth: 'thin',
                scrollbarColor: '#000 #f8f8f8'
              }}>
                {activeTab === 'available' ? (
                  availableStickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      draggable
                      onDragStart={(e) => {
                        // Create a custom drag image to prevent default browser behavior
                        const dragImg = document.createElement('div');
                        dragImg.innerHTML = sticker.emoji;
                        dragImg.style.position = 'absolute';
                        dragImg.style.top = '-1000px';
                        dragImg.style.fontSize = '32px';
                        dragImg.style.background = sticker.color;
                        dragImg.style.padding = '8px';
                        dragImg.style.border = '2px solid black';
                        document.body.appendChild(dragImg);
                        e.dataTransfer.setDragImage(dragImg, 20, 20);
                        setTimeout(() => document.body.removeChild(dragImg), 0);
                        
                        handleStickerDragStart(sticker.id);
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.cursor = 'grab';
                      }}
                      style={{
                        width: '80px',
                        height: '80px',
                        border: '2px solid black',
                        backgroundColor: sticker.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        cursor: 'grab',
                        userSelect: 'none',
                        // Add sticker peel effect to palette items too
                        filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))',
                        borderRadius: '4px',
                        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                        position: 'relative'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                      onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                      title={sticker.name}
                    >
                      {/* Corner peel for palette stickers */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0px',
                          right: '0px',
                          width: '6px',
                          height: '6px',
                          background: 'linear-gradient(225deg, rgba(255,255,255,0.7) 0%, rgba(200,200,200,0.3) 100%)',
                          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}
                      />
                      <span style={{ position: 'relative', zIndex: 2 }}>{sticker.emoji}</span>
                    </div>
                  ))
                ) : (
                  userStickers.length > 0 ? (
                    userStickers.map((sticker) => (
                      <div
                        key={sticker.id}
                        draggable
                        onDragStart={(e) => {
                          // Prevent default image dragging behavior
                          e.dataTransfer.effectAllowed = 'copy';
                          const dragImg = document.createElement('div');
                          dragImg.style.position = 'absolute';
                          dragImg.style.top = '-1000px';
                          dragImg.style.width = '80px';
                          dragImg.style.height = '80px';
                          dragImg.style.backgroundImage = `url(${sticker.imageUrl})`;
                          dragImg.style.backgroundSize = 'contain';
                          dragImg.style.backgroundRepeat = 'no-repeat';
                          dragImg.style.backgroundPosition = 'center';
                          dragImg.style.border = '2px solid black';
                          document.body.appendChild(dragImg);
                          e.dataTransfer.setDragImage(dragImg, 40, 40);
                          setTimeout(() => document.body.removeChild(dragImg), 0);
                          
                          handleStickerDragStart(sticker.id);
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.cursor = 'grab';
                        }}
                        style={{
                          width: '80px',
                          height: '80px',
                          border: '2px solid black',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          userSelect: 'none',
                          // Add sticker peel effect
                          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))',
                          borderRadius: '4px',
                          clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                          position: 'relative',
                          backgroundImage: `url(${sticker.imageUrl})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                        onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                        title={sticker.name}
                      >
                        {/* Corner peel for user stickers */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '0px',
                            right: '0px',
                            width: '6px',
                            height: '6px',
                            background: 'linear-gradient(225deg, rgba(255,255,255,0.7) 0%, rgba(200,200,200,0.3) 100%)',
                            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            zIndex: 1,
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '20px',
                      fontSize: '12px',
                      fontFamily: '"PixelFont", "Orbitron", monospace',
                      color: '#666'
                    }}>
                      No custom stickers yet.<br />
                      Click "Upload Sticker" to create one!
                    </div>
                  )
                )}
              </div>
            </div>
          </MacWindow>
        )}

        {/* Cozy Fall Postcard Window */}
        <MacWindow title="🍁 Autumn Postcard Maker 🎃" width="720px" height="580px">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            padding: '12px',
            gap: '10px',
            backgroundColor: '#F5DEB3'
          }}>
            {/* Cozy Fall Controls Bar */}
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '8px',
              padding: '6px 12px',
              borderBottom: '2px solid #8B4513',
              backgroundColor: '#DEB887',
              borderRadius: '4px 4px 0 0'
            }}>
              {/* Small toggle button for stickers */}
              <button
                onClick={() => setShowStickers(!showStickers)}
                onMouseEnter={(e) => {
                  if (!showStickers) {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showStickers) {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: '"PixelFont", "Chicago", monospace',
                  padding: '2px 6px',
                  border: '1px solid #000',
                  backgroundColor: showStickers ? '#000' : '#fff',
                  color: showStickers ? '#fff' : '#000',
                  cursor: 'pointer',
                  borderRadius: '0',
                  minWidth: '60px',
                  transition: 'background-color 0.1s ease'
                }}
                title={showStickers ? 'Hide sticker palette' : 'Show sticker palette'}
              >
                {showStickers ? '◀ Hide' : '▶ Stickers'}
              </button>
              
              {/* Small clear button */}
              <button
                onClick={clearPostcard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: '"PixelFont", "Chicago", monospace',
                  padding: '2px 6px',
                  border: '1px solid #000',
                  backgroundColor: '#fff',
                  color: '#000',
                  cursor: 'pointer',
                  borderRadius: '0',
                  minWidth: '45px',
                  transition: 'background-color 0.1s ease'
                }}
                title="Clear all stickers and text"
              >
                ✕ Clear
              </button>

              {/* Inbox button */}
              <button
                onClick={() => router.push('/inbox')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: '"PixelFont", "Chicago", monospace',
                  padding: '2px 6px',
                  border: '1px solid #000',
                  backgroundColor: '#fff',
                  color: '#000',
                  cursor: 'pointer',
                  borderRadius: '0',
                  minWidth: '50px',
                  transition: 'background-color 0.1s ease'
                }}
                title="Go to inbox"
              >
                📬 Inbox
              </button>
            </div>

            {/* Clean White Postcard Area */}
            <div
              ref={postcardRef}
              onDrop={handlePostcardDrop}
              onDragOver={handlePostcardDragOver}
              onClick={deselectSticker}
              style={{
                width: '620px',
                height: '385px',
                border: '4px solid #8B4513',
                backgroundColor: '#ffffff',
                position: 'relative',
                padding: '24px',
                margin: '0 auto',
                boxShadow: '6px 6px 12px rgba(139, 69, 19, 0.3)',
                borderRadius: '6px'
              }}
            >
              {/* Main Message Area */}
              <div style={{
                textAlign: 'center',
                marginBottom: '30px'
              }}>
                <input
                  type="text"
                  placeholder="What are you doing this fall?"
                  value={postcard.message}
                  onChange={(e) => setPostcard(prev => ({ ...prev, message: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '18px',
                    fontFamily: '"PixelFont", "Orbitron", monospace',
                    textAlign: 'center',
                    width: '100%',
                    color: '#000000',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Stickers on postcard */}
              {stickers.map((sticker) => {
                const isSelected = selectedSticker === sticker.id;
                const baseSize = sticker.size;
                const finalSize = baseSize * sticker.scale;
                
                return (
                  <div key={sticker.id} style={{ position: 'relative' }}>
                    {/* Main Sticker with Peel Effect */}
                    <div
                      onClick={(e) => selectSticker(sticker.id, e)}
                      onMouseDown={(e) => {
                        if (isSelected) {
                          handleMouseDown(e, 'move', sticker.id);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: sticker.x,
                        top: sticker.y,
                        width: `${finalSize}px`,
                        height: `${finalSize}px`,
                        cursor: isSelected ? (isDragging?.type === 'move' ? 'grabbing' : 'grab') : 'pointer',
                        userSelect: 'none',
                        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: sticker.emoji ? `${Math.min(finalSize * 0.8, finalSize)}px` : undefined,
                        zIndex: isSelected ? 10 : 1,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        lineHeight: 1,
                        overflow: 'visible',
                        // Sticker peel effect - subtle shadow and slight border
                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.15))',
                        borderRadius: '4px'
                      }}
                      title={isSelected ? "Drag to move" : "Click to select"}
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
                          borderRadius: '4px',
                          border: '1px solid rgba(0,0,0,0.1)',
                          // Peel corner effect
                          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                          boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.05)'
                        }}
                      />
                      
                      {/* Corner peel highlight */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0px',
                          right: '0px',
                          width: '8px',
                          height: '8px',
                          background: 'linear-gradient(225deg, rgba(255,255,255,0.8) 0%, rgba(200,200,200,0.3) 100%)',
                          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                          borderRadius: '0 4px 0 0',
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

                    {/* Retro Selection UI */}
                    {isSelected && (
                      <>
                        {/* Simple Delete Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSticker(sticker.id);
                          }}
                          style={{
                            position: 'absolute',
                            left: sticker.x + finalSize / 2 + 12,
                            top: sticker.y - finalSize / 2 - 12,
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#000',
                            color: '#fff',
                            border: '2px solid #000',
                            borderRadius: '0',
                            cursor: 'pointer',
                            pointerEvents: 'all',
                            zIndex: 15,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontFamily: '"PixelFont", "Chicago", monospace',
                            fontWeight: 'bold',
                            boxShadow: '2px 2px 0 -1px #000',
                            userSelect: 'none'
                          }}
                          title="Delete sticker"
                          onMouseDown={(e) => e.currentTarget.classList.add('clickyblinky')}
                          onMouseUp={(e) => setTimeout(() => e.currentTarget.classList.remove('clickyblinky'), 300)}
                        >
                          ×
                        </div>

                        {/* Retro Selection Box */}
                        <div
                          style={{
                            position: 'absolute',
                            left: sticker.x,
                            top: sticker.y,
                            width: `${finalSize + 20}px`,
                            height: `${finalSize + 20}px`,
                            transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                            border: '2px dashed #000',
                            backgroundColor: 'transparent',
                            pointerEvents: 'none',
                            zIndex: 11
                          }}
                        >
                          {/* Corner Resize Handles - Retro Style */}
                          {[
                            { top: '-6px', left: '-6px', cursor: 'nw-resize' },
                            { top: '-6px', right: '-6px', cursor: 'ne-resize' },
                            { bottom: '-6px', left: '-6px', cursor: 'sw-resize' },
                            { bottom: '-6px', right: '-6px', cursor: 'se-resize' }
                          ].map((pos, i) => (
                            <div
                              key={`corner-${i}`}
                              onMouseDown={(e) => handleMouseDown(e, 'resize', sticker.id)}
                              style={{
                                position: 'absolute',
                                ...pos,
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#fff',
                                border: '2px solid #000',
                                borderRadius: '0',
                                cursor: pos.cursor,
                                pointerEvents: 'all',
                                zIndex: 12,
                                boxShadow: '1px 1px 0 0 #000'
                              }}
                            />
                          ))}

                          {/* Side Resize Handles - Retro Style */}
                          {[
                            { top: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
                            { bottom: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
                            { left: '-6px', top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' },
                            { right: '-6px', top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' }
                          ].map((pos, i) => (
                            <div
                              key={`side-${i}`}
                              onMouseDown={(e) => handleMouseDown(e, 'resize', sticker.id)}
                              style={{
                                position: 'absolute',
                                ...pos,
                                width: '12px',
                                height: '6px',
                                backgroundColor: '#fff',
                                border: '2px solid #000',
                                borderRadius: '0',
                                cursor: pos.cursor,
                                pointerEvents: 'all',
                                zIndex: 12,
                                boxShadow: '1px 1px 0 0 #000'
                              }}
                            />
                          ))}
                        </div>

                        {/* Retro Rotation Handle */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'rotate', sticker.id)}
                          style={{
                            position: 'absolute',
                            left: sticker.x,
                            top: sticker.y + finalSize / 2 + 30,
                            transform: 'translateX(-50%)',
                            width: '20px',
                            height: '20px',
                            backgroundColor: '#fff',
                            border: '2px solid #000',
                            borderRadius: '50%',
                            cursor: isDragging?.type === 'rotate' ? 'grabbing' : 'grab',
                            pointerEvents: 'all',
                            zIndex: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '1px 1px 0 0 #000'
                          }}
                          title="Drag to rotate"
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#000',
                              borderRadius: '50%'
                            }}
                          />
                        </div>

                        {/* Connection Line to Rotation Handle - Retro Style */}
                        <div
                          style={{
                            position: 'absolute',
                            left: sticker.x,
                            top: sticker.y + finalSize / 2 + 10,
                            width: '2px',
                            height: '20px',
                            backgroundColor: '#000',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                            zIndex: 10
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Bottom Section */}
              <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '24px',
                right: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'end',
                fontSize: '14px',
                fontFamily: '"PixelFont", "Orbitron", monospace',
                color: '#000000'
              }}>
                <div>
                  <div style={{ marginBottom: '6px' }}>
                    <span>Location: </span>
                    <input
                      type="text"
                      placeholder="Where are you?"
                      value={postcard.location}
                      onChange={(e) => setPostcard(prev => ({ ...prev, location: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontFamily: '"PixelFont", "Orbitron", monospace',
                        color: '#000000',
                        outline: 'none',
                        width: '120px',
                        borderBottom: '1px dotted #999'
                      }}
                    />
                  </div>
                  <div>
                    <span>Lines: {postcard.message.split('\n').length}/6</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <select
                      value={postcard.shareState}
                      onChange={(e) => setPostcard(prev => ({ ...prev, shareState: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        border: '2px solid black',
                        fontSize: '12px',
                        fontFamily: '"PixelFont", "Orbitron", monospace',
                        backgroundColor: 'white',
                        color: '#000000',
                        padding: '4px 6px',
                        borderRadius: '0'
                      }}
                    >
                      <option>Share State</option>
                      <option>Public</option>
                      <option>Private</option>
                      <option>Friends Only</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px' }}>{postcard.message.length} chars To: </span>
                    <input
                      type="text"
                      placeholder="Someone Special"
                      value={postcard.recipient}
                      onChange={(e) => setPostcard(prev => ({ ...prev, recipient: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontFamily: '"PixelFont", "Orbitron", monospace',
                        outline: 'none',
                        width: '100px',
                        borderBottom: '1px dotted #999'
                      }}
                    />
                    <MacButton
                      onClick={handleSendPostcard}
                      disabled={!postcard.message.trim() || isLoading}
                      style={{
                        backgroundColor: isLoading ? '#ccc' : '#4CAF50',
                        color: '#fff',
                        fontSize: '12px',
                        padding: '6px 12px',
                        fontWeight: 'bold',
                        minWidth: '100px',
                        fontFamily: '"PixelFont", "Orbitron", monospace'
                      }}
                    >
                      {isLoading ? '✈️ Sending...' : '📮 Send Postcard'}
                    </MacButton>
                  </div>
                </div>
              </div>
            </div>



            {/* Clean Status Bar */}
            <div style={{
              padding: '8px 16px',
              border: '2px solid #8B4513',
              fontSize: '11px',
              backgroundColor: '#DEB887',
              color: '#2F1B14',
              textAlign: 'left',
              fontFamily: '"ChicagoFLF", "Chicago", monospace',
              marginTop: '8px',
              borderRadius: '0 0 4px 4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span>📎 {stickers.length} stickers</span>
                <span>📝 {postcard.message.length} chars</span>
                <span>📏 {postcard.message.split('\n').length} lines</span>
              </div>
              <div style={{ fontSize: '10px', color: '#666', maxWidth: '300px', textAlign: 'right' }}>
                {selectedSticker ? (
                  isDragging ? 
                    `${isDragging.type === 'move' ? '✋ Moving' : isDragging.type === 'resize' ? '🔍 Resizing' : '🔄 Rotating'} sticker...` : 
                    '🎯 Selected • Arrow keys: rotate/scale • Del: remove'
                ) : (
                  '� Click sticker to select • Drag from palette to add'
                )}
              </div>
            </div>
          </div>
        </MacWindow>
      </div>

      {/* Sticker Uploader Modal */}
      <StickerUploader
        isOpen={showStickerUploader}
        onClose={() => setShowStickerUploader(false)}
        onCreateSticker={handleCreateUserSticker}
      />
    </div>
  );
};