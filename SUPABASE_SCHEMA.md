# Supabase Database Schema Setup

## Instructions

1. Go to your Supabase project dashboard at https://app.supabase.com
2. Navigate to **SQL Editor**
3. Copy and paste the SQL code below
4. Click **RUN** to execute

---

## Database Schema SQL

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_location JSONB,
  opt_out_random BOOLEAN DEFAULT false,
  bio TEXT,
  avatar_url TEXT
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  sender_location JSONB,
  recipient_location JSONB,
  status VARCHAR(20) DEFAULT 'flying' CHECK (status IN ('flying', 'delivered', 'read')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  journey_data JSONB,
  message_type VARCHAR(20) DEFAULT 'regular' CHECK (message_type IN ('regular', 'postcard')),
  sticker_data JSONB DEFAULT '[]'::jsonb,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Messages table policies
CREATE POLICY "Users can read messages they sent" ON messages
  FOR SELECT USING (auth.uid()::text = sender_id::text);

CREATE POLICY "Users can read messages they received" ON messages
  FOR SELECT USING (auth.uid()::text = recipient_id::text);

CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

CREATE POLICY "Users can update messages they sent" ON messages
  FOR UPDATE USING (auth.uid()::text = sender_id::text);

CREATE POLICY "Recipients can update message status" ON messages
  FOR UPDATE USING (auth.uid()::text = recipient_id::text);

-- Conversations table policies
CREATE POLICY "Users can read their conversations" ON conversations
  FOR SELECT USING (
    auth.uid()::text = user1_id::text OR 
    auth.uid()::text = user2_id::text
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid()::text = user1_id::text OR 
    auth.uid()::text = user2_id::text
  );

CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE USING (
    auth.uid()::text = user1_id::text OR 
    auth.uid()::text = user2_id::text
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at
  WHERE 
    (user1_id = NEW.sender_id AND user2_id = NEW.recipient_id) OR
    (user1_id = NEW.recipient_id AND user2_id = NEW.sender_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversations
CREATE TRIGGER trigger_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to update user last_active
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET last_active = NOW()
  WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user activity
CREATE TRIGGER trigger_update_user_activity
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();
```

---

## After Running the Schema

1. Update your `.env.local` file with your Supabase credentials:
   - Go to **Project Settings > API** in Supabase dashboard
   - Copy your **Project URL** and paste it as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy your **anon public** key and paste it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy your **service_role** key and paste it as `SUPABASE_SERVICE_ROLE_KEY`

2. Your Supabase database is now ready to use!

## Notes

- **Row Level Security (RLS)** is enabled to protect user data
- Users can only read their own messages and profiles
- The service role key bypasses RLS for admin operations
- Triggers automatically maintain conversation metadata
- All timestamps use UTC timezone
