/**
 * Weather Integration Demo
 * 
 * This file demonstrates how the weather API integration works with the flight engine
 * to provide dynamic flight conditions and real-time weather monitoring.
 */

import { weatherService, WeatherCondition } from '@/services/weather';
import { flightEngine } from '@/services/flightEngine';
import { LocationData } from '@/types';

/**
 * Demo locations for testing weather integration
 */
const DEMO_LOCATIONS = {
  newYork: {
    latitude: 40.7128,
    longitude: -74.0060,
    state: 'New York',
    country: 'United States',
    is_anonymous: false
  } as LocationData,
  
  london: {
    latitude: 51.5074,
    longitude: -0.1278,
    state: 'London',
    country: 'United Kingdom',
    is_anonymous: false
  } as LocationData,
  
  tokyo: {
    latitude: 35.6762,
    longitude: 139.6503,
    state: 'Tokyo',
    country: 'Japan',
    is_anonymous: false
  } as LocationData,
  
  sydney: {
    latitude: -33.8688,
    longitude: 151.2093,
    state: 'New South Wales',
    country: 'Australia',
    is_anonymous: false
  } as LocationData
};

/**
 * Demonstrate weather data fetching
 */
export async function demoWeatherFetching(): Promise<void> {
  console.log('🌤️  Weather Integration Demo - Fetching Weather Data\n');
  
  for (const [cityName, location] of Object.entries(DEMO_LOCATIONS)) {
    try {
      console.log(`📍 Fetching weather for ${cityName}...`);
      const weather = await weatherService.fetchWeatherData(location);
      
      if (weather) {
        const summary = weatherService.getWeatherSummary(weather);
        const speedEffect = Math.round((weather.speed_modifier - 1) * 100);
        const effectText = speedEffect > 0 ? `+${speedEffect}%` : `${speedEffect}%`;
        
        console.log(`   Weather: ${summary}`);
        console.log(`   Intensity: ${Math.round(weather.intensity * 100)}%`);
        console.log(`   Speed Effect: ${effectText}`);
        console.log(`   Condition: ${weather.type}\n`);
      } else {
        console.log(`   ❌ Failed to fetch weather data\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error fetching weather for ${cityName}:`, error);
    }
  }
}

/**
 * Demonstrate flight speed calculations with different weather conditions
 */
export async function demoFlightSpeedCalculations(): Promise<void> {
  console.log('✈️  Weather Integration Demo - Flight Speed Calculations\n');
  
  const baseSpeed = 50; // km/h
  const testWeatherConditions = [
    {
      type: WeatherCondition.CLEAR,
      intensity: 0,
      speed_modifier: 1.0,
      location: DEMO_LOCATIONS.newYork,
      timestamp: new Date()
    },
    {
      type: WeatherCondition.RAIN,
      intensity: 0.6,
      speed_modifier: 0.75,
      location: DEMO_LOCATIONS.london,
      timestamp: new Date()
    },
    {
      type: WeatherCondition.STORM,
      intensity: 0.8,
      speed_modifier: 0.5,
      location: DEMO_LOCATIONS.tokyo,
      timestamp: new Date()
    },
    {
      type: WeatherCondition.WIND,
      intensity: 0.7,
      speed_modifier: 1.15, // Tailwind
      location: DEMO_LOCATIONS.sydney,
      timestamp: new Date()
    }
  ];
  
  console.log(`Base flight speed: ${baseSpeed} km/h\n`);
  
  testWeatherConditions.forEach((weather, index) => {
    const actualSpeed = weatherService.calculateFlightSpeed(baseSpeed, weather);
    const summary = weatherService.getWeatherSummary(weather);
    const speedChange = Math.round(((actualSpeed / baseSpeed) - 1) * 100);
    const changeText = speedChange > 0 ? `+${speedChange}%` : `${speedChange}%`;
    
    console.log(`${index + 1}. ${weather.type.toUpperCase()} CONDITIONS`);
    console.log(`   Description: ${summary}`);
    console.log(`   Actual Speed: ${actualSpeed} km/h (${changeText})`);
    console.log(`   Speed Modifier: ${weather.speed_modifier}x`);
    console.log(`   Intensity: ${Math.round(weather.intensity * 100)}%\n`);
  });
}

/**
 * Demonstrate route weather monitoring
 */
export async function demoRouteWeatherMonitoring(): Promise<void> {
  console.log('🗺️  Weather Integration Demo - Route Weather Monitoring\n');
  
  const route = [
    DEMO_LOCATIONS.newYork,
    DEMO_LOCATIONS.london,
    DEMO_LOCATIONS.tokyo,
    DEMO_LOCATIONS.sydney
  ];
  
  console.log('Fetching weather along flight route...\n');
  
  try {
    const routeWeather = await weatherService.fetchWeatherForRoute(route);
    
    routeWeather.forEach((weather, index) => {
      const cityName = Object.keys(DEMO_LOCATIONS)[index];
      const summary = weatherService.getWeatherSummary(weather);
      const shouldRecalculate = weatherService.shouldRecalculateRoute(weather);
      
      console.log(`📍 Waypoint ${index + 1}: ${cityName}`);
      console.log(`   Weather: ${summary}`);
      console.log(`   Speed Effect: ${Math.round((weather.speed_modifier - 1) * 100)}%`);
      console.log(`   Route Recalculation: ${shouldRecalculate ? '⚠️  Required' : '✅ Not needed'}\n`);
    });
  } catch (error) {
    console.error('❌ Error fetching route weather:', error);
  }
}

/**
 * Demonstrate flight engine integration with weather
 */
export async function demoFlightEngineIntegration(): Promise<void> {
  console.log('🚁 Weather Integration Demo - Flight Engine Integration\n');
  
  const messageId = 'demo-flight-001';
  const startLocation = DEMO_LOCATIONS.newYork;
  const endLocation = DEMO_LOCATIONS.london;
  
  console.log(`Starting flight from New York to London...\n`);
  
  try {
    // Initialize flight
    const flight = await flightEngine.initializeFlight(
      messageId,
      startLocation,
      endLocation
    );
    
    if (!flight) {
      console.log('❌ Failed to initialize flight');
      return;
    }
    
    console.log('✅ Flight initialized successfully!');
    console.log(`   Flight ID: ${flight.id}`);
    console.log(`   Total Distance: ${Math.round(flight.total_distance)} km`);
    console.log(`   Initial Speed: ${flight.speed_kmh} km/h`);
    console.log(`   Estimated Duration: ${Math.round(flight.estimated_duration / (1000 * 60 * 60))} hours`);
    console.log(`   Weather Events: ${flight.weather_events.length}\n`);
    
    // Show initial weather conditions
    if (flight.weather_events.length > 0) {
      const initialWeather = flight.weather_events[0];
      const summary = weatherService.getWeatherSummary(initialWeather);
      console.log(`🌤️  Initial Weather Conditions:`);
      console.log(`   Condition: ${summary}`);
      console.log(`   Speed Impact: ${Math.round((initialWeather.speed_modifier - 1) * 100)}%\n`);
    }
    
    // Register progress callback
    flightEngine.onFlightProgress(messageId, (progress) => {
      console.log(`📊 Flight Progress: ${Math.round(progress.progress_percentage * 100) / 100}%`);
      if (progress.current_weather) {
        const summary = weatherService.getWeatherSummary(progress.current_weather);
        console.log(`   Current Weather: ${summary}`);
      }
    });
    
    // Let the flight run for a few seconds
    console.log('🔄 Monitoring flight progress for 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get final progress
    const finalProgress = flightEngine.getFlightProgress(messageId);
    if (finalProgress) {
      console.log(`\n📈 Final Progress: ${Math.round(finalProgress.progress_percentage * 100) / 100}%`);
      console.log(`   Current Position: ${finalProgress.current_position.latitude.toFixed(4)}, ${finalProgress.current_position.longitude.toFixed(4)}`);
    }
    
    // Cleanup
    flightEngine.cancelFlight(messageId);
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in flight engine demo:', error);
  }
}

/**
 * Run all weather integration demos
 */
export async function runWeatherIntegrationDemo(): Promise<void> {
  console.log('🌟 Starting Weather Integration Demo\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    await demoWeatherFetching();
    console.log('=' .repeat(60) + '\n');
    
    await demoFlightSpeedCalculations();
    console.log('=' .repeat(60) + '\n');
    
    await demoRouteWeatherMonitoring();
    console.log('=' .repeat(60) + '\n');
    
    await demoFlightEngineIntegration();
    console.log('=' .repeat(60) + '\n');
    
    console.log('🎉 All weather integration demos completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Cleanup
    flightEngine.cleanup();
    weatherService.cleanup();
  }
}

// Export for use in other files
export {
  DEMO_LOCATIONS,
  weatherService,
  flightEngine
};

// Run demo if this file is executed directly
if (require.main === module) {
  runWeatherIntegrationDemo().catch(console.error);
}