import { createClient } from '@supabase/supabase-js';

interface MessageMemory {
  id: number;
  twin_id: number;
  content: string;
  is_user: boolean;
  created_at: string;
  metadata?: {
    type?: 'regular' | 'summary' | 'system' | 'memory';
    tokens_used?: number;
    client_timestamp?: string;
    model?: string;
    summary_of_ids?: number[];
    memory_strength?: number;
    embedding?: number[];
  };
}

/**
 * Gets the most recent messages for context
 */
export async function getRecentMessages(twinId: number, limit: number = 10): Promise<MessageMemory[]> {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const { data, error } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent messages:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getRecentMessages:', error);
    return [];
  }
}

/**
 * Creates a summary message from older conversations
 */
export async function createConversationSummary(twinId: number): Promise<void> {
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get count of messages for this twin
    const { count, error: countError } = await adminClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('twin_id', twinId);
    
    if (countError) {
      console.error('Error counting messages:', countError);
      return;
    }
    
    // Only create summary if we have more than 20 messages
    if (!count || count < 20) {
      return;
    }
    
    // Get oldest messages that haven't been summarized yet
    const { data: oldMessages, error: messagesError } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .is('metadata->summary_of_ids', null)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (messagesError || !oldMessages || oldMessages.length < 5) {
      return; // Not enough unsummarized messages yet
    }
    
    // In a real implementation, you'd use OpenAI to generate a summary
    // For now, we'll just create a simple mechanical summary
    const messageIds = oldMessages.map(msg => msg.id);
    const userMessages = oldMessages.filter(msg => msg.is_user).map(msg => msg.content);
    const aiMessages = oldMessages.filter(msg => !msg.is_user).map(msg => msg.content);
    
    const summarySentence = `This conversation covered: ${
      userMessages.join(' ').substring(0, 100)
    }...`;
    
    // Save the summary as a special message type
    await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: summarySentence,
        is_user: false,
        metadata: {
          type: 'summary',
          summary_of_ids: messageIds,
          model: 'mechanical-summary' // In production, you'd use a real model
        }
      });
    
    console.log(`Created summary for ${messageIds.length} messages`);
    
  } catch (error) {
    console.error('Error in createConversationSummary:', error);
  }
}

/**
 * Gets a combination of recent messages and memory for a rich context
 */
export async function getEnhancedContext(twinId: number): Promise<MessageMemory[]> {
  try {
    // First get the most recent messages
    const recentMessages = await getRecentMessages(twinId, 8);
    
    // Create a summary of older messages if needed
    await createConversationSummary(twinId);
    
    // Get the most recent summary, if any
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const { data: summaries, error } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .eq('metadata->type', 'summary')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !summaries || summaries.length === 0) {
      // No summaries yet, just return recent messages
      return recentMessages;
    }
    
    // Prepend the summary to the recent messages
    return [summaries[0], ...recentMessages];
  } catch (error) {
    console.error('Error in getEnhancedContext:', error);
    // Fallback to simple recent messages
    return getRecentMessages(twinId);
  }
} 