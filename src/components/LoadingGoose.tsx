"use client"

import { useEffect, useState } from 'react'

export default function LoadingGoose() {
  const [bounce, setBounce] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(prev => (prev + 1) % 3)
    }, 300)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-sky-300 to-sky-100">
      <div className="flex flex-col items-center gap-6">
        {/* Animated goose/duck sprite */}
        <div 
          className="relative"
          style={{
            transform: `translateY(${bounce === 1 ? -8 : 0}px)`,
            transition: 'transform 0.3s ease-in-out'
          }}
        >
          <img 
            src="/nature_5/duck.png" 
            alt="Loading..." 
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Loading text - Animal Crossing style */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white" style={{ 
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            fontFamily: "'Comic Sans MS', cursive"
          }}>
            Loading
          </span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-white"
                style={{
                  opacity: bounce === i ? 1 : 0.3,
                  transition: 'opacity 0.3s ease-in-out',
                  boxShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
