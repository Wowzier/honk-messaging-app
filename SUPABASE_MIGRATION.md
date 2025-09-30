# 🚀 Supabase Migration Guide

## Overview

We've migrated from SQLite to Supabase for better scalability, real-time capabilities, and cloud-based storage! This guide will help you complete the migration.

---

## 📋 Prerequisites

1. Create a free Supabase account at https://app.supabase.com
2. Create a new project (choose a region close to you)
3. Wait for the project to finish setting up (~2 minutes)

---

## 🔧 Step 1: Set Up Supabase Database

### 1.1 Run the Schema

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Open `SUPABASE_SCHEMA.md` in this project
4. Copy the entire SQL code from the file
5. Paste it into the SQL Editor
6. Click **RUN** (bottom right)
7. ✅ You should see "Success. No rows returned"

### 1.2 Verify Tables Created

1. Click on **Table Editor** in the left sidebar
2. You should see three tables:
   - `users`
   - `messages`
   - `conversations`

---

## 🔑 Step 2: Configure Environment Variables

### 2.1 Get Your Supabase Credentials

1. In your Supabase dashboard, click **Project Settings** (gear icon)
2. Click **API** in the left menu
3. You'll see two important values:
   - **Project URL** (starts with `https://`)
   - **Project API keys** (two keys: `anon` and `service_role`)

### 2.2 Update `.env.local`

1. Open the file `.env.local` in your project root
2. Replace the placeholder values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
```

### 2.3 Security Notes

- ✅ **`NEXT_PUBLIC_SUPABASE_URL`** - Safe to expose (public)
- ✅ **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** - Safe to expose (protected by RLS)
- ⚠️ **`SUPABASE_SERVICE_ROLE_KEY`** - **NEVER** expose this! Server-side only!

---

## 📝 Step 3: Update Your Code to Use Supabase

### Option A: Quick Migration (Recommended)

Replace the database import in your API routes:

**Before:**
```typescript
import { dbManager } from '@/lib/database';
const db = dbManager.getDatabase();
```

**After:**
```typescript
import { supabaseDb } from '@/lib/supabase-db';
const db = supabaseDb;
```

### Option B: Use Supabase Directly

For new code, you can use Supabase directly:

```typescript
import { supabaseAdmin } from '@/lib/supabase';

// Query users
const { data, error } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('username', 'alice');

// Insert message
const { data, error } = await supabaseAdmin
  .from('messages')
  .insert({
    sender_id: userId,
    recipient_id: recipientId,
    title: 'Hello!',
    content: 'Message content',
  });
```

---

## 🔄 Step 4: Update API Routes

### Example: Update Message Send Route

**File:** `app/api/messages/send/route.ts`

**Before:**
```typescript
import { dbManager } from '@/lib/database';

const db = dbManager.connect();
const stmt = db.prepare('INSERT INTO messages...');
```

**After:**
```typescript
import { supabaseDb } from '@/lib/supabase-db';

await supabaseDb.createMessage({
  id: messageId,
  sender_id: user.id,
  recipient_id: recipientId,
  title: 'My Message',
  content: messageContent,
  status: 'flying',
});
```

---

## ✅ Step 5: Test Your Migration

### 5.1 Start Your Development Server

```bash
cd honk
npm run dev
```

### 5.2 Test Core Features

1. **Registration** - Create a new user account
2. **Login** - Sign in with your credentials
3. **Send Postcard** - Create and send a postcard
4. **Check Inbox** - Verify the postcard appears
5. **Platform View** - Check the duck flying animation

### 5.3 Check Supabase Dashboard

1. Go to **Table Editor** in Supabase
2. Click on the `messages` table
3. You should see your test messages!

---

## 🎯 Migration Checklist

- [ ] Created Supabase project
- [ ] Ran SQL schema in Supabase
- [ ] Updated `.env.local` with credentials
- [ ] Tested registration/login
- [ ] Tested sending postcards
- [ ] Tested viewing inbox
- [ ] Verified data in Supabase dashboard

---

## 🆘 Troubleshooting

### Error: "Missing NEXT_PUBLIC_SUPABASE_URL"

- Make sure `.env.local` exists in your project root
- Restart your Next.js dev server after adding environment variables
- Check that variable names match exactly (case-sensitive)

### Error: "row level security policy"

- Run the SQL schema again to ensure RLS policies are created
- Make sure you're using `supabaseAdmin` in API routes (not `supabase`)

### Can't see data in Supabase

- Check the **Table Editor** in Supabase dashboard
- Verify your API routes are using the new Supabase methods
- Check the browser console and server logs for errors

---

## 🎉 Benefits of Supabase

✅ **Cloud-based** - No more local database files  
✅ **Real-time** - Get live updates when data changes  
✅ **Scalable** - Handles millions of rows easily  
✅ **Secure** - Row Level Security (RLS) built-in  
✅ **Backups** - Automatic daily backups  
✅ **Dashboard** - Visual interface to view/edit data  

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

## 🔄 Rollback (If Needed)

If you need to go back to SQLite temporarily:

1. Change imports back to `@/lib/database`
2. The old SQLite files are still in `/data/honk.db`
3. Comment out Supabase-specific code

**Note:** The old SQLite code is still available for reference, but we recommend completing the Supabase migration for better performance and features!
