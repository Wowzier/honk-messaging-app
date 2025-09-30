"use client"

import { useState, useRef, useMemo } from "react"
import { PaintbrushIcon, PencilIcon, X, RotateCcw, ChevronUp, ChevronDown, InboxIcon, StickerIcon, Send } from "lucide-react"
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import ParallaxCanvas from "@/components/ParallaxCanvas"
import { StickerPalette } from "@/components/StickerPalette"
import { DraggableResizableSticker } from "@/components/DraggableResizableSticker"
import { ColorWheelPicker } from "@/components/ColorWheelPicker"
import { useAuth } from '@/hooks/useAuth'

interface DrawingPoint {
  x: number
  y: number
}

interface PlacedSticker {
  id: string
  content: string
  type: 'emoji' | 'image'
  x: number
  y: number
  width: number
  height: number
}

// Define layers outside component to prevent re-creation
const PARALLAX_LAYERS = [
  { src: "/forest/background1/Plan-5.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
  { src: "/forest/background1/Plan-4.png", speed: 0.3, yOffset: 0, alt: "Layer 4" },
  { src: "/forest/background1/Plan-3.png", speed: 0.5, yOffset: 0, alt: "Layer 3" },
  { src: "/forest/background1/Plan-2.png", speed: 0.7, yOffset: 0, alt: "Layer 2" },
  { src: "/forest/background1/Plan-1.png", speed: 0.9, yOffset: 0, alt: "Layer 1" },
];

// Helper function to convert emoji to data URL
const createEmojiImage = (emoji: string): string => {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = '80px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 50, 50)
  }
  return canvas.toDataURL()
}

