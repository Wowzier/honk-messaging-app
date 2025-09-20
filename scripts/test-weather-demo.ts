#!/usr/bin/env tsx

/**
 * Weather Integration Test Script
 * Run this to see the weather system in action!
 */

import { runWeatherIntegrationDemo } from '../src/examples/weatherIntegrationDemo';

console.log('🌟 Starting Honk! Weather Integration Demo...\n');

runWeatherIntegrationDemo()
  .then(() => {
    console.log('\n✅ Demo completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  });