'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const [bounce, setBounce] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(prev => (prev + 1) % 3)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-green-50 flex items-center justify-center p-4">
      {/* Cute clouds in background */}
      <div className="absolute top-10 left-20 w-32 h-16 bg-white/60 rounded-full blur-sm"></div>
      <div className="absolute top-20 right-32 w-40 h-20 bg-white/50 rounded-full blur-sm"></div>
      <div className="absolute top-40 left-1/3 w-24 h-12 bg-white/40 rounded-full blur-sm"></div>

      {/* Main content card */}
      <div className="relative max-w-md w-full">
        {/* Cute white card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-yellow-100">
          {/* Duck sprite with bounce animation */}
          <div className="flex justify-center mb-6">
            <div 
              className="relative"
              style={{
                transform: `translateY(${bounce === 1 ? -12 : 0}px)`,
                transition: 'transform 0.4s ease-in-out'
              }}
            >
              <img 
                src="/nature_5/duck.png" 
                alt="Lost Duck" 
                className="w-24 h-24 object-contain drop-shadow-lg"
              />
            </div>
          </div>

          {/* 404 text - Animal Crossing style */}
          <div className="text-center mb-6">
            <h1 className="text-6xl font-bold text-yellow-600 mb-2" style={{ 
              fontFamily: "'Comic Sans MS', cursive",
              textShadow: '3px 3px 0px rgba(255,200,100,0.3)'
            }}>
              404
            </h1>
            <p className="text-2xl font-semibold text-gray-700 mb-4" style={{ 
              fontFamily: "'Comic Sans MS', cursive"
            }}>
              Oh no!
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              This page flew away! Our duck couldn't find it anywhere.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-200 to-transparent mb-6"></div>

          {/* Navigation buttons - minimalistic */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-full text-gray-800 font-semibold text-center shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              style={{ fontFamily: "'Comic Sans MS', cursive" }}
            >
              🏠 Go Home
            </Link>
            
            <Link
              href="/inbox"
              className="px-6 py-3 bg-green-400 hover:bg-green-500 rounded-full text-gray-800 font-semibold text-center shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
              style={{ fontFamily: "'Comic Sans MS', cursive" }}
            >
              📬 Check Inbox
            </Link>
          </div>
        </div>

        {/* Cute grass at the bottom */}
        <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-2">
          <div className="w-8 h-8 bg-green-400 rounded-t-full"></div>
          <div className="w-6 h-6 bg-green-500 rounded-t-full"></div>
          <div className="w-10 h-10 bg-green-400 rounded-t-full"></div>
          <div className="w-7 h-7 bg-green-500 rounded-t-full"></div>
          <div className="w-9 h-9 bg-green-400 rounded-t-full"></div>
        </div>
      </div>
    </div>
  );
}
