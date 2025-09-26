'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      {/* Glassmorphism background with animated gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 animate-gradient-shift"></div>
      <div className="fixed inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent backdrop-blur-3xl"></div>
      
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-32 w-96 h-96 bg-blue-400/20 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-purple-400/15 rounded-full blur-xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-pink-400/20 rounded-full blur-xl animate-float-delayed"></div>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center text-white p-6">
        <div className="text-center max-w-2xl">
          {/* Duck with question mark */}
          <div className="text-9xl mb-8 animate-bounce">🦆❓</div>
          
          {/* 404 Message */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-12 mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <h2 className="text-3xl font-semibold text-white mb-6">Oops! This duck got lost</h2>
            <p className="text-xl text-white/80 leading-relaxed mb-8">
              It seems like our duck courier couldn't find the page you were looking for. 
              Even the best navigators sometimes take a wrong turn in the clouds!
            </p>
            
            {/* Fun message about the duck */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mb-8">
              <div className="text-lg text-white/90 mb-2">🌤️ Weather Report</div>
              <div className="text-white/70">
                Our duck is circling around looking for the right destination. 
                Don't worry, we'll help get you back on track!
              </div>
            </div>
          </div>

          {/* Navigation options */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl text-white font-semibold text-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              🏠 Back to Home
            </Link>
            
            <Link
              href="/postcard"
              className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl text-white font-semibold text-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              📮 Send a Postcard
            </Link>
            
            <Link
              href="/inbox"
              className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl text-white font-semibold text-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              📬 Check Inbox
            </Link>
          </div>

          {/* Helpful links */}
          <div className="mt-12 text-center">
            <p className="text-white/60 mb-4">Looking for something specific?</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/demo" className="text-yellow-300 hover:text-yellow-200 transition-colors">
                🦆 Demo
              </Link>
              <Link href="/weather-demo" className="text-yellow-300 hover:text-yellow-200 transition-colors">
                🌤️ Weather Demo
              </Link>
              <Link href="/platform" className="text-yellow-300 hover:text-yellow-200 transition-colors">
                🛩️ Flight Platform
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Style definitions */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(15px) translateX(-15px); }
          66% { transform: translateY(-10px) translateX(15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        .animate-gradient-shift {
          background-size: 400% 400%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}