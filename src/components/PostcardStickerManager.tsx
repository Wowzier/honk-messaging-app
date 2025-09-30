"use client"

import React, { useState, useRef } from 'react';
import { StickerEditor } from './StickerEditor';

interface Sticker {
  id: string;
  name: string;
  imageUrl: string;
  type: 'user';
}

interface PostcardStickerManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSticker: (imageUrl: string) => void;
}

export const PostcardStickerManager: React.FC<PostcardStickerManagerProps> = ({
  isOpen,
  onClose,
  onPlaceSticker
}) => {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setShowEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleStickerEdited = (editedImageUrl: string, stickerName: string) => {
    const newSticker: Sticker = {
      id: `sticker-${Date.now()}`,
      name: stickerName,
      imageUrl: editedImageUrl,
      type: 'user'
    };
    
    setStickers(prev => [...prev, newSticker]);
    setShowEditor(false);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleStickerClick = (sticker: Sticker) => {
    onPlaceSticker(sticker.imageUrl);
    onClose();
  };

  const handleDeleteSticker = (stickerId: string) => {
    setStickers(prev => prev.filter(s => s.id !== stickerId));
  };

  if (!isOpen && !showEditor) return null;

  if (showEditor && imagePreview) {
    return (
      <StickerEditor
        isOpen={showEditor}
        imageUrl={imagePreview}
        onClose={() => {
          setShowEditor(false);
          setSelectedFile(null);
          setImagePreview(null);
        }}
        onSave={handleStickerEdited}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border-4 border-journal-accent/30">
        {/* Header */}
        <div className="bg-journal-paper p-6 border-b-4 border-journal-accent/30">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
              🎨 Stickers
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-journal-button-cancel hover:bg-red-500 text-white font-bold transition-colors shadow-md"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Upload Button */}
          <div className="mb-6">
            <button
              onClick={handleUploadClick}
              className="w-full py-4 px-6 bg-journal-accent hover:bg-journal-accent/90 text-white rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
              style={{ fontFamily: "'Comic Sans MS', cursive" }}
            >
              <span className="text-2xl">📸</span>
              <span>Upload New Sticker</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Stickers Grid */}
          {stickers.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className="relative group"
                >
                  <button
                    onClick={() => handleStickerClick(sticker)}
                    className="w-full aspect-square bg-white border-4 border-journal-accent/20 rounded-xl hover:border-journal-accent hover:scale-105 transition-all p-2 shadow-md hover:shadow-lg"
                  >
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      className="w-full h-full object-contain"
                    />
                  </button>
                  
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteSticker(sticker.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-journal-button-cancel hover:bg-red-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    ✕
                  </button>
                  
                  <div className="mt-2 text-xs text-center text-journal-button truncate" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                    {sticker.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-journal-button text-lg mb-2" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                No stickers yet!
              </p>
              <p className="text-gray-500 text-sm" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                Upload an image to create your first sticker
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-journal-paper/50 p-4 border-t-2 border-journal-accent/20 text-center">
          <p className="text-xs text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
            💡 Tip: Images with solid backgrounds work best for background removal
          </p>
        </div>
      </div>
    </div>
  );
};
