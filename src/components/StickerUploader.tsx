import React, { useState, useRef } from 'react';
import { MacWindow } from './MacWindow';
import { MacButton } from './MacButton';
import { StickerEditor } from './StickerEditor';

interface StickerUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSticker: (sticker: { id: string; name: string; imageUrl: string; type: 'user' }) => void;
}

export const StickerUploader: React.FC<StickerUploaderProps> = ({
  isOpen,
  onClose,
  onCreateSticker
}) => {
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
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEditSticker = () => {
    if (imagePreview) {
      setShowEditor(true);
    }
  };

  const handleStickerEdited = (editedImageUrl: string, stickerName: string) => {
    const newSticker = {
      id: `user-${Date.now()}`,
      name: stickerName,
      imageUrl: editedImageUrl,
      type: 'user' as const
    };
    
    onCreateSticker(newSticker);
    setShowEditor(false);
    setSelectedFile(null);
    setImagePreview(null);
    onClose();
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setShowEditor(false);
  };

  if (!isOpen) return null;

  if (showEditor && imagePreview) {
    return (
      <StickerEditor
        isOpen={showEditor}
        imageUrl={imagePreview}
        onClose={() => setShowEditor(false)}
        onSave={handleStickerEdited}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(2px)'
    }}>
      <MacWindow title="🎨 Create Custom Sticker" width="520px" height="640px">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '20px',
          background: 'linear-gradient(180deg, #f8f8f8 0%, #ebebeb 100%)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)',
            padding: '12px',
            margin: '-20px -20px 20px -20px',
            borderBottom: '3px solid #000'
          }}>
            <div style={{
              fontSize: '16px',
              fontFamily: '"ChicagoFLF", "Chicago", monospace',
              fontWeight: 'bold',
              color: '#222'
            }}>
              🎨 Create Your Sticker
            </div>
            <MacButton 
              onClick={onClose}
              style={{
                fontSize: '14px',
                padding: '4px 8px',
                minWidth: '30px'
              }}
            >
              ✕
            </MacButton>
          </div>

          {/* Upload Area */}
          {!imagePreview ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px dashed #666',
              backgroundColor: '#fff',
              borderRadius: '4px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              {/* Decorative corners */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                width: '20px',
                height: '20px',
                border: '2px solid #ccc',
                borderRight: 'none',
                borderBottom: 'none'
              }} />
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '20px',
                height: '20px',
                border: '2px solid #ccc',
                borderLeft: 'none',
                borderBottom: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                width: '20px',
                height: '20px',
                border: '2px solid #ccc',
                borderRight: 'none',
                borderTop: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '20px',
                height: '20px',
                border: '2px solid #ccc',
                borderLeft: 'none',
                borderTop: 'none'
              }} />
              
              <div style={{
                fontSize: '64px',
                marginBottom: '20px',
                filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.1))'
              }}>
                �️
              </div>
              <div style={{
                fontSize: '18px',
                fontFamily: '"ChicagoFLF", "Chicago", monospace',
                marginBottom: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Create Your Custom Sticker
              </div>
              <div style={{
                fontSize: '13px',
                fontFamily: '"ChicagoFLF", "Chicago", monospace',
                color: '#666',
                marginBottom: '30px',
                lineHeight: '1.4'
              }}>
                Upload any image and we'll help you<br />
                turn it into a perfect sticker!<br />
                <span style={{ fontSize: '11px', color: '#888' }}>
                  (PNG, JPG, GIF supported • Max 5MB)
                </span>
              </div>
              <MacButton 
                onClick={handleUploadClick}
                style={{
                  fontSize: '14px',
                  padding: '12px 24px',
                  fontWeight: 'bold',
                  backgroundColor: '#4CAF50',
                  color: 'white'
                }}
              >
                📁 Choose Image File
              </MacButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Preview */}
              <div style={{
                border: '3px solid #333',
                padding: '20px',
                backgroundColor: 'white',
                marginBottom: '20px',
                borderRadius: '4px',
                boxShadow: '4px 4px 8px rgba(0,0,0,0.2), inset 0 0 1px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '16px',
                  backgroundColor: '#f8f8f8',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontFamily: '"ChicagoFLF", "Chicago", monospace',
                  color: '#666',
                  border: '1px solid #ccc'
                }}>
                  PREVIEW
                </div>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    maxWidth: '320px',
                    maxHeight: '320px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>

              {/* File Info */}
              <div style={{
                fontSize: '12px',
                fontFamily: '"ChicagoFLF", "Chicago", monospace',
                marginBottom: '24px',
                textAlign: 'center',
                backgroundColor: '#f0f0f0',
                padding: '12px 20px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%',
                maxWidth: '320px'
              }}>
                <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>📄 File: {selectedFile?.name}</div>
                <div style={{ color: '#666' }}>📏 Size: {Math.round((selectedFile?.size || 0) / 1024)}KB</div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '320px'
              }}>
                <MacButton 
                  onClick={handleEditSticker}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: '#2196F3',
                    color: 'white'
                  }}
                >
                  ✨ Edit & Remove Background
                </MacButton>
                <MacButton 
                  onClick={resetUploader}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '13px',
                    backgroundColor: '#f5f5f5'
                  }}
                >
                  🔄 Choose Different Image
                </MacButton>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div style={{
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
            marginTop: '20px',
            fontFamily: '"ChicagoFLF", "Chicago", monospace',
            borderTop: '2px solid #ddd',
            paddingTop: '16px',
            backgroundColor: '#fafafa',
            padding: '16px',
            margin: '20px -20px -20px -20px',
            lineHeight: '1.4'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#444' }}>
              💡 Pro Tips for Perfect Stickers:
            </div>
            <div style={{ fontSize: '10px' }}>
              • Images with solid/simple backgrounds work best<br />
              • High contrast subjects are easier to cut out<br />
              • Square images (1:1 ratio) look great as stickers
            </div>
          </div>
        </div>
      </MacWindow>
    </div>
  );
};