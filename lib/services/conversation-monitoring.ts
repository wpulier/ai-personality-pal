/**
 * Conversation Monitoring Service
 * 
 * This service tracks conversation metrics and quality to help
 * improve the AI twin experience.
 */

import { createClient } from '@supabase/supabase-js';

interface ConversationMetrics {
    twinId: string | number;
    messageCount: number;
    userMessageCount: number;
    twinMessageCount: number;
    averageUserMessageLength: number;
    averageTwinMessageLength: number;
    phaseCompletionRates: Record<string, number>;
    parentMentionAchieved: boolean;
    lastInteractionDate: string;
    firstInteractionDate: string;
}

/**
 * Get conversation metrics for a specific twin
 */
export async function getConversationMetrics(twinId: string | number): Promise<ConversationMetrics | null> {
    try {
        // Create admin client for direct database access
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

        // Get conversation state
        const { data: stateData, error: stateError } = await adminClient
            .from('conversation_states')
            .select('*')
            .eq('twin_id', twinId)
            .single();

        if (stateError && stateError.code !== 'PGRST116') {
            console.error('Error fetching conversation state:', stateError);
        }

        // Get all messages for this twin
        const { data: messages, error: messagesError } = await adminClient
            .from('messages')
            .select('*')
            .eq('twin_id', twinId)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return null;
        }

        if (!messages || messages.length === 0) {
            return {
                twinId,
                messageCount: 0,
                userMessageCount: 0,
                twinMessageCount: 0,
                averageUserMessageLength: 0,
                averageTwinMessageLength: 0,
                phaseCompletionRates: {},
                parentMentionAchieved: false,
                lastInteractionDate: '',
                firstInteractionDate: ''
            };
        }

        // Calculate message counts
        const userMessages = messages.filter(msg => msg.is_user);
        const twinMessages = messages.filter(msg => !msg.is_user);

        // Calculate average message lengths
        const totalUserLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0);
        const totalTwinLength = twinMessages.reduce((sum, msg) => sum + msg.content.length, 0);

        const averageUserMessageLength = userMessages.length > 0 ? totalUserLength / userMessages.length : 0;
        const averageTwinMessageLength = twinMessages.length > 0 ? totalTwinLength / twinMessages.length : 0;

        // Calculate phase completion rates
        const phaseCompletionRates: Record<string, number> = {};

        if (stateData) {
            // Simple mapping of phases to completion percentage
            const phases = ['INITIAL', 'YES_RESPONSE', 'NO_RESPONSE', 'DIGGING_DEEPER', 'PARENT_MENTION', 'CLOSURE'];
            const currentPhaseIndex = phases.indexOf(stateData.current_phase);

            phases.forEach((phase, index) => {
                if (index <= currentPhaseIndex) {
                    phaseCompletionRates[phase] = 100; // Completed phases
                } else {
                    phaseCompletionRates[phase] = 0; // Not reached yet
                }
            });
        }

        return {
            twinId,
            messageCount: messages.length,
            userMessageCount: userMessages.length,
            twinMessageCount: twinMessages.length,
            averageUserMessageLength,
            averageTwinMessageLength,
            phaseCompletionRates,
            parentMentionAchieved: stateData?.parent_mentioned || false,
            lastInteractionDate: messages[messages.length - 1].created_at,
            firstInteractionDate: messages[0].created_at
        };
    } catch (error) {
        console.error('Error getting conversation metrics:', error);
        return null;
    }
}

/**
 * Log a conversation interaction event
 */
export async function logInteraction(
    twinId: string | number,
    eventType: 'MESSAGE_SENT' | 'TEMPLATE_USED' | 'PHASE_ADVANCED' | 'PARENT_MENTIONED',
    metadata: Record<string, any> = {}
): Promise<boolean> {
    try {
        // Create admin client for direct database access
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

        // Log the interaction event
        const { error } = await adminClient
            .from('conversation_events')
            .insert({
                twin_id: twinId,
                event_type: eventType,
                metadata,
                occurred_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error logging interaction:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error logging interaction:', error);
        return false;
    }
}

/**
 * Get conversation flow completion statistics across all twins
 */
export async function getCompletionStatistics(): Promise<Record<string, any>> {
    try {
        // Create admin client for direct database access
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

        // Get all conversation states
        const { data: states, error } = await adminClient
            .from('conversation_states')
            .select('*');

        if (error) {
            console.error('Error fetching conversation states:', error);
            return {};
        }

        if (!states || states.length === 0) {
            return {
                totalConversations: 0,
                phaseDistribution: {},
                parentMentionRate: 0
            };
        }

        // Calculate phase distribution
        const phaseDistribution: Record<string, number> = {};
        states.forEach(state => {
            phaseDistribution[state.current_phase] = (phaseDistribution[state.current_phase] || 0) + 1;
        });

        // Calculate parent mention rate
        const mentionCount = states.filter(state => state.parent_mentioned).length;
        const parentMentionRate = (mentionCount / states.length) * 100;

        // Calculate completion rate
        const completedCount = states.filter(state => state.current_phase === 'CLOSURE').length;
        const completionRate = (completedCount / states.length) * 100;

        return {
            totalConversations: states.length,
            phaseDistribution,
            parentMentionRate,
            completionRate
        };
    } catch (error) {
        console.error('Error getting completion statistics:', error);
        return {};
    }
} 