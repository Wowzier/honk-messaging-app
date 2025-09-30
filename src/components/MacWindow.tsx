import React from 'react';

interface MacWindowProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  width?: string;
  height?: string;
}

function WindowFrame() {
  return (
    <div className="absolute inset-0">
      <div className="overflow-clip relative size-full">
        <div className="absolute bg-[#ffffff] inset-0" />
      </div>
      <div className="absolute border border-[#000000] border-solid inset-0 pointer-events-none shadow-[1px_1px_0px_1px_#000000]" />
    </div>
  );
}

function Bars() {
  return (
    <div className="absolute contents left-1 top-1.5">
      <div className="absolute bg-[#000000] h-px left-1 right-1 top-1.5" />
      <div className="absolute bg-[#000000] h-px left-1 right-1 top-3" />
      <div className="absolute bg-[#000000] h-px left-1 right-1 top-[18px]" />
      <div className="absolute bg-[#000000] h-px left-1 right-1 top-[9px]" />
      <div className="absolute bg-[#000000] h-px left-1 right-1 top-[15px]" />
      <div className="absolute bg-[#000000] h-px left-1 right-1 top-[21px]" />
    </div>
  );
}

function IconClose({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="absolute block cursor-pointer left-3.5 overflow-visible size-4 top-1.5 hover:bg-gray-100"
      onClick={onClick}
    >
      <div className="absolute bg-[#ffffff] left-1/2 size-4 top-1/2 translate-x-[-50%] translate-y-[-50%]">
        <div className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
      </div>
    </button>
  );
}

function Title({ title }: { title: string }) {
  return (
    <div className="absolute bg-[#ffffff] left-1/2 top-0 translate-x-[-50%]">
      <div className="flex flex-row items-center relative size-full">
        <div className="box-border content-stretch flex flex-row gap-2.5 items-center justify-start px-2 py-0 relative">
          <div className="flex flex-col font-['ChicagoFLF',_'Chicago',_monospace] justify-center leading-[0] not-italic relative shrink-0 text-[#000000] text-[20px] text-center text-nowrap tracking-[-0.08px]">
            <p className="block leading-[normal] whitespace-pre">
              {title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Titlebar({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="absolute bg-[#ffffff] inset-0">
      <div className="overflow-clip relative size-full">
        <Bars />
        <IconClose onClick={onClose} />
        <Title title={title} />
      </div>
      <div className="absolute border border-[#000000] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

export function MacWindow({ title, children, onClose, className = "", width, height }: MacWindowProps) {
  const style = {
    ...(width && { width }),
    ...(height && { height })
  };
  
  return (
    <div 
      className={`relative bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] ${className}`}
      style={style}
    >
      {/* Titlebar */}
      <div className="relative h-7 border-b border-black">
        <Titlebar title={title} onClose={onClose} />
      </div>
      
      {/* Content */}
      <div className="relative bg-white overflow-hidden" style={{ height: height ? `calc(${height} - 28px)` : 'auto' }}>
        {children}
      </div>
    </div>
  );
}