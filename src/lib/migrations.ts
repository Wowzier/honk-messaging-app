import { Database } from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_schema_version_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS schema_version;');
    }
  },
  {
    version: 2,
    name: 'create_users_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_active TEXT NOT NULL DEFAULT (datetime('now')),
          total_journey_points INTEGER NOT NULL DEFAULT 0,
          current_rank TEXT NOT NULL DEFAULT 'Fledgling Courier',
          location_sharing_preference TEXT NOT NULL DEFAULT 'state' CHECK (location_sharing_preference IN ('state', 'country', 'anonymous')),
          opt_out_random INTEGER NOT NULL DEFAULT 0 CHECK (opt_out_random IN (0, 1)),
          current_location TEXT
        );
      `);
      
      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
        CREATE INDEX IF NOT EXISTS idx_users_opt_out_random ON users(opt_out_random);
        CREATE INDEX IF NOT EXISTS idx_users_journey_points ON users(total_journey_points);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS users;');
    }
  },
  {
    version: 3,
    name: 'create_messages_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          sender_id TEXT NOT NULL,
          recipient_id TEXT,
          title TEXT NOT NULL CHECK (length(title) <= 100),
          content TEXT NOT NULL CHECK (length(content) <= 280),
          sender_location TEXT NOT NULL,
          recipient_location TEXT,
          status TEXT NOT NULL DEFAULT 'flying' CHECK (status IN ('flying', 'delivered')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          delivered_at TEXT,
          journey_data TEXT,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `);
      
      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS messages;');
    }
  },
  {
    version: 4,
    name: 'create_conversations_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          user1_id TEXT NOT NULL,
          user2_id TEXT NOT NULL,
          message_ids TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user1_id, user2_id)
        );
      `);
      
      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS conversations;');
    }
  },
  {
    version: 5,
    name: 'create_user_rewards_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_rewards (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          reward_type TEXT NOT NULL,
          reward_id TEXT NOT NULL,
          unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, reward_type, reward_id)
        );
      `);
      
      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_rewards_reward_type ON user_rewards(reward_type);
        CREATE INDEX IF NOT EXISTS idx_user_rewards_unlocked_at ON user_rewards(unlocked_at);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS user_rewards;');
    }
  },
  {
    version: 6,
    name: 'add_authentication_fields_to_users',
    up: (db: Database) => {
      const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
      const columnNames = new Set(columns.map(column => column.name));

      const ensureColumn = (definition: string, name: string) => {
        if (!columnNames.has(name)) {
          db.exec(`ALTER TABLE users ADD COLUMN ${definition};`);
          columnNames.add(name);
        }
      };

      ensureColumn('email TEXT', 'email');
      ensureColumn('username TEXT', 'username');
      ensureColumn('password_hash TEXT', 'password_hash');

      // Create unique indexes for email and username
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);
    },
    down: (db: Database) => {
      // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
      // For now, we'll just drop the indexes
      db.exec(`
        DROP INDEX IF EXISTS idx_users_email;
        DROP INDEX IF EXISTS idx_users_username;
      `);
    }
  },
  {
    version: 7,
    name: 'create_flights_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS flights (
          id TEXT PRIMARY KEY,
          message_id TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL CHECK (status IN ('scheduled', 'enroute', 'holding', 'delivered', 'failed')),
          route TEXT NOT NULL,
          total_distance REAL NOT NULL,
          estimated_duration REAL NOT NULL,
          progress_percentage REAL NOT NULL DEFAULT 0,
          current_position TEXT NOT NULL,
          speed_kmh REAL NOT NULL DEFAULT 800,
          weather_events TEXT NOT NULL DEFAULT '[]',
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          estimated_arrival TEXT,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);
        CREATE INDEX IF NOT EXISTS idx_flights_updated_at ON flights(updated_at);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS flights;');
    }
  },
  {
    version: 8,
    name: 'create_notifications_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          read_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS notifications;');
    }
  },
  {
    version: 9,
    name: 'create_scrapbook_entries_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS scrapbook_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          UNIQUE(user_id, message_id)
        );

        CREATE INDEX IF NOT EXISTS idx_scrapbook_user_id ON scrapbook_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_scrapbook_pinned ON scrapbook_entries(pinned);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS scrapbook_entries;');
    }
  },
  {
    version: 10,
    name: 'create_postcards_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS postcards (
          id TEXT PRIMARY KEY,
          message_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          image_url TEXT,
          location TEXT NOT NULL,
          weather_snapshot TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_postcards_message_id ON postcards(message_id);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS postcards;');
    }
  },
  {
    version: 11,
    name: 'create_rate_limit_events_table',
    up: (db: Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limit_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
          metadata TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON rate_limit_events(user_id, action);
        CREATE INDEX IF NOT EXISTS idx_rate_limit_occurred_at ON rate_limit_events(occurred_at);
      `);
    },
    down: (db: Database) => {
      db.exec('DROP TABLE IF EXISTS rate_limit_events;');
    }
  },
  {
    version: 12,
    name: 'extend_user_statistics',
    up: (db: Database) => {
      const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
      const columnNames = new Set(columns.map(column => column.name));

      const ensureColumn = (definition: string, name: string) => {
        if (!columnNames.has(name)) {
          db.exec(`ALTER TABLE users ADD COLUMN ${definition};`);
          columnNames.add(name);
        }
      };

      ensureColumn('total_flights_sent INTEGER NOT NULL DEFAULT 0', 'total_flights_sent');
      ensureColumn('total_flights_received INTEGER NOT NULL DEFAULT 0', 'total_flights_received');
      ensureColumn('total_distance_traveled REAL NOT NULL DEFAULT 0', 'total_distance_traveled');
      ensureColumn("countries_visited TEXT NOT NULL DEFAULT '[]'", 'countries_visited');
      ensureColumn("states_visited TEXT NOT NULL DEFAULT '[]'", 'states_visited');
      ensureColumn("achievements TEXT NOT NULL DEFAULT '[]'", 'achievements');
    },
    down: (db: Database) => {
      db.exec(`
        -- Columns remain in place on rollback due to SQLite limitations.
      `);
    }
  },

];

export class MigrationRunner {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  public getCurrentVersion(): number {
    try {
      const result = this.db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null };
      return result.version || 0;
    } catch (error) {
      // Table doesn't exist yet
      return 0;
    }
  }

  public runMigrations(): void {
    // Ensure schema_version table exists first
    this.ensureSchemaVersionTable();
    
    const currentVersion = this.getCurrentVersion();
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);

    this.db.transaction(() => {
      for (const migration of pendingMigrations) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        migration.up(this.db);
        
        // Record the migration
        this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
      }
    })();

    console.log('All migrations completed successfully');
  }

  private ensureSchemaVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  public rollbackMigration(targetVersion: number): void {
    const currentVersion = this.getCurrentVersion();
    
    if (targetVersion >= currentVersion) {
      console.log('Target version is not lower than current version');
      return;
    }

    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Rollback in reverse order

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

    this.db.transaction(() => {
      for (const migration of migrationsToRollback) {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        migration.down(this.db);
        
        // Remove the migration record
        this.db.prepare('DELETE FROM schema_version WHERE version = ?').run(migration.version);
      }
    })();

    console.log('Rollback completed successfully');
  }
}