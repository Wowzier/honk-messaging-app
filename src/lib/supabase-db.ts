import { supabaseAdmin } from './supabase';
import { 
  User, 
  HonkMessage, 
  Conversation, 
  UserReward,
  LocationData,
} from '@/types';

/**
 * Supabase Database Manager
 * Replaces SQLite with Supabase for cloud-based storage
 */
class SupabaseDatabaseManager {
  private static instance: SupabaseDatabaseManager;

  private constructor() {}

  public static getInstance(): SupabaseDatabaseManager {
    if (!SupabaseDatabaseManager.instance) {
      SupabaseDatabaseManager.instance = new SupabaseDatabaseManager();
    }
    return SupabaseDatabaseManager.instance;
  }

  // Connection methods (kept for backward compatibility)
  public connect() {
    // No-op: Supabase client is always connected
    return this;
  }

  public getDatabase() {
    // Return admin client for backward compatibility
    return supabaseAdmin;
  }

  public close() {
    // No-op: Supabase manages connections
  }

  // =============================================
  // USER OPERATIONS
  // =============================================

  async createUser(user: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        username: user.username!,
        password_hash: user.password_hash!,
        current_location: user.current_location || null,
        opt_out_random: user.opt_out_random || false,
        bio: null,
        avatar_url: null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.rowToUser(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return this.rowToUser(data);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return this.rowToUser(data);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        username: updates.username,
        current_location: updates.current_location,
        opt_out_random: updates.opt_out_random,
        last_active: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToUser(row));
  }

  // =============================================
  // MESSAGE OPERATIONS
  // =============================================

  async createMessage(message: Partial<HonkMessage>): Promise<HonkMessage> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        id: message.id,
        sender_id: message.sender_id!,
        recipient_id: message.recipient_id!,
        title: message.title!,
        content: message.content!,
        sender_location: message.sender_location,
        recipient_location: message.recipient_location,
        status: message.status || 'flying',
        delivered_at: message.delivered_at?.toISOString() || null,
        read_at: null,
        journey_data: message.journey_data || null,
        message_type: message.message_type || 'regular',
        sticker_data: message.sticker_data || [],
        reply_to_message_id: null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.rowToMessage(data);
  }

  async getMessageById(id: string): Promise<HonkMessage | null> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.rowToMessage(data);
  }

  async getMessagesBySenderId(senderId: string): Promise<HonkMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('sender_id', senderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToMessage(row));
  }

  async getMessagesByRecipientId(recipientId: string): Promise<HonkMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.rowToMessage(row));
  }

  async updateMessageStatus(id: string, status: 'flying' | 'delivered' | 'read'): Promise<void> {
    const updates: any = { status };
    
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    } else if (status === 'read') {
      updates.read_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async getFlyingMessages(): Promise<HonkMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('status', 'flying')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(row => this.rowToMessage(row));
  }

  // =============================================
  // CONVERSATION OPERATIONS
  // =============================================

  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
    // Ensure consistent ordering (smaller id first)
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

    // Try to find existing conversation
    const { data: existing, error: findError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('user1_id', sortedUser1)
      .eq('user2_id', sortedUser2)
      .single();

    if (existing) return existing.id;

    // Create new conversation if it doesn't exist
    const { data: created, error: createError } = await supabaseAdmin
      .from('conversations')
      .insert({
        user1_id: sortedUser1,
        user2_id: sortedUser2,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return created.id;
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return data.map(row => this.rowToConversation(row));
  }

  // =============================================
  // HELPER METHODS - Data Transformation
  // =============================================

  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: '', // Not stored in Supabase schema
      username: row.username,
      password_hash: row.password_hash,
      created_at: new Date(row.created_at),
      last_active: new Date(row.last_active),
      current_location: row.current_location,
      opt_out_random: row.opt_out_random,
      // Legacy fields with defaults
      total_journey_points: 0,
      current_rank: '0',
      location_sharing_preference: 'state' as const,
      total_flights_sent: 0,
      total_flights_received: 0,
      total_distance_traveled: 0,
      countries_visited: [],
      states_visited: [],
      achievements: [],
    };
  }

  public rowToMessage(row: any): HonkMessage {
    return {
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      title: row.title,
      content: row.content,
      sender_location: row.sender_location,
      recipient_location: row.recipient_location,
      status: row.status,
      created_at: new Date(row.created_at),
      delivered_at: row.delivered_at ? new Date(row.delivered_at) : undefined,
      journey_data: row.journey_data,
      message_type: row.message_type || 'regular',
      sticker_data: row.sticker_data || [],
    };
  }

  private rowToConversation(row: any): Conversation {
    return {
      id: row.id,
      user1_id: row.user1_id,
      user2_id: row.user2_id,
      message_ids: [], // Legacy field
      created_at: new Date(row.created_at),
      last_message_at: row.last_message_at ? new Date(row.last_message_at) : new Date(row.created_at),
    };
  }

  // For backward compatibility with SQLite code
  public prepare(sql: string) {
    throw new Error('Direct SQL is not supported with Supabase. Use Supabase methods instead.');
  }

  public pragma(pragma: string) {
    // No-op: Supabase doesn't use pragmas
    return this;
  }
}

export const supabaseDb = SupabaseDatabaseManager.getInstance();
export default supabaseDb;
