#!/usr/bin/env tsx

import { dbManager } from '../src/lib/database';
import { MigrationRunner } from '../src/lib/migrations';
import { validateUser, validateHonkMessage, assertValid } from '../src/lib/validation';
import { User, HonkMessage, LocationData } from '../src/types';
import { v4 as uuidv4 } from 'uuid';

async function demoDatabase() {
  console.log('🦆 Honk! Database Demo\n');

  try {
    // Initialize database
    console.log('1. Initializing database...');
    const db = dbManager.connect('./demo.db');
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();
    console.log('✅ Database initialized\n');

    // Create sample users
    console.log('2. Creating sample users...');
    
    const user1: User = {
      id: uuidv4(),
      email: 'demo1@example.com',
      username: 'skynavigator',
      password_hash: 'demo_hash_1',
      created_at: new Date(),
      last_active: new Date(),
      total_journey_points: 1500,
      current_rank: 'Sky Navigator',
      location_sharing_preference: 'state',
      opt_out_random: false,
      current_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'United States',
        is_anonymous: false
      }
    };

    const user2: User = {
      id: uuidv4(),
      email: 'demo2@example.com',
      username: 'cloudrider',
      password_hash: 'demo_hash_2',
      created_at: new Date(),
      last_active: new Date(),
      total_journey_points: 750,
      current_rank: 'Cloud Rider',
      location_sharing_preference: 'country',
      opt_out_random: false,
      current_location: {
        latitude: 34.0522,
        longitude: -118.2437,
        state: 'California',
        country: 'United States',
        is_anonymous: false
      }
    };

    // Validate users before inserting
    assertValid(user1, validateUser);
    assertValid(user2, validateUser);

    // Insert users
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, username, password_hash, created_at, last_active, total_journey_points, current_rank, 
                        location_sharing_preference, opt_out_random, current_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const user1Row = dbManager.userToRow(user1);
    const user2Row = dbManager.userToRow(user2);

    insertUser.run(
      user1.id, user1.email, user1.username, user1.password_hash, user1Row.created_at, user1Row.last_active, user1.total_journey_points,
      user1.current_rank, user1.location_sharing_preference, user1Row.opt_out_random,
      user1Row.current_location
    );

    insertUser.run(
      user2.id, user2.email, user2.username, user2.password_hash, user2Row.created_at, user2Row.last_active, user2.total_journey_points,
      user2.current_rank, user2.location_sharing_preference, user2Row.opt_out_random,
      user2Row.current_location
    );

    console.log(`✅ Created user: ${user1.current_rank} from ${user1.current_location?.state}`);
    console.log(`✅ Created user: ${user2.current_rank} from ${user2.current_location?.state}\n`);

    // Create sample message
    console.log('3. Creating sample message...');
    
    const message: HonkMessage = {
      id: uuidv4(),
      sender_id: user1.id,
      recipient_id: user2.id,
      title: 'Greetings from the Big Apple! 🍎',
      content: 'Hey there! Sending you warm wishes from New York City. Hope this duck finds you well on the West Coast! 🦆✨',
      sender_location: user1.current_location!,
      recipient_location: user2.current_location!,
      status: 'flying',
      created_at: new Date(),
      journey_data: {
        route: [],
        total_distance: 3935, // NYC to LA distance in km
        estimated_duration: 120, // 2 hours flight time
        weather_events: [],
        current_progress: 25,
        journey_points_earned: 3935
      }
    };

    // Validate message before inserting
    assertValid(message, validateHonkMessage);

    // Insert message
    const insertMessage = db.prepare(`
      INSERT INTO messages (id, sender_id, recipient_id, title, content, sender_location,
                           recipient_location, status, created_at, journey_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const messageRow = dbManager.messageToRow(message);
    insertMessage.run(
      message.id, message.sender_id, message.recipient_id, message.title, message.content,
      messageRow.sender_location, messageRow.recipient_location, message.status,
      messageRow.created_at, messageRow.journey_data
    );

    console.log(`✅ Created message: "${message.title}"`);
    console.log(`   From: ${message.sender_location.state} to ${message.recipient_location?.state}`);
    console.log(`   Distance: ${message.journey_data?.total_distance}km`);
    console.log(`   Status: ${message.status} (${message.journey_data?.current_progress}% complete)\n`);

    // Query and display data
    console.log('4. Querying database...');
    
    // Get all users
    const users = db.prepare('SELECT * FROM users').all();
    console.log(`📊 Found ${users.length} users in database`);
    
    // Get all messages
    const messages = db.prepare('SELECT * FROM messages').all();
    console.log(`📊 Found ${messages.length} messages in database`);
    
    // Get message with sender info
    const messageWithSender = db.prepare(`
      SELECT m.*, u.current_rank as sender_rank, u.total_journey_points as sender_points
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(message.id) as any;
    
    console.log(`📧 Message details:`);
    console.log(`   Title: ${messageWithSender.title}`);
    console.log(`   Sender Rank: ${messageWithSender.sender_rank}`);
    console.log(`   Sender Points: ${messageWithSender.sender_points}`);
    console.log(`   Content: ${messageWithSender.content}\n`);

    // Test data transformation
    console.log('5. Testing data transformation...');
    const rawUserRow = users[0] as any;
    const transformedUser = dbManager.rowToUser(rawUserRow);
    console.log(`✅ User transformation: ${transformedUser.current_rank} (${transformedUser.total_journey_points} points)`);
    
    const rawMessageRow = messages[0] as any;
    const transformedMessage = dbManager.rowToMessage(rawMessageRow);
    console.log(`✅ Message transformation: "${transformedMessage.title}" - ${transformedMessage.status}\n`);

    console.log('🎉 Database demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Clean up
    dbManager.close();
  }
}

// Run the demo
demoDatabase().catch(console.error);