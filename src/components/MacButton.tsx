import React from 'react';

interface MacButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'small';
  className?: string;
  style?: React.CSSProperties;
}

export function MacButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'default',
  className = "",
  style = {}
}: MacButtonProps) {
  const baseClasses = "border-2 border-black bg-white hover:bg-gray-100 active:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed font-['ChicagoFLF',_'Chicago',_monospace] text-black transition-colors";
  
  const sizeClasses = variant === 'small' 
    ? "px-3 py-1 text-sm" 
    : "px-4 py-2 text-base";
    
  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}