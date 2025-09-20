# Database Implementation

This document describes the database implementation for the Honk! messaging app.

## Overview

The database layer uses SQLite with better-sqlite3 for local development and testing. The implementation includes:

- **TypeScript interfaces** for all data models
- **Database schema** with proper constraints and indexes
- **Migration system** for schema versioning
- **Data validation** utilities
- **Connection management** with singleton pattern
- **Data transformation** between TypeScript objects and database rows

## Database Schema

### Tables

#### `users`
Stores user account information and preferences.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active TEXT NOT NULL DEFAULT (datetime('now')),
  total_journey_points INTEGER NOT NULL DEFAULT 0,
  current_rank TEXT NOT NULL DEFAULT 'Fledgling Courier',
  location_sharing_preference TEXT NOT NULL DEFAULT 'state' 
    CHECK (location_sharing_preference IN ('state', 'country', 'anonymous')),
  opt_out_random INTEGER NOT NULL DEFAULT 0 CHECK (opt_out_random IN (0, 1)),
  current_location TEXT -- JSON string
);
```

#### `messages`
Stores Honk messages and their journey data.

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT,
  title TEXT NOT NULL CHECK (length(title) <= 100),
  content TEXT NOT NULL CHECK (length(content) <= 280),
  sender_location TEXT NOT NULL, -- JSON string
  recipient_location TEXT, -- JSON string
  status TEXT NOT NULL DEFAULT 'flying' CHECK (status IN ('flying', 'delivered')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  journey_data TEXT, -- JSON string
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### `conversations`
Tracks conversation threads between users.

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  message_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user1_id, user2_id)
);
```

#### `user_rewards`
Tracks unlocked rewards and achievements.

```sql
CREATE TABLE user_rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, reward_type, reward_id)
);
```

## TypeScript Interfaces

### Core Data Models

```typescript
interface User {
  id: string;
  created_at: Date;
  last_active: Date;
  total_journey_points: number;
  current_rank: string;
  location_sharing_preference: 'state' | 'country' | 'anonymous';
  opt_out_random: boolean;
  current_location?: LocationData;
}

interface HonkMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  title: string;
  content: string;
  sender_location: LocationData;
  recipient_location?: LocationData;
  status: 'flying' | 'delivered';
  created_at: Date;
  delivered_at?: Date;
  journey_data?: JourneyData;
}

interface LocationData {
  latitude: number;
  longitude: number;
  state?: string;
  country?: string;
  is_anonymous: boolean;
}
```

## Database Manager

The `DatabaseManager` class provides:

- **Singleton pattern** for connection management
- **Data transformation** between TypeScript objects and database rows
- **Connection lifecycle** management
- **Error handling** and logging

### Usage

```typescript
import { dbManager } from '@/lib/database';

// Connect to database
const db = dbManager.connect('./app.db');

// Transform data
const userRow = dbManager.userToRow(user);
const user = dbManager.rowToUser(userRow);

// Close connection
dbManager.close();
```

## Migration System

The migration system provides:

- **Version tracking** with `schema_version` table
- **Forward migrations** with `up()` functions
- **Rollback support** with `down()` functions
- **Transaction safety** for atomic migrations

### Running Migrations

```typescript
import { MigrationRunner } from '@/lib/migrations';

const migrationRunner = new MigrationRunner(db);
migrationRunner.runMigrations();
```

## Data Validation

Comprehensive validation utilities ensure data integrity:

### Message Validation
- Title: Required, max 100 characters
- Content: Required, max 280 characters
- Automatic whitespace trimming

### Location Validation
- Latitude: -90 to 90 degrees
- Longitude: -180 to 180 degrees
- Proper coordinate validation

### User Validation
- Journey points: Non-negative numbers
- Location preferences: Valid enum values
- Boolean field validation

### Usage

```typescript
import { validateMessage, assertValid } from '@/lib/validation';

// Validate and get results
const result = validateMessage(title, content);
if (!result.isValid) {
  console.log('Errors:', result.errors);
}

// Assert valid or throw
assertValid(user, validateUser);
```

## Database Initialization

The database is automatically initialized on application startup:

```typescript
import { initializeDatabase } from '@/lib/db-init';

// Initialize with default path
initializeDatabase();

// Initialize with custom path
initializeDatabase('./custom.db');

// Reset database (for testing)
resetDatabase('./test.db');
```

## Testing

Comprehensive test suite covers:

- **Data validation** with edge cases
- **Database operations** with real SQLite
- **Migration system** functionality
- **Data transformation** accuracy
- **Error handling** scenarios

Run tests:
```bash
npm test
```

## Demo

Run the database demo to see the implementation in action:

```bash
npm run demo:db
```

The demo creates sample users and messages, demonstrates validation, and shows data querying capabilities.

## Performance Considerations

- **Indexes** on frequently queried columns
- **Foreign key constraints** for data integrity
- **Check constraints** for data validation
- **WAL mode** for better concurrency
- **Connection pooling** ready architecture

## Security Features

- **Input validation** prevents invalid data
- **SQL injection protection** via prepared statements
- **Foreign key constraints** maintain referential integrity
- **Data type validation** ensures type safety
- **Location privacy** controls for user data