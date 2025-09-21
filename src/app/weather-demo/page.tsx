'use client';

import React from 'react';
import { WeatherDisplay } from '@/components/messaging/WeatherDisplay';
import { WeatherDemoTracker } from '@/components/flight/WeatherDemoTracker';

export default function WeatherDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <span className="text-blue-600">🌤️</span>
            <span>Weather & Flight Demo</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience real-time weather data and duck courier flight tracking based on your location!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Weather Section */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>🌍</span>
                Your Local Weather
              </h2>
              <WeatherDisplay />
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-lg mb-3">Weather Impact on Flights</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">☀️</div>
                  <div className="font-medium">Clear Skies</div>
                  <div className="text-sm text-gray-600">100% speed</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🌧️</div>
                  <div className="font-medium">Rain</div>
                  <div className="text-sm text-gray-600">75% speed</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl mb-2">⛈️</div>
                  <div className="font-medium">Storms</div>
                  <div className="text-sm text-gray-600">50% speed</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mb-2">💨</div>
                  <div className="font-medium">Strong Winds</div>
                  <div className="text-sm text-gray-600">±25% speed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Tracker Section */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span>🦆</span>
                Live Flight Tracking
              </h2>
              <WeatherDemoTracker />
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <h3 className="font-semibold text-lg mb-3">Real-time Features</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-xl">📊</span>
                  <div>
                    <div className="font-medium">Live Progress</div>
                    <div className="text-sm text-gray-600">Track flight completion percentage and ETA</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-xl">🌤️</span>
                  <div>
                    <div className="font-medium">Weather Integration</div>
                    <div className="text-sm text-gray-600">Real-time weather affects flight speed</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="font-medium">Smart Routing</div>
                    <div className="text-sm text-gray-600">Automatic route adjustments for severe weather</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center pt-4">
          <a 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            <span className="mr-2">←</span>
            Back to Honk! App
          </a>
        </div>
      </div>
    </div>
  );
}