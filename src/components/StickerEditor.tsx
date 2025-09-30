import React, { useState, useRef, useEffect } from 'react';
import { MacWindow } from './MacWindow';
import { MacButton } from './MacButton';

interface StickerEditorProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string, stickerName: string, isPublic: boolean) => void;
}

export const StickerEditor: React.FC<StickerEditorProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave
}) => {
  const [stickerName, setStickerName] = useState('My Sticker');
  const [hasWhiteStroke, setHasWhiteStroke] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [tolerance, setTolerance] = useState(30);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>(imageUrl);
  const [isPublic, setIsPublic] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        originalImageRef.current = img;
        drawImageToCanvas(img, false);
        setProcessedImageUrl(canvasRef.current?.toDataURL('image/png') || imageUrl);
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  const drawImageToCanvas = (img: HTMLImageElement, shouldUpdate = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to image size (max 400px)
    const maxSize = 400;
    let { width, height } = img;
    
    if (width > maxSize || height > maxSize) {
      if (width > height) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else {
        width = (width * maxSize) / height;
        height = maxSize;
      }
    }

    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    if (shouldUpdate) {
      updateProcessedImage();
    }
  };

  const removeBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Get corner colors to determine background color
    const corners = [
      [0, 0], // top-left
      [canvas.width - 1, 0], // top-right
      [0, canvas.height - 1], // bottom-left
      [canvas.width - 1, canvas.height - 1] // bottom-right
    ];

    const getPixelColor = (x: number, y: number) => {
      const index = (y * canvas.width + x) * 4;
      return [data[index], data[index + 1], data[index + 2]];
    };

    // Find the most common corner color
    const cornerColors = corners.map(([x, y]) => getPixelColor(x, y));
    const bgColor = cornerColors[0]; // Use top-left as background color

    // Remove background
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate color difference
      const diff = Math.sqrt(
        Math.pow(r - bgColor[0], 2) +
        Math.pow(g - bgColor[1], 2) +
        Math.pow(b - bgColor[2], 2)
      );

      // If pixel is similar to background color, make it transparent
      if (diff < tolerance) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setBackgroundRemoved(true);
    
    // Apply white stroke if needed, then update processed image
    updateProcessedImage();
  };

  const addWhiteStroke = (sourceCanvas: HTMLCanvasElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw white stroke by drawing the image multiple times with offset
    ctx.fillStyle = 'white';
    for (let x = -strokeWidth; x <= strokeWidth; x++) {
      for (let y = -strokeWidth; y <= strokeWidth; y++) {
        if (x * x + y * y <= strokeWidth * strokeWidth) {
          ctx.globalCompositeOperation = 'destination-over';
          ctx.drawImage(sourceCanvas, x, y);
        }
      }
    }

    // Draw the original image on top
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sourceCanvas, 0, 0);
  };

  const updateProcessedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a copy of the current canvas state
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, 0, 0);

    if (hasWhiteStroke) {
      addWhiteStroke(tempCanvas);
    }

    setProcessedImageUrl(canvas.toDataURL('image/png'));
  };

  const resetImage = () => {
    if (originalImageRef.current) {
      drawImageToCanvas(originalImageRef.current);
    }
    setBackgroundRemoved(false);
    setHasWhiteStroke(false);
  };

  const handleSave = () => {
    onSave(processedImageUrl, stickerName, isPublic);
  };

  useEffect(() => {
    if (canvasRef.current && originalImageRef.current) {
      // Redraw from original image first
      drawImageToCanvas(originalImageRef.current, false);
      
      // If background was removed, reapply it
      if (backgroundRemoved) {
        removeBackground();
        return; // removeBackground will handle the final update
      }
      
      // Apply white stroke if needed and update
      updateProcessedImage();
    }
  }, [hasWhiteStroke, strokeWidth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-journal-accent/30">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-journal-accent/30">
            <h2 className="text-2xl font-bold text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
              🎨 Edit Sticker
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-journal-button-cancel hover:bg-red-500 text-white font-bold transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Panel - Preview */}
            <div className="flex-1 flex flex-col items-center">
              <div className="text-lg font-semibold mb-4 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                Preview
              </div>
              
              <div className="border-4 border-journal-accent/30 p-4 bg-white rounded-xl mb-4"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}>
                <canvas
                  ref={canvasRef}
                  className="max-w-[300px] max-h-[300px] shadow-lg"
                />
              </div>

              {/* Name Input */}
              <div className="w-full max-w-[300px]">
                <label className="block text-sm font-semibold mb-2 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  Sticker Name:
                </label>
                <input
                  type="text"
                  value={stickerName}
                  onChange={(e) => setStickerName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-journal-accent/30 rounded-lg focus:border-journal-accent focus:outline-none"
                  style={{ fontFamily: "'Comic Sans MS', cursive" }}
                />
              </div>

              {/* Public/Private Toggle */}
              <div className="w-full max-w-[300px]">
                <label className="block text-sm font-semibold mb-2 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  Share with:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      !isPublic 
                        ? 'bg-journal-accent text-white shadow-md' 
                        : 'bg-white border-2 border-journal-accent/30 text-journal-button hover:bg-journal-accent/10'
                    }`}
                    style={{ fontFamily: "'Comic Sans MS', cursive" }}
                  >
                    🔒 Private
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      isPublic 
                        ? 'bg-journal-accent text-white shadow-md' 
                        : 'bg-white border-2 border-journal-accent/30 text-journal-button hover:bg-journal-accent/10'
                    }`}
                    style={{ fontFamily: "'Comic Sans MS', cursive" }}
                  >
                    🌍 Community
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  {isPublic ? 'Everyone can use this sticker!' : 'Only you can use this sticker'}
                </p>
              </div>
            </div>

            {/* Right Panel - Controls */}
            <div className="w-full md:w-64 bg-journal-paper rounded-xl p-4 border-2 border-journal-accent/30">
              <div className="text-lg font-bold mb-4 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                Editing Tools
              </div>

              {/* Background Removal */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  Background Removal
                </div>
                
                <div className="text-xs text-gray-600 mb-3" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  ⚠️ Works best with solid backgrounds
                </div>

                <div className="mb-3">
                  <label className="text-xs font-semibold block mb-1 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                    Tolerance: {tolerance}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={tolerance}
                    onChange={(e) => setTolerance(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={removeBackground}
                  disabled={backgroundRemoved}
                  className={`w-full py-2 px-4 rounded-full font-semibold transition-colors text-sm ${
                    backgroundRemoved 
                      ? 'bg-green-400 text-white cursor-not-allowed' 
                      : 'bg-journal-accent hover:bg-journal-accent/90 text-white'
                  }`}
                  style={{ fontFamily: "'Comic Sans MS', cursive" }}
                >
                  {backgroundRemoved ? '✓ Background Removed' : 'Remove Background'}
                </button>
              </div>

              {/* White Stroke */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  White Stroke
                </div>

                <label className="flex items-center gap-2 mb-3 text-sm cursor-pointer text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                  <input
                    type="checkbox"
                    checked={hasWhiteStroke}
                    onChange={(e) => setHasWhiteStroke(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Add white stroke
                </label>

                {hasWhiteStroke && (
                  <div>
                    <label className="text-xs font-semibold block mb-1 text-journal-button" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                      Stroke Width: {strokeWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Reset */}
              <button
                onClick={resetImage}
                className="w-full py-2 px-4 rounded-full bg-journal-button hover:bg-journal-button-light text-white font-semibold transition-colors mb-4 text-sm"
                style={{ fontFamily: "'Comic Sans MS', cursive" }}
              >
                🔄 Reset to Original
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                className="w-full py-3 px-4 rounded-full bg-journal-accent hover:bg-journal-accent/90 text-white font-bold transition-colors shadow-lg text-base"
                style={{ fontFamily: "'Comic Sans MS', cursive" }}
              >
                💾 Save Sticker
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