export default function AnimalCrossingPostcard() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedTool, setSelectedTool] = useState<string>("keyboard")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentColor, setCurrentColor] = useState("#000000")
  const [lastPoint, setLastPoint] = useState<DrawingPoint | null>(null)
  const [drawingHistory, setDrawingHistory] = useState<string[]>([]) // Stack for undo
  const [brushWidth, setBrushWidth] = useState(4) // Brush width control
  const [showStickerPalette, setShowStickerPalette] = useState(false)
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([])
  const [draggedSticker, setDraggedSticker] = useState<{ type: 'emoji' | 'image', content: string } | null>(null)
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [isInteractingWithSticker, setIsInteractingWithSticker] = useState(false)
  const [isDraggingSticker, setIsDraggingSticker] = useState<{
    type: 'move' | 'resize' | 'rotate'
    startX: number
    startY: number
    initialValue: number
    centerX: number
    centerY: number
    initialX?: number
    initialY?: number
  } | null>(null)
  const postcardRef = useRef<HTMLDivElement>(null)
  const courierId = useMemo(() => user?.username ?? 'Courier', [user])

  // Improved drawing functionality with smoothing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === "keyboard" || isInteractingWithSticker) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setIsDrawing(true)
    setLastPoint({ x, y })
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.strokeStyle = currentColor
      ctx.lineWidth = brushWidth // Use dynamic brush width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 0.9
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || selectedTool === "keyboard" || isInteractingWithSticker) return
    
    const canvas = canvasRef.current
    if (!canvas || !lastPoint) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Draw smooth line using quadratic curve
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, (x + lastPoint.x) / 2, (y + lastPoint.y) / 2)
      ctx.stroke()
      setLastPoint({ x, y })
    }
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      // Save canvas state to history when done drawing
      const canvas = canvasRef.current
      const dataUrl = canvas.toDataURL()
      setDrawingHistory(prev => [...prev, dataUrl])
    }
    setIsDrawing(false)
    setLastPoint(null)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const undoLastAction = () => {
    if (drawingHistory.length === 0) {
      clearCanvas()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Remove the last action
    const newHistory = [...drawingHistory]
    newHistory.pop()
    setDrawingHistory(newHistory)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Redraw from history
    if (newHistory.length > 0) {
      const img = new Image()
      img.src = newHistory[newHistory.length - 1]
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
      }
    }
  }

  const handleToolClick = (tool: string, color?: string) => {
    setSelectedTool(tool)
    if (color) {
      setCurrentColor(color)
    }
  }

  const handleStickerDragStart = (stickerId: string, type: 'emoji' | 'image', content: string) => {
    setDraggedSticker({ type, content })
  }

  const handlePostcardDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedSticker || !postcardRef.current) return

    const rect = postcardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newSticker: PlacedSticker = {
      id: `sticker-${Date.now()}`,
      content: draggedSticker.content,
      type: draggedSticker.type,
      x: Math.max(20, Math.min(x, rect.width - 100)),
      y: Math.max(20, Math.min(y, rect.height - 100)),
      width: 80,
      height: 80
    }
    setPlacedStickers(prev => [...prev, newSticker])
    setDraggedSticker(null)
  }

  const handlePostcardDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const removeSticker = (stickerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setPlacedStickers(prev => prev.filter(s => s.id !== stickerId))
    setSelectedSticker(null)
  }

  const updateSticker = (id: string, x: number, y: number, width: number, height: number) => {
    setPlacedStickers(prev => 
      prev.map(sticker => 
        sticker.id === id 
          ? { ...sticker, x, y, width, height }
          : sticker
      )
    )
  }

  const selectSticker = (stickerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSticker(selectedSticker === stickerId ? null : stickerId)
  }

  const updateStickerProperty = (stickerId: string, property: keyof PlacedSticker, value: any) => {
    setPlacedStickers(prev => prev.map(sticker => 
      sticker.id === stickerId 
        ? { ...sticker, [property]: value }
        : sticker
    ))
  }

  const handleSendPostcard = async () => {
    if (!message.trim()) {
      alert('Please write a message before sending your postcard!')
      return
    }

    setIsLoading(true)
    try {
      const authToken = Cookies.get('honk_auth_token') || localStorage.getItem('auth_token')
      if (!authToken) {
        alert('You must be logged in to send a postcard')
        router.push('/auth')
        return
      }

      // Get canvas data
      const canvas = canvasRef.current
      const canvasData = canvas?.toDataURL('image/png') || null

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Journal Entry',
          content: message.trim(),
          locationSharing: 'state',
          message_type: 'postcard',
          canvas_data: canvasData
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send postcard')
      }

      // Success! Clear the form
      setMessage("")
      clearCanvas()
      setDrawingHistory([])

      // Navigate to inbox
      router.push('/inbox')

    } catch (error) {
      console.error('Error sending postcard:', error)
      alert('Failed to send postcard. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/inbox')
  }

  return (
    <div className="h-screen w-screen fixed inset-0 overflow-hidden" style={{ background: 'transparent' }}>
      {/* Parallax Background - always visible */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <ParallaxCanvas
          layers={PARALLAX_LAYERS}
          initialSpeed={1}
          fullScreen={false}
        />
        {/* Transparent texture overlay on parallax background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.3) 2px, transparent 2px),
              radial-gradient(circle, rgba(255,255,255,0.2) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '20px 20px, 30px 30px',
            backgroundPosition: '0 0, 10px 10px',
            opacity: 0.35,
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative h-full w-full flex flex-col items-center justify-center p-4 gap-4 pointer-events-auto" style={{ zIndex: 1 }}>
        <div className="bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full border-2 border-journal-accent shadow-lg text-journal-accent font-semibold">
          Courier ID: <span className="text-journal-marker-black">{courierId}</span>
        </div>
        {/* Top toolbar - cute and compact */}
        <div className="bg-journal-paper/95 backdrop-blur-sm px-6 py-3 rounded-full border-4 border-white shadow-lg flex items-center gap-3">
          {/* Undo button */}
          <button 
            onClick={undoLastAction}
            className="w-10 h-10 rounded-full bg-white hover:bg-journal-button-light border-2 border-journal-accent/30 flex items-center justify-center hover:scale-110 transition-all"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4 text-journal-accent" />
          </button>

          <div className="w-px h-8 bg-journal-accent/20" /> {/* Divider */}

          {/* Tool buttons */}
          <div className="flex items-center gap-2">
            {/* Paintbrush or Pencil (switch to typing mode) */}
            <button
              onClick={() => handleToolClick("keyboard")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "keyboard" 
                  ? "bg-journal-accent border-journal-accent shadow-md" 
                  : "bg-white border-journal-accent/30 hover:border-journal-accent/50"
              }`}
              title="Type text"
            >
              {selectedTool === "keyboard" ? (
                <PaintbrushIcon className="w-4 h-4 text-white" />
              ) : (
                <PencilIcon className="w-4 h-4 text-journal-accent" />
              )}
            </button>

            {/* Eraser */}
            <button
              onClick={() => handleToolClick("eraser", "#FFFFFF")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "eraser" 
                  ? "bg-gray-200 border-gray-400 shadow-md ring-2 ring-journal-highlight" 
                  : "bg-white border-journal-accent/30"
              }`}
              title="Eraser"
            >
              <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-sm" />
            </button>

            {/* Black marker */}
            <button
              onClick={() => handleToolClick("black", "#000000")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "black" 
                  ? "bg-journal-marker-black border-journal-marker-black shadow-md ring-2 ring-journal-highlight" 
                  : "bg-white border-journal-accent/30"
              }`}
              title="Black marker"
            >
              <div className="w-3 h-6 bg-journal-marker-black rounded-full transform -rotate-12" />
            </button>

            {/* Cyan marker */}
            <button
              onClick={() => handleToolClick("cyan", "#4dd0e1")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "cyan" 
                  ? "bg-journal-accent border-journal-accent shadow-md ring-2 ring-journal-highlight" 
                  : "bg-white border-journal-accent/30"
              }`}
              title="Cyan marker"
            >
              <div className="w-3 h-6 bg-journal-accent rounded-full transform -rotate-12" />
            </button>

            {/* Pink marker */}
            <button
              onClick={() => handleToolClick("pink", "#ff9e9e")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "pink" 
                  ? "bg-journal-doodle border-journal-doodle shadow-md ring-2 ring-journal-highlight" 
                  : "bg-white border-journal-accent/30"
              }`}
              title="Pink marker"
            >
              <div className="w-3 h-6 bg-journal-doodle rounded-full transform -rotate-12" />
            </button>

            {/* Yellow marker */}
            <button
              onClick={() => handleToolClick("yellow", "#ffeb3b")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "yellow" 
                  ? "bg-journal-marker-yellow border-journal-marker-yellow shadow-md ring-2 ring-journal-highlight" 
                  : "bg-white border-journal-accent/30"
              }`}
              title="Yellow marker"
            >
              <div className="w-3 h-6 bg-journal-marker-yellow rounded-full transform -rotate-12" />
            </button>

            {/* Brown marker */}
            <button
              onClick={() => handleToolClick("brown", "#8b7355")}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
                selectedTool === "brown" 
                  ? "bg-journal-button border-journal-button shadow-md ring-2 ring-journal-highlight" 
                  : "bg-white border-journal-accent/30"
              }`}
              title="Brown marker"
            >
              <div className="w-3 h-6 bg-journal-button rounded-full transform -rotate-12" />
            </button>

            {/* Color wheel picker */}
            <ColorWheelPicker
              currentColor={currentColor}
              onColorChange={(color) => {
                setCurrentColor(color)
                setSelectedTool("custom")
              }}
            />
          </div>

          <div className="w-px h-8 bg-journal-accent/20" /> {/* Divider */}

          {/* Sticker button */}
          <button
            onClick={() => setShowStickerPalette(!showStickerPalette)}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all ${
              showStickerPalette
                ? 'bg-journal-accent border-journal-accent shadow-md'
                : 'bg-white border-journal-accent/30 hover:border-journal-accent/50'
            }`}
            title="Toggle sticker palette"
          >
            <StickerIcon className={`w-5 h-5 ${showStickerPalette ? 'text-white' : 'text-journal-accent'}`} />
          </button>

          {selectedTool !== "keyboard" && selectedTool !== "sticker" && (
            <>
              <div className="w-px h-8 bg-journal-accent/20" /> {/* Divider */}
              
              {/* Brush width slider - cute and compact */}
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs font-semibold text-journal-button">Size</span>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(Number(e.target.value))}
                  className="w-20 h-2 bg-journal-accent/20 rounded-full appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, ${currentColor} 0%, ${currentColor} ${((brushWidth - 2) / 18) * 100}%, rgba(77, 208, 225, 0.2) ${((brushWidth - 2) / 18) * 100}%, rgba(77, 208, 225, 0.2) 100%)`
                  }}
                />
                <div 
                  className="rounded-full border border-gray-300"
                  style={{ 
                    width: `${brushWidth}px`, 
                    height: `${brushWidth}px`, 
                    minWidth: '2px', 
                    minHeight: '2px',
                    backgroundColor: currentColor
                  }}
                  title={`${brushWidth}px`}
                />
              </div>
            </>
          )}
        </div>

        {/* Postcard without drop shadow - white background */}
        <div className="w-full max-w-4xl">
          <div className="bg-white p-8 rounded-2xl border shadow-inner relative" style={{ borderColor: '#e5e5e5' }}>
            {/* Canvas and text area - increased size to match reference */}
            <div 
              className="relative h-[400px] bg-white rounded-lg"
              ref={postcardRef}
              onDrop={handlePostcardDrop}
              onDragOver={handlePostcardDragOver}
              onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
                  setSelectedSticker(null)
                }
              }}
            >
              <canvas
                ref={canvasRef}
                width={1200}
                height={400}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                style={{ 
                  touchAction: 'none', 
                  zIndex: 5, 
                  background: 'white',
                  cursor: selectedTool === "keyboard" ? 'text' : 'crosshair',
                  pointerEvents: selectedTool === "keyboard" ? 'none' : 'auto'
                }}
              />

              {/* Stickers layer */}
              <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 6, pointerEvents: 'none' }}>
                {placedStickers.map((sticker) => {
                  // For emoji stickers, we need to create a data URL
                  const imageUrl = sticker.type === 'image' 
                    ? sticker.content 
                    : createEmojiImage(sticker.content)

                  return (
                    <DraggableResizableSticker
                      key={sticker.id}
                      id={sticker.id}
                      imageUrl={imageUrl}
                      initialX={sticker.x}
                      initialY={sticker.y}
                      initialWidth={sticker.width}
                      initialHeight={sticker.height}
                      containerWidth={postcardRef.current?.offsetWidth || 1200}
                      containerHeight={postcardRef.current?.offsetHeight || 400}
                      onUpdate={updateSticker}
                      onRemove={removeSticker}
                      onInteractionStart={() => setIsInteractingWithSticker(true)}
                      onInteractionEnd={() => setIsInteractingWithSticker(false)}
                    />
                  )
                })}
              </div>

              {/* Text area - centered with 6-line limit, always visible */}
              <div className="absolute top-0 left-0 w-full h-full rounded-lg p-8 flex items-center justify-center"
                   style={{ zIndex: 7, pointerEvents: selectedTool === "keyboard" ? 'auto' : 'none' }}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full bg-transparent text-3xl leading-relaxed font-black text-primary resize-none outline-none border-none text-center"
                  style={{ fontFamily: "'SL Minoel', inherit", color: '#666', maxHeight: 'calc(1.5em * 6)' }}
                  rows={6}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <button 
            onClick={handleCancel}
            className="bg-journal-button-cancel text-journal-button-cancel-fg px-5 py-2 rounded-full border-3 border-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <InboxIcon className="w-5 h-5" />
            <span className="font-bold text-lg">Inbox</span>
          </button>

          <button 
            onClick={handleSendPostcard}
            disabled={isLoading || !message.trim()}
            className="bg-journal-accent text-journal-accent-foreground px-5 py-2 rounded-full border-3 border-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span className="font-bold text-lg">{isLoading ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>

      {/* Sticker Palette */}
      <StickerPalette
        isOpen={showStickerPalette}
        onToggle={() => setShowStickerPalette(!showStickerPalette)}
        onDragStart={handleStickerDragStart}
      />
    </div>
  )
}
