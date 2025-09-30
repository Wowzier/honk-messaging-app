"use client"

import { useState, useRef, useEffect } from 'react'

interface DraggableResizableStickerProps {
  id: string
  imageUrl: string
  initialX: number
  initialY: number
  initialWidth: number
  initialHeight: number
  containerWidth: number
  containerHeight: number
  onUpdate: (id: string, x: number, y: number, width: number, height: number) => void
  onRemove: (id: string) => void
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

export const DraggableResizableSticker: React.FC<DraggableResizableStickerProps> = ({
  id,
  imageUrl,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  containerWidth,
  containerHeight,
  onUpdate,
  onRemove,
  onInteractionStart,
  onInteractionEnd
}) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const stickerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    onInteractionStart?.()
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    onInteractionStart?.()
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && stickerRef.current) {
        const newX = Math.max(0, Math.min(containerWidth - size.width, e.clientX - dragStart.x))
        const newY = Math.max(0, Math.min(containerHeight - size.height, e.clientY - dragStart.y))
        setPosition({ x: newX, y: newY })
        onUpdate(id, newX, newY, size.width, size.height)
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y
        const newWidth = Math.max(50, Math.min(containerWidth - position.x, resizeStart.width + deltaX))
        const newHeight = Math.max(50, Math.min(containerHeight - position.y, resizeStart.height + deltaY))
        setSize({ width: newWidth, height: newHeight })
        onUpdate(id, position.x, position.y, newWidth, newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      onInteractionEnd?.()
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart, position, size, containerWidth, containerHeight, id, onUpdate])

  return (
    <div
      ref={stickerRef}
      className="absolute group cursor-move select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: isDragging || isResizing ? 100 : 10,
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Sticker Image */}
      <img
        src={imageUrl}
        alt="Sticker"
        className="w-full h-full object-contain drop-shadow-md pointer-events-none"
        draggable={false}
      />

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(id)
        }}
        className="absolute -top-3 -right-3 w-7 h-7 bg-journal-button-cancel hover:bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 flex items-center justify-center"
      >
        ✕
      </button>

      {/* Resize handle */}
      <div
        className="resize-handle absolute -bottom-2 -right-2 w-6 h-6 bg-journal-accent hover:bg-journal-accent/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-nwse-resize z-10 flex items-center justify-center text-white text-xs"
        onMouseDown={handleResizeMouseDown}
      >
        ⋮⋮
      </div>

      {/* Border when hovering */}
      <div className="absolute inset-0 border-2 border-journal-accent rounded-lg opacity-0 group-hover:opacity-50 pointer-events-none transition-opacity" />
    </div>
  )
}
