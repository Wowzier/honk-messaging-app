'use client';

import React from 'react';
import { WeatherDisplay } from '@/components/messaging/WeatherDisplay';
import { FlightTracker } from '@/components/messaging/FlightTracker';

export default function WeatherDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            🌤️ Weather Integration Demo
          </h1>
          <p className="text-lg text-gray-600">
            See how weather conditions affect duck courier flights in real-time!
          </p>
        </div>

        {/* Demo Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Weather Display */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Current Weather Conditions
            </h2>
            <WeatherDisplay />
            <div className="text-sm text-gray-600 p-4 bg-white rounded-lg border">
              <h3 className="font-semibold mb-2">How Weather Affects Flights:</h3>
              <ul className="space-y-1">
                <li>☀️ <strong>Clear Weather:</strong> Normal flight speed (100%)</li>
                <li>🌧️ <strong>Rain:</strong> Reduced speed (75% - 25% slower)</li>
                <li>⛈️ <strong>Storms:</strong> Significantly slower (50% - 50% slower)</li>
                <li>💨 <strong>Strong Winds:</strong> Variable speed (±25% depending on direction)</li>
              </ul>
            </div>
          </div>

          {/* Flight Tracker */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Live Flight Tracking
            </h2>
            <FlightTracker />
            <div className="text-sm text-gray-600 p-4 bg-white rounded-lg border">
              <h3 className="font-semibold mb-2">Flight Tracking Features:</h3>
              <ul className="space-y-1">
                <li>📊 Real-time progress updates</li>
                <li>🌤️ Live weather monitoring</li>
                <li>⚠️ Automatic route recalculation for severe weather</li>
                <li>📍 Current position tracking</li>
                <li>⏱️ Dynamic ETA calculations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              🔧 Technical Implementation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Weather Service</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ OpenWeatherMap API integration</li>
                  <li>✅ 10-minute weather data caching</li>
                  <li>✅ Fallback to simulated weather</li>
                  <li>✅ Real-time weather monitoring</li>
                  <li>✅ Speed modifier calculations</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Flight Engine</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Weather-aware flight management</li>
                  <li>✅ Dynamic route recalculation</li>
                  <li>✅ Real-time progress tracking</li>
                  <li>✅ Journey points with weather bonuses</li>
                  <li>✅ Comprehensive error handling</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ← Back to Honk! App
          </a>
        </div>
      </div>
    </div>
  );
}