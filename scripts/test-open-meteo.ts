#!/usr/bin/env tsx

/**
 * Quick test script to verify Open-Meteo integration works
 */

import { weatherService } from '../src/services/weather';

const testLocation = {
  latitude: 40.7128,
  longitude: -74.0060,
  state: 'New York',
  country: 'United States',
  is_anonymous: false
};

async function testOpenMeteo() {
  console.log('🌤️ Testing Open-Meteo Weather Integration...\n');
  
  try {
    console.log('📍 Fetching weather for New York City...');
    const weather = await weatherService.fetchWeatherData(testLocation);
    
    if (weather) {
      console.log('✅ Success! Weather data received:');
      console.log(`   Condition: ${weather.type}`);
      console.log(`   Intensity: ${Math.round(weather.intensity * 100)}%`);
      console.log(`   Speed Effect: ${Math.round((weather.speed_modifier - 1) * 100)}%`);
      console.log(`   Summary: ${weatherService.getWeatherSummary(weather)}`);
      
      // Test flight speed calculation
      const baseSpeed = 50;
      const actualSpeed = weatherService.calculateFlightSpeed(baseSpeed, weather);
      console.log(`\n🦆 Duck Flight Speed:`);
      console.log(`   Base Speed: ${baseSpeed} km/h`);
      console.log(`   Weather-Adjusted Speed: ${actualSpeed} km/h`);
      
      console.log('\n🎉 Open-Meteo integration working perfectly!');
    } else {
      console.log('❌ Failed to fetch weather data');
    }
  } catch (error) {
    console.error('❌ Error testing Open-Meteo:', error);
  }
}

testOpenMeteo();