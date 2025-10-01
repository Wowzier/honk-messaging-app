"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Palette, X } from 'lucide-react'

interface ColorWheelPickerProps {
  currentColor: string
  onColorChange: (color: string) => void
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  currentColor,
  onColorChange
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [lightness, setLightness] = useState(50)
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  const hexToHsl = useCallback((hex: string) => {
    const sanitized = hex.replace('#', '')
    if (sanitized.length !== 6) return null

    const r = parseInt(sanitized.substring(0, 2), 16) / 255
    const g = parseInt(sanitized.substring(2, 4), 16) / 255
    const b = parseInt(sanitized.substring(4, 6), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        default:
          h = (r - g) / d + 4
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }, [])

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current || !panelRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const panelRect = panelRef.current.getBoundingClientRect()
    const margin = 12

    let left = buttonRect.left
    let top = buttonRect.bottom + margin

    const maxLeft = window.innerWidth - panelRect.width - margin
    const minLeft = margin
    left = Math.min(Math.max(left, minLeft), maxLeft < minLeft ? minLeft : maxLeft)

    if (top + panelRect.height > window.innerHeight - margin) {
      const potentialTop = buttonRect.top - panelRect.height - margin
      top = potentialTop >= margin ? potentialTop : window.innerHeight - panelRect.height - margin
    }

    if (top < margin) {
      top = margin
    }

    setPanelPosition({ top, left })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const frame = requestAnimationFrame(updatePanelPosition)
    const handleWindowChange = () => updatePanelPosition()

    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [isOpen, updatePanelPosition])

  useEffect(() => {
    if (!isOpen) {
      setPanelPosition(null)
    }
  }, [isOpen])

  useEffect(() => {
    const hsl = hexToHsl(currentColor)
    if (!hsl) return
    setHue(hsl.h)
    setSaturation(hsl.s)
    setLightness(hsl.l)
  }, [currentColor, hexToHsl])

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value)
    setHue(newHue)
    const color = hslToHex(newHue, saturation, lightness)
    onColorChange(color)
  }

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSaturation = parseInt(e.target.value)
    setSaturation(newSaturation)
    const color = hslToHex(hue, newSaturation, lightness)
    onColorChange(color)
  }

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLightness = parseInt(e.target.value)
    setLightness(newLightness)
    const color = hslToHex(hue, saturation, newLightness)
    onColorChange(color)
  }

  const handlePresetColor = (color: string) => {
    onColorChange(color)
    setIsOpen(false)
  }

  const presetColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F39C12'
  ]

  return (
    <div className="relative" ref={pickerRef}>
      <button
        ref={buttonRef}
        onClick={() => {
          const nextState = !isOpen
          setIsOpen(nextState)
          if (!nextState) {
            setPanelPosition(null)
          }
        }}
        className="w-10 h-10 rounded-full border-2 border-journal-accent/40 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:border-journal-accent"
        title="Color Picker"
        style={{ backgroundColor: currentColor }}
      >
        <Palette className="w-4 h-4 text-white drop-shadow-md" />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-[120] w-64 rounded-2xl border border-journal-accent/40 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
          style={{
            fontFamily: "'Comic Sans MS', cursive",
            top: `${panelPosition?.top ?? 0}px`,
            left: `${panelPosition?.left ?? 0}px`,
            opacity: panelPosition ? 1 : 0,
            pointerEvents: panelPosition ? 'auto' : 'none'
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-journal-button">🎨 Custom color</div>
            <button
              onClick={() => setIsOpen(false)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-journal-accent/30 text-journal-button transition hover:border-journal-accent hover:bg-journal-accent/10"
              aria-label="Close color picker"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="mb-4 rounded-xl border border-journal-accent/20 bg-white/60 p-3">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: hslToHex(hue, saturation, lightness) }}
              />
              <div className="space-y-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-journal-button/70">Selected</span>
                <span className="inline-flex items-center rounded-full bg-journal-highlight/10 px-3 py-1 font-mono text-xs text-journal-button">
                  {hslToHex(hue, saturation, lightness)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-journal-button/60">Hue</label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={handleHueChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-journal-button/60">Saturation</label>
              <input
                type="range"
                min="0"
                max="100"
                value={saturation}
                onChange={handleSaturationChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-journal-button/60">Lightness</label>
              <input
                type="range"
                min="0"
                max="100"
                value={lightness}
                onChange={handleLightnessChange}
                className="h-2 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`
                }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-journal-button/60">Quick picks</div>
            <div className="grid grid-cols-6 gap-2">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetColor(color)}
                  className="h-8 w-8 rounded-full border border-white/70 shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
