"use client"

import { useState } from 'react'
import { StickerEditor } from './StickerEditor'
import { Grid, List } from 'lucide-react'

interface StickerPaletteProps {
  isOpen: boolean
  onToggle: () => void
  onDragStart: (stickerId: string, type: 'emoji' | 'image', content: string) => void
}

interface UserSticker {
  id: string
  name: string
  imageUrl: string
}

const DEFAULT_STICKERS = [
  { id: 'sticker1', emoji: '', imageUrl: '/sticker.png', name: 'Sticker 1' },
  { id: 'sticker2', emoji: '', imageUrl: '/sticker.png', name: 'Sticker 2' },
  { id: 'sticker3', emoji: '', imageUrl: '/sticker.png', name: 'Sticker 3' },
  { id: 'sticker4', emoji: '', imageUrl: '/sticker.png', name: 'Sticker 4' },
  { id: 'sticker5', emoji: '', imageUrl: '/sticker.png', name: 'Sticker 5' },
  { id: 'sticker6', emoji: '', imageUrl: '/sticker.png', name: 'Sticker 6' },
]

export const StickerPalette: React.FC<StickerPaletteProps> = ({
  isOpen,
  onToggle,
  onDragStart
}) => {
  const [activeTab, setActiveTab] = useState<'community' | 'private'>('community')
  const [userStickers, setUserStickers] = useState<UserSticker[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImagePreview(result)
        setShowEditor(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleStickerEdited = (editedImageUrl: string, stickerName: string, isPublic: boolean) => {
    const newSticker: UserSticker = {
      id: `custom-${Date.now()}`,
      name: stickerName,
      imageUrl: editedImageUrl
    }
    
    if (isPublic) {
      // TODO: Save to database as community sticker
      console.log('Saving to community:', newSticker)
      // For now, just add to local state
    } else {
      // Save to private stickers
      setUserStickers(prev => [...prev, newSticker])
    }
    
    setShowEditor(false)
    setSelectedFile(null)
    setImagePreview(null)
  }

  const handleDeleteSticker = (stickerId: string) => {
    setUserStickers(prev => prev.filter(s => s.id !== stickerId))
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed left-0 top-0 h-full w-80 bg-journal-paper border-r-4 border-journal-accent/30 shadow-2xl z-[100] flex flex-col">
        {/* Header */}
        <div className="bg-journal-accent/20 p-4 border-b-4 border-journal-accent/30 flex justify-between items-center">
          <h3 className="text-xl font-bold text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
            Stickers!
          </h3>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-full bg-journal-button-cancel hover:bg-red-500 text-white font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Drag instruction */}
        <div className="p-3 bg-journal-highlight/20 border-b-2 border-journal-accent/20 flex items-center gap-2">
          <p className="text-xs text-journal-button font-semibold flex-shrink-0" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
            💡 Drag stickers onto your postcard!
          </p>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border-2 border-journal-accent/30 rounded-lg focus:outline-none focus:border-journal-accent"
            style={{ fontFamily: "'Comic Sans MS', cursive" }}
          />
        </div>

        {/* View mode toggle and tabs row */}
        <div className="flex items-center border-b-2 border-journal-accent/30 bg-journal-paper/50">
          {/* View mode toggle */}
          <div className="flex gap-1 p-2 border-r-2 border-journal-accent/20">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-journal-accent text-white shadow-md'
                  : 'text-gray-500 hover:bg-journal-accent/10'
              }`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-journal-accent text-white shadow-md'
                  : 'text-gray-500 hover:bg-journal-accent/10'
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-1">
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 py-2 px-4 font-semibold transition-colors ${
                activeTab === 'community'
                  ? 'bg-white text-journal-accent border-b-4 border-journal-accent'
                  : 'bg-journal-paper/50 text-journal-button hover:bg-white/50'
              }`}
              style={{ fontFamily: "'Comic Sans MS', cursive" }}
            >
              Community ({DEFAULT_STICKERS.length})
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`flex-1 py-2 px-4 font-semibold transition-colors ${
                activeTab === 'private'
                  ? 'bg-white text-journal-accent border-b-4 border-journal-accent'
                  : 'bg-journal-paper/50 text-journal-button hover:bg-white/50'
              }`}
              style={{ fontFamily: "'Comic Sans MS', cursive" }}
            >
              Your Stickers ({userStickers.length})
            </button>
          </div>
        </div>

        {/* Upload button for private tab */}
        {activeTab === 'private' && (
          <div className="p-3 border-b-2 border-journal-accent/20">
            <label className="block w-full py-3 px-4 bg-journal-accent hover:bg-journal-accent/90 text-white rounded-xl font-bold shadow-md cursor-pointer text-center transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span style={{ fontFamily: "'Comic Sans MS', cursive" }}>📸 Upload Sticker</span>
            </label>
          </div>
        )}

        {/* Sticker grid with custom scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4dd0e1 #f5f5f5'
        }}>
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f5f5f5;
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #4dd0e1;
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #3ab8c7;
            }
          `}</style>
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
            {activeTab === 'community' ? (
              DEFAULT_STICKERS
                .filter(sticker => sticker.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((sticker) => (
                <div
                  key={sticker.id}
                  draggable
                  onDragStart={() => onDragStart(sticker.id, 'image', sticker.imageUrl)}
                  className={`flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'} items-center gap-2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform`}
                >
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.name}
                    className={`object-contain drop-shadow-lg ${viewMode === 'grid' ? 'w-32 h-32' : 'w-20 h-20'}`}
                    draggable={false}
                  />
                  <div className="text-xs text-journal-button text-center font-semibold" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                    {sticker.name}
                  </div>
                </div>
              ))
            ) : userStickers.length > 0 ? (
              userStickers
                .filter(sticker => sticker.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((sticker) => (
                <div
                  key={sticker.id}
                  className={`relative group flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'} items-center gap-2`}
                >
                  <div
                    draggable
                    onDragStart={() => onDragStart(sticker.id, 'image', sticker.imageUrl)}
                    className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                  >
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      className={`object-contain drop-shadow-lg ${viewMode === 'grid' ? 'w-32 h-32' : 'w-20 h-20'}`}
                      draggable={false}
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteSticker(sticker.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-journal-button-cancel hover:bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                  >
                    ✕
                  </button>
                  <div className={`text-xs text-journal-button font-semibold truncate ${viewMode === 'grid' ? 'text-center w-full' : 'flex-1'}`} style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                    {sticker.name}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-8">
                <div className="text-4xl mb-2">🎨</div>
                <p className="text-sm text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  No stickers yet!
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  Click "Upload Sticker" to create one
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && imagePreview && (
        <StickerEditor
          isOpen={showEditor}
          imageUrl={imagePreview}
          onClose={() => {
            setShowEditor(false)
            setSelectedFile(null)
            setImagePreview(null)
          }}
          onSave={handleStickerEdited}
        />
      )}
    </>
  )
}
