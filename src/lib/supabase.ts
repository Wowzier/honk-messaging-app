import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
// Prefer public env vars so the browser client keeps working, but fall back to
// the server-only names so deployments that only define those (like Vercel
// secrets) still succeed.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing Supabase anon key environment variable (NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY)'
  );
}

/**
 * Public Supabase client for client-side operations
 * Uses the anonymous key which respects Row Level Security (RLS) policies
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Admin Supabase client for server-side operations
 * Uses the service role key which BYPASSES Row Level Security (RLS)
 * ⚠️ ONLY use this in API routes and server-side code!
 */
export const supabaseAdmin: SupabaseClient = (() => {
  if (!supabaseServiceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found. Admin operations will fail.');
    // Return regular client as fallback
    return supabase;
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
})();

/**
 * Database types for TypeScript support
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          created_at: string;
          last_active: string;
          current_location: any;
          opt_out_random: boolean;
          bio: string | null;
          avatar_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'last_active'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          title: string;
          content: string;
          sender_location: any;
          recipient_location: any;
          status: 'flying' | 'delivered' | 'read';
          created_at: string;
          delivered_at: string | null;
          read_at: string | null;
          journey_data: any;
          message_type: 'regular' | 'postcard';
          sticker_data: any;
          reply_to_message_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          last_message_id: string | null;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
    };
  };
}
