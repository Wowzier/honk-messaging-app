'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

interface LocationWidgetProps {
  currentLocation?: string;
  weather?: {
    temperature: number;
    condition: string;
    icon: string;
  };
  isNewLocation?: boolean;
}

export function SubwayLocationWidget({ currentLocation, weather, isNewLocation }: LocationWidgetProps) {
  const [showNewLocation, setShowNewLocation] = useState(false);

  useEffect(() => {
    if (isNewLocation) {
      setShowNewLocation(true);
      const timer = setTimeout(() => setShowNewLocation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNewLocation, currentLocation]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="relative"
      >
        {/* LED Display Board */}
        <div 
          className="bg-black border-4 border-gray-800 rounded-lg p-4 shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 0 10px rgba(255,255,255,0.1)',
            minWidth: '500px',
          }}
        >
          {/* Top indicator lights */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                  style={{
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)',
                  }}
                />
              ))}
            </div>
            <div className="text-green-500 text-xs font-mono">
              LIVE
            </div>
          </div>

          {/* Main display area */}
          <div className="bg-gradient-to-b from-gray-900 to-black p-4 rounded border border-gray-700">
            <AnimatePresence mode="wait">
              {showNewLocation && (
                <motion.div
                  key="new-location-banner"
                  initial={{ x: 500 }}
                  animate={{ x: -500 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="absolute inset-0 flex items-center justify-center bg-yellow-500 z-10"
                >
                  <div className="text-black text-3xl font-bold font-mono tracking-wider">
                    ★ NEW LOCATION ★
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-6">
              {/* Location Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="text-3xl"
                  >
                    📍
                  </motion.div>
                  <div>
                    <div className="text-[10px] text-green-400 font-mono tracking-wider">
                      CURRENT LOCATION
                    </div>
                    <motion.div
                      key={currentLocation}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-bold text-green-500 font-mono tracking-wide"
                      style={{
                        textShadow: '0 0 10px rgba(34, 197, 94, 0.8)',
                      }}
                    >
                      {currentLocation || 'UNKNOWN'}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Weather Info */}
              {weather && (
                <div className="border-l-2 border-green-500 pl-6">
                  <div className="text-[10px] text-blue-400 font-mono tracking-wider mb-1">
                    WEATHER
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                      }}
                      className="text-3xl"
                    >
                      {weather.icon}
                    </motion.div>
                    <div>
                      <div className="text-3xl font-bold text-blue-400 font-mono">
                        {weather.temperature}°
                      </div>
                      <div className="text-xs text-blue-300 font-mono">
                        {weather.condition}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom status bar */}
            <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    opacity: [1, 0.3, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                  className="w-2 h-2 bg-green-500 rounded-full"
                  style={{
                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)',
                  }}
                />
                <span className="text-[10px] text-green-400 font-mono">
                  DUCK IN TRANSIT
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* LED dots effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #00ff00 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />
        </div>

        {/* Corner mounting brackets */}
        <div className="absolute -top-2 -left-2 w-4 h-4 border-l-4 border-t-4 border-gray-700" />
        <div className="absolute -top-2 -right-2 w-4 h-4 border-r-4 border-t-4 border-gray-700" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-4 border-b-4 border-gray-700" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-4 border-b-4 border-gray-700" />
      </motion.div>
    </div>
  );
}
