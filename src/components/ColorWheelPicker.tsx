"use client"

import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'

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
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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
          setIsOpen(!isOpen)
          if (!isOpen && buttonRef.current) {
            setButtonRect(buttonRef.current.getBoundingClientRect())
          }
        }}
        className="w-10 h-10 rounded-full bg-white hover:bg-journal-button-light border-2 border-journal-accent/30 flex items-center justify-center hover:scale-110 transition-all shadow-sm"
        title="Color Picker"
        style={{ backgroundColor: currentColor }}
      >
        <Palette className="w-4 h-4 text-white drop-shadow-md" />
      </button>

      {isOpen && buttonRect && (
        <div 
          className="fixed bg-white rounded-2xl shadow-2xl p-4 w-72 border-4 border-journal-accent/20"
          style={{ 
            fontFamily: "'Comic Sans MS', cursive",
            top: `${buttonRect.bottom + 8}px`,
            left: `${buttonRect.left}px`,
            zIndex: 9999
          }}>
          <div className="text-sm font-bold text-journal-button mb-3">🎨 Custom Color</div>

          {/* Current color preview */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
              style={{ backgroundColor: hslToHex(hue, saturation, lightness) }}
            />
            <div className="text-xs text-gray-600 font-mono bg-gray-100 px-3 py-1 rounded-full">
              {hslToHex(hue, saturation, lightness)}
            </div>
          </div>

          {/* Hue slider */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Hue</label>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
            />
          </div>

          {/* Saturation slider */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Saturation</label>
            <input
              type="range"
              min="0"
              max="100"
              value={saturation}
              onChange={handleSaturationChange}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
              }}
            />
          </div>

          {/* Lightness slider */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Lightness</label>
            <input
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={handleLightnessChange}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`
              }}
            />
          </div>

          {/* Preset colors */}
          <div className="border-t-2 border-gray-200 pt-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">Quick picks</div>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetColor(color)}
                  className="w-10 h-10 rounded-full border-3 border-white shadow-md hover:scale-110 transition-transform"
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
