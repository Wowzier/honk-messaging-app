'use client';

import React from 'react';
import { WeatherSearch } from '@/components/messaging/WeatherSearch';

export default function WeatherSearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🌤️ Weather Search Tool
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Test real weather conditions from anywhere in the world!
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-500">
            <span>✅ Real-time data</span>
            <span>✅ No API key needed</span>
            <span>✅ Global coverage</span>
            <span>✅ Duck flight calculations</span>
          </div>
        </div>

        {/* Weather Search Component */}
        <WeatherSearch />

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-auto shadow-sm">
            <h3 className="font-semibold text-lg mb-3">🚀 About This Tool</h3>
            <p className="text-gray-600 mb-4">
              This weather search tool demonstrates the Open-Meteo API integration for the Honk! 
              messaging app. It shows how weather conditions affect duck courier flight speeds in real-time.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl mb-1">☀️</div>
                <div className="font-semibold">Clear</div>
                <div className="text-gray-500">100% speed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🌧️</div>
                <div className="font-semibold">Rain</div>
                <div className="text-gray-500">75% speed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⛈️</div>
                <div className="font-semibold">Storm</div>
                <div className="text-gray-500">50% speed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">💨</div>
                <div className="font-semibold">Wind</div>
                <div className="text-gray-500">±25% speed</div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 space-x-4">
            <a 
              href="/weather-demo"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🛩️ Flight Demo
            </a>
            <a 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back to App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}