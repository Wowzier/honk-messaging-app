import { dbManager } from './database';
import { MigrationRunner } from './migrations';

export function initializeDatabase(dbPath?: string): void {
  try {
    console.log('Initializing database...');
    
    // Connect to database
    const db = dbManager.connect(dbPath);
    
    // Run migrations
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function resetDatabase(dbPath?: string): void {
  try {
    console.log('Resetting database...');
    
    // Close existing connection
    dbManager.close();
    
    // Delete database file if it exists
    if (dbPath) {
      const fs = require('fs');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
    
    // Reinitialize
    initializeDatabase(dbPath);
    
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}

// Auto-initialize database in development
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase();
}